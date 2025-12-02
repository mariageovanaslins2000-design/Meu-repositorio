import { Upload, Bell, User } from "lucide-react";
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
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [clinic, setClinic] = useState({ name: "", phone: "", address: "", logo_url: "", primary_color: "#D4AF37", secondary_color: "#1A1A1A" });
  
  useEffect(() => { loadClinic(); }, [user]);

  const loadClinic = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from("barbershops").select("*").eq("owner_id", user.id).single();
      if (error) throw error;
      if (data) setClinic({ name: data.name || "", phone: data.phone || "", address: data.address || "", logo_url: data.logo_url || "", primary_color: data.primary_color || "#D4AF37", secondary_color: data.secondary_color || "#1A1A1A" });
    } catch { }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    const { data: clinicData } = await supabase.from("barbershops").select("id").eq("owner_id", user.id).single();
    if (!clinicData) return;
    try {
      setUploading(true);
      if (clinic.logo_url) { const oldPath = clinic.logo_url.split("/").pop(); if (oldPath) await supabase.storage.from("logos").remove([`${clinicData.id}/${oldPath}`]); }
      const fileExt = file.name.split(".").pop();
      const fileName = `${clinicData.id}/logo-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("logos").upload(fileName, file, { cacheControl: "3600", upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("logos").getPublicUrl(fileName);
      setClinic({ ...clinic, logo_url: publicUrl });
      toast.success("Logo enviada!");
    } catch { toast.error("Erro ao enviar logo"); } finally { setUploading(false); }
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("barbershops").update({ name: clinic.name, phone: clinic.phone, address: clinic.address, logo_url: clinic.logo_url, primary_color: clinic.primary_color, secondary_color: clinic.secondary_color }).eq("owner_id", user.id);
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
          <CardHeader><CardTitle className="flex items-center gap-2"><Upload className="w-5 h-5" />Logo e Identidade</CardTitle><CardDescription>Personalize a aparência</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Logo da Clínica</Label><div className="mt-2 space-y-3">{clinic.logo_url && <div className="relative w-32 h-32 rounded-lg overflow-hidden border"><img src={clinic.logo_url} alt="Logo" className="w-full h-full object-cover" /></div>}<input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" /><Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-full"><Upload className="w-4 h-4 mr-2" />{uploading ? "Enviando..." : "Escolher Arquivo"}</Button></div></div>
            <div className="space-y-3"><Label>Cores do Tema</Label><div className="flex gap-4"><div className="flex-1"><Label className="text-xs">Cor Primária</Label><div className="flex gap-2 mt-1"><Input type="color" value={clinic.primary_color} onChange={(e) => setClinic({ ...clinic, primary_color: e.target.value })} className="w-12 h-10 p-1 cursor-pointer" /><Input value={clinic.primary_color} onChange={(e) => setClinic({ ...clinic, primary_color: e.target.value })} /></div></div><div className="flex-1"><Label className="text-xs">Cor Secundária</Label><div className="flex gap-2 mt-1"><Input type="color" value={clinic.secondary_color} onChange={(e) => setClinic({ ...clinic, secondary_color: e.target.value })} className="w-12 h-10 p-1 cursor-pointer" /><Input value={clinic.secondary_color} onChange={(e) => setClinic({ ...clinic, secondary_color: e.target.value })} /></div></div></div></div>
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
