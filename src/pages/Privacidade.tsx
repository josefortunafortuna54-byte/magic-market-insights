import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Layout } from "@/components/layout/Layout";

export default function Privacidade() {
  return (
    <Layout>
      <section className="py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
              <ArrowLeft className="h-3 w-3" /> Voltar
            </Link>

            <h1 className="font-display text-3xl font-bold mb-6">Política de Privacidade</h1>

            <div className="glass-card p-8 space-y-6 text-sm text-muted-foreground leading-relaxed">
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground mb-2">1. Dados Recolhidos</h2>
                <p>
                  Recolhemos apenas os dados necessários para o funcionamento da plataforma: endereço de email,
                  nome de utilizador (quando fornecido via Google OAuth) e dados de pagamento processados
                  diretamente pela Stripe.
                </p>
              </div>

              <div>
                <h2 className="font-display text-lg font-semibold text-foreground mb-2">2. Uso dos Dados</h2>
                <p>
                  Os seus dados são utilizados exclusivamente para: autenticação, gestão da sua subscrição,
                  envio de notificações relacionadas com a sua conta, e melhoria da experiência na plataforma.
                </p>
              </div>

              <div>
                <h2 className="font-display text-lg font-semibold text-foreground mb-2">3. Armazenamento</h2>
                <p>
                  Os dados são armazenados de forma segura através do Supabase (PostgreSQL) com encriptação
                  em trânsito e em repouso. Não armazenamos dados de pagamento diretamente.
                </p>
              </div>

              <div>
                <h2 className="font-display text-lg font-semibold text-foreground mb-2">4. Partilha de Dados</h2>
                <p>
                  Não partilhamos, vendemos ou transmitimos os seus dados pessoais a terceiros, exceto
                  quando exigido por lei ou para o processamento de pagamentos através do Stripe.
                </p>
              </div>

              <div>
                <h2 className="font-display text-lg font-semibold text-foreground mb-2">5. Cookies</h2>
                <p>
                  Utilizamos cookies essenciais para o funcionamento da plataforma e cookies de autenticação
                  geridos pelo Supabase. Não utilizamos cookies de rastreamento de terceiros.
                </p>
              </div>

              <div>
                <h2 className="font-display text-lg font-semibold text-foreground mb-2">6. Os Seus Direitos</h2>
                <p>
                  Pode solicitar a eliminação dos seus dados pessoais a qualquer momento contactando-nos.
                  Tem direito de acesso, retificação e eliminação dos seus dados pessoais.
                </p>
              </div>

              <div>
                <h2 className="font-display text-lg font-semibold text-foreground mb-2">7. Contacto</h2>
                <p>
                  Para questões sobre privacidade, contacte-nos através do email de suporte da plataforma.
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-4">Última atualização: Janeiro 2026</p>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
}
