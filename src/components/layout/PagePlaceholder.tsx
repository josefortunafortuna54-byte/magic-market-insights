import { Construction } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Layout } from "./Layout";
import { Button } from "@/components/ui/button";

interface PagePlaceholderProps {
  title: string;
  description?: string;
}

export function PagePlaceholder({ title, description }: PagePlaceholderProps) {
  const navigate = useNavigate();

  return (
    <Layout>
      <section className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-secondary flex items-center justify-center mb-6">
              <Construction className="h-8 w-8 text-muted-foreground" />
            </div>
            <h1 className="font-display text-2xl font-bold mb-2">{title}</h1>
            <p className="text-muted-foreground mb-8">{description ?? "Disponível em breve."}</p>
            <Button variant="outline" onClick={() => navigate(-1)}>
              Voltar
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
}
