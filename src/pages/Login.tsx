import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Sparkles, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Layout } from "@/components/layout/Layout";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement login logic
    console.log("Login:", { email, password });
  };

  return (
    <Layout>
      <section className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto"
          >
            {/* Header */}
            <div className="text-center mb-8">
              <Link to="/" className="inline-flex items-center gap-2 mb-6">
                <Sparkles className="h-8 w-8 text-primary" />
                <span className="font-display text-xl font-bold">
                  The Magic Trader
                </span>
              </Link>
              <h1 className="font-display text-2xl font-bold mb-2">
                Bem-vindo de volta
              </h1>
              <p className="text-muted-foreground">
                Entre na sua conta para continuar
              </p>
            </div>

            {/* Form */}
            <div className="glass-card p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="rounded border-border"
                    />
                    <span className="text-muted-foreground">Lembrar-me</span>
                  </label>
                  <Link
                    to="/recuperar-senha"
                    className="text-primary hover:underline"
                  >
                    Esqueceu a senha?
                  </Link>
                </div>

                <Button type="submit" variant="hero" className="w-full">
                  Entrar
                </Button>
              </form>

              <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">Não tem uma conta?</span>{" "}
                <Link to="/registro" className="text-primary hover:underline font-medium">
                  Criar conta
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
}
