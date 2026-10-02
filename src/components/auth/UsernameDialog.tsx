import { useState } from "react";
import { AtSign, Lock, UserCircle } from "lucide-react";
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
import { createAccountWithUsername, signInWithUsername } from "@/lib/usernameAuth";
import { useTranslation } from "react-i18next";

const MIN_PASSWORD = 8;

const USERNAME_RE = /^[a-z0-9][a-z0-9._-]*[a-z0-9]$/;

// Mesma regra do edge function e do CHECK da base de dados. 'wa' seguido de
// digitos esta reservado para os emails sinteticos de WhatsApp: um username
// assim colidiria com uma conta real.
function isValidUsername(value: string): boolean {
  if (value.length < 3 || value.length > 30) return false;
  if (!USERNAME_RE.test(value)) return false;
  return !/^wa\d+$/.test(value);
}

type Mode = "signin" | "create";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function UsernameDialog({ open, onOpenChange, onSuccess }: Props) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setUsername("");
    setPassword("");
    setError("");
    setMode("signin");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = username.trim().toLowerCase();

    if (!isValidUsername(normalized)) {
      setError(t("auth.usernameInvalid"));
      return;
    }
    if (password.length < MIN_PASSWORD) {
      setError(t("authErrors.passwordTooShort"));
      return;
    }

    setLoading(true);
    setError("");
    const { error: err } =
      mode === "signin"
        ? await signInWithUsername(normalized, password)
        : await createAccountWithUsername(normalized, password);
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
            <UserCircle className="h-5 w-5 text-primary" />
            {mode === "signin" ? t("auth.usernameSignInTitle") : t("auth.usernameCreateTitle")}
          </DialogTitle>
          <DialogDescription>{t("auth.usernamePrompt")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">{t("auth.usernameLabel")}</Label>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t("auth.usernamePlaceholder")}
                className="pl-10"
                autoCapitalize="none"
                autoCorrect="false"
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username-password">{t("auth.password")}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="username-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                required
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" variant="hero" className="w-full" disabled={loading}>
            {loading
              ? t("auth.loggingIn")
              : mode === "signin"
                ? t("auth.signInWithUsername")
                : t("auth.createWithUsername")}
          </Button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "signin" ? "create" : "signin");
              setError("");
            }}
            className="w-full text-sm text-primary hover:underline">
            {mode === "signin" ? t("auth.usernameNoAccount") : t("auth.usernameHasAccount")}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
