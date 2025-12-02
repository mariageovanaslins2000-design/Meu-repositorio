import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  action: 'getInfo' | 'getAvailableTimes' | 'createAppointment' | 'listAppointments' | 'cancelAppointment';
  barbershop_id: string;
  barber_id?: string;
  service_id?: string;
  date?: string;
  time?: string;
  client_name?: string;
  client_phone?: string;
  appointment_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: RequestBody = await req.json();
    console.log('n8n-appointments request:', body);

    const { action, barbershop_id } = body;

    // Validar barbershop_id
    if (!barbershop_id) {
      throw new Error('barbershop_id é obrigatório');
    }

    switch (action) {
      case 'getInfo': {
        // Buscar informações da barbearia, barbeiros e serviços
        const [barbershopResult, barbersResult, servicesResult] = await Promise.all([
          supabase.from('barbershops').select('*').eq('id', barbershop_id).single(),
          supabase.from('barbers').select('*').eq('barbershop_id', barbershop_id).eq('is_active', true),
          supabase.from('services').select('*').eq('barbershop_id', barbershop_id).eq('is_active', true),
        ]);

        if (barbershopResult.error) throw barbershopResult.error;
        if (barbersResult.error) throw barbersResult.error;
        if (servicesResult.error) throw servicesResult.error;

        return new Response(
          JSON.stringify({
            barbershop: barbershopResult.data,
            barbers: barbersResult.data,
            services: servicesResult.data,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'getAvailableTimes': {
        const { barber_id, service_id, date } = body;
        if (!barber_id || !service_id || !date) {
          throw new Error('barber_id, service_id e date são obrigatórios para getAvailableTimes');
        }

        // Validar que barbeiro pertence à barbearia
        const { data: barber, error: barberError } = await supabase
          .from('barbers')
          .select('*')
          .eq('id', barber_id)
          .eq('barbershop_id', barbershop_id)
          .single();

        if (barberError || !barber) {
          throw new Error('Barbeiro não encontrado ou não pertence a esta barbearia');
        }

        // Validar que serviço pertence à barbearia
        const { data: service, error: serviceError } = await supabase
          .from('services')
          .select('*')
          .eq('id', service_id)
          .eq('barbershop_id', barbershop_id)
          .single();

        if (serviceError || !service) {
          throw new Error('Serviço não encontrado ou não pertence a esta barbearia');
        }

        // Buscar horários da barbearia
        const { data: barbershop, error: barbershopError } = await supabase
          .from('barbershops')
          .select('opening_time, closing_time, working_days')
          .eq('id', barbershop_id)
          .single();

        if (barbershopError || !barbershop) {
          throw new Error('Barbearia não encontrada');
        }

        // Verificar se a data é um dia de trabalho
        const dateObj = new Date(date + 'T00:00:00');
        const dayOfWeek = dateObj.getDay();
        
        if (!barbershop.working_days.includes(dayOfWeek)) {
          return new Response(
            JSON.stringify({ available_times: [] }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Buscar agendamentos existentes para este barbeiro nesta data
        const startOfDay = `${date}T00:00:00`;
        const endOfDay = `${date}T23:59:59`;

        const { data: existingAppointments, error: appointmentsError } = await supabase
          .from('appointments')
          .select('appointment_date, service_id')
          .eq('barber_id', barber_id)
          .gte('appointment_date', startOfDay)
          .lte('appointment_date', endOfDay);

        if (appointmentsError) throw appointmentsError;

        // Buscar duração dos serviços dos agendamentos existentes
        const serviceIds = [...new Set(existingAppointments?.map(a => a.service_id) || [])];
        const { data: services, error: servicesError } = await supabase
          .from('services')
          .select('id, duration_minutes')
          .in('id', serviceIds);

        if (servicesError) throw servicesError;

        const serviceDurations = new Map(services?.map(s => [s.id, s.duration_minutes]) || []);

        // Gerar slots de tempo
        const [openHour, openMinute] = barbershop.opening_time.split(':').map(Number);
        const [closeHour, closeMinute] = barbershop.closing_time.split(':').map(Number);
        
        const slots: string[] = [];
        let currentHour = openHour;
        let currentMinute = openMinute;

        while (currentHour < closeHour || (currentHour === closeHour && currentMinute < closeMinute)) {
          const timeString = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
          const slotDateTime = new Date(`${date}T${timeString}:00`);
          
          // Verificar se este slot conflita com algum agendamento existente
          const hasConflict = existingAppointments?.some(appointment => {
            const appointmentStart = new Date(appointment.appointment_date);
            const appointmentDuration = serviceDurations.get(appointment.service_id) || 30;
            const appointmentEnd = new Date(appointmentStart.getTime() + appointmentDuration * 60000);
            const slotEnd = new Date(slotDateTime.getTime() + service.duration_minutes * 60000);

            // Verifica se há sobreposição
            return slotDateTime < appointmentEnd && slotEnd > appointmentStart;
          });

          if (!hasConflict) {
            // Verificar se o slot + duração do serviço cabe antes do horário de fechamento
            const slotEndHour = Math.floor((currentHour * 60 + currentMinute + service.duration_minutes) / 60);
            const slotEndMinute = (currentHour * 60 + currentMinute + service.duration_minutes) % 60;
            
            if (slotEndHour < closeHour || (slotEndHour === closeHour && slotEndMinute <= closeMinute)) {
              slots.push(timeString);
            }
          }

          // Avançar 30 minutos
          currentMinute += 30;
          if (currentMinute >= 60) {
            currentHour += 1;
            currentMinute = 0;
          }
        }

        return new Response(
          JSON.stringify({ available_times: slots }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'createAppointment': {
        const { barber_id, service_id, date, time, client_name, client_phone } = body;
        
        console.log('Dados recebidos:', { barber_id, service_id, date, time, client_name, client_phone });
        
        if (!barber_id || !service_id || !date || !time || !client_name || !client_phone) {
          throw new Error('barber_id, service_id, date, time, client_name e client_phone são obrigatórios');
        }

        // Validar barbeiro
        const { data: barber, error: barberError } = await supabase
          .from('barbers')
          .select('*')
          .eq('id', barber_id)
          .eq('barbershop_id', barbershop_id)
          .single();

        if (barberError || !barber) {
          throw new Error('Barbeiro não encontrado ou não pertence a esta barbearia');
        }

        // Validar serviço
        const { data: service, error: serviceError } = await supabase
          .from('services')
          .select('*')
          .eq('id', service_id)
          .eq('barbershop_id', barbershop_id)
          .single();

        if (serviceError || !service) {
          throw new Error('Serviço não encontrado ou não pertence a esta barbearia');
        }

        // Buscar ou criar cliente
        let client_id: string;

        const { data: existingClient, error: clientSearchError } = await supabase
          .from('clients')
          .select('id')
          .eq('barbershop_id', barbershop_id)
          .eq('phone', client_phone)
          .maybeSingle();

        if (clientSearchError) {
          console.error('Erro ao buscar cliente:', clientSearchError);
          throw clientSearchError;
        }

        if (existingClient) {
          console.log('Cliente existente encontrado:', existingClient.id);
          client_id = existingClient.id;
        } else {
          console.log('Criando novo cliente...');
          // Criar novo cliente
          const { data: newClient, error: clientCreateError } = await supabase
            .from('clients')
            .insert({
              barbershop_id,
              name: client_name,
              phone: client_phone,
              total_visits: 0
            })
            .select('id')
            .single();

          if (clientCreateError) {
            console.error('Erro ao criar cliente:', clientCreateError);
            throw clientCreateError;
          }
          console.log('Cliente criado:', newClient.id);
          client_id = newClient.id;
        }

        // Verificar conflito de horário (com timezone de Brasília)
        const appointmentDateTime = `${date}T${time}:00-03:00`;
        const appointmentStart = new Date(appointmentDateTime);
        const appointmentEnd = new Date(appointmentStart.getTime() + service.duration_minutes * 60000);

        const { data: conflicts, error: conflictError } = await supabase
          .from('appointments')
          .select('id, appointment_date, service_id')
          .eq('barber_id', barber_id)
          .gte('appointment_date', date + 'T00:00:00')
          .lte('appointment_date', date + 'T23:59:59');

        if (conflictError) throw conflictError;

        // Buscar durações dos serviços dos conflitos
        if (conflicts && conflicts.length > 0) {
          const serviceIds = [...new Set(conflicts.map(c => c.service_id))];
          const { data: services, error: servicesError } = await supabase
            .from('services')
            .select('id, duration_minutes')
            .in('id', serviceIds);

          if (servicesError) throw servicesError;

          const serviceDurations = new Map(services?.map(s => [s.id, s.duration_minutes]) || []);

          const hasConflict = conflicts.some(conflict => {
            const conflictStart = new Date(conflict.appointment_date);
            const conflictDuration = serviceDurations.get(conflict.service_id) || 30;
            const conflictEnd = new Date(conflictStart.getTime() + conflictDuration * 60000);

            return appointmentStart < conflictEnd && appointmentEnd > conflictStart;
          });

          if (hasConflict) {
            throw new Error('Horário não disponível - já existe um agendamento neste horário');
          }
        }

        // Criar agendamento
        console.log('Criando agendamento com client_id:', client_id);
        const { data: appointment, error: appointmentError } = await supabase
          .from('appointments')
          .insert({
            barbershop_id,
            barber_id,
            client_id,
            service_id,
            appointment_date: appointmentDateTime,
            status: 'pending',
          })
          .select('*')
          .single();

        if (appointmentError) {
          console.error('Erro ao criar agendamento:', appointmentError);
          throw appointmentError;
        }

        console.log('Agendamento criado:', appointment);

        return new Response(
          JSON.stringify({ 
            success: true, 
            appointment,
            message: 'Agendamento criado com sucesso'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'listAppointments': {
        const { client_phone } = body;
        
        if (!client_phone) {
          throw new Error('client_phone é obrigatório para listAppointments');
        }

        // Buscar cliente pelo telefone
        const { data: client, error: clientError } = await supabase
          .from('clients')
          .select('id')
          .eq('barbershop_id', barbershop_id)
          .eq('phone', client_phone)
          .maybeSingle();

        if (clientError) throw clientError;

        if (!client) {
          return new Response(
            JSON.stringify({ appointments: [] }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Buscar agendamentos do cliente
        const { data: appointments, error: appointmentsError } = await supabase
          .from('appointments')
          .select(`
            *,
            barber:barbers(name),
            service:services(name, price, duration_minutes)
          `)
          .eq('client_id', client.id)
          .eq('barbershop_id', barbershop_id)
          .order('appointment_date', { ascending: true });

        if (appointmentsError) throw appointmentsError;

        return new Response(
          JSON.stringify({ appointments: appointments || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'cancelAppointment': {
        const { appointment_id } = body;
        
        if (!appointment_id) {
          throw new Error('appointment_id é obrigatório para cancelAppointment');
        }

        // Verificar se o agendamento existe e pertence à barbearia
        const { data: appointment, error: appointmentError } = await supabase
          .from('appointments')
          .select('*')
          .eq('id', appointment_id)
          .eq('barbershop_id', barbershop_id)
          .single();

        if (appointmentError || !appointment) {
          throw new Error('Agendamento não encontrado');
        }

        // Atualizar status para cancelled
        const { error: updateError } = await supabase
          .from('appointments')
          .update({ status: 'cancelled' })
          .eq('id', appointment_id);

        if (updateError) throw updateError;

        console.log('Agendamento cancelado:', appointment_id);

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Agendamento cancelado com sucesso'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error(`Ação não reconhecida: ${action}`);
    }
  } catch (error) {
    console.error('Erro em n8n-appointments:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: String(error)
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
