import { Upload, Palette, Bell, User, Link2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

const Settings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [barbershop, setBarbershop] = useState({
    name: "",
    phone: "",
    address: "",
    logo_url: "",
    primary_color: "#D4AF37",
    secondary_color: "#1A1A1A",
  });
  const [barbershopId, setBarbershopId] = useState<string | null>(null);
  const [clientSignupLink, setClientSignupLink] = useState<string>("");

  useEffect(() => {
    loadBarbershop();
  }, [user]);

  useEffect(() => {
    if (barbershopId) {
      const link = `${window.location.origin}/cadastro-cliente?idBarbearia=${barbershopId}`;
      setClientSignupLink(link);
    }
  }, [barbershopId]);

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
        setBarbershopId(data.id);
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

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !barbershopId) return;

    try {
      setUploading(true);

      // Delete old logo if exists
      if (barbershop.logo_url) {
        const oldPath = barbershop.logo_url.split("/").pop();
        if (oldPath) {
          await supabase.storage.from("logos").remove([`${barbershopId}/${oldPath}`]);
        }
      }

      // Upload new logo
      const fileExt = file.name.split(".").pop();
      const fileName = `${barbershopId}/logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("logos")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("logos")
        .getPublicUrl(fileName);

      setBarbershop({ ...barbershop, logo_url: publicUrl });
      toast.success("Logo enviada com sucesso!");
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("Erro ao enviar logo");
    } finally {
      setUploading(false);
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
              <Label>Logo da Barbearia</Label>
              <div className="mt-2 space-y-3">
                {barbershop.logo_url && (
                  <div className="relative w-32 h-32 rounded-lg overflow-hidden border">
                    <img
                      src={barbershop.logo_url}
                      alt="Logo"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? "Enviando..." : "Escolher Arquivo"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Formatos aceitos: JPG, PNG, SVG (máx. 5MB)
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

        {/* Client Signup Link */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5" />
              Link de Cadastro para Clientes
            </CardTitle>
            <CardDescription>
              Compartilhe este link para que novos clientes possam se cadastrar na sua barbearia.
              <br />
              <strong className="text-primary">Importante:</strong> Este link é exclusivo para <strong>novos clientes</strong>. 
              Se você já está logado como proprietário, precisará fazer logout para testar o cadastro como cliente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 break-all">
              <p className="text-sm font-mono">{clientSignupLink || "Carregando..."}</p>
            </div>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(clientSignupLink);
                toast.success("Link copiado para a área de transferência!");
              }}
              className="w-full"
              disabled={!clientSignupLink}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copiar Link
            </Button>
            <p className="text-xs text-muted-foreground">
              Clientes que se cadastrarem através deste link serão automaticamente vinculados à sua barbearia.
            </p>
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
