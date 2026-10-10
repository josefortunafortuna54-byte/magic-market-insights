import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, AlertCircle, MessageCircle, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Layout } from "@/components/layout/Layout";
import { UsernameDialog } from "@/components/auth/UsernameDialog";
import { WhatsAppDialog } from "@/components/auth/WhatsAppDialog";
import { supabase } from "@/lib/supabaseClient";
import { useTranslation } from "react-i18next";

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [usernameOpen, setUsernameOpen] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem("rememberMe") === "true");
  const [showEmailForm, setShowEmailForm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      localStorage.setItem("rememberMe", String(rememberMe));
      navigate("/analises");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message === "Invalid login credentials"
        ? t('auth.loginError')
        : message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.hostname === "localhost" ? "http://localhost:8080" : window.location.origin}/analises`,
        },
      });
      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setGoogleLoading(false);
    }
  };

  return (
    <Layout>
      <section className="min-h-[calc(100vh-4rem)] flex items-start justify-center pt-6 pb-12">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto w-full">

            {/* Header */}
            <div className="text-center mb-4">
              <h1 className="font-display text-2xl font-bold mb-1">{t('auth.loginTitle')}</h1>
              <p className="text-muted-foreground text-sm">{t('auth.loginSubtitle')}</p>
            </div>

            <div className="glass-card p-4">

              {/* Botão Google */}
              <button
                onClick={handleGoogle}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-border/60 bg-secondary/30 hover:bg-secondary/60 transition-all text-sm font-medium mb-2 disabled:opacity-50"
              >
                {googleLoading ? (
                  <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                {googleLoading ? t('auth.redirecting') : t('auth.continueGoogle')}
              </button>

              {/* Botão WhatsApp */}
              <button
                onClick={() => { setError(""); setWhatsappOpen(true); }}
                disabled={whatsappOpen}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-border/60 hover:bg-secondary/40 transition-all text-sm font-medium mb-2 disabled:opacity-50"
              >
                <MessageCircle className="h-4 w-4 text-[#25D366]" />
                {t('auth.enterWhatsapp')}
              </button>

              {/* Botão NomeUnico */}
              <button
                onClick={() => { setError(""); setUsernameOpen(true); }}
                disabled={usernameOpen}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-border/60 hover:bg-secondary/40 transition-all text-sm font-medium mb-2 disabled:opacity-50"
              >
                <UserCircle className="h-4 w-4 text-primary" />
                {t('auth.enterUsername')}
              </button>

              {/* Botão E-mail */}
              <button
                type="button"
                onClick={() => { setError(""); setShowEmailForm(true); }}
                disabled={showEmailForm}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-border/60 bg-secondary/30 hover:bg-secondary/60 transition-all text-sm font-medium mb-2 disabled:opacity-50"
              >
                <Mail className="h-4 w-4 text-primary" />
                {t('auth.continueEmail')}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 h-px bg-border/50" />
                <span className="text-xs text-muted-foreground">{t('auth.orWithEmail')}</span>
                <div className="flex-1 h-px bg-border/50" />
              </div>

              {/* Erro */}
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm mb-3">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Form E-mail */}
{showEmailForm && (
                <form onSubmit={handleSubmit} className="space-y-4 animate-slide-up">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">{t('auth.email')}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="email" type="email" placeholder={t('auth.emailPlaceholder')}
                        value={email} onChange={(e) => setEmail(e.target.value)}
                        className="pl-10" required autoComplete="email" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password">{t('auth.password')}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="password" type={showPassword ? "text" : "password"}
                        placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10" required autoComplete="current-password" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="rounded border-border" />
                      <span className="text-muted-foreground">{t('auth.rememberMe')}</span>
                    </label>
                    <Link to="/recuperar-senha" className="text-primary hover:underline">
                      {t('auth.forgotPassword')}
                    </Link>
                  </div>

                  <Button type="submit" variant="hero" className="w-full" disabled={loading}>
                    {loading ? t('auth.loggingIn') : t('perfil.signIn')}
                  </Button>
                </form>
              )}

              <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">{t('auth.noAccount')}</span>{" "}
                <Link to="/registro" className="text-primary hover:underline font-medium">{t('auth.createAccount')}</Link>
              </div>
            </div>
          </motion.div>
        </div>

        <WhatsAppDialog
          open={whatsappOpen}
          onOpenChange={setWhatsappOpen}
          onSuccess={() => navigate("/analises")}
        />
        <UsernameDialog
          open={usernameOpen}
          onOpenChange={setUsernameOpen}
          onSuccess={() => navigate("/analises")}
        />
      </section>
    </Layout>
  );
}
