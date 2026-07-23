import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Layout } from "@/components/layout/Layout";

export default function AvisoRisco() {
  return (
    <Layout>
      <section className="py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
              <ArrowLeft className="h-3 w-3" /> Voltar
            </Link>

            <h1 className="font-display text-3xl font-bold mb-6">Aviso de Risco</h1>

            <div className="glass-card p-8 space-y-6 text-sm text-muted-foreground leading-relaxed">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-warning/10 border border-warning/30">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <p className="text-foreground font-medium">
                  O trading de produtos financeiros envolve riscos significativos e não é adequado para todos os investidores.
                  Deve considerar cuidadosamente os seus objetivos de investimento, nível de experiência e tolerância ao risco.
                </p>
              </div>

              <div>
                <h2 className="font-display text-lg font-semibold text-foreground mb-2">Risco de Perda Financeira</h2>
                <p>
                  O mercado Forex e outros mercados financeiros são altamente voláteis. Existe um risco significativo
                  de perda parcial ou total do capital investido. Nunca invista dinheiro que não pode se dar ao luxo de perder.
                </p>
              </div>

              <div>
                <h2 className="font-display text-lg font-semibold text-foreground mb-2">Natureza Educacional</h2>
                <p>
                  As análises e sinais fornecidos pela plataforma The Magic Trader são de caráter exclusivamente
                  educacional e informativo. Não constituem recomendação de compra, venda ou subscrição de qualquer
                  instrumento financeiro.
                </p>
              </div>

              <div>
                <h2 className="font-display text-lg font-semibold text-foreground mb-2">Sem Garantias</h2>
                <p>
                  Não garantimos a precisão, completitude ou atualidade das análises fornecidas. Os modelos de IA
                  e indicadores técnicos podem gerar sinais incorretos. Resultados passados não são indicativos
                  de resultados futuros.
                </p>
              </div>

              <div>
                <h2 className="font-display text-lg font-semibold text-foreground mb-2">Decisão de Investimento</h2>
                <p>
                  Qualquer decisão de investimento é da exclusiva responsabilidade do utilizador. Recomendamos
                  que consulte um consultor financeiro profissional antes de tomar qualquer decisão de investimento.
                </p>
              </div>

              <div>
                <h2 className="font-display text-lg font-semibold text-foreground mb-2">Alavancagem</h2>
                <p>
                  O trading com alavancagem amplifica tanto os lucros como as perdas. Pode perder mais do que o capital
                  investido inicialmente. Certifique-se de que compreende plenamente os riscos associados antes de operar.
                </p>
              </div>

              <div>
                <h2 className="font-display text-lg font-semibold text-foreground mb-2">Regulamentação</h2>
                <p>
                  The Magic Trader não é uma corretora licenciada e não execute ordens de trading diretamente.
                  Para operar no mercado Forex, deve utilizar um corretor regulamentado.
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
