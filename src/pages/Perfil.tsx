import { Link, useNavigate } from "react-router-dom";
import {
  Wallet,
  Landmark,
  Bell,
  BookOpen,
  Bot,
  AlarmClock,
  Moon,
  Languages,
  Shield,
  ChevronRight,
  LogOut,
  LogIn,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { isAdminEmail } from "@/lib/admin";
import { planLabel, type PlanId } from "@/lib/plans";
import { useTranslation } from "react-i18next";

const PLAN_BADGE_LABEL: Record<string, string> = {
  basic: "BASIC",
  pro: "PRO",
  premium: "PREMIUM",
};

function ProfileInitial(email?: string, fullName?: string): string {
  if (fullName) return fullName[0].toUpperCase();
  if (email) return email[0].toUpperCase();
  return "U";
}

interface MenuRow {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export default function Perfil() {
  const { user, signOut } = useAuth();
  const { tier } = useSubscription();
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (!user) {
    return (
      <Layout>
        <section className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-md mx-auto">
              <Card className="glass-card text-center p-8">
                <CardContent className="pt-6 pb-2 space-y-6">
                  <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                    <LogIn className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h1 className="font-display text-2xl font-bold mb-2">{t("perfil.signIn")}</h1>
                    <p className="text-muted-foreground">
                      {t("perfil.signInSubtitle")}
                    </p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <Link to="/login" className="block w-full">
                      <Button variant="hero" className="w-full">{t("perfil.signIn")}</Button>
                    </Link>
                    <Link to="/registro" className="block w-full">
                      <Button variant="outline" className="w-full">{t("auth.createAccount")}</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  const fullName = user.user_metadata?.full_name as string | undefined;
  const displayName = fullName || user.email?.split("@")[0] || "Utilizador";
  const initial = ProfileInitial(user.email, fullName);
  const isPremium = tier !== "free";

  const menuRows: MenuRow[] = [
    { href: "/banca", label: t("perfil.banca"), icon: Wallet },
    { href: "/depositos", label: t("depositos.title"), icon: Landmark },
    { href: "/notificacoes", label: t("perfil.notifications"), icon: Bell },
    { href: "/diario-trader", label: t("perfil.diario"), icon: BookOpen },
    { href: "/suporte-ia", label: t("suporteIa.title"), icon: Bot },
    { href: "/definicoes-booms", label: t("definicoesBooms.title"), icon: AlarmClock },
    { href: "/tema", label: t("theme.title"), icon: Moon },
    { href: "/idioma", label: t("language.title"), icon: Languages },
  ];
  if (isAdminEmail(user.email)) {
    menuRows.push({ href: "/admin-gate", label: t("admin.title"), icon: Shield });
  }

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <Layout>
      <section className="pt-10 pb-16">
        <div className="container mx-auto px-4 max-w-2xl">
          {/* Profile header */}
          <Card className="glass-card mb-6">
            <CardContent className="pt-6 flex flex-col items-center text-center gap-2">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-3xl font-bold text-primary border-2 border-primary/40 mb-2">
                {initial}
              </div>
              <h1 className="font-display text-2xl font-bold">{displayName}</h1>
              <p className="text-muted-foreground text-sm">{user.email}</p>
              {isPremium && (
                <span
                  className={
                    tier === "premium"
                      ? "badge-premium mt-2"
                      : "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 mt-2"
                  }
                >
                  {PLAN_BADGE_LABEL[tier as string] ?? planLabel(tier as Exclude<PlanId, "free">).toUpperCase()}
                </span>
              )}
            </CardContent>
          </Card>

          {/* Wallet summary (placeholder — real WalletCard in Phase 2) */}
          <Card className="glass-card mb-6">
            <CardContent className="pt-6 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t("components.walletCard.capital")}</p>
                <p className="text-sm font-semibold text-muted-foreground">Kz 0,00</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t("components.walletCard.profit")}</p>
                <p className="text-sm font-semibold text-muted-foreground">Kz 0,00</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t("components.walletCard.withdrawals")}</p>
                <p className="text-sm font-semibold text-muted-foreground">{t("components.walletCard.soon")}</p>
              </div>
            </CardContent>
          </Card>

          {/* Menu */}
          <div className="space-y-2">
            {menuRows.map((row) => {
              const Icon = row.icon;
              return (
                <Link key={row.href} to={row.href} className="block">
                  <Card className="glass-card hover:border-primary/30 transition-colors">
                    <CardContent className="py-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <span className="flex-1 text-sm font-medium">{row.label}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              );
            })}

            {/* Logout */}
            <Button variant="destructive" className="w-full mt-4" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              {t("perfil.signOut")}
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
}
