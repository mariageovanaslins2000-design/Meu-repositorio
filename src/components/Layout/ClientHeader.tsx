import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Scissors, Home, Calendar, Users, Briefcase, User, LogOut, Settings2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ClientMobileMenu } from "./ClientMobileMenu";

export function ClientHeader() {
  const { signOut, user, hasRole } = useAuth();
  const location = useLocation();
  const [barbershop, setBarbershop] = useState<{ name: string; logo_url: string } | null>(null);

  useEffect(() => {
    const loadBarbershop = async () => {
      if (!user) return;

      // Get the barbershop from the first appointment
      const { data: appointment } = await supabase
        .from("appointments")
        .select("barbershop_id")
        .eq("client_id", user.id)
        .limit(1)
        .single();

      if (appointment) {
        const { data: barbershopData } = await supabase
          .from("barbershops")
          .select("name, logo_url")
          .eq("id", appointment.barbershop_id)
          .single();

        if (barbershopData) {
          setBarbershop(barbershopData);
        }
      }
    };

    loadBarbershop();
  }, [user]);

  const navItems = [
    { path: "/client", label: "Início", icon: Home },
    { path: "/client/booking", label: "Agendar", icon: Calendar },
    { path: "/client/appointments", label: "Meus Agendamentos", icon: Calendar },
    { path: "/client/barbers", label: "Barbeiros", icon: Users },
    { path: "/client/services", label: "Serviços", icon: Briefcase },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4 md:gap-8">
          <ClientMobileMenu />
          
          <Link to="/client" className="flex items-center gap-2">
            {barbershop?.logo_url ? (
              <img src={barbershop.logo_url} alt={barbershop.name} className="h-10 w-10 object-contain rounded-lg" />
            ) : (
              <div className="p-2 bg-primary rounded-full">
                <Scissors className="h-5 w-5 text-primary-foreground" />
              </div>
            )}
            <span className="text-lg md:text-xl font-bold">{barbershop?.name || "BarberShop"}</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary ${
                  isActive(item.path) ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar>
                <AvatarFallback>
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/client/profile" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Meu Perfil
              </Link>
            </DropdownMenuItem>
            {hasRole("owner") && (
              <DropdownMenuItem asChild>
                <Link to="/admin" className="cursor-pointer">
                  <Settings2 className="mr-2 h-4 w-4" />
                  Painel Admin
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={signOut} className="cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
