import { Outlet } from "react-router-dom";
import { ClientHeader } from "./ClientHeader";

export function ClientLayout() {
  return (
    <div className="min-h-screen bg-background">
      <ClientHeader />
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
