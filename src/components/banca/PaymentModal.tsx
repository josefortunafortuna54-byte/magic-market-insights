import { useRef, useState } from "react";
import { Check, Copy, ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PAYMENT_METHODS, PAYMENT_METHOD_ICONS, planLabel, type Currency, type PaymentMethod, type PaymentMethodInfo, type PlanId } from "@/lib/plans";
import { fileToReceipt, type ReceiptFile } from "@/lib/payments";

interface PaymentModalProps {
  plan: Exclude<PlanId, "free">;
  currency: Currency;
  price: string;
  onClose: () => void;
  onConfirm: (proof: ReceiptFile | null) => void;
  method?: PaymentMethod;
  onMethodSelect: (method: PaymentMethod | undefined) => void;
  availableMethods?: PaymentMethodInfo[];
  initialProof?: ReceiptFile | null;
  busy?: boolean;
  titleText?: string;
}

function MethodIcon({ method, className }: { method: PaymentMethodInfo; className?: string }) {
  const Icon = PAYMENT_METHOD_ICONS[method.icon];
  if (!Icon) return null;
  return <Icon className={className} />;
}

export function PaymentModal({
  plan,
  price,
  onClose,
  onConfirm,
  method,
  onMethodSelect,
  availableMethods = PAYMENT_METHODS,
  initialProof = null,
  busy = false,
  titleText,
}: PaymentModalProps) {
  const selectedMethod = method ? availableMethods.find((m) => m.id === method) : null;
  const [proof, setProof] = useState<ReceiptFile | null>(initialProof);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerResolve = useRef<((f: ReceiptFile | null) => void) | null>(null);

  const pickProof = (): Promise<ReceiptFile | null> =>
    new Promise((resolve) => {
      if (!inputRef.current) {
        resolve(null);
        return;
      }
      pickerResolve.current = resolve;
      inputRef.current.value = "";
      inputRef.current.click();
    });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    const receipt = file ? fileToReceipt(file) : null;
    if (pickerResolve.current) {
      pickerResolve.current(receipt);
      pickerResolve.current = null;
    }
    if (receipt) setProof(receipt);
  };

  const copyValue = async () => {
    if (!selectedMethod) return;
    try {
      await navigator.clipboard.writeText(selectedMethod.copyValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar o número");
    }
  };

  const handleConfirm = async () => {
    if (proof) {
      onConfirm(proof);
      return;
    }
    const receipt = await pickProof();
    if (receipt) {
      setProof(receipt);
      onConfirm(receipt);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !busy) onClose(); }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <DialogTitle className="font-display text-xl">
              {titleText ?? `Pagamento: ${planLabel(plan)}`}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={onClose}
              disabled={busy}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">Valor: {price}/mês</p>
        </DialogHeader>

        {!method ? (
          <div className="py-2">
            <p className="text-sm text-muted-foreground mb-3">Escolha o método:</p>
            <div className="grid grid-cols-2 gap-3">
              {availableMethods.map((m) => {
                return (
                  <button
                    key={m.id}
                    onClick={() => onMethodSelect(m.id)}
                    style={{ borderColor: m.color, borderWidth: 2 }}
                    className="flex flex-col items-center gap-2 rounded-2xl bg-card p-4 hover:opacity-90 transition-opacity"
                  >
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${m.color}1A`, color: m.color }}
                    >
                      <MethodIcon method={m} className="h-7 w-7" />
                    </div>
                    <span className="text-sm font-bold" style={{ color: m.color }}>
                      {m.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-4 rounded-xl border border-border bg-secondary/50 p-4">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${selectedMethod?.color ?? "#6366F1"}1A`, color: selectedMethod?.color }}
              >
                {selectedMethod ? <MethodIcon method={selectedMethod} className="h-6 w-6" /> : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold" style={{ color: selectedMethod?.color }}>
                  {selectedMethod?.label}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {selectedMethod?.getDetails()}
                </p>
              </div>
              <Button
                variant="link"
                size="sm"
                className="p-0 h-auto text-primary"
                onClick={() => onMethodSelect(undefined)}
                disabled={busy}
              >
                Alterar
              </Button>
            </div>

            <div className="rounded-xl border border-success/40 bg-secondary/50 p-4 space-y-2">
              <p className="text-center text-2xl font-extrabold tabular-nums tracking-wide">
                {selectedMethod?.copyValue}
              </p>
              <Button variant="success" className="mx-auto flex" onClick={copyValue} disabled={busy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copiado" : "Copiar"}
              </Button>
            </div>

            <div className="rounded-xl border border-border bg-secondary/50 p-4">
              <p className="text-center text-base font-bold text-accent">
                Pague para o número/UID acima
              </p>
            </div>

            {!proof ? (
              <button
                onClick={() => pickProof()}
                disabled={busy}
                className="flex w-full items-center gap-3 rounded-xl border border-dashed border-border bg-secondary/50 p-4 text-left hover:opacity-90 transition-opacity"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                  <ImagePlus className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-primary">Anexar comprovativo</p>
                  <p className="text-xs text-muted-foreground">Galeria ou ficheiros</p>
                </div>
              </button>
            ) : (
              <div className="flex items-center gap-4 rounded-xl border border-success/40 bg-secondary/50 p-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-background">
                  <img src={proof.uri} alt="Comprovativo" className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-success">Comprovativo anexado</p>
                  <p className="truncate text-xs text-muted-foreground">{proof.fileName}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setProof(null)}
                  disabled={busy}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <p className="text-center text-xs text-muted-foreground leading-relaxed">
              Após o pagamento, envie o comprovante…
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2 flex-col sm:flex-col">
          <Button variant="outline" className="w-full" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          {method ? (
            <Button variant="premium" className="w-full" onClick={handleConfirm} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              ENVIAR O COMPROVATIVO
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}