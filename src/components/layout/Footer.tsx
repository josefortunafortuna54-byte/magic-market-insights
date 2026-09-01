import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

export function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="border-t navbar-border bg-card/30">
      {/* Risk Disclaimer */}
      <div className="border-b border-border/30 bg-destructive/5">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-start gap-3 text-sm text-muted-foreground">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <p>
              <strong className="text-foreground">{t("legal.aviso")}:</strong> {t("legal.avisoRiscoDoc.intro")}
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-3 mb-4">
              <img src="/logo.png" alt="The Magic Trader" className="h-10 w-10 object-contain logo-glow" />
              <span className="font-display text-lg font-bold gradient-shield">
                The Magic Trader
              </span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-md">
              {t("common.footerTagline")}
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-display font-semibold mb-4">{t("common.navigation")}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/" className="hover:text-foreground transition-colors">
                  {t("tabs.inicio")}
                </Link>
              </li>
              <li>
                <Link to="/analises" className="hover:text-foreground transition-colors">
                  {t("tabs.analises")}
                </Link>
              </li>
              <li>
                <Link to="/historico" className="hover:text-foreground transition-colors">
                  {t("tabs.historico")}
                </Link>
              </li>
              <li>
                <Link to="/planos" className="hover:text-foreground transition-colors">
                  {t("planos.title")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-display font-semibold mb-4">{t("common.legal")}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/termos" className="hover:text-foreground transition-colors">
                  {t("legal.termosTitle")}
                </Link>
              </li>
              <li>
                <Link to="/privacidade" className="hover:text-foreground transition-colors">
                  {t("legal.privacidadeTitle")}
                </Link>
              </li>
              <li>
                <Link to="/aviso-risco" className="hover:text-foreground transition-colors">
                  {t("legal.avisoRiscoTitle")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border/30 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} The Magic Trader. {t("common.copyright")}</p>
        </div>
      </div>
    </footer>
  );
}
