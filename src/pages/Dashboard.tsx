import { Calendar, DollarSign, Users, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/Dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Dashboard = () => {
  const stats = [
    {
      title: "Agendamentos Hoje",
      value: 12,
      icon: Calendar,
      trend: { value: "+8%", positive: true },
    },
    {
      title: "Receita do Mês",
      value: "R$ 18.500",
      icon: DollarSign,
      trend: { value: "+15%", positive: true },
    },
    {
      title: "Barbeiros Ativos",
      value: 4,
      icon: Users,
      trend: { value: "Estável", positive: true },
    },
    {
      title: "Taxa de Ocupação",
      value: "85%",
      icon: TrendingUp,
      trend: { value: "+5%", positive: true },
    },
  ];

  const recentAppointments = [
    { id: 1, client: "João Silva", barber: "Carlos", time: "09:00", service: "Corte + Barba" },
    { id: 2, client: "Pedro Santos", barber: "Ricardo", time: "10:30", service: "Corte Tradicional" },
    { id: 3, client: "Lucas Oliveira", barber: "Carlos", time: "11:00", service: "Barba Completa" },
    { id: 4, client: "André Costa", barber: "Bruno", time: "14:00", service: "Corte + Sombrancelha" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do seu negócio</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Recent Appointments */}
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle>Próximos Agendamentos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium">{appointment.client}</p>
                  <p className="text-sm text-muted-foreground">{appointment.service}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{appointment.time}</p>
                  <p className="text-sm text-muted-foreground">{appointment.barber}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
