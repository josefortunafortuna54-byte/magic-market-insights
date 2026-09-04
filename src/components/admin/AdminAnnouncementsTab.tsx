import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteAnnouncement,
  listAnnouncements,
  upsertAnnouncement,
  type AdminAnnouncement,
} from "@/lib/adminApi";
import { timeAgo } from "@/lib/format";

// Port of mobile AnnouncementsPanel.tsx — all copy is hardcoded PT literal
// (there are no admin.newAnnouncement / admin.editAnnouncement keys).
interface Draft {
  id?: string;
  title: string;
  body: string;
  image_url: string;
  link: string;
  link_label: string;
  sort_order: string;
  is_active: boolean;
}

const EMPTY_DRAFT: Draft = {
  title: "",
  body: "",
  image_url: "",
  link: "",
  link_label: "",
  sort_order: "0",
  is_active: true,
};

export function AdminAnnouncementsTab() {
  const [items, setItems] = useState<AdminAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await listAnnouncements();
      setItems([...list].sort((a, b) => a.sort_order - b.sort_order));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = async (id: string, fn: () => Promise<void>, success: string) => {
    setBusyId(id);
    try {
      await fn();
      toast.success(success);
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setBusyId(null);
    }
  };

  const handleSave = async () => {
    if (!draft || !draft.title.trim()) return;
    setSaving(true);
    try {
      await upsertAnnouncement({
        id: draft.id,
        title: draft.title.trim(),
        body: draft.body.trim() || null,
        image_url: draft.image_url.trim() || null,
        link: draft.link.trim() || null,
        link_label: draft.link_label.trim() || null,
        is_active: draft.is_active,
        sort_order: parseInt(draft.sort_order, 10) || 0,
      });
      toast.success(draft.id ? "Anúncio atualizado!" : "Anúncio criado!");
      setDraft(null);
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (a: AdminAnnouncement) => {
    setDraft({
      id: a.id,
      title: a.title,
      body: a.body ?? "",
      image_url: a.image_url ?? "",
      link: a.link ?? "",
      link_label: a.link_label ?? "",
      sort_order: String(a.sort_order ?? 0),
      is_active: a.is_active,
    });
  };

  const handleToggle = (a: AdminAnnouncement) => {
    void runAction(a.id, async () => { await upsertAnnouncement({ ...a, is_active: !a.is_active }); }, "Atualizado");
  };

  // Mobile's Alert has a title (Apagar Anúncio) plus the message `"${title}"?`.
  // window.confirm has no title, so it is conveyed as a prefix of the message.
  const handleDelete = (a: AdminAnnouncement) => {
    if (!window.confirm(`Apagar Anúncio?\n"${a.title}"?`)) return;
    void runAction(a.id, () => deleteAnnouncement(a.id), "Apagado");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button onClick={() => setDraft({ ...EMPTY_DRAFT })}>
          + Novo Anúncio
        </Button>
        <Button variant="secondary" size="sm" onClick={() => void load()}>
          Atualizar
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent>
            <p className="py-8 text-center text-sm text-muted-foreground">A carregar...</p>
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent>
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum anúncio. Crie pelo menos dois para o card rodar automaticamente.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{a.title}</p>
                    {a.body ? (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{a.body}</p>
                    ) : null}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      #{a.sort_order} • {timeAgo(a.created_at)}
                      {a.link ? ` • ${a.link}` : ""}
                    </p>
                  </div>
                  {!a.is_active ? (
                    <Badge className="shrink-0 bg-muted text-muted-foreground">Inativo</Badge>
                  ) : null}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    disabled={busyId === a.id}
                    onClick={() => openEdit(a)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    disabled={busyId === a.id}
                    onClick={() => handleToggle(a)}
                  >
                    {a.is_active ? "Desativar" : "Ativar"}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    disabled={busyId === a.id}
                    onClick={() => handleDelete(a)}
                  >
                    Apagar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!draft} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Editar Anúncio" : "Novo Anúncio"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <Input
              value={draft?.title ?? ""}
              onChange={(e) => setDraft((d) => d && { ...d, title: e.target.value })}
              placeholder="Título *"
            />
            <Textarea
              value={draft?.body ?? ""}
              onChange={(e) => setDraft((d) => d && { ...d, body: e.target.value })}
              placeholder="Descrição (opcional)"
              rows={3}
            />
            <Input
              value={draft?.image_url ?? ""}
              onChange={(e) => setDraft((d) => d && { ...d, image_url: e.target.value })}
              placeholder="URL da imagem (opcional)"
            />
            <Input
              value={draft?.link ?? ""}
              onChange={(e) => setDraft((d) => d && { ...d, link: e.target.value })}
              placeholder="Link ao tocar (/planos ou https://…)"
            />
            <Input
              value={draft?.link_label ?? ""}
              onChange={(e) => setDraft((d) => d && { ...d, link_label: e.target.value })}
              placeholder="Texto do botão do link (opcional)"
            />
            <Input
              value={draft?.sort_order ?? "0"}
              onChange={(e) => setDraft((d) => d && { ...d, sort_order: e.target.value.replace(/\D/g, "") })}
              placeholder="Ordem (0 = primeiro)"
              inputMode="numeric"
            />
            <div className="flex items-center gap-2">
              <Checkbox
                id="announcement-active"
                checked={draft?.is_active ?? true}
                onCheckedChange={(v) => setDraft((d) => d && { ...d, is_active: v === true })}
              />
              <label
                htmlFor="announcement-active"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Ativo
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Cancelar
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving || !draft?.title.trim()}>
              {saving ? "A guardar..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}