import { useState, useEffect } from "react";
import { Mail, Phone, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AddBarberDialog } from "@/components/Barbers/AddBarberDialog";
import { EditBarberDialog } from "@/components/Barbers/EditBarberDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const Barbers = () => {
  const { user } = useAuth();
  const [barbers, setBarbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBarbers = async () => {
    try {
      const { data: barbershop } = await supabase
        .from("barbershops")
        .select("id")
        .eq("owner_id", user?.id)
        .single();

      if (!barbershop) return;

      const { data, error } = await supabase
        .from("barbers")
        .select("*")
        .eq("barbershop_id", barbershop.id)
        .order("name");

      if (error) throw error;
      setBarbers(data || []);
    } catch (error) {
      console.error("Error loading barbers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadBarbers();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Barbeiros</h1>
          <p className="text-muted-foreground">Gerencie sua equipe de profissionais</p>
        </div>
        <AddBarberDialog onBarberAdded={loadBarbers} />
      </div>

      {/* Barbers Grid */}
      {barbers.length === 0 ? (
        <Card className="p-12 text-center">
          <User className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">Nenhum barbeiro cadastrado</h3>
          <p className="text-muted-foreground mb-4">
            Adicione barbeiros à sua equipe para começar
          </p>
          <AddBarberDialog onBarberAdded={loadBarbers} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {barbers.map((barber) => (
            <Card key={barber.id} className="shadow-elegant hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <Avatar className="w-20 h-20 sm:w-16 sm:h-16 mx-auto sm:mx-0">
                    {barber.photo_url && <AvatarImage src={barber.photo_url} alt={barber.name} />}
                    <AvatarFallback className="bg-gradient-gold text-lg font-bold">
                      {barber.name.split(' ').map((n: string) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                      <h3 className="text-xl font-bold">{barber.name}</h3>
                      <EditBarberDialog barber={barber} onBarberUpdated={loadBarbers} />
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      {barber.specialty || "Barbeiro"}
                    </p>
                    
                    {barber.phone && (
                      <div className="flex items-center justify-center sm:justify-start gap-2 text-sm mb-4">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{barber.phone}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-center sm:justify-start gap-6 pt-4 border-t">
                      <div>
                        <p className="text-sm text-muted-foreground">Comissão</p>
                        <p className="text-2xl font-bold">{barber.commission_percent}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <p className="text-sm font-semibold text-green-600">
                          {barber.is_active ? "Ativo" : "Inativo"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Barbers;
