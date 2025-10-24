import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Scissors, UserCircle, Building2 } from "lucide-react";
import { useEffect } from "react";

const Index = () => {
  const navigate = useNavigate();
  const { user, hasRole, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      if (hasRole("owner")) {
        navigate("/admin");
      } else if (hasRole("client")) {
        navigate("/client");
      }
    }
  }, [user, hasRole, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-primary rounded-full">
              <Scissors className="h-12 w-12 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-2">IABarber</h1>
          <p className="text-xl text-muted-foreground">Sistema de Gestão de Barbearias</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Cliente */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <UserCircle className="h-8 w-8 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl">Área do Cliente</CardTitle>
              <CardDescription>Agende e gerencie seus horários</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                className="w-full" 
                size="lg"
                onClick={() => navigate("/login-cliente")}
              >
                Entrar como Cliente
              </Button>
              <Button 
                variant="outline" 
                className="w-full" 
                size="lg"
                onClick={() => navigate("/cadastro-cliente")}
              >
                Cadastrar como Cliente
              </Button>
            </CardContent>
          </Card>

          {/* Administrador */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl">Área Administrativa</CardTitle>
              <CardDescription>Gerencie sua barbearia</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                className="w-full" 
                size="lg"
                onClick={() => navigate("/auth")}
              >
                Acessar Painel Admin
              </Button>
              <p className="text-sm text-center text-muted-foreground">
                Para donos e administradores
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
