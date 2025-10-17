import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { MobileSidebar } from "@/components/Layout/MobileSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useBarbershopTheme } from "@/hooks/useBarbershopTheme";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function AdminLayout() {
  const { user } = useAuth();
  const [barbershopId, setBarbershopId] = useState<string>();

  useEffect(() => {
    const loadBarbershop = async () => {
      if (!user) return;

      const { data } = await supabase
        .from("barbershops")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (data) {
        setBarbershopId(data.id);
      }
    };

    loadBarbershop();
  }, [user]);

  useBarbershopTheme(barbershopId);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      <MobileSidebar />
      <div className="flex-1 lg:ml-64 pt-16 lg:pt-0">
        <Header />
        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
