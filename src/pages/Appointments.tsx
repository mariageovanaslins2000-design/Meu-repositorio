import { useState } from "react";
import { Calendar as CalendarIcon, Plus, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";

const Appointments = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());

  const todayAppointments = [
    { id: 1, time: "09:00", client: "João Silva", barber: "Carlos", service: "Corte + Barba", duration: "1h" },
    { id: 2, time: "10:30", client: "Pedro Santos", barber: "Ricardo", service: "Corte Tradicional", duration: "45min" },
    { id: 3, time: "11:00", client: "Lucas Oliveira", barber: "Carlos", service: "Barba Completa", duration: "30min" },
    { id: 4, time: "14:00", client: "André Costa", barber: "Bruno", service: "Corte + Sombrancelha", duration: "1h" },
    { id: 5, time: "15:30", client: "Rafael Lima", barber: "Ricardo", service: "Corte Degradê", duration: "45min" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agendamentos</h1>
          <p className="text-muted-foreground">Gerencie todos os agendamentos</p>
        </div>
        <Button className="bg-gradient-gold">
          <Plus className="w-4 h-4 mr-2" />
          Novo Agendamento
        </Button>
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
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Agendamentos de Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todayAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors border border-border"
                >
                  <div className="w-16 text-center">
                    <p className="text-lg font-bold">{appointment.time}</p>
                    <p className="text-xs text-muted-foreground">{appointment.duration}</p>
                  </div>
                  <div className="h-12 w-px bg-border" />
                  <div className="flex-1">
                    <p className="font-medium">{appointment.client}</p>
                    <p className="text-sm text-muted-foreground">{appointment.service}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{appointment.barber}</p>
                    <p className="text-xs text-muted-foreground">Barbeiro</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Detalhes
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Appointments;
