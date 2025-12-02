import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "lucide-react";

export default function ClientBarbers() {
  const [barbers, setBarbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBarbers();
  }, []);

  const loadBarbers = async () => {
    try {
      const { data, error } = await supabase
        .from("barbers")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setBarbers(data || []);
    } catch (error) {
      console.error("Error loading barbers:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Nossos Barbeiros</h1>
        <p className="text-muted-foreground">
          Conheça nossa equipe de profissionais
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {barbers.map((barber) => (
          <Card key={barber.id} className="group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
            <CardHeader className="text-center pb-2">
              <div className="relative w-32 h-32 mx-auto mb-4">
                <div className="absolute inset-0 bg-gradient-gold rounded-full animate-pulse opacity-20"></div>
                <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-primary/20 shadow-xl">
                  {barber.photo_url ? (
                    <img 
                      src={barber.photo_url} 
                      alt={barber.name} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-gold flex items-center justify-center">
                      <User className="h-16 w-16 text-sidebar-primary-foreground" />
                    </div>
                  )}
                </div>
              </div>
              <CardTitle className="text-xl">{barber.name}</CardTitle>
              {barber.specialty && (
                <CardDescription className="text-base">{barber.specialty}</CardDescription>
              )}
            </CardHeader>
            {barber.phone && (
              <CardContent className="text-center pt-2">
                <p className="text-sm text-muted-foreground">{barber.phone}</p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
