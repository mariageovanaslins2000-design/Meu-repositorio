import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PortfolioImage {
  id: string;
  image_url: string;
  title: string | null;
  description: string | null;
}

const Portfolio = () => {
  const { user } = useAuth();
  const [images, setImages] = useState<PortfolioImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [barbershopId, setBarbershopId] = useState<string>();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadPortfolio();
  }, [user]);

  const loadPortfolio = async () => {
    if (!user) return;

    try {
      const { data: barbershop } = await supabase
        .from("barbershops")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!barbershop) return;
      
      setBarbershopId(barbershop.id);

      const { data, error } = await supabase
        .from("portfolio_images")
        .select("*")
        .eq("barbershop_id", barbershop.id)
        .order("display_order");

      if (error) throw error;
      setImages(data || []);
    } catch (error) {
      console.error("Error loading portfolio:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !barbershopId) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${barbershopId}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('portfolio')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('portfolio')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from("portfolio_images")
        .insert({
          barbershop_id: barbershopId,
          image_url: publicUrl,
          title: title || null,
          description: description || null,
        });

      if (insertError) throw insertError;

      toast({
        title: "Imagem adicionada!",
        description: "A imagem foi adicionada ao portfólio.",
      });

      setTitle("");
      setDescription("");
      setOpen(false);
      loadPortfolio();
    } catch (error: any) {
      toast({
        title: "Erro ao fazer upload",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (image: PortfolioImage) => {
    try {
      const fileName = image.image_url.split('/').pop();
      
      await supabase.storage.from('portfolio').remove([fileName!]);
      
      const { error } = await supabase
        .from("portfolio_images")
        .delete()
        .eq("id", image.id);

      if (error) throw error;

      toast({
        title: "Imagem removida",
        description: "A imagem foi removida do portfólio.",
      });

      loadPortfolio();
    } catch (error: any) {
      toast({
        title: "Erro ao remover",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Portfólio</h1>
          <p className="text-muted-foreground">Mostre seus melhores trabalhos</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="w-4 h-4 mr-2" />
              Adicionar Imagem
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar ao Portfólio</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título (opcional)</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Corte Degradê"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o trabalho..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Imagem</Label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? "Enviando..." : "Escolher Imagem"}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUpload}
                  className="hidden"
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {images.length === 0 ? (
        <Card className="p-12 text-center">
          <ImageIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">Nenhuma imagem no portfólio</h3>
          <p className="text-muted-foreground mb-4">
            Adicione fotos dos seus melhores trabalhos
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {images.map((image) => (
            <Card key={image.id} className="group relative overflow-hidden shadow-elegant hover:shadow-xl transition-all">
              <CardContent className="p-0">
                <div className="relative aspect-square">
                  <img
                    src={image.image_url}
                    alt={image.title || "Portfolio image"}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(image)}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Remover
                    </Button>
                  </div>
                </div>
                {(image.title || image.description) && (
                  <div className="p-4">
                    {image.title && (
                      <h3 className="font-semibold mb-1">{image.title}</h3>
                    )}
                    {image.description && (
                      <p className="text-sm text-muted-foreground">{image.description}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Portfolio;