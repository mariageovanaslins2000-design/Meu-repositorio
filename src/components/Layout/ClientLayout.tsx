import { Outlet } from "react-router-dom";
import { ClientHeader } from "./ClientHeader";
import { useBarbershopTheme } from "@/hooks/useBarbershopTheme";
import { useClientBarbershop } from "@/hooks/useClientBarbershop";

export function ClientLayout() {
  const { barbershopId } = useClientBarbershop();
  useBarbershopTheme(barbershopId || undefined);

  return (
    <div className="min-h-screen bg-background">
      <ClientHeader />
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
