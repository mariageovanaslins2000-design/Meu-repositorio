import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Clock, X, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
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
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { user } = useAuth();

  const handleDeleteAppointment = async () => {
    if (!appointmentToDelete) return;
    
    setDeleting(true);
    try {
      // Primeiro deletar registros financeiros vinculados
      await supabase
        .from("financial_records")
        .delete()
        .eq("appointment_id", appointmentToDelete.id);

      const { error } = await supabase
        .from("appointments")
        .delete()
        .eq("id", appointmentToDelete.id);

      if (error) throw error;

      toast({
        title: "Agendamento excluído",
        description: "O agendamento foi excluído com sucesso.",
      });
      loadData();
    } catch (error) {
      console.error("Error deleting appointment:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o agendamento.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setAppointmentToDelete(null);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, date, startDate, endDate]);

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

      // Determine date range
      let startTime: string, endTime: string;
      
      if (startDate && endDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        startTime = start.toISOString();
        endTime = end.toISOString();
      } else if (date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        startTime = startOfDay.toISOString();
        endTime = endOfDay.toISOString();
      } else {
        setAppointments([]);
        return;
      }

      // Fetch appointments from database
      const { data: appointmentsData, error } = await supabase
        .from("appointments")
        .select(`
          id,
          appointment_date,
          status,
          barbers (id, name),
          clients (id, name),
          services (name, duration_minutes, price)
        `)
        .eq("barbershop_id", barbershop.id)
        .gte("appointment_date", startTime)
        .lte("appointment_date", endTime)
        .order("appointment_date", { ascending: true });

      if (error) throw error;

      // Map to expected format
      const mappedAppointments: Appointment[] = (appointmentsData || []).map((apt: any) => ({
        id: apt.id,
        appointment_date: apt.appointment_date,
        status: apt.status,
        barber: {
          id: apt.barbers.id,
          name: apt.barbers.name
        },
        client: {
          full_name: apt.clients.name
        },
        service: {
          name: apt.services.name,
          duration_minutes: apt.services.duration_minutes,
          price: apt.services.price
        }
      }));

      setAppointments(mappedAppointments);
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

  const handleConfirmAppointment = async (appointmentId: string) => {
    try {
      // 1. Buscar dados do agendamento
      const { data: appointment, error: appointmentError } = await supabase
        .from("appointments")
        .select(`
          id,
          barbershop_id,
          barber_id,
          client_id,
          appointment_date,
          service_id,
          services (price)
        `)
        .eq("id", appointmentId)
        .single();

      if (appointmentError || !appointment) {
        throw new Error("Agendamento não encontrado");
      }

      // 2. Buscar comissão do barbeiro
      const { data: barber, error: barberError } = await supabase
        .from("barbers")
        .select("commission_percent")
        .eq("id", appointment.barber_id)
        .single();

      if (barberError || !barber) {
        throw new Error("Barbeiro não encontrado");
      }

      // 3. Calcular valores financeiros
      const valorTotal = (appointment.services as any)?.price || 0;
      const comissaoPercent = barber.commission_percent || 50;
      const comissaoValor = (valorTotal * comissaoPercent) / 100;
      const valorLiquidoBarbearia = valorTotal - comissaoValor;

      // 4. Criar registro financeiro
      const { error: financialError } = await supabase.from("financial_records").insert({
        barbershop_id: appointment.barbershop_id,
        appointment_id: appointmentId,
        barber_id: appointment.barber_id,
        valor_total: valorTotal,
        comissao_percent: comissaoPercent,
        comissao_valor: comissaoValor,
        valor_liquido_barbearia: valorLiquidoBarbearia,
        status: "EFETIVADO"
      });

      if (financialError) {
        console.error("Error creating financial record:", financialError);
        throw new Error("Erro ao criar registro financeiro");
      }

      // 5. Atualizar dados do cliente (total_visits e last_appointment_at)
      const { data: clientData } = await supabase
        .from("clients")
        .select("total_visits")
        .eq("id", appointment.client_id)
        .single();

      if (clientData) {
        const { error: clientUpdateError } = await supabase
          .from("clients")
          .update({
            total_visits: (clientData.total_visits || 0) + 1,
            last_appointment_at: appointment.appointment_date
          })
          .eq("id", appointment.client_id);

        if (clientUpdateError) {
          console.error("Error updating client:", clientUpdateError);
        }
      }

      // 6. Atualizar status do agendamento
      const { error: updateError } = await supabase
        .from("appointments")
        .update({ status: "confirmed" })
        .eq("id", appointmentId);

      if (updateError) throw updateError;

      toast({
        title: "Sucesso",
        description: "Agendamento confirmado e financeiro atualizado!",
      });

      // Recarregar dados
      loadData();
    } catch (error) {
      console.error("Error confirming appointment:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível confirmar o agendamento",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (appointmentId: string, status: string) => {
    if (status === "pending") {
      return (
        <Button
          size="sm"
          onClick={() => handleConfirmAppointment(appointmentId)}
          className="bg-green-500 hover:bg-green-600 text-black font-medium"
        >
          Confirmar
        </Button>
      );
    }

    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
      confirmed: { label: "Confirmado", variant: "default" },
      completed: { label: "Concluído", variant: "default" },
      cancelled: { label: "Cancelado", variant: "destructive" }
    };
    
    const statusInfo = statusMap[status] || { label: status, variant: "secondary" as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const filteredAppointments = selectedBarber === "all" 
    ? appointments 
    : appointments.filter(apt => apt.barber.id === selectedBarber);

  const handleClearPeriodFilter = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setDate(new Date());
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Agendamentos</h1>
        <p className="text-muted-foreground">Gerencie todos os agendamentos por barbeiro</p>
      </div>

      {/* Period Filter */}
      <Card className="shadow-elegant">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Filtrar por período:</span>
            </div>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "dd/MM/yyyy", { locale: ptBR }) : "Data inicial"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            <span className="text-muted-foreground">até</span>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "dd/MM/yyyy", { locale: ptBR }) : "Data final"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            {(startDate || endDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearPeriodFilter}
                className="h-9"
              >
                <X className="mr-2 h-4 w-4" />
                Limpar período
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
        {/* Calendar */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Calendário
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        {/* Appointments List */}
        <Card className="shadow-elegant">
          <CardHeader>
            <div className="flex flex-col gap-3">
              <CardTitle className="flex items-center gap-2 whitespace-nowrap">
                <Clock className="w-5 h-5" />
                {startDate && endDate ? "Agendamentos do Período" : "Agendamentos do Dia"}
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
                    className={cn(
                      "flex flex-col lg:flex-row lg:items-center gap-4 p-4 rounded-lg transition-colors border border-border",
                      appointment.status === "confirmed" 
                        ? "bg-green-100 hover:bg-green-200" 
                        : "bg-muted/50 hover:bg-muted"
                    )}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-16 text-center flex-shrink-0">
                        <p className="text-lg font-bold">
                          {new Date(appointment.appointment_date).toLocaleTimeString('pt-BR', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            timeZone: 'America/Sao_Paulo'
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {appointment.service.duration_minutes}min
                        </p>
                      </div>
                      <div className="h-12 w-px bg-border hidden lg:block" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{appointment.client.full_name}</p>
                        <p className="text-sm text-muted-foreground truncate">{appointment.service.name}</p>
                        <p className="text-sm font-medium text-primary">R$ {appointment.service.price}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between lg:justify-end gap-4 flex-wrap">
                      <div className="text-left lg:text-right">
                        <p className="text-sm font-medium">{appointment.barber.name}</p>
                        <p className="text-xs text-muted-foreground">Barbeiro</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {getStatusBadge(appointment.id, appointment.status)}
                        {appointment.status === "cancelled" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setAppointmentToDelete(appointment)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!appointmentToDelete} onOpenChange={() => setAppointmentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o agendamento de "{appointmentToDelete?.client.full_name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAppointment}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Appointments;
