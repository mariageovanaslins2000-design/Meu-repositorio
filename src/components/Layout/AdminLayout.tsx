import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { MobileSidebar } from "@/components/Layout/MobileSidebar";

export function AdminLayout() {
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
