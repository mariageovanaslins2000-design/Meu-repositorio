import { Upload, Palette, Bell, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Settings = () => {
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
              <Input placeholder="Barbearia Demo" />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input placeholder="(11) 98765-4321" />
            </div>
            <div>
              <Label>Email</Label>
              <Input placeholder="contato@barbearia.com" />
            </div>
            <div>
              <Label>Endereço</Label>
              <Input placeholder="Rua Example, 123" />
            </div>
            <Button className="w-full">Salvar Alterações</Button>
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
              <div className="mt-2 border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-accent transition-colors cursor-pointer">
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Clique para fazer upload</p>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG até 2MB</p>
              </div>
            </div>
            <Button className="w-full" variant="outline">
              <Palette className="w-4 h-4 mr-2" />
              Personalizar Cores
            </Button>
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
              <div>
                <p className="font-medium">Novos Agendamentos</p>
                <p className="text-sm text-muted-foreground">Receba alertas de novos agendamentos</p>
              </div>
              <input type="checkbox" className="w-5 h-5" defaultChecked />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <p className="font-medium">Lembretes de Cliente</p>
                <p className="text-sm text-muted-foreground">Enviar lembretes automáticos</p>
              </div>
              <input type="checkbox" className="w-5 h-5" defaultChecked />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <p className="font-medium">Relatórios Diários</p>
                <p className="text-sm text-muted-foreground">Resumo diário por email</p>
              </div>
              <input type="checkbox" className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
