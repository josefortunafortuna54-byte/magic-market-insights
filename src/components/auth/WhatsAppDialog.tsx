import { useState } from "react";
import { KeyRound, MessageCircle, Phone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestWhatsAppCode, verifyWhatsAppCode } from "@/lib/whatsappAuth";
import { useTranslation } from "react-i18next";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function WhatsAppDialog({ open, onOpenChange, onSuccess }: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sentPhone, setSentPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const digits = () => phone.replace(/\D/g, "");

  const reset = () => {
    setStep("phone");
    setPhone("");
    setCode("");
    setSentPhone("");
    setError("");
  };

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const value = digits();
    if (value.length < 8 || value.length > 15) {
      setError(t("auth.invalidPhone"));
      return;
    }

    setLoading(true);
    setError("");
    const { error: err } = await requestWhatsAppCode(`+${value}`);
    setLoading(false);

    if (err) {
      setError(err);
      return;
    }
    setSentPhone(`+${value}`);
    setStep("code");
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code.trim())) {
      setError(t("auth.codeInvalid"));
      return;
    }

    setLoading(true);
    setError("");
    const { error: err } = await verifyWhatsAppCode(sentPhone, code.trim());
    setLoading(false);

    if (err) {
      setError(err);
      return;
    }
    reset();
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-[#25D366]" />
            {t("auth.enterWhatsapp")}
          </DialogTitle>
          <DialogDescription>
            {step === "phone"
              ? t("auth.whatsappPrompt")
              : t("auth.codeSent", { phone: sentPhone })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={step === "phone" ? sendCode : verify} className="space-y-4">
          {step === "phone" ? (
            <div className="space-y-2">
              <Label htmlFor="wa-phone">{t("auth.phoneLabel")}</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="wa-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t("auth.phonePlaceholder")}
                  className="pl-10"
                  autoComplete="tel"
                  required
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="wa-code">{t("auth.codeLabel")}</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="wa-code"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={t("auth.codePlaceholder")}
                  className="pl-10 tracking-[0.4em]"
                  autoFocus
                  required
                />
              </div>
              <button
                type="button"
                onClick={() => sendCode()}
                className="w-full text-xs text-primary hover:underline">
                {t("auth.resendCode")}
              </button>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" variant="hero" className="w-full" disabled={loading}>
            {loading
              ? t("auth.loggingIn")
              : step === "phone"
                ? t("auth.sendCode")
                : t("auth.verifyCode")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
