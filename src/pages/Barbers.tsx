import { useState, useEffect } from "react";
import { Phone, User, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AddBarberDialog } from "@/components/Barbers/AddBarberDialog";
import { EditBarberDialog } from "@/components/Barbers/EditBarberDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";

const Barbers = () => {
  const { user } = useAuth();
  const [barbers, setBarbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [barberToDelete, setBarberToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteBarber = async () => {
    if (!barberToDelete) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("barbers")
        .delete()
        .eq("id", barberToDelete.id);

      if (error) {
        if (error.code === "23503") {
          toast({
            title: "Não é possível excluir",
            description: "Este barbeiro está vinculado a agendamentos. Considere inativá-lo ao invés de excluir.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Barbeiro excluído",
          description: `O barbeiro "${barberToDelete.name}" foi excluído com sucesso.`,
        });
        loadBarbers();
      }
    } catch (error) {
      console.error("Error deleting barber:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o barbeiro.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setBarberToDelete(null);
    }
  };

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
                      <div className="flex items-center gap-2">
                        <EditBarberDialog barber={barber} onBarberUpdated={loadBarbers} />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setBarberToDelete(barber)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!barberToDelete} onOpenChange={() => setBarberToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o barbeiro "{barberToDelete?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBarber}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Barbers;
