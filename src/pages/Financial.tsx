import { DollarSign, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Financial = () => {
  const summary = [
    { label: "Receita Total", value: "R$ 18.500", icon: DollarSign, trend: "+15%" },
    { label: "Comissões", value: "R$ 7.400", icon: Wallet, trend: "+12%" },
    { label: "Lucro Líquido", value: "R$ 11.100", icon: TrendingUp, trend: "+18%" },
    { label: "Ticket Médio", value: "R$ 85", icon: TrendingUp, trend: "+8%" },
  ];

  const transactions = [
    { id: 1, date: "2024-01-15", client: "João Silva", service: "Corte + Barba", barber: "Carlos", value: 120, commission: 48 },
    { id: 2, date: "2024-01-15", client: "Pedro Santos", service: "Corte Tradicional", barber: "Ricardo", value: 75, commission: 30 },
    { id: 3, date: "2024-01-14", client: "Lucas Oliveira", service: "Barba Completa", barber: "Carlos", value: 60, commission: 24 },
    { id: 4, date: "2024-01-14", client: "André Costa", service: "Corte + Sombrancelha", barber: "Bruno", value: 95, commission: 38 },
    { id: 5, date: "2024-01-13", client: "Rafael Lima", service: "Corte Degradê", barber: "Ricardo", value: 85, commission: 34 },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Financeiro</h1>
        <p className="text-muted-foreground">Acompanhe receitas, comissões e lucros</p>
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
                  <p className="text-sm text-green-600 mt-2">↑ {item.trend}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-gradient-gold flex items-center justify-center">
                  <item.icon className="w-6 h-6 text-secondary-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Transactions Table */}
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle>Transações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Data</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Cliente</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Serviço</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Barbeiro</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Valor</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Comissão</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4">{new Date(transaction.date).toLocaleDateString('pt-BR')}</td>
                    <td className="py-3 px-4 font-medium">{transaction.client}</td>
                    <td className="py-3 px-4">{transaction.service}</td>
                    <td className="py-3 px-4">{transaction.barber}</td>
                    <td className="py-3 px-4 text-right font-medium">R$ {transaction.value}</td>
                    <td className="py-3 px-4 text-right text-accent">R$ {transaction.commission}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Financial;
