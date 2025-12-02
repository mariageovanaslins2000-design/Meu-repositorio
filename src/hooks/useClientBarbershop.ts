import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface BarbershopData {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
}

export function useClientBarbershop() {
  const { user } = useAuth();
  const [barbershopId, setBarbershopId] = useState<string | null>(null);
  const [barbershop, setBarbershop] = useState<BarbershopData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBarbershop = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // First get the barbershop_id from client_barbershop
        const { data: linkData, error: linkError } = await supabase
          .from("client_barbershop")
          .select("barbershop_id")
          .eq("profile_id", user.id)
          .maybeSingle();

        if (linkError) throw linkError;
        
        if (!linkData) {
          setBarbershopId(null);
          setBarbershop(null);
          setLoading(false);
          return;
        }

        setBarbershopId(linkData.barbershop_id);

        // Now fetch the full barbershop data
        const { data: barbershopData, error: barbershopError } = await supabase
          .from("barbershops")
          .select("id, name, logo_url, primary_color, secondary_color")
          .eq("id", linkData.barbershop_id)
          .single();

        if (barbershopError) throw barbershopError;
        setBarbershop(barbershopData);
      } catch (error) {
        console.error("Error loading barbershop:", error);
      } finally {
        setLoading(false);
      }
    };

    loadBarbershop();

    // Subscribe to realtime updates for barbershop changes
    if (user) {
      const channel = supabase
        .channel('barbershop-theme-updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'barbershops'
          },
          (payload) => {
            // Only update if it's our barbershop
            if (barbershopId && payload.new.id === barbershopId) {
              setBarbershop(payload.new as BarbershopData);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, barbershopId]);

  return { barbershopId, barbershop, loading };
}
