import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Clock, Store, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function PublicBarbershopSelection() {
  const navigate = useNavigate();
  const [barbershops, setBarbershops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBarbershops();
  }, []);

  const loadBarbershops = async () => {
    try {
      const { data, error } = await supabase
        .from("barbershops")
        .select("*")
        .order("name");

      if (error) throw error;
      setBarbershops(data || []);
    } catch (error) {
      console.error("Error loading barbershops:", error);
      toast.error("Erro ao carregar barbearias");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBarbershop = (barbershopId: string) => {
    navigate(`/cadastro-cliente?idBarbearia=${barbershopId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-8 py-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/login-cliente")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 text-center">
            <h1 className="text-4xl font-bold">Criar Conta</h1>
            <p className="text-xl text-muted-foreground mt-2">
              Selecione uma barbearia para se cadastrar
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {barbershops.map((barbershop) => (
            <Card key={barbershop.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Store className="h-5 w-5 text-primary" />
                  <CardTitle className="text-xl">{barbershop.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {barbershop.address && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{barbershop.address}</span>
                  </div>
                )}
                
                {barbershop.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{barbershop.phone}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {barbershop.opening_time?.slice(0, 5)} - {barbershop.closing_time?.slice(0, 5)}
                  </span>
                </div>

                <Button
                  className="w-full"
                  onClick={() => handleSelectBarbershop(barbershop.id)}
                >
                  Cadastrar nesta barbearia
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {barbershops.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Nenhuma barbearia disponível no momento.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
