import { useState } from "react";
import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Briefcase,
  DollarSign, 
  Settings,
  Scissors,
  LogOut,
  Menu,
  X
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
  { icon: Calendar, label: "Agendamentos", path: "/admin/appointments" },
  { icon: Users, label: "Barbeiros", path: "/admin/barbers" },
  { icon: Briefcase, label: "Serviços", path: "/admin/services" },
  { icon: Users, label: "Clientes", path: "/admin/clients" },
  { icon: DollarSign, label: "Financeiro", path: "/admin/financial" },
  { icon: Settings, label: "Configurações", path: "/admin/settings" },
];

export const MobileSidebar = () => {
  const { user, signOut } = useAuth();
  const [barbershopName, setBarbershopName] = useState("Barbearia");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const loadBarbershop = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from("barbershops")
        .select("name")
        .eq("owner_id", user.id)
        .maybeSingle();
      
      if (data) {
        setBarbershopName(data.name);
      }
    };

    loadBarbershop();
  }, [user]);

  return (
    <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar border-b border-sidebar-border">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-gold flex items-center justify-center">
            <Scissors className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-sidebar-foreground">BarberPro</h1>
          </div>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-sidebar-foreground">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 bg-sidebar border-sidebar-border">
            <div className="flex flex-col h-full">
              {/* Logo */}
              <div className="p-6 border-b border-sidebar-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-gold flex items-center justify-center">
                    <Scissors className="w-5 h-5 text-sidebar-primary-foreground" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-sidebar-foreground">BarberPro</h1>
                    <p className="text-xs text-muted-foreground">Gestão Profissional</p>
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
                        onClick={() => setOpen(false)}
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
                <div className="flex items-center gap-3 p-3 rounded-lg bg-sidebar-accent">
                  <div className="w-10 h-10 rounded-full bg-gradient-gold flex items-center justify-center">
                    <span className="text-sm font-bold text-sidebar-primary-foreground">
                      {barbershopName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-sidebar-foreground truncate">
                      {barbershopName}
                    </p>
                    <p className="text-xs text-muted-foreground">Admin</p>
                  </div>
                </div>
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
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};
