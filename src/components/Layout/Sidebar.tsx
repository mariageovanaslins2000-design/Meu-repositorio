import { NavLink, Link } from "react-router-dom";
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Briefcase,
  DollarSign, 
  Settings,
  Image,
  LogOut,
  Store,
  Building2
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
  { icon: Calendar, label: "Agendamentos", path: "/admin/appointments" },
  { icon: Users, label: "Profissionais", path: "/admin/professionals" },
  { icon: Briefcase, label: "Serviços", path: "/admin/services" },
  { icon: Users, label: "Clientes", path: "/admin/clients" },
  { icon: DollarSign, label: "Financeiro", path: "/admin/financial" },
  { icon: Image, label: "Portfólio", path: "/admin/portfolio" },
  { icon: Settings, label: "Configurações", path: "/admin/settings" },
];

export const Sidebar = () => {
  const { user, signOut } = useAuth();
  const [clinicName, setClinicName] = useState("Clínica");

  useEffect(() => {
    const loadClinic = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from("barbershops")
        .select("name")
        .eq("owner_id", user.id)
        .single();
      
      if (data) {
        setClinicName(data.name);
      }
    };

    loadClinic();
  }, [user]);

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col lg:flex hidden">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-salmon flex items-center justify-center">
            <Building2 className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground">IAClinic</h1>
            <p className="text-xs text-muted-foreground">Gestão Inteligente</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-sidebar-border space-y-2">
        <div className="flex items-center gap-3 p-3 rounded-lg">
          <div className="w-10 h-10 rounded-full bg-sidebar-border flex items-center justify-center">
            <span className="text-sm font-bold text-sidebar-foreground">
              {clinicName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {clinicName}
            </p>
            <p className="text-xs text-muted-foreground">Admin</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          asChild
        >
          <Link to="/client">
            <Store className="w-4 h-4 mr-2" />
            Área do Cliente
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={signOut}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
      </div>
    </aside>
  );
};
