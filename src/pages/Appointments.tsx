import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

type Appointment = {
  id: string;
  appointment_date: string;
  status: string;
  barber: { name: string; id: string };
  client: { full_name: string };
  service: { name: string; duration_minutes: number; price: number };
};

type Barber = {
  id: string;
  name: string;
};

const Appointments = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    loadData();
  }, [user, date]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Get barbershop
      const { data: barbershop } = await supabase
        .from("barbershops")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!barbershop) return;

      // Load barbers
      const { data: barbersData } = await supabase
        .from("barbers")
        .select("id, name")
        .eq("barbershop_id", barbershop.id)
        .eq("is_active", true);

      setBarbers(barbersData || []);

      // Load appointments for selected date
      const startOfDay = new Date(date || new Date());
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date || new Date());
      endOfDay.setHours(23, 59, 59, 999);

      const { data: appointmentsData } = await supabase
        .from("appointments")
        .select(`
          id,
          appointment_date,
          status,
          client_id,
          barber_id,
          service_id
        `)
        .eq("barbershop_id", barbershop.id)
        .gte("appointment_date", startOfDay.toISOString())
        .lte("appointment_date", endOfDay.toISOString())
        .order("appointment_date", { ascending: true });

      // Fetch related data separately
      if (appointmentsData && appointmentsData.length > 0) {
        const barberIds = [...new Set(appointmentsData.map(a => a.barber_id))];
        const clientIds = [...new Set(appointmentsData.map(a => a.client_id))];
        const serviceIds = [...new Set(appointmentsData.map(a => a.service_id))];

        const [{ data: barbersData }, { data: clientsData }, { data: servicesData }] = await Promise.all([
          supabase.from("barbers").select("id, name").in("id", barberIds),
          supabase.from("profiles").select("id, full_name").in("id", clientIds),
          supabase.from("services").select("id, name, duration_minutes, price").in("id", serviceIds),
        ]);

        const formattedAppointments = appointmentsData.map(apt => ({
          id: apt.id,
          appointment_date: apt.appointment_date,
          status: apt.status,
          barber: {
            id: apt.barber_id,
            name: barbersData?.find(b => b.id === apt.barber_id)?.name || "N/A"
          },
          client: {
            full_name: clientsData?.find(c => c.id === apt.client_id)?.full_name || "N/A"
          },
          service: servicesData?.find(s => s.id === apt.service_id) || { name: "N/A", duration_minutes: 0, price: 0 }
        }));

        setAppointments(formattedAppointments);
      } else {
        setAppointments([]);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os agendamentos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (appointmentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: newStatus })
        .eq("id", appointmentId);

      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: "O status do agendamento foi atualizado com sucesso",
      });

      loadData();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "secondary", label: "Pendente" },
      confirmed: { variant: "default", label: "Confirmado" },
      completed: { variant: "outline", label: "Concluído" },
      cancelled: { variant: "destructive", label: "Cancelado" },
    };
    
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredAppointments = selectedBarber === "all" 
    ? appointments 
    : appointments.filter(apt => apt.barber.id === selectedBarber);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Agendamentos</h1>
        <p className="text-muted-foreground">Gerencie todos os agendamentos por barbeiro</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-1 shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Calendário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        {/* Appointments List */}
        <Card className="lg:col-span-2 shadow-elegant">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Agendamentos do Dia
              </CardTitle>
              <Select value={selectedBarber} onValueChange={setSelectedBarber}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Todos os barbeiros" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os barbeiros</SelectItem>
                  {barbers.map((barber) => (
                    <SelectItem key={barber.id} value={barber.id}>
                      {barber.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : filteredAppointments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum agendamento encontrado para este dia
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors border border-border"
                  >
                    <div className="w-16 text-center">
                      <p className="text-lg font-bold">
                        {new Date(appointment.appointment_date).toLocaleTimeString('pt-BR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {appointment.service.duration_minutes}min
                      </p>
                    </div>
                    <div className="h-12 w-px bg-border" />
                    <div className="flex-1">
                      <p className="font-medium">{appointment.client.full_name}</p>
                      <p className="text-sm text-muted-foreground">{appointment.service.name}</p>
                      <p className="text-sm font-medium text-accent">R$ {appointment.service.price}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{appointment.barber.name}</p>
                      <p className="text-xs text-muted-foreground">Barbeiro</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      {getStatusBadge(appointment.status)}
                      <Select 
                        value={appointment.status} 
                        onValueChange={(value) => updateStatus(appointment.id, value)}
                      >
                        <SelectTrigger className="w-[140px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pendente</SelectItem>
                          <SelectItem value="confirmed">Confirmado</SelectItem>
                          <SelectItem value="completed">Concluído</SelectItem>
                          <SelectItem value="cancelled">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Appointments;
