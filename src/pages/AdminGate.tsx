import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router-dom";
import { ShieldAlert, ShieldCheck, ChevronLeft, KeyRound, AlertCircle } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminEmail } from "@/lib/admin";
import { isAdminUnlocked, unlockAdmin, verifyAdminCode } from "@/lib/adminGate";

export default function AdminGate() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!user || !isAdminEmail(user.email)) {
    return (
      <Layout noFooter>
        <section className="flex min-h-[calc(100vh-4rem)] items-center justify-center py-12">
          <div className="container mx-auto max-w-md px-4">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <ShieldAlert className="h-8 w-8 text-destructive" />
              </div>
              <h1 className="font-display text-2xl font-bold">{t("admin.restrictedTitle")}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("admin.restrictedDesc")}
              </p>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  if (isAdminUnlocked()) {
    return <Navigate to="/admin" replace />;
  }

  const submit = async () => {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const ok = await verifyAdminCode(code.trim());
      if (ok) {
        unlockAdmin();
        navigate("/admin", { replace: true });
        return;
      }
    } catch {
      // fallthrough to error below
    } finally {
      setBusy(false);
    }
    setCode("");
    setError(t("admin.gateWrong"));
  };

  return (
    <Layout noFooter>
      <section className="pt-8 pb-24">
        <div className="container mx-auto max-w-md px-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            {t("common.back")}
          </button>

          <Card className="glass-card">
            <CardContent className="pt-6 pb-6 flex flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/40 bg-primary/10">
                <ShieldCheck className="h-8 w-8 text-primary" />
              </div>

              <h1 className="font-display text-2xl font-bold">{t("admin.gateTitle")}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("admin.gateSubtitle")}
              </p>

              <div className="mt-6 w-full text-left">
                <label className="mb-2 block text-xs font-semibold tracking-wide text-muted-foreground">
                  {t("admin.gateCodeLabel")}
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
                    if (e.key === "Enter") submit();
                  }}
                  className="text-center tracking-[0.4em]"
                />
              </div>

              {error ? (
                <Alert variant="destructive" className="mt-4 text-left">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <Button
                size="lg"
                className="mt-6 w-full"
                onClick={submit}
                disabled={busy}
              >
                {busy ? t("admin.checkingAccess") : (
                  <>
                    <KeyRound className="h-4 w-4" />
                    {t("admin.gateCta")}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </Layout>
  );
}
