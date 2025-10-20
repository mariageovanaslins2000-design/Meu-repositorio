import { Outlet } from "react-router-dom";
import { ClientHeader } from "./ClientHeader";
import { useBarbershopTheme } from "@/hooks/useBarbershopTheme";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function ClientLayout() {
  const { user } = useAuth();
  const [barbershopId, setBarbershopId] = useState<string>();

  useEffect(() => {
    const loadBarbershop = async () => {
      if (!user) return;

      // Get barbershop from client_barbershop link
      const { data } = await supabase
        .from("client_barbershop")
        .select("barbershop_id")
        .eq("profile_id", user.id)
        .maybeSingle();

      if (data) {
        setBarbershopId(data.barbershop_id);
      }
    };

    loadBarbershop();
  }, [user]);

  useBarbershopTheme(barbershopId);

  return (
    <div className="min-h-screen bg-background">
      <ClientHeader />
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
