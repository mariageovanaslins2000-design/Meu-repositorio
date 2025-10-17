import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Phone, Calendar, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Client {
  id: string;
  full_name: string;
  phone: string;
  total_appointments: number;
  last_appointment_date: string | null;
  last_service: string | null;
}

interface AppointmentHistory {
  id: string;
  appointment_date: string;
  service_name: string;
  barber_name: string;
  status: string;
  paid_amount: number;
}

const Clients = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [appointmentHistory, setAppointmentHistory] = useState<AppointmentHistory[]>([]);

  useEffect(() => {
    loadClients();
    
    // Set up realtime subscription for clients changes
    const channel = supabase
      .channel('clients-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clients'
        },
        () => {
          loadClients();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadClients = async () => {
    if (!user) return;

    try {
      // Get barbershop
      const { data: barbershop } = await supabase
        .from("barbershops")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!barbershop) return;

      // Get clients from the new clients table
      const { data: clientsData } = await supabase
        .from("clients")
        .select("*")
        .eq("barbershop_id", barbershop.id)
        .order("last_appointment_at", { ascending: false });

      if (clientsData) {
        // Map to match the existing Client interface
        const mappedClients: Client[] = clientsData.map(c => ({
          id: c.id,
          full_name: c.name,
          phone: c.phone || "Não informado",
          total_appointments: c.total_visits,
          last_appointment_date: c.last_appointment_at,
          last_service: null, // We'll get this from appointment history if needed
        }));

        setClients(mappedClients);
      }
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadClientHistory = async (clientId: string) => {
    if (!user) return;

    try {
      const { data: barbershop } = await supabase
        .from("barbershops")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!barbershop) return;

      const { data: appointments } = await supabase
        .from("appointments")
        .select(`
          id,
          appointment_date,
          status,
          paid_amount,
          services (
            name
          ),
          barbers (
            name
          )
        `)
        .eq("barbershop_id", barbershop.id)
        .eq("client_id", clientId)
        .order("appointment_date", { ascending: false });

      if (appointments) {
        setAppointmentHistory(
          appointments.map((apt: any) => ({
            id: apt.id,
            appointment_date: apt.appointment_date,
            service_name: apt.services?.name || "Não especificado",
            barber_name: apt.barbers?.name || "Não especificado",
            status: apt.status,
            paid_amount: apt.paid_amount || 0,
          }))
        );
      }
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/10 text-yellow-500";
      case "confirmed":
        return "bg-blue-500/10 text-blue-500";
      case "completed":
        return "bg-green-500/10 text-green-500";
      case "cancelled":
        return "bg-red-500/10 text-red-500";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Pendente";
      case "confirmed":
        return "Confirmado";
      case "completed":
        return "Concluído";
      case "cancelled":
        return "Cancelado";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Clientes</h1>
        <p className="text-muted-foreground">Gerencie sua base de clientes</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clients.filter(c => c.total_appointments > 0).length}</div>
            <p className="text-xs text-muted-foreground">Com agendamentos confirmados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Agendamentos</CardTitle>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clients.reduce((acc, client) => acc + client.total_appointments, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Média por Cliente</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clients.length > 0
                ? (clients.reduce((acc, client) => acc + client.total_appointments, 0) / clients.length).toFixed(1)
                : "0"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clients List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {clients.map((client) => (
              <div
                key={client.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors gap-4"
              >
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-12 h-12 rounded-full bg-gradient-gold flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-bold text-sidebar-primary-foreground">
                      {client.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{client.full_name}</h3>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-muted-foreground mt-1">
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        <span className="truncate">{client.phone}</span>
                      </div>
                      <span className="hidden sm:inline">•</span>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{client.total_appointments} agendamentos</span>
                      </div>
                    </div>
                    {client.last_appointment_date && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Último: {client.last_service} -{" "}
                        {format(new Date(client.last_appointment_date), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    )}
                  </div>
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedClient(client);
                        loadClientHistory(client.id);
                      }}
                      className="w-full sm:w-auto"
                    >
                      Ver Histórico
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Histórico de {selectedClient?.full_name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      {appointmentHistory.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">Nenhum agendamento encontrado</p>
                      ) : (
                        appointmentHistory.map((apt) => (
                          <div key={apt.id} className="p-4 rounded-lg border bg-card">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium">
                                  {format(new Date(apt.appointment_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                </span>
                              </div>
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(apt.status)}`}
                              >
                                {getStatusLabel(apt.status)}
                              </span>
                            </div>
                            <div className="space-y-1 text-sm">
                              <p>
                                <span className="text-muted-foreground">Serviço:</span> {apt.service_name}
                              </p>
                              <p>
                                <span className="text-muted-foreground">Barbeiro:</span> {apt.barber_name}
                              </p>
                              {apt.paid_amount > 0 && (
                                <p>
                                  <span className="text-muted-foreground">Valor:</span> R${" "}
                                  {apt.paid_amount.toFixed(2)}
                                </p>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            ))}

            {clients.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum cliente cadastrado ainda</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Os clientes aparecerão aqui automaticamente após realizarem agendamentos
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Clients;
