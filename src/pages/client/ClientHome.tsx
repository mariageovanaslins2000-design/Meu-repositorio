import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, User, Store } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ClientHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasBarbershop, setHasBarbershop] = useState(true);

  useEffect(() => {
    checkBarbershopLink();
    loadUpcomingAppointments();
  }, [user]);

  const checkBarbershopLink = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from("client_barbershop")
        .select("barbershop_id")
        .eq("profile_id", user.id)
        .maybeSingle();

      setHasBarbershop(!!data);
    } catch (error) {
      console.error("Error checking barbershop link:", error);
    }
  };

  const loadUpcomingAppointments = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          barbers (name),
          services (name, price),
          barbershops (name)
        `)
        .eq("client_id", user.id)
        .gte("appointment_date", new Date().toISOString())
        .order("appointment_date", { ascending: true })
        .limit(3);

      if (error) throw error;
      setUpcomingAppointments(data || []);
    } catch (error) {
      console.error("Error loading appointments:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasBarbershop) {
    return (
      <div className="max-w-2xl mx-auto space-y-8 text-center">
        <div className="space-y-2">
          <Store className="h-16 w-16 mx-auto text-primary" />
          <h1 className="text-3xl font-bold">Bem-vindo!</h1>
          <p className="text-muted-foreground">
            Para começar a usar o sistema, você precisa selecionar uma barbearia
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Próximos Passos</CardTitle>
            <CardDescription>
              Escolha uma barbearia para acessar todos os recursos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/client/select-barbershop")} className="w-full">
              Selecionar Barbearia
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Bem-vindo!</h1>
        <p className="text-muted-foreground">
          Gerencie seus agendamentos e explore nossos serviços
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>Novo Agendamento</CardTitle>
            <CardDescription>
              Agende um horário com nossos profissionais
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/client/booking">
                <Calendar className="mr-2 h-4 w-4" />
                Agendar Agora
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>Meus Agendamentos</CardTitle>
            <CardDescription>
              Visualize e gerencie seus agendamentos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to="/client/appointments">
                Ver Todos
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Próximos Agendamentos</h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : upcomingAppointments.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground mb-4">
                Você não tem agendamentos futuros
              </p>
              <Button asChild>
                <Link to="/client/booking">Fazer Agendamento</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {upcomingAppointments.map((appointment) => (
              <Card key={appointment.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <h3 className="font-semibold">{appointment.services.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {appointment.barbers.name}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(appointment.appointment_date), "dd 'de' MMMM", { locale: ptBR })}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {format(new Date(appointment.appointment_date), "HH:mm")}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">
                        R$ {Number(appointment.services.price).toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {appointment.status === "pending" && "Pendente"}
                        {appointment.status === "confirmed" && "Confirmado"}
                        {appointment.status === "cancelled" && "Cancelado"}
                        {appointment.status === "completed" && "Concluído"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
