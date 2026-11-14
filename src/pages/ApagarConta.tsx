import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";

const DELETE_ACCOUNT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`;

export default function ApagarConta() {
  const { user, loading } = useAuth();
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const canDelete = confirmation.trim().toUpperCase() === "APAGAR" && !busy;

  const handleDelete = async () => {
    if (!canDelete) return;
    setError("");
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Inicia sessão para apagar a conta.");

      const res = await fetch(DELETE_ACCOUNT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ confirm: true }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok || data.error) throw new Error(data.error || "Não foi possível apagar a conta.");

      await supabase.auth.signOut();
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível apagar a conta.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout>
      <section className="py-12">
        <div className="container mx-auto px-4 max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
              <ArrowLeft className="h-3 w-3" /> Voltar
            </Link>

            <h1 className="font-display text-3xl font-bold mb-6">Apagar conta</h1>

            <div className="glass-card p-8 space-y-6 text-sm text-muted-foreground leading-relaxed">
              {done ? (
                <div className="flex items-start gap-3 text-foreground">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                  <p>A tua conta foi apagada. Todos os dados associados foram eliminados.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-foreground">
                    <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                    <p>
                      Esta ação é permanente. O teu perfil, histórico, conteúdos e ficheiros serão eliminados e
                      não podem ser recuperados.
                    </p>
                  </div>

                  <p>
                    Se tiveres uma subscrição ativa, cancela-a primeiro. A eliminação da conta não reembolsa
                    pagamentos já efetuados.
                  </p>

                  {loading ? (
                    <p>A carregar…</p>
                  ) : user ? (
                    <>
                      <p>
                        Conta: <span className="text-foreground font-medium">{user.email}</span>
                      </p>
                      <div className="space-y-2">
                        <label htmlFor="confirm" className="block text-foreground font-medium">
                          Escreve APAGAR para confirmar
                        </label>
                        <input
                          id="confirm"
                          value={confirmation}
                          onChange={(e) => setConfirmation(e.target.value)}
                          autoComplete="off"
                          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none focus:border-primary"
                        />
                      </div>
                      {error ? <p className="text-destructive">{error}</p> : null}
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={!canDelete}
                        className="inline-flex items-center justify-center rounded-xl bg-destructive px-6 py-3 font-semibold text-destructive-foreground transition-opacity disabled:opacity-50"
                      >
                        {busy ? "A apagar…" : "Apagar definitivamente"}
                      </button>
                    </>
                  ) : (
                    <p>
                      <Link to="/login" className="text-primary underline">
                        Inicia sessão
                      </Link>{" "}
                      para apagar a tua conta.
                    </p>
                  )}
                </>
              )}
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              Também podes apagar a conta na app: Perfil → Apagar conta.
            </p>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
}
