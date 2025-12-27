import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, Wallet, Users, CalendarIcon, X, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSubscription } from "@/hooks/useSubscription";
import { UpgradePrompt } from "@/components/Subscription/UpgradePrompt";

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
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const { user } = useAuth();
  const { plan, hasFeature, loading: subscriptionLoading } = useSubscription();
  const canUseDateFilter = hasFeature('date_filter');

  useEffect(() => {
    loadFinancialData();
  }, [user, startDate, endDate]);

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

      // Get all financial records with date filter
      let query = supabase
        .from("financial_records")
        .select(`
          id,
          appointment_id,
          barber_id,
          valor_total,
          comissao_percent,
          comissao_valor,
          valor_liquido_barbearia,
          status,
          created_at
        `)
        .eq("barbershop_id", barbershop.id)
        .eq("status", "EFETIVADO");

      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query = query.gte("created_at", start.toISOString());
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query = query.lte("created_at", end.toISOString());
      }

      const { data: financialRecords } = await query.order("created_at", { ascending: false });

      if (!financialRecords || financialRecords.length === 0) {
        setLoading(false);
        return;
      }

      // Get barbers
      const { data: barbers } = await supabase
        .from("barbers")
        .select("id, name, commission_percent")
        .eq("barbershop_id", barbershop.id)
        .eq("is_active", true);

      if (!barbers) return;

      // Get appointment details for transactions
      const appointmentIds = financialRecords.map(r => r.appointment_id);
      const { data: appointments } = await supabase
        .from("appointments")
        .select(`
          id,
          appointment_date,
          client_id,
          service_id
        `)
        .in("id", appointmentIds);

      // Get clients and services for display
      const clientIds = [...new Set(appointments?.map(a => a.client_id) || [])];
      const serviceIds = [...new Set(appointments?.map(a => a.service_id) || [])];

      const [{ data: profiles }, { data: services }] = await Promise.all([
        supabase.from("profiles").select("id, full_name").in("id", clientIds),
        supabase.from("services").select("id, name").in("id", serviceIds),
      ]);

      // Calculate financial data for each barber
      const barberFinancialsData: BarberFinancial[] = barbers.map((barber) => {
        const barberRecords = financialRecords.filter(
          (record) => record.barber_id === barber.id
        );

        const totalRevenue = barberRecords.reduce(
          (sum, record) => sum + Number(record.valor_total),
          0
        );

        const totalCommission = barberRecords.reduce(
          (sum, record) => sum + Number(record.comissao_valor),
          0
        );

        const barbershopProfit = barberRecords.reduce(
          (sum, record) => sum + Number(record.valor_liquido_barbearia),
          0
        );

        return {
          id: barber.id,
          name: barber.name,
          commission_percent: Number(barber.commission_percent) || 0,
          totalServices: barberRecords.length,
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
      const totalServicesCount = barberFinancialsData.reduce((sum, b) => sum + b.totalServices, 0);

      setTotalRevenue(revenue);
      setTotalCommissions(commissions);
      setTotalProfit(profit);
      setTotalServices(totalServicesCount);

      // Format transactions (last 10)
      const transactionsData: Transaction[] = financialRecords.slice(0, 10).map((record) => {
        const appointment = appointments?.find(a => a.id === record.appointment_id);
        const client = profiles?.find(p => p.id === appointment?.client_id);
        const service = services?.find(s => s.id === appointment?.service_id);
        const barber = barbers.find(b => b.id === record.barber_id);

        return {
          id: record.id,
          date: appointment?.appointment_date || record.created_at,
          client: client?.full_name || "N/A",
          service: service?.name || "N/A",
          barber: barber?.name || "N/A",
          value: Number(record.valor_total),
          commission: Number(record.comissao_valor),
        };
      });

      setTransactions(transactionsData);

      // Calculate pending revenue (appointments not yet completed - only "pending" status)
      const { data: pendingAppointments } = await supabase
        .from("appointments")
        .select(`
          service_id
        `)
        .eq("barbershop_id", barbershop.id)
        .eq("status", "pending");

      if (pendingAppointments && pendingAppointments.length > 0) {
        const pendingServiceIds = [...new Set(pendingAppointments.map(a => a.service_id))];
        const { data: pendingServices } = await supabase
          .from("services")
          .select("id, price")
          .in("id", pendingServiceIds);

        const pendingTotal = pendingAppointments.reduce((sum, apt) => {
          const service = pendingServices?.find(s => s.id === apt.service_id);
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

  const handleClearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Financeiro</h1>
        <p className="text-muted-foreground">Acompanhe receitas, comissões e lucros por barbeiro</p>
      </div>

      {/* Date Filter */}
      {canUseDateFilter ? (
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
                  onClick={handleClearFilters}
                  className="h-9"
                >
                  <X className="mr-2 h-4 w-4" />
                  Limpar filtros
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-elegant">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Lock className="w-4 h-4" />
                <span className="text-sm">Filtro por período disponível no plano Premium</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowUpgradePrompt(true)}>
                Ver Planos
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <UpgradePrompt 
        open={showUpgradePrompt} 
        onOpenChange={setShowUpgradePrompt}
        feature="date_filter"
        currentPlan={plan?.name}
      />

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
                <div className="text-3xl">
                  <item.icon className="w-8 h-8 text-primary" />
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
