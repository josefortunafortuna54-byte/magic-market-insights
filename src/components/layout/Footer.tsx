import { Link } from "react-router-dom";
import { Sparkles, AlertTriangle } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-card/30">
      {/* Risk Disclaimer */}
      <div className="border-b border-border/30 bg-destructive/5">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-start gap-3 text-sm text-muted-foreground">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <p>
              <strong className="text-foreground">Aviso de Risco:</strong> The Magic Trader fornece análises educacionais do mercado Forex. 
              Não oferecemos aconselhamento financeiro. O trading envolve riscos significativos e pode resultar na perda total do capital investido. 
              Resultados passados não garantem resultados futuros.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <Sparkles className="h-6 w-6 text-primary" />
              <span className="font-display text-lg font-bold">
                The Magic Trader
              </span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-md">
              Plataforma de análise técnica avançada para o mercado Forex. 
              Utilizamos inteligência artificial e indicadores técnicos para 
              fornecer análises educacionais de alta qualidade.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-display font-semibold mb-4">Navegação</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/" className="hover:text-foreground transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/analises" className="hover:text-foreground transition-colors">
                  Análises
                </Link>
              </li>
              <li>
                <Link to="/historico" className="hover:text-foreground transition-colors">
                  Histórico
                </Link>
              </li>
              <li>
                <Link to="/planos" className="hover:text-foreground transition-colors">
                  Planos
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-display font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/termos" className="hover:text-foreground transition-colors">
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link to="/privacidade" className="hover:text-foreground transition-colors">
                  Privacidade
                </Link>
              </li>
              <li>
                <Link to="/aviso-risco" className="hover:text-foreground transition-colors">
                  Aviso de Risco
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border/30 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} The Magic Trader. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
