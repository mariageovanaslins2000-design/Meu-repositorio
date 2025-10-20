import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useClientBarbershop() {
  const { user } = useAuth();
  const [barbershopId, setBarbershopId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBarbershop = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("client_barbershop")
          .select("barbershop_id")
          .eq("profile_id", user.id)
          .maybeSingle();

        if (error) throw error;
        setBarbershopId(data?.barbershop_id || null);
      } catch (error) {
        console.error("Error loading barbershop:", error);
      } finally {
        setLoading(false);
      }
    };

    loadBarbershop();
  }, [user]);

  return { barbershopId, loading };
}
