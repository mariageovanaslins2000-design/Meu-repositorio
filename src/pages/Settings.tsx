import { Upload, Bell, User, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { ClientLinkGenerator } from "@/components/Clients/ClientLinkGenerator";

const Settings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSidebarLogo, setUploadingSidebarLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const sidebarLogoInputRef = useRef<HTMLInputElement>(null);
  const [clinic, setClinic] = useState({ 
    name: "", 
    phone: "", 
    address: "", 
    logo_url: "", 
    logo_sidebar_url: "",
    primary_color: "#D4AF37", 
    secondary_color: "#1A1A1A" 
  });
  
  useEffect(() => { loadClinic(); }, [user]);

  const loadClinic = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from("barbershops").select("*").eq("owner_id", user.id).single();
      if (error) throw error;
      if (data) setClinic({ 
        name: data.name || "", 
        phone: data.phone || "", 
        address: data.address || "", 
        logo_url: data.logo_url || "", 
        logo_sidebar_url: data.logo_sidebar_url || "",
        primary_color: data.primary_color || "#D4AF37", 
        secondary_color: data.secondary_color || "#1A1A1A" 
      });
    } catch { }
  };

  const uploadLogo = async (file: File, type: 'main' | 'sidebar') => {
    if (!user) return null;
    const { data: clinicData } = await supabase.from("barbershops").select("id").eq("owner_id", user.id).single();
    if (!clinicData) return null;
    
    try {
      const currentUrl = type === 'main' ? clinic.logo_url : clinic.logo_sidebar_url;
      if (currentUrl) {
        const oldPath = currentUrl.split("/").pop();
        if (oldPath) await supabase.storage.from("logos").remove([`${clinicData.id}/${oldPath}`]);
      }
      
      const fileExt = file.name.split(".").pop();
      const fileName = `${clinicData.id}/${type}-logo-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("logos").upload(fileName, file, { cacheControl: "3600", upsert: true });
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage.from("logos").getPublicUrl(fileName);
      return publicUrl;
    } catch {
      toast.error("Erro ao enviar logo");
      return null;
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setUploadingLogo(true);
    const url = await uploadLogo(file, 'main');
    if (url) {
      setClinic({ ...clinic, logo_url: url });
      toast.success("Logo principal enviada!");
    }
    setUploadingLogo(false);
  };

  const handleSidebarLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setUploadingSidebarLogo(true);
    const url = await uploadLogo(file, 'sidebar');
    if (url) {
      setClinic({ ...clinic, logo_sidebar_url: url });
      toast.success("Logo da sidebar enviada!");
    }
    setUploadingSidebarLogo(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("barbershops").update({ 
        name: clinic.name, 
        phone: clinic.phone, 
        address: clinic.address, 
        logo_url: clinic.logo_url, 
        logo_sidebar_url: clinic.logo_sidebar_url,
        primary_color: clinic.primary_color, 
        secondary_color: clinic.secondary_color 
      }).eq("owner_id", user.id);
      if (error) throw error;
      toast.success("Configurações salvas!");
      setTimeout(() => window.location.reload(), 1000);
    } catch { toast.error("Erro ao salvar"); } finally { setLoading(false); }
  };

  return (
    <div className="space-y-8">
      <div><h1 className="text-3xl font-bold">Configurações</h1><p className="text-muted-foreground">Personalize seu sistema</p></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-elegant">
          <CardHeader><CardTitle className="flex items-center gap-2"><User className="w-5 h-5" />Informações da Clínica</CardTitle><CardDescription>Dados principais do seu negócio</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Nome da Clínica</Label><Input value={clinic.name} onChange={(e) => setClinic({ ...clinic, name: e.target.value })} placeholder="Minha Clínica" /></div>
            <div><Label>Telefone</Label><Input value={clinic.phone} onChange={(e) => setClinic({ ...clinic, phone: e.target.value })} placeholder="(11) 98765-4321" /></div>
            <div><Label>Endereço</Label><Input value={clinic.address} onChange={(e) => setClinic({ ...clinic, address: e.target.value })} placeholder="Rua Example, 123" /></div>
            <Button className="w-full" onClick={handleSave} disabled={loading}>{loading ? "Salvando..." : "Salvar Alterações"}</Button>
          </CardContent>
        </Card>
        
        <Card className="shadow-elegant">
          <CardHeader><CardTitle className="flex items-center gap-2"><Image className="w-5 h-5" />Logos</CardTitle><CardDescription>Gerencie as logos do sistema</CardDescription></CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Logo Principal (Login/Cadastro)</Label>
              <p className="text-xs text-muted-foreground">Usada em fundos claros</p>
              <div className="flex items-center gap-4">
                {clinic.logo_url ? (
                  <div className="w-20 h-20 rounded-lg overflow-hidden border bg-background">
                    <img src={clinic.logo_url} alt="Logo Principal" className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-lg border border-dashed flex items-center justify-center bg-muted/50">
                    <Image className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  <Button type="button" variant="outline" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo} className="w-full">
                    <Upload className="w-4 h-4 mr-2" />{uploadingLogo ? "Enviando..." : "Enviar Logo"}
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="border-t pt-4 space-y-3">
              <Label>Logo da Sidebar (Menu Lateral)</Label>
              <p className="text-xs text-muted-foreground">Usada no fundo verde do menu</p>
              <div className="flex items-center gap-4">
                {clinic.logo_sidebar_url ? (
                  <div className="w-20 h-20 rounded-lg overflow-hidden border bg-sidebar">
                    <img src={clinic.logo_sidebar_url} alt="Logo Sidebar" className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-lg border border-dashed flex items-center justify-center bg-sidebar">
                    <Image className="w-8 h-8 text-sidebar-foreground/50" />
                  </div>
                )}
                <div className="flex-1">
                  <input ref={sidebarLogoInputRef} type="file" accept="image/*" onChange={handleSidebarLogoUpload} className="hidden" />
                  <Button type="button" variant="outline" onClick={() => sidebarLogoInputRef.current?.click()} disabled={uploadingSidebarLogo} className="w-full">
                    <Upload className="w-4 h-4 mr-2" />{uploadingSidebarLogo ? "Enviando..." : "Enviar Logo"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-elegant">
          <CardHeader><CardTitle className="flex items-center gap-2"><Upload className="w-5 h-5" />Cores e Identidade</CardTitle><CardDescription>Personalize a aparência</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label>Cores do Tema</Label>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label className="text-xs">Cor Primária</Label>
                  <div className="flex gap-2 mt-1">
                    <Input type="color" value={clinic.primary_color} onChange={(e) => setClinic({ ...clinic, primary_color: e.target.value })} className="w-12 h-10 p-1 cursor-pointer" />
                    <Input value={clinic.primary_color} onChange={(e) => setClinic({ ...clinic, primary_color: e.target.value })} />
                  </div>
                </div>
                <div className="flex-1">
                  <Label className="text-xs">Cor Secundária</Label>
                  <div className="flex gap-2 mt-1">
                    <Input type="color" value={clinic.secondary_color} onChange={(e) => setClinic({ ...clinic, secondary_color: e.target.value })} className="w-12 h-10 p-1 cursor-pointer" />
                    <Input value={clinic.secondary_color} onChange={(e) => setClinic({ ...clinic, secondary_color: e.target.value })} />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <ClientLinkGenerator />
        
        <Card className="shadow-elegant">
          <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5" />Notificações</CardTitle><CardDescription>Configure alertas</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50"><div className="flex-1"><p className="font-medium">Novos Agendamentos</p><p className="text-sm text-muted-foreground">Receba alertas</p></div><Switch defaultChecked /></div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50"><div className="flex-1"><p className="font-medium">Lembretes de Cliente</p><p className="text-sm text-muted-foreground">Enviar lembretes automáticos</p></div><Switch defaultChecked /></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
