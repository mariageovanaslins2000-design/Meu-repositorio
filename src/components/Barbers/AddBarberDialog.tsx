import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

interface AddBarberDialogProps {
  onBarberAdded: () => void;
}

export function AddBarberDialog({ onBarberAdded }: AddBarberDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    specialty: "",
    phone: "",
    photo_url: "",
    commission_percent: "50",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get barbershop ID
      const { data: barbershop } = await supabase
        .from("barbershops")
        .select("id")
        .eq("owner_id", user?.id)
        .single();

      if (!barbershop) {
        toast.error("Barbearia não encontrada");
        return;
      }

      // Insert barber
      const { error } = await supabase.from("barbers").insert({
        barbershop_id: barbershop.id,
        name: formData.name,
        specialty: formData.specialty || null,
        phone: formData.phone || null,
        photo_url: formData.photo_url || null,
        commission_percent: parseFloat(formData.commission_percent),
        is_active: true,
      });

      if (error) throw error;

      toast.success("Barbeiro adicionado com sucesso!");
      setFormData({
        name: "",
        specialty: "",
        phone: "",
        photo_url: "",
        commission_percent: "50",
      });
      setOpen(false);
      onBarberAdded();
    } catch (error: any) {
      console.error("Error adding barber:", error);
      toast.error(error.message || "Erro ao adicionar barbeiro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-gold">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Barbeiro
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Barbeiro</DialogTitle>
          <DialogDescription>
            Preencha os dados do barbeiro para adicionar à sua equipe
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome Completo *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialty">Especialidade</Label>
            <Input
              id="specialty"
              placeholder="Ex: Cortes Clássicos, Degradê..."
              value={formData.specialty}
              onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              placeholder="(11) 98765-4321"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="photo_url">URL da Foto</Label>
            <Input
              id="photo_url"
              type="url"
              placeholder="https://..."
              value={formData.photo_url}
              onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="commission">Comissão (%)</Label>
            <Input
              id="commission"
              type="number"
              min="0"
              max="100"
              value={formData.commission_percent}
              onChange={(e) => setFormData({ ...formData, commission_percent: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 bg-gradient-gold" disabled={loading}>
              {loading ? "Salvando..." : "Adicionar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
