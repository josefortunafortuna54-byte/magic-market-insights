import { useEffect, useState } from "react";
import { AlertCircle, KeyRound, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { verifyAdminCode } from "@/lib/adminGate";

interface AdminCodePromptProps {
  open: boolean;
  description: string;
  onCancel: () => void;
  onConfirmed: () => void;
}

export function AdminCodePrompt({
  open,
  description,
  onCancel,
  onConfirmed,
}: AdminCodePromptProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (open) {
      setCode("");
      setError(null);
      setVerifying(false);
    }
  }, [open]);

  const submit = async () => {
    if (verifying || code.trim().length < 4) return;
    setVerifying(true);
    setError(null);
    try {
      const ok = await verifyAdminCode(code.trim());
      if (!ok) {
        setCode("");
        setError("Código de admin incorreto. Tenta novamente.");
        return;
      }
      onConfirmed();
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Confirmação de admin
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">{description}</p>

        <div className="space-y-2">
          <label className="block text-xs font-semibold tracking-wide text-muted-foreground">
            CÓDIGO DE ADMIN
          </label>
          <Input
            type="password"
            inputMode="numeric"
            maxLength={6}
            autoFocus
            placeholder="••••••"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
            }}
            className="text-center tracking-[0.4em]"
          />
          {error ? (
            <p className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5" /> {error}
            </p>
          ) : null}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={verifying}>
            Cancelar
          </Button>
          <Button
            className="flex-1"
            onClick={() => void submit()}
            disabled={verifying || code.trim().length < 4}
          >
            <KeyRound className="h-4 w-4" />
            {verifying ? "A verificar…" : "Confirmar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


