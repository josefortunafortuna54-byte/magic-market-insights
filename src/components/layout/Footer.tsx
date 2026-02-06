import { Link } from "react-router-dom";
import { AlertTriangle, TrendingUp } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/30 bg-card/20">
      <div className="border-b border-border/20 bg-destructive/5">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-start gap-3 text-sm text-muted-foreground">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <p>
              <strong className="text-foreground">Aviso de Risco:</strong> Magic Market Insights fornece análises educacionais. 
              Não é aconselhamento financeiro. Trading envolve riscos significativos e pode resultar em perda total do capital.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-brand text-sm font-bold tracking-wider">MAGIC MARKET INSIGHTS</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-md">
              Plataforma de sinais inteligentes com IA para traders. 
              Análise técnica avançada, sinais em tempo real e performance comprovada.
            </p>
          </div>

          <div>
            <h4 className="font-display font-semibold mb-4 text-sm">Plataforma</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/" className="hover:text-foreground transition-colors">Dashboard</Link></li>
              <li><Link to="/analises" className="hover:text-foreground transition-colors">Sinais</Link></li>
              <li><Link to="/resultados" className="hover:text-foreground transition-colors">Resultados</Link></li>
              <li><Link to="/ia-trader" className="hover:text-foreground transition-colors">IA Trader</Link></li>
              <li><Link to="/planos" className="hover:text-foreground transition-colors">Premium</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold mb-4 text-sm">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/termos" className="hover:text-foreground transition-colors">Termos de Uso</Link></li>
              <li><Link to="/privacidade" className="hover:text-foreground transition-colors">Privacidade</Link></li>
              <li><Link to="/aviso-risco" className="hover:text-foreground transition-colors">Aviso de Risco</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border/20 text-center text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Magic Market Insights. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
