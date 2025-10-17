import { Plus, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const Barbers = () => {
  const barbers = [
    {
      id: 1,
      name: "Carlos Silva",
      specialty: "Cortes Clássicos",
      email: "carlos@barberpro.com",
      phone: "(11) 98765-4321",
      stats: { appointments: 145, rating: 4.9 },
    },
    {
      id: 2,
      name: "Ricardo Santos",
      specialty: "Degradê e Fade",
      email: "ricardo@barberpro.com",
      phone: "(11) 98765-4322",
      stats: { appointments: 132, rating: 4.8 },
    },
    {
      id: 3,
      name: "Bruno Costa",
      specialty: "Barba e Bigode",
      email: "bruno@barberpro.com",
      phone: "(11) 98765-4323",
      stats: { appointments: 98, rating: 4.7 },
    },
    {
      id: 4,
      name: "André Oliveira",
      specialty: "Cortes Modernos",
      email: "andre@barberpro.com",
      phone: "(11) 98765-4324",
      stats: { appointments: 87, rating: 4.9 },
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Barbeiros</h1>
          <p className="text-muted-foreground">Gerencie sua equipe de profissionais</p>
        </div>
        <Button className="bg-gradient-gold">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Barbeiro
        </Button>
      </div>

      {/* Barbers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {barbers.map((barber) => (
          <Card key={barber.id} className="shadow-elegant hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarFallback className="bg-gradient-gold text-lg font-bold">
                    {barber.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{barber.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{barber.specialty}</p>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{barber.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{barber.phone}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 pt-4 border-t">
                    <div>
                      <p className="text-2xl font-bold">{barber.stats.appointments}</p>
                      <p className="text-xs text-muted-foreground">Atendimentos</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{barber.stats.rating}</p>
                      <p className="text-xs text-muted-foreground">Avaliação</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 mt-4">
                <Button variant="outline" className="flex-1">Ver Perfil</Button>
                <Button variant="outline" className="flex-1">Editar</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Barbers;
