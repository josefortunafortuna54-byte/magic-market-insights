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
                  nome e NomeUnico, foto de perfil (quando fornecida), conteúdo que publicas na Comunidade
                  (mensagens, imagens e áudio), token de notificações e registos técnicos de utilização. Os dados
                  de pagamento são tratados pelos prestadores de pagamento no site oficial; a app móvel não
                  processa pagamentos.
                </p>
              </div>

              <div>
                <h2 className="font-display text-lg font-semibold text-foreground mb-2">2. Uso dos Dados</h2>
                <p>
                  Os teus dados são utilizados para autenticação, gestão da conta e da subscrição, envio de
                  notificações, funcionamento da Comunidade, suporte e segurança da plataforma.
                </p>
              </div>

              <div>
                <h2 className="font-display text-lg font-semibold text-foreground mb-2">3. Armazenamento</h2>
                <p>
                  Os dados são armazenados de forma segura através do Supabase (PostgreSQL) com encriptação em
                  trânsito e em repouso. Comprovativos de pagamento, quando enviados, ficam em armazenamento
                  privado. Não armazenamos dados de cartões.
                </p>
              </div>

              <div>
                <h2 className="font-display text-lg font-semibold text-foreground mb-2">4. Partilha de Dados</h2>
                <p>
                  Não vendemos nem partilhamos os teus dados pessoais com terceiros, exceto com prestadores que
                  nos ajudam a operar a plataforma (alojamento, autenticação, notificações e pagamentos no site)
                  ou quando exigido por lei.
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
                  Podes apagar a tua conta em{" "}
                  <Link to="/apagar-conta" className="text-primary underline">
                    /apagar-conta
                  </Link>{" "}
                  ou na app em Perfil → Apagar conta. A eliminação remove o perfil, conteúdo e ficheiros
                  associados e não pode ser revertida. Tens também direito de acesso e retificação dos teus dados.
                </p>
              </div>

              <div>
                <h2 className="font-display text-lg font-semibold text-foreground mb-2">7. Contacto</h2>
                <p>
                  Para questões sobre privacidade, contacte-nos através do email de suporte da plataforma.
                </p>
              </div>

              <div>
                <h2 className="font-display text-lg font-semibold text-foreground mb-2">8. Menores</h2>
                <p>
                  A plataforma destina-se a maiores de 18 anos. Não recolhemos intencionalmente dados de menores.
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-4">Última atualização: Novembro 2026</p>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
}
