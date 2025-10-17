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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {barbers.map((barber) => (
          <Card key={barber.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center text-4xl font-bold">
                {barber.photo_url ? (
                  <img src={barber.photo_url} alt={barber.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <User className="h-12 w-12 text-muted-foreground" />
                )}
              </div>
              <CardTitle>{barber.name}</CardTitle>
              {barber.specialty && (
                <CardDescription>{barber.specialty}</CardDescription>
              )}
            </CardHeader>
            {barber.phone && (
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground">{barber.phone}</p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
