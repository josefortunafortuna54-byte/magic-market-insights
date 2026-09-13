import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useSubscription } from "@/hooks/useSubscription";
import { Layout } from "@/components/layout/Layout";
import { PremiumLock } from "@/components/signals/PremiumLock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isAdminEmail } from "@/lib/admin";
import { supabase } from "@/lib/supabaseClient";

export default function ComunidadeNovoCanal() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isPremium, loading: subLoading } = useSubscription();
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);

  if (!subLoading && !isPremium && !isAdminEmail(user?.email)) {
    return (
      <Layout noFooter>
        <section className="pt-8 pb-24">
          <div className="container mx-auto max-w-2xl px-4">
            <button
              type="button"
              onClick={() => navigate("/comunidade")}
              className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
              {t("common.back")}
            </button>
            <PremiumLock title={t("workspace.newChannel")} description={t("workspace.newChannelLockDesc")} />
          </div>
        </section>
      </Layout>
    );
  }

  if (subLoading) {
    return (
      <Layout noFooter>
        <section className="flex items-center justify-center gap-3 py-24">
          <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        </section>
      </Layout>
    );
  }

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "")
    .trim();

  const canSave = slug.length >= 2 && displayName.trim().length >= 1 && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    const { error } = await supabase.from("channels").insert({
      name: slug,
      display_name: displayName.trim(),
      type: "regular",
    });
    setSaving(false);
    if (error) {
      if (error.code === "23505") {
        toast.error(t("workspace.channelNameExists"));
      } else {
        toast.error(t("workspace.channelCreateFailed"), { description: error.message });
      }
      return;
    }
    const { data: ch } = await supabase
      .from("channels")
      .select("id")
      .eq("name", slug)
      .maybeSingle();
    toast.success(t("workspace.channelCreated"));
    navigate(ch?.id ? `/comunidade/canais/${ch.id}` : "/comunidade", { replace: true });
  };

  return (
    <Layout noFooter>
      <section className="pt-8 pb-24">
        <div className="container mx-auto max-w-2xl px-4">
          <h1 className="mb-4 font-display text-xl font-bold">{t("workspace.newChannel")}</h1>
          <p className="mb-4 text-sm text-muted-foreground">{t("workspace.newChannelHint")}</p>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="channel-name">{t("workspace.channelName")}</Label>
              <Input
                id="channel-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder={t("workspace.channelSlugPlaceholder")}
              />
              {slug.length > 0 && slug.length < 2 ? (
                <p className="text-xs text-destructive">{t("workspace.channelNameMin")}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="channel-display">{t("workspace.channelName")}</Label>
              <Input
                id="channel-display"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t("workspace.channelDisplayNamePlaceholder")}
              />
            </div>

            <Button className="w-full" onClick={save} disabled={!canSave}>
              {saving ? t("workspace.channelCreating") : t("workspace.channelCreate")}
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
}