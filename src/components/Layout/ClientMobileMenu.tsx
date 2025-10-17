import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Scissors, Home, Calendar, Users, Briefcase, Menu, User, LogOut, Settings2, Image } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

export function ClientMobileMenu() {
  const { signOut, user, hasRole } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const navItems = [
    { path: "/client", label: "Início", icon: Home },
    { path: "/client/booking", label: "Agendar", icon: Calendar },
    { path: "/client/appointments", label: "Meus Agendamentos", icon: Calendar },
    { path: "/client/barbers", label: "Barbeiros", icon: Users },
    { path: "/client/services", label: "Serviços", icon: Briefcase },
    { path: "/client/portfolio", label: "Portfólio", icon: Image },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64">
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 pb-6 border-b">
              <div className="p-2 bg-primary rounded-full">
                <Scissors className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">BarberShop</span>
            </div>

            <nav className="flex-1 py-6">
              <ul className="space-y-2">
                {navItems.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive(item.path)
                          ? "bg-primary text-primary-foreground font-medium"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="border-t pt-4 space-y-2">
              <div className="px-4 py-2 text-sm font-medium text-muted-foreground">
                {user?.email}
              </div>
              <Link
                to="/client/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
              >
                <User className="h-5 w-5" />
                <span>Meu Perfil</span>
              </Link>
              {hasRole("owner") && (
                <Link
                  to="/admin"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                >
                  <Settings2 className="h-5 w-5" />
                  <span>Painel Admin</span>
                </Link>
              )}
              <button
                onClick={() => {
                  setOpen(false);
                  signOut();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
