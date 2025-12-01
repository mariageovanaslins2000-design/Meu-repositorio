import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Clock, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  const { user } = useAuth();

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
        .select("id, name, google_calendar_id")
        .eq("barbershop_id", barbershop.id)
        .eq("is_active", true);

      setBarbers(barbersData || []);

      // Determine date range
      let timeMin: string, timeMax: string;
      
      if (startDate && endDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        timeMin = start.toISOString();
        timeMax = end.toISOString();
      } else if (date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        timeMin = startOfDay.toISOString();
        timeMax = endOfDay.toISOString();
      } else {
        setAppointments([]);
        return;
      }

      // Fetch events from all barbers' Google Calendars
      const allAppointments: Appointment[] = [];
      
      for (const barber of (barbersData || [])) {
        if (!barber.google_calendar_id) continue;

        const { data: gcData, error: gcError } = await supabase.functions.invoke('google-calendar', {
          body: {
            action: 'listEvents',
            calendarId: barber.google_calendar_id,
            timeMin,
            timeMax
          }
        });

        if (gcError) {
          console.error(`Error loading events for barber ${barber.name}:`, gcError);
          continue;
        }

        // Parse Google Calendar events
        const events = gcData?.items || [];
        events.forEach((event: any) => {
          if (!event.start?.dateTime) return;

          // Extract service and price from description
          const description = event.description || '';
          const serviceName = description.match(/Serviço: (.+)/)?.[1] || 'Serviço';
          const priceMatch = description.match(/Valor: R\$ ([\d.,]+)/);
          const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : 0;
          const clientName = event.summary?.split(' - ')[1] || description.match(/Cliente: (.+)/)?.[1] || 'Cliente';
          
          allAppointments.push({
            id: event.id,
            appointment_date: event.start.dateTime,
            status: 'confirmed',
            barber: {
              id: barber.id,
              name: barber.name
            },
            client: {
              full_name: clientName
            },
            service: {
              name: serviceName,
              duration_minutes: Math.round((new Date(event.end.dateTime).getTime() - new Date(event.start.dateTime).getTime()) / 60000),
              price
            }
          });
        });
      }

      // Sort by date
      allAppointments.sort((a, b) => 
        new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime()
      );

      setAppointments(allAppointments);
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

  const getStatusBadge = (status: string) => {
    return <Badge variant="default">Confirmado</Badge>;
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
                    className="flex flex-col lg:flex-row lg:items-center gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors border border-border"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-16 text-center flex-shrink-0">
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
                      
                      <div>
                        {getStatusBadge(appointment.status)}
                      </div>
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
