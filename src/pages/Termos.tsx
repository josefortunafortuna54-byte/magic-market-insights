import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Layout } from "@/components/layout/Layout";

export default function Termos() {
  return (
    <Layout>
      <section className="py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
              <ArrowLeft className="h-3 w-3" /> Voltar
            </Link>

            <h1 className="font-display text-3xl font-bold mb-6">Termos de Uso</h1>

            <div className="glass-card p-8 space-y-6 text-sm text-muted-foreground leading-relaxed">
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground mb-2">1. Aceitação dos Termos</h2>
                <p>
                  Ao aceder e utilizar a plataforma The Magic Trader, o utilizador concorda com estes Termos de Uso.
                  Se não concordar com algum dos termos, não deve utilizar a plataforma.
                </p>
              </div>

              <div>
                <h2 className="font-display text-lg font-semibold text-foreground mb-2">2. Descrição do Serviço</h2>
                <p>
                  The Magic Trader é uma plataforma de análise técnica do mercado Forex que utiliza inteligência artificial
                  e indicadores técnicos para gerar análises educacionais. Os sinais fornecidos são baseados em modelos
                  estatísticos e não devem ser considerados aconselhamento financeiro.
                </p>
              </div>

              <div>
                <h2 className="font-display text-lg font-semibold text-foreground mb-2">3. Natureza Educacional</h2>
                <p>
                  Todo o conteúdo disponibilizado na plataforma é de caráter exclusivamente educacional e informativo.
                  Não nos responsabilizamos por decisões de investimento tomadas com base nas análises fornecidas.
                </p>
              </div>

              <div>
                <h2 className="font-display text-lg font-semibold text-foreground mb-2">4. Conta de Utilizador</h2>
                <p>
                  O utilizador é responsável por manter a confidencialidade das suas credenciais de acesso.
                  Uma conta premium é pessoal e intransmissível.
                </p>
              </div>

              <div>
                <h2 className="font-display text-lg font-semibold text-foreground mb-2">5. Pagamentos</h2>
                <p>
                  As subscrições premium são processadas via Stripe. Os planos são renovados automaticamente
                  ao final de cada período de faturação, a menos que sejam cancelados antes da data de renovação.
                </p>
              </div>

              <div>
                <h2 className="font-display text-lg font-semibold text-foreground mb-2">6. Propriedade Intelectual</h2>
                <p>
                  Todo o conteúdo da plataforma, incluindo mas não se limitando a textos, gráficos, logotipos,
                  software e análises, é propriedade de The Magic Trader e é protegido por direitos de autor.
                </p>
              </div>

              <div>
                <h2 className="font-display text-lg font-semibold text-foreground mb-2">7. Alterações</h2>
                <p>
                  Reservamo-nos o direito de alterar estes termos a qualquer momento. As alterações entram em vigor
                  imediatamente após a publicação na plataforma.
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
