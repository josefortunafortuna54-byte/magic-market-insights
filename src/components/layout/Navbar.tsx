import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, BarChart3, History, Crown, LogIn, LogOut, User, Settings, Bot, TrendingUp, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navLinks = [
  { href: "/", label: "Dashboard", icon: TrendingUp },
  { href: "/analises", label: "Sinais", icon: BarChart3 },
  { href: "/resultados", label: "Resultados", icon: Trophy },
  { href: "/ia-trader", label: "IA Trader", icon: Bot },
  { href: "/planos", label: "Premium", icon: Crown },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, isAdmin, signOut, isLoading } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/30 bg-background/70 backdrop-blur-2xl">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-primary-foreground" />
              <div className="absolute inset-0 rounded-lg blur-md bg-primary/30 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex flex-col">
              <span className="font-brand text-base font-bold tracking-wider leading-tight">
                THE MAGIC <span className="gradient-text-accent">TRADER</span>
              </span>
              <span className="text-[10px] text-muted-foreground tracking-[0.2em] uppercase">AI Signals</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.href;
              return (
                <Link key={link.href} to={link.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className={`gap-2 text-xs font-medium ${isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {link.label}
                    {link.label === "Premium" && (
                      <Badge variant="warning" className="ml-1 text-[9px] px-1.5 py-0">PRO</Badge>
                    )}
                  </Button>
                </Link>
              );
            })}
            {isAdmin && (
              <Link to="/admin">
                <Button
                  variant={location.pathname === "/admin" ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-2 text-xs"
                >
                  <Settings className="h-3.5 w-3.5" />
                  Admin
                </Button>
              </Link>
            )}
          </div>

          {/* Auth */}
          <div className="hidden lg:flex items-center gap-3">
            {isLoading ? (
              <div className="h-9 w-24 bg-secondary animate-pulse rounded-md" />
            ) : user ? (
              <div className="flex items-center gap-3">
                {profile?.plan === "premium" && (
                  <Badge variant="warning" className="text-[10px]">
                    <Crown className="h-3 w-3 mr-1" />
                    PREMIUM
                  </Badge>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                        <User className="h-3 w-3 text-primary" />
                      </div>
                      {profile?.full_name || user.email?.split("@")[0]}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem className="text-muted-foreground text-xs">
                      {user.email}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {isAdmin && (
                      <>
                        <DropdownMenuItem onClick={() => navigate("/admin")}>
                          <Settings className="h-4 w-4 mr-2" />
                          Painel Admin
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                      <LogOut className="h-4 w-4 mr-2" />
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="text-muted-foreground">
                    <LogIn className="h-4 w-4 mr-2" />
                    Entrar
                  </Button>
                </Link>
                <Link to="/registro">
                  <Button variant="default" size="sm" className="font-bold">
                    Começar Grátis
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile */}
          <button className="lg:hidden p-2" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden border-t border-border/30 bg-background/95 backdrop-blur-xl"
          >
            <div className="container mx-auto px-4 py-4 space-y-2">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.href;
                return (
                  <Link key={link.href} to={link.href} onClick={() => setIsOpen(false)}>
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50"
                    }`}>
                      <Icon className="h-5 w-5" />
                      {link.label}
                    </div>
                  </Link>
                );
              })}
              <div className="pt-4 space-y-2 border-t border-border/50">
                {user ? (
                  <>
                    <div className="px-4 py-2 text-sm text-muted-foreground">{user.email}</div>
                    <Button variant="outline" className="w-full" onClick={handleSignOut}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Sair
                    </Button>
                  </>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setIsOpen(false)}>
                      <Button variant="outline" className="w-full">Entrar</Button>
                    </Link>
                    <Link to="/registro" onClick={() => setIsOpen(false)}>
                      <Button variant="default" className="w-full">Começar Grátis</Button>
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
