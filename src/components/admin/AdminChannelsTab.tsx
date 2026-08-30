import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SearchBar } from "@/components/admin/SearchBar";
import { useAdminSearch } from "@/hooks/useAdminSearch";
import {
  deleteChannel,
  listChannels,
  toggleChannelPremium,
  updateChannel,
  type AdminChannel,
} from "@/lib/adminApi";
import { timeAgo } from "@/lib/format";

export function AdminChannelsTab() {
  const [channels, setChannels] = useState<AdminChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [editCh, setEditCh] = useState<AdminChannel | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const { searchQuery, setSearchQuery, filteredData } = useAdminSearch({
    data: channels as (AdminChannel & Record<string, unknown>)[],
    searchFields: ["display_name", "name"],
  });

  const load = useCallback(async () => {
    try {
      setChannels(await listChannels());
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

  const openEdit = (ch: AdminChannel) => {
    setEditCh(ch);
    setEditName(ch.display_name);
    setEditDesc(ch.description || "");
  };

  const handleSaveEdit = async () => {
    if (!editCh) return;
    await runAction(
      editCh.id,
      () => updateChannel(editCh.id, { display_name: editName, description: editDesc }),
      "Canal atualizado!",
    );
    setEditCh(null);
  };

  // Mobile's Alert has a title (Remover Premium / Tornar Premium) plus the
  // message `"${display_name}"?`. window.confirm has no title, so the title is
  // conveyed as a prefix of the confirm message.
  const handleTogglePremium = (ch: AdminChannel) => {
    const title = ch.is_premium ? "Remover Premium" : "Tornar Premium";
    if (!window.confirm(`${title}?\n"${ch.display_name}"?`)) return;
    void runAction(ch.id, async () => { await toggleChannelPremium(ch.id); }, "Atualizado");
  };

  // Mobile's Alert is "Apagar Canal" (title) + `"${display_name}"? Mensagens
  // serão apagadas.` (message). window.confirm has no title, so it is conveyed
  // as a prefix. Success toast is "Apagado" (NOT "Eliminado").
  const handleDelete = (ch: AdminChannel) => {
    if (!window.confirm(`Apagar Canal?\n"${ch.display_name}"? Mensagens serão apagadas.`)) return;
    void runAction(ch.id, () => deleteChannel(ch.id), "Apagado");
  };

  const renderChannel = (ch: AdminChannel) => (
    <Card key={ch.id}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{ch.display_name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              /{ch.name} • {ch.type} • {timeAgo(ch.created_at)}
            </p>
            {ch.description ? (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{ch.description}</p>
            ) : null}
          </div>
          {ch.is_premium ? (
            <Badge className="shrink-0 border-amber-400/30 bg-amber-400/10 text-amber-400">
              ⭐ PREMIUM
            </Badge>
          ) : null}
        </div>
        <div className="mt-3 flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1"
            disabled={busyId === ch.id}
            onClick={() => openEdit(ch)}
          >
            Editar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1"
            disabled={busyId === ch.id}
            onClick={() => handleTogglePremium(ch)}
          >
            {ch.is_premium ? "Rem. Premium" : "Premium"}
          </Button>
          {ch.type !== "pair" ? (
            <Button
              variant="destructive"
              size="sm"
              className="flex-1"
              disabled={busyId === ch.id}
              onClick={() => handleDelete(ch)}
            >
              Apagar
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );

  const regular = filteredData.filter((ch) => ch.type === "regular");
  const pairRooms = filteredData.filter((ch) => ch.type === "pair");

  return (
    <div className="space-y-4">
      <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Pesquisar canais..." />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Canais Regulares ({regular.length})</p>
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
      ) : (
        <div className="space-y-2">
          {regular.map(renderChannel)}
          <p className="pt-2 text-sm text-muted-foreground">Pair Rooms ({pairRooms.length})</p>
          {pairRooms.map(renderChannel)}
        </div>
      )}

      <Dialog open={!!editCh} onOpenChange={(open) => !open && setEditCh(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Canal</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Nome"
            />
            <Textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              placeholder="Descrição"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditCh(null)}>
              Cancelar
            </Button>
            <Button onClick={() => void handleSaveEdit()} disabled={busyId === editCh?.id}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
