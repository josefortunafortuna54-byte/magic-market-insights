import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Sparkles, BarChart3, History, Crown, LogIn, LogOut, User, Clock, MessageCircle, Bell } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useUnreadUserNotifications } from "@/hooks/useUnreadUserNotifications";
import { planLabel, type PlanId } from "@/lib/plans";

const navLinks = [
  { href: "/", key: "tabs.inicio", icon: Sparkles },
  { href: "/analises", key: "tabs.analises", icon: BarChart3 },
  { href: "/historico", key: "tabs.historico", icon: History },
  { href: "/planos", key: "planos.title", icon: Crown },
  { href: "/horarios", key: "tabs.horarios", icon: Clock },
  { href: "/comunidade", key: "tabs.comunidade", icon: MessageCircle },
  { href: "/perfil", key: "tabs.perfil", icon: User },
];

const PLAN_BADGE_LABEL: Record<string, string> = {
  basic: "BASIC",
  pro: "PRO",
  premium: "PREMIUM",
};

export function Navbar() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { user, signOut } = useAuth();
  const { tier } = useSubscription();
  const { unread } = useUnreadUserNotifications();
  const isPremium = tier !== "free";

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await signOut();
    setShowUserMenu(false);
    navigate("/");
  };

  const userInitial = user?.user_metadata?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || "U";
  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Utilizador";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b navbar-border bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-4">
        <div className="flex h-20 items-center justify-between">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <img 
              src="/logo.png" 
              alt="The Magic Trader" 
              className="h-14 w-14 object-contain logo-glow"
            />
            <span className="hidden sm:block font-display text-lg font-bold gradient-shield">
              The Magic Trader
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.href;
              return (
                <Link key={link.href} to={link.href}>
                  <Button variant={isActive ? "secondary" : "ghost"} className="gap-2">
                    <Icon className="h-4 w-4" />
                    {t(link.key)}
                  </Button>
                </Link>
              );
            })}
          </div>

          {/* Auth */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
              <Link
                to="/notificacoes"
                aria-label={t("notificacoes.title")}
                className="relative flex h-8 w-8 items-center justify-center rounded-xl hover:bg-secondary/60 active:scale-95 transition-all"
              >
                <Bell className="h-5 w-5" />
                {unread > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white border border-background">
                    {unread > 9 ? "9+" : unread}
                  </span>
                ) : null}
              </Link>
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-secondary/60 transition-all"
                >
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary border border-primary/30">
                    {user?.user_metadata?.avatar_url ? (
                      <img src={user.user_metadata.avatar_url} className="w-full h-full rounded-full object-cover" />
                    ) : userInitial}
                  </div>
                  <span className="text-sm font-medium max-w-24 truncate">{userName}</span>
                  {isPremium && (
                    <span
                      className={
                        tier === "premium"
                          ? "badge-premium text-xs py-0.5"
                          : "inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20"
                      }
                    >
                      {tier === "premium" && <Crown className="h-2.5 w-2.5" />}
                      {PLAN_BADGE_LABEL[tier as string] ?? planLabel(tier as Exclude<PlanId, "free">).toUpperCase()}
                    </span>
                  )}
                </button>

                {/* Dropdown */}
                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-12 w-56 glass-card p-2 shadow-xl"
                    >
                      <div className="px-3 py-2 mb-1 border-b border-border/50">
                        <p className="text-sm font-medium truncate">{userName}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        {isPremium && (
                          <span className="inline-flex items-center gap-1 text-xs text-accent mt-1">
                            <Crown className="h-3 w-3" /> {planLabel(tier as Exclude<PlanId, "free">)}
                          </span>
                        )}
                      </div>
                      {!isPremium && (
                        <Link to="/planos" onClick={() => setShowUserMenu(false)}>
                          <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-accent hover:bg-accent/10 transition-colors">
                            <Crown className="h-4 w-4" />
                            {t("common.upgradePremium")}
                          </button>
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors mt-1"
                      >
                        <LogOut className="h-4 w-4" />
                        {t("perfil.signOut")}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    <LogIn className="h-4 w-4 mr-2" />
                    {t("perfil.signIn")}
                  </Button>
                </Link>
                <Link to="/registro">
                  <Button variant="hero" size="sm">{t("auth.enterApp")}</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile button */}
          <button className="md:hidden p-2" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl"
          >
            <div className="container mx-auto px-4 py-4 space-y-2">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.href;
                return (
                  <Link key={link.href} to={link.href} onClick={() => setIsOpen(false)}>
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50"}`}>
                      <Icon className="h-5 w-5" />
                      {t(link.key)}
                    </div>
                  </Link>
                );
              })}
              <div className="pt-4 space-y-2 border-t border-border/50">
                {user ? (
                  <>
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary">
                        {userInitial}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{userName}</p>
                        {isPremium && (
                          <p className="text-xs text-accent">
                            {PLAN_BADGE_LABEL[tier as string] ?? planLabel(tier as Exclude<PlanId, "free">)}
                          </p>
                        )}
                      </div>
                    </div>
                    <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-3 rounded-lg text-destructive hover:bg-destructive/10 transition-colors">
                      <LogOut className="h-4 w-4" />
                      {t("perfil.signOut")}
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setIsOpen(false)}>
                      <Button variant="outline" className="w-full">{t("perfil.signIn")}</Button>
                    </Link>
                    <Link to="/registro" onClick={() => setIsOpen(false)}>
                      <Button variant="hero" className="w-full">{t("auth.enterApp")}</Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
