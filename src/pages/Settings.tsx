import { Upload, Palette, Bell, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

const Settings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [barbershop, setBarbershop] = useState({
    name: "",
    phone: "",
    address: "",
    logo_url: "",
    primary_color: "#D4AF37",
    secondary_color: "#1A1A1A",
  });

  useEffect(() => {
    loadBarbershop();
  }, [user]);

  const loadBarbershop = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("barbershops")
        .select("*")
        .eq("owner_id", user.id)
        .single();

      if (error) throw error;

      if (data) {
        setBarbershop({
          name: data.name || "",
          phone: data.phone || "",
          address: data.address || "",
          logo_url: data.logo_url || "",
          primary_color: data.primary_color || "#D4AF37",
          secondary_color: data.secondary_color || "#1A1A1A",
        });
      }
    } catch (error) {
      console.error("Erro ao carregar barbearia:", error);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("barbershops")
        .update({
          name: barbershop.name,
          phone: barbershop.phone,
          address: barbershop.address,
          logo_url: barbershop.logo_url,
          primary_color: barbershop.primary_color,
          secondary_color: barbershop.secondary_color,
        })
        .eq("owner_id", user.id);

      if (error) throw error;

      toast.success("Configurações salvas com sucesso!");
      
      // Reload page to apply color changes
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Personalize seu sistema</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Business Info */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Informações da Barbearia
            </CardTitle>
            <CardDescription>Dados principais do seu negócio</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nome da Barbearia</Label>
              <Input
                value={barbershop.name}
                onChange={(e) => setBarbershop({ ...barbershop, name: e.target.value })}
                placeholder="Barbearia Demo"
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                value={barbershop.phone}
                onChange={(e) => setBarbershop({ ...barbershop, phone: e.target.value })}
                placeholder="(11) 98765-4321"
              />
            </div>
            <div>
              <Label>Endereço</Label>
              <Input
                value={barbershop.address}
                onChange={(e) => setBarbershop({ ...barbershop, address: e.target.value })}
                placeholder="Rua Example, 123"
              />
            </div>
            <Button className="w-full" onClick={handleSave} disabled={loading}>
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </CardContent>
        </Card>

        {/* Branding */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Logo e Identidade
            </CardTitle>
            <CardDescription>Personalize a aparência do seu sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Logo URL</Label>
              <Input
                value={barbershop.logo_url}
                onChange={(e) => setBarbershop({ ...barbershop, logo_url: e.target.value })}
                placeholder="https://exemplo.com/logo.png"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Cole o link da sua logo (hospedado em Imgur, Cloudinary, etc)
              </p>
            </div>
            <div className="space-y-3">
              <Label>Cores do Tema</Label>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label className="text-xs">Cor Primária</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="color"
                      value={barbershop.primary_color}
                      onChange={(e) => setBarbershop({ ...barbershop, primary_color: e.target.value })}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={barbershop.primary_color}
                      onChange={(e) => setBarbershop({ ...barbershop, primary_color: e.target.value })}
                      placeholder="#D4AF37"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <Label className="text-xs">Cor Secundária</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="color"
                      value={barbershop.secondary_color}
                      onChange={(e) => setBarbershop({ ...barbershop, secondary_color: e.target.value })}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={barbershop.secondary_color}
                      onChange={(e) => setBarbershop({ ...barbershop, secondary_color: e.target.value })}
                      placeholder="#1A1A1A"
                    />
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                As cores serão aplicadas após salvar e recarregar a página
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notificações
            </CardTitle>
            <CardDescription>Configure alertas e lembretes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex-1">
                <p className="font-medium">Novos Agendamentos</p>
                <p className="text-sm text-muted-foreground">Receba alertas de novos agendamentos</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex-1">
                <p className="font-medium">Lembretes de Cliente</p>
                <p className="text-sm text-muted-foreground">Enviar lembretes automáticos</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex-1">
                <p className="font-medium">Relatórios Diários</p>
                <p className="text-sm text-muted-foreground">Resumo diário por email</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
