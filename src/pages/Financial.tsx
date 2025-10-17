import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, Wallet, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type BarberFinancial = {
  id: string;
  name: string;
  commission_percent: number;
  totalServices: number;
  totalRevenue: number;
  totalCommission: number;
  barbershopProfit: number;
};

type Transaction = {
  id: string;
  date: string;
  client: string;
  service: string;
  barber: string;
  value: number;
  commission: number;
};

const Financial = () => {
  const [loading, setLoading] = useState(true);
  const [barberFinancials, setBarberFinancials] = useState<BarberFinancial[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalCommissions, setTotalCommissions] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [totalServices, setTotalServices] = useState(0);
  const [pendingRevenue, setPendingRevenue] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    loadFinancialData();
  }, [user]);

  const loadFinancialData = async () => {
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

      // Get all barbers
      const { data: barbers } = await supabase
        .from("barbers")
        .select("id, name, commission_percent")
        .eq("barbershop_id", barbershop.id)
        .eq("is_active", true);

      if (!barbers) return;

      // Get completed appointments
      const { data: completedAppointments } = await supabase
        .from("appointments")
        .select(`
          id,
          appointment_date,
          barber_id,
          client_id,
          service_id
        `)
        .eq("barbershop_id", barbershop.id)
        .eq("status", "completed");

      // Get pending appointments for pending revenue calculation
      const { data: pendingAppointments } = await supabase
        .from("appointments")
        .select(`
          service_id
        `)
        .eq("barbershop_id", barbershop.id)
        .in("status", ["pending", "confirmed"]);

      // Fetch related data if there are appointments
      let enrichedAppointments: any[] = [];
      if (completedAppointments && completedAppointments.length > 0) {
        const barberIds = [...new Set(completedAppointments.map(a => a.barber_id))];
        const clientIds = [...new Set(completedAppointments.map(a => a.client_id))];
        const serviceIds = [...new Set(completedAppointments.map(a => a.service_id))];

        const [{ data: barbersData }, { data: clientsData }, { data: servicesData }] = await Promise.all([
          supabase.from("barbers").select("id, name").in("id", barberIds),
          supabase.from("profiles").select("id, full_name").in("id", clientIds),
          supabase.from("services").select("id, name, price").in("id", serviceIds),
        ]);

        enrichedAppointments = completedAppointments.map(apt => ({
          ...apt,
          barber: { name: barbersData?.find(b => b.id === apt.barber_id)?.name || "N/A" },
          client: { full_name: clientsData?.find(c => c.id === apt.client_id)?.full_name || "N/A" },
          service: servicesData?.find(s => s.id === apt.service_id) || { name: "N/A", price: 0 }
        }));
      }

      // Calculate financial data for each barber
      const barberFinancialsData: BarberFinancial[] = barbers.map((barber) => {
        const barberAppointments = enrichedAppointments.filter(
          (apt) => apt.barber_id === barber.id
        );

        const totalRevenue = barberAppointments.reduce(
          (sum, apt) => sum + Number(apt.service.price),
          0
        );

        const commissionPercent = Number(barber.commission_percent) || 0;
        const totalCommission = (totalRevenue * commissionPercent) / 100;
        const barbershopProfit = totalRevenue - totalCommission;

        return {
          id: barber.id,
          name: barber.name,
          commission_percent: commissionPercent,
          totalServices: barberAppointments.length,
          totalRevenue,
          totalCommission,
          barbershopProfit,
        };
      });

      setBarberFinancials(barberFinancialsData);

      // Calculate totals
      const revenue = barberFinancialsData.reduce((sum, b) => sum + b.totalRevenue, 0);
      const commissions = barberFinancialsData.reduce((sum, b) => sum + b.totalCommission, 0);
      const profit = barberFinancialsData.reduce((sum, b) => sum + b.barbershopProfit, 0);
      const services = barberFinancialsData.reduce((sum, b) => sum + b.totalServices, 0);

      setTotalRevenue(revenue);
      setTotalCommissions(commissions);
      setTotalProfit(profit);
      setTotalServices(services);

      // Format transactions
      const transactionsData: Transaction[] = enrichedAppointments.map((apt) => ({
        id: apt.id,
        date: apt.appointment_date,
        client: apt.client.full_name,
        service: apt.service.name,
        barber: apt.barber.name,
        value: Number(apt.service.price),
        commission: (Number(apt.service.price) * 
          (barbers.find(b => b.id === apt.barber_id)?.commission_percent || 0)) / 100,
      }));

      setTransactions(transactionsData.slice(0, 10)); // Show last 10

      // Calculate pending revenue
      if (pendingAppointments && pendingAppointments.length > 0) {
        const serviceIds = [...new Set(pendingAppointments.map(a => a.service_id))];
        const { data: servicesData } = await supabase
          .from("services")
          .select("id, price")
          .in("id", serviceIds);

        const pendingTotal = pendingAppointments.reduce((sum, apt) => {
          const service = servicesData?.find(s => s.id === apt.service_id);
          return sum + (service?.price || 0);
        }, 0);

        setPendingRevenue(pendingTotal);
      }

    } catch (error) {
      console.error("Error loading financial data:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados financeiros",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const summary = [
    { 
      label: "Receita Concluída", 
      value: `R$ ${totalRevenue.toFixed(2)}`, 
      icon: DollarSign,
      description: "Serviços confirmados"
    },
    { 
      label: "Receita Pendente", 
      value: `R$ ${pendingRevenue.toFixed(2)}`, 
      icon: DollarSign,
      description: "Aguardando confirmação"
    },
    { 
      label: "Comissões", 
      value: `R$ ${totalCommissions.toFixed(2)}`, 
      icon: Wallet,
      description: "Total de comissões"
    },
    { 
      label: "Lucro Líquido", 
      value: `R$ ${totalProfit.toFixed(2)}`, 
      icon: TrendingUp,
      description: "Receita - comissões"
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Carregando dados financeiros...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Financeiro</h1>
        <p className="text-muted-foreground">Acompanhe receitas, comissões e lucros por barbeiro</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {summary.map((item) => (
          <Card key={item.label} className="shadow-elegant">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">{item.label}</p>
                  <p className="text-2xl font-bold">{item.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-gradient-gold flex items-center justify-center">
                  <item.icon className="w-6 h-6 text-secondary-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs for General and By Barber */}
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="by-barber">Por Barbeiro</TabsTrigger>
        </TabsList>

        {/* General Financial Tab */}
        <TabsContent value="general" className="space-y-4">
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle>Transações Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Barbeiro</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Comissão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Nenhuma transação encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          {new Date(transaction.date).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="font-medium">{transaction.client}</TableCell>
                        <TableCell>{transaction.service}</TableCell>
                        <TableCell>{transaction.barber}</TableCell>
                        <TableCell className="text-right font-medium">
                          R$ {transaction.value.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-accent">
                          R$ {transaction.commission.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Barber Financial Tab */}
        <TabsContent value="by-barber" className="space-y-4">
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle>Desempenho por Barbeiro</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Barbeiro</TableHead>
                    <TableHead className="text-center">Serviços Realizados</TableHead>
                    <TableHead className="text-right">Total Faturado</TableHead>
                    <TableHead className="text-center">Comissão (%)</TableHead>
                    <TableHead className="text-right">Comissão R$</TableHead>
                    <TableHead className="text-right">Lucro Barbearia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {barberFinancials.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Nenhum dado encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    barberFinancials.map((barber) => (
                      <TableRow key={barber.id}>
                        <TableCell className="font-medium">{barber.name}</TableCell>
                        <TableCell className="text-center">{barber.totalServices}</TableCell>
                        <TableCell className="text-right font-medium">
                          R$ {barber.totalRevenue.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                          {barber.commission_percent}%
                        </TableCell>
                        <TableCell className="text-right text-accent">
                          R$ {barber.totalCommission.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          R$ {barber.barbershopProfit.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Financial;
