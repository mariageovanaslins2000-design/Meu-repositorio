import { Calendar, DollarSign, Users, Building2, MessageSquare } from "lucide-react";
import { StatCard } from "@/components/Dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";

type DashboardStats = { todayAppointments: number; monthRevenue: number; activeProfessionals: number; activeClients: number; };
type RecentAppointment = { id: string; client_name: string; professional_name: string; service_name: string; time: string; status: string; };

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({ todayAppointments: 0, monthRevenue: 0, activeProfessionals: 0, activeClients: 0 });
  const [recentAppointments, setRecentAppointments] = useState<RecentAppointment[]>([]);

  useEffect(() => { loadDashboardData(); }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data: clinic } = await supabase.from("barbershops").select("id").eq("owner_id", user.id).single();
      if (!clinic) return;
      const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);
      const { count: todayCount } = await supabase.from("appointments").select("*", { count: "exact", head: true }).eq("barbershop_id", clinic.id).gte("appointment_date", startOfDay.toISOString()).lte("appointment_date", endOfDay.toISOString());
      const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
      const { data: monthFinancials } = await supabase.from("financial_records").select("valor_total").eq("barbershop_id", clinic.id).eq("status", "EFETIVADO").gte("created_at", startOfMonth.toISOString());
      const monthRevenue = monthFinancials?.reduce((sum, record) => sum + Number(record.valor_total), 0) || 0;
      const { count: professionalsCount } = await supabase.from("barbers").select("*", { count: "exact", head: true }).eq("barbershop_id", clinic.id).eq("is_active", true);
      const { count: clientsCount } = await supabase.from("clients").select("*", { count: "exact", head: true }).eq("barbershop_id", clinic.id).gte("total_visits", 1);
      setStats({ todayAppointments: todayCount || 0, monthRevenue, activeProfessionals: professionalsCount || 0, activeClients: clientsCount || 0 });
      const { data: appointmentsData } = await supabase.from("appointments").select("id, appointment_date, status, client_id, barber_id, service_id").eq("barbershop_id", clinic.id).gte("appointment_date", new Date().toISOString()).order("appointment_date", { ascending: true }).limit(5);
      if (appointmentsData && appointmentsData.length > 0) {
        const barberIds = [...new Set(appointmentsData.map(a => a.barber_id))];
        const clientIds = [...new Set(appointmentsData.map(a => a.client_id))];
        const serviceIds = [...new Set(appointmentsData.map(a => a.service_id))];
        const [{ data: professionalsData }, { data: clientsData }, { data: servicesData }] = await Promise.all([supabase.from("barbers").select("id, name").in("id", barberIds), supabase.from("profiles").select("id, full_name").in("id", clientIds), supabase.from("services").select("id, name").in("id", serviceIds)]);
        const formatted = appointmentsData.map(apt => ({ id: apt.id, client_name: clientsData?.find(c => c.id === apt.client_id)?.full_name || "N/A", professional_name: professionalsData?.find(b => b.id === apt.barber_id)?.name || "N/A", service_name: servicesData?.find(s => s.id === apt.service_id)?.name || "N/A", time: new Date(apt.appointment_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), status: apt.status }));
        setRecentAppointments(formatted);
      }
    } catch { } finally { setLoading(false); }
  };

  const statsCards = [
    { title: "Agendamentos Hoje", value: loading ? "..." : stats.todayAppointments, icon: Calendar, trend: { value: "Hoje", positive: true } },
    { title: "Receita do Mês", value: loading ? "..." : `R$ ${stats.monthRevenue.toFixed(2)}`, icon: DollarSign, trend: { value: "Mês atual", positive: true } },
    { title: "Profissionais Ativos", value: loading ? "..." : stats.activeProfessionals, icon: Building2, trend: { value: "Ativos", positive: true } },
    { title: "Clientes Ativos", value: loading ? "..." : stats.activeClients, icon: Users, trend: { value: "Total", positive: true } },
  ];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = { pending: { variant: "secondary", label: "Pendente" }, confirmed: { variant: "default", label: "Confirmado" }, completed: { variant: "outline", label: "Concluído" }, cancelled: { variant: "destructive", label: "Cancelado" } };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-8">
      <div><h1 className="text-3xl font-bold">Dashboard</h1><p className="text-muted-foreground">Visão geral do seu negócio</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">{statsCards.map((stat) => <StatCard key={stat.title} {...stat} />)}</div>
      <Card className="shadow-elegant">
        <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-green-600" />WhatsApp Bot</CardTitle></CardHeader>
        <CardContent><div className="space-y-3"><div className="flex items-center justify-between"><span className="text-sm font-medium">Status:</span><Badge className="bg-green-600 hover:bg-green-700">✅ Conectado</Badge></div></div></CardContent>
      </Card>
      <Card className="shadow-elegant">
        <CardHeader><CardTitle>Próximos Agendamentos</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="text-center py-8 text-muted-foreground">Carregando...</div> : recentAppointments.length === 0 ? <div className="text-center py-8 text-muted-foreground">Nenhum agendamento próximo</div> : (
            <div className="space-y-4">{recentAppointments.map((apt) => (
              <div key={apt.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors border border-border">
                <div className="flex-1 min-w-0"><p className="font-medium truncate">{apt.client_name}</p><p className="text-sm text-muted-foreground truncate">{apt.service_name}</p></div>
                <div className="flex items-center gap-4 justify-between sm:justify-end"><div className="text-left sm:text-right"><p className="font-medium">{apt.time}</p><p className="text-sm text-muted-foreground">{apt.professional_name}</p></div>{getStatusBadge(apt.status)}</div>
              </div>
            ))}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
