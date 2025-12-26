import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.text();
    const event = JSON.parse(body);
    
    logStep("Event type", { type: event.type });

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      logStep("Checkout session completed", { 
        sessionId: session.id,
        customerEmail: session.customer_details?.email,
        customerPhone: session.customer_details?.phone,
        subscriptionId: session.subscription
      });

      const email = session.customer_details?.email;
      const phone = session.customer_details?.phone || null;
      const customerId = session.customer;
      const subscriptionId = session.subscription;
      const planId = session.metadata?.plan_id;

      if (!email || !planId) {
        logStep("Missing required data", { email, planId });
        return new Response(JSON.stringify({ error: "Missing email or planId" }), { status: 400 });
      }

      // Check if token already exists for this session
      const { data: existingToken } = await supabase
        .from("activation_tokens")
        .select("id")
        .eq("stripe_session_id", session.id)
        .single();

      if (existingToken) {
        logStep("Token already exists for this session");
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      // Create activation token
      const { data: tokenData, error: tokenError } = await supabase
        .from("activation_tokens")
        .insert({
          email,
          phone,
          plan_id: planId,
          stripe_customer_id: customerId,
          stripe_session_id: session.id,
          stripe_subscription_id: subscriptionId,
        })
        .select()
        .single();

      if (tokenError) {
        logStep("Error creating token", { error: tokenError });
        throw tokenError;
      }

      logStep("Activation token created", { tokenId: tokenData.id, token: tokenData.token });

      // Get plan info
      const { data: planData } = await supabase
        .from("subscription_plans")
        .select("name")
        .eq("id", planId)
        .single();

      const activationUrl = `${Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", ".lovable.app") || "https://iclinic.lovable.app"}/ativar/${tokenData.token}`;
      
      // Try to get a better origin from the session
      const origin = "https://preview--iclinic-iota.lovable.app";
      const finalActivationUrl = `${origin}/ativar/${tokenData.token}`;
      
      logStep("Activation URL", { url: finalActivationUrl });

      // Send email via Resend
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        try {
          const resend = new Resend(resendKey);
          
          await resend.emails.send({
            from: "iClinic <onboarding@resend.dev>",
            to: [email],
            subject: "🎉 Ative sua conta no iClinic",
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #5A6E5A;">Bem-vindo ao iClinic!</h1>
                <p>Seu pagamento foi confirmado e seu período de teste de 7 dias começou.</p>
                <p><strong>Plano:</strong> ${planData?.name || "Profissional"}</p>
                <p>Clique no botão abaixo para ativar sua conta e começar a usar:</p>
                <a href="${finalActivationUrl}" style="display: inline-block; background-color: #5A6E5A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
                  Ativar Minha Conta
                </a>
                <p style="color: #666; font-size: 14px;">
                  Este link expira em 48 horas.<br>
                  Se você não solicitou isso, ignore este email.
                </p>
              </div>
            `,
          });

          // Update token with email sent timestamp
          await supabase
            .from("activation_tokens")
            .update({ email_sent_at: new Date().toISOString() })
            .eq("id", tokenData.id);

          logStep("Email sent successfully");
        } catch (emailError) {
          logStep("Error sending email", { error: emailError });
        }
      }

      // Send WhatsApp via n8n
      if (phone) {
        try {
          const n8nWebhookUrl = "https://n8n-n8n.knceh1.easypanel.host/webhook/ativacao";
          
          await fetch(n8nWebhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              telefone: phone,
              email,
              plano: planData?.name || "Profissional",
              link_ativacao: finalActivationUrl,
            }),
          });

          // Update token with WhatsApp sent timestamp
          await supabase
            .from("activation_tokens")
            .update({ whatsapp_sent_at: new Date().toISOString() })
            .eq("id", tokenData.id);

          logStep("WhatsApp webhook triggered");
        } catch (whatsappError) {
          logStep("Error triggering WhatsApp webhook", { error: whatsappError });
        }
      }
    }

    // Handle subscription updates
    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      logStep("Subscription event", { 
        subscriptionId: subscription.id, 
        status: subscription.status 
      });

      // Update subscription status in database
      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
        })
        .eq("stripe_subscription_id", subscription.id);

      if (updateError) {
        logStep("Error updating subscription", { error: updateError });
      } else {
        logStep("Subscription updated in database");
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
