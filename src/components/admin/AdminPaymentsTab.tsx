import { useState } from "react";
import { Wallet, Check, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { getErrorMessage } from "@/lib/utils";

export interface AdminPaymentRow {
  id: string;
  user_id: string;
  email: string | null;
  method: "binance" | "multicaixa";
  currency: "usd" | "aoa";
  amount: number;
  transaction_id: string;
  proof_url: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  created_at: string;
}

interface Props {
  payments: AdminPaymentRow[];
  onRefresh: () => Promise<void>;
}

const METHOD_LABEL: Record<AdminPaymentRow["method"], string> = {
  binance: "Binance",
  multicaixa: "Multicaixa Express",
};

const STATUS_STYLE: Record<AdminPaymentRow["status"], string> = {
  pending: "bg-warning/20 text-warning",
  approved: "bg-success/20 text-success",
  rejected: "bg-destructive/20 text-destructive",
  cancelled: "bg-secondary text-muted-foreground",
};

export function AdminPaymentsTab({ payments, onRefresh }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const review = async (id: string, status: "approved" | "rejected") => {
    if (!confirm(`Confirmar ${status === "approved" ? "aprovação (ativa Premium +30 dias)" : "rejeição"} deste pagamento?`)) return;
    setBusyId(id);
    try {
      const { error } = await supabase.rpc("review_payment_request", { payment_id: id, new_status: status });
      if (error) throw new Error(error.message);
      alert(status === "approved" ? "✅ Premium ativado!" : "Pagamento rejeitado.");
      await onRefresh();
    } catch (e: unknown) { alert("Erro: " + getErrorMessage(e)); }
    setBusyId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" /> Pagamentos Manuais ({payments.length})
        </h2>
        <button onClick={onRefresh} className="text-xs text-muted-foreground hover:text-foreground">Atualizar</button>
      </div>

      {payments.length === 0 ? (
        <p className="text-sm text-muted-foreground p-4 glass-card">Sem pagamentos manuais por enquanto.</p>
      ) : (
        <div className="glass-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                {["Data", "Email", "Método", "Valor", "Transação", "Comprovativo", "Estado", "Ações"].map(h => (
                  <th key={h} className="text-left p-3 text-xs text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} className="border-b border-border/30 hover:bg-secondary/20 align-top">
                  <td className="p-3 text-xs whitespace-nowrap">{new Date(p.created_at).toLocaleDateString("pt-PT")}</td>
                  <td className="p-3 text-xs">{p.email || p.user_id.slice(0, 8)}</td>
                  <td className="p-3 text-xs">{METHOD_LABEL[p.method]}</td>
                  <td className="p-3 text-xs whitespace-nowrap">{p.currency === "usd" ? `$${p.amount}` : `${p.amount} Kz`}</td>
                  <td className="p-3 text-xs font-mono">{p.transaction_id}</td>
                  <td className="p-3">
                    {p.proof_url ? (
                      <button onClick={() => setPreview(p.proof_url)}
                        className="text-xs text-primary hover:underline">Ver comprovativo</button>
                    ) : "—"}
                  </td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-1 rounded-lg font-medium ${STATUS_STYLE[p.status]}`}>{p.status}</span>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {p.status === "pending" ? (
                      <div className="flex gap-2">
                        <button onClick={() => review(p.id, "approved")} disabled={busyId === p.id}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-success/20 text-success text-xs font-medium hover:opacity-80 disabled:opacity-50">
                          <Check className="h-3 w-3" /> Aprovar
                        </button>
                        <button onClick={() => review(p.id, "rejected")} disabled={busyId === p.id}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-destructive/20 text-destructive text-xs font-medium hover:opacity-80 disabled:opacity-50">
                          <X className="h-3 w-3" /> Rejeitar
                        </button>
                      </div>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="relative max-w-lg w-full">
            <img src={preview} alt="Comprovativo" className="rounded-xl w-full max-h-[80vh] object-contain bg-black" />
            <button onClick={() => setPreview(null)}
              className="absolute top-2 right-2 bg-secondary rounded-full w-8 h-8 flex items-center justify-center text-sm hover:opacity-80">✕</button>
          </div>
        </div>
      )}
    </div>
  );
}
