import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, Mail, Lock, Eye, EyeOff, User, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function Registro() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const { error } = await signUp(formData.email, formData.password, formData.name);

    if (error) {
      toast({
        title: "Erro no registro",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    toast({
      title: "Conta criada!",
      description: "Verifique seu email para confirmar o registro.",
    });

    navigate("/login");
  };

  const benefits = [
    "Acesso a sinais gratuitos",
    "Análise técnica básica",
    "1 par de moedas (EUR/USD)",
    "Suporte da comunidade",
  ];

  return (
    <Layout>
      <section className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 max-w-5xl mx-auto items-center">
            {/* Left Side - Benefits */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="hidden lg:block"
            >
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="h-8 w-8 text-primary" />
                <span className="font-display text-xl font-bold">
                  The Magic Trader
                </span>
              </div>
              <h2 className="font-display text-3xl font-bold mb-4">
                Comece sua jornada no Forex
              </h2>
              <p className="text-muted-foreground mb-8">
                Crie sua conta gratuita e tenha acesso a análises técnicas 
                avançadas para o mercado Forex.
              </p>

              <ul className="space-y-4">
                {benefits.map((benefit, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-6 h-6 rounded-full bg-success/20 flex items-center justify-center">
                      <Check className="h-4 w-4 text-success" />
                    </div>
                    <span>{benefit}</span>
                  </motion.li>
                ))}
              </ul>

              <div className="mt-8 p-6 glass-card">
                <p className="text-sm text-muted-foreground italic">
                  "O The Magic Trader me ajudou a entender melhor a análise técnica.
                  Os sinais são educativos e bem explicados."
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">João Silva</p>
                    <p className="text-xs text-muted-foreground">Trader iniciante</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right Side - Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Mobile Header */}
              <div className="text-center mb-8 lg:hidden">
                <Link to="/" className="inline-flex items-center gap-2 mb-6">
                  <Sparkles className="h-8 w-8 text-primary" />
                  <span className="font-display text-xl font-bold">
                    The Magic Trader
                  </span>
                </Link>
              </div>

              <div className="glass-card p-8">
                <div className="text-center mb-6">
                  <h1 className="font-display text-2xl font-bold mb-2">
                    Criar Conta
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Comece gratuitamente, sem cartão de crédito
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="João Silva"
                        value={formData.name}
                        onChange={handleChange}
                        className="pl-10"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={formData.email}
                        onChange={handleChange}
                        className="pl-10"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={handleChange}
                        className="pl-10 pr-10"
                        required
                        disabled={isLoading}
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

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="pl-10"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      id="terms"
                      className="mt-1 rounded border-border"
                      required
                    />
                    <label htmlFor="terms" className="text-muted-foreground">
                      Concordo com os{" "}
                      <Link to="/termos" className="text-primary hover:underline">
                        Termos de Uso
                      </Link>{" "}
                      e a{" "}
                      <Link to="/privacidade" className="text-primary hover:underline">
                        Política de Privacidade
                      </Link>
                    </label>
                  </div>

                  <Button type="submit" variant="hero" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Criando conta...
                      </>
                    ) : (
                      "Criar Conta Grátis"
                    )}
                  </Button>
                </form>

                <div className="mt-6 text-center text-sm">
                  <span className="text-muted-foreground">Já tem uma conta?</span>{" "}
                  <Link to="/login" className="text-primary hover:underline font-medium">
                    Entrar
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
