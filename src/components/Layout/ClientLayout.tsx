import { Outlet } from "react-router-dom";
import { ClientHeader } from "./ClientHeader";
import { useClinicTheme } from "@/hooks/useClinicTheme";
import { useClientClinic } from "@/hooks/useClientClinic";

export function ClientLayout() {
  const { clinicId } = useClientClinic();
  useClinicTheme(clinicId || undefined);

  return (
    <div className="min-h-screen bg-background">
      <ClientHeader />
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
