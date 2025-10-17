import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Image as ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PortfolioImage {
  id: string;
  image_url: string;
  title: string | null;
  description: string | null;
}

export default function ClientPortfolio() {
  const [images, setImages] = useState<PortfolioImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<PortfolioImage | null>(null);

  useEffect(() => {
    loadPortfolio();
  }, []);

  const loadPortfolio = async () => {
    try {
      const { data, error } = await supabase
        .from("portfolio_images")
        .select("*")
        .order("display_order");

      if (error) throw error;
      setImages(data || []);
    } catch (error) {
      console.error("Error loading portfolio:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Portfólio</h1>
        <p className="text-muted-foreground">
          Conheça nossos trabalhos e inspire-se para seu próximo visual
        </p>
      </div>

      {images.length === 0 ? (
        <Card className="p-12 text-center">
          <ImageIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Nenhuma imagem disponível</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {images.map((image) => (
            <Card
              key={image.id}
              className="group cursor-pointer overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
              onClick={() => setSelectedImage(image)}
            >
              <CardContent className="p-0">
                <div className="relative aspect-square overflow-hidden">
                  <img
                    src={image.image_url}
                    alt={image.title || "Portfolio image"}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  {(image.title || image.description) && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                      {image.title && (
                        <h3 className="font-semibold text-white mb-1">{image.title}</h3>
                      )}
                      {image.description && (
                        <p className="text-sm text-white/90 line-clamp-2">{image.description}</p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>{selectedImage?.title || "Trabalho"}</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="relative">
              <img
                src={selectedImage.image_url}
                alt={selectedImage.title || "Portfolio image"}
                className="w-full h-auto max-h-[70vh] object-contain"
              />
              {selectedImage.description && (
                <div className="p-6">
                  <p className="text-muted-foreground">{selectedImage.description}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}