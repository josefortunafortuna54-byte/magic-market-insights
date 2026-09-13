import { useMemo, useRef, useState } from "react";
import { Loader2, ImagePlus, Send, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { UserAvatar } from "@/components/community/UserAvatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { uploadCommunityImage } from "@/lib/community";
import type { UserProfile } from "@/lib/types";

export function Composer({
  onSend,
  disabled,
  placeholder,
  profiles,
  currentUserId,
  initialImage,
}: {
  onSend: (text: string, imageUrl?: string | null, mentionIds?: string[]) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  profiles: Record<string, UserProfile>;
  currentUserId: string | null;
  initialImage?: { file: File; url: string } | null;
}) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [selectionStart, setSelectionStart] = useState(0);
  const [mentionIds, setMentionIds] = useState<string[]>([]);
  const [image, setImage] = useState<{ file: File; url: string } | null>(() =>
    initialImage ? { file: initialImage.file, url: initialImage.url } : null,
  );
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const activeMention = useMemo(() => {
    const before = text.slice(0, selectionStart);
    const at = before.lastIndexOf("@");
    if (at < 0) return null;
    if (at > 0 && !/\s/.test(before[at - 1])) return null;
    const after = text.slice(at + 1);
    if (/\s/.test(after)) return null;
    return { at, query: after.toLowerCase() };
  }, [text, selectionStart]);

  const suggestions = useMemo(() => {
    if (!activeMention) return [];
    const q = activeMention.query;
    return Object.values(profiles)
      .filter((p) => p.user_id !== currentUserId)
      .filter((p) => p.display_name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [activeMention, profiles, currentUserId]);

  const selectMention = (p: UserProfile) => {
    if (!activeMention) return;
    const inserted = `${text.slice(0, activeMention.at)}@${p.display_name} ${text.slice(selectionStart)}`;
    setText(inserted);
    setSelectionStart(inserted.length);
    setMentionIds((prev) => (prev.includes(p.user_id) ? prev : [...prev, p.user_id]));
  };

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImage({ file, url: URL.createObjectURL(file) });
  };

  const send = async () => {
    if (!user || sending || uploading || disabled) return;
    if (!text.trim() && !image) return;
    setSending(true);
    let imageUrl: string | null = null;
    if (image) {
      setUploading(true);
      imageUrl = await uploadCommunityImage(user.id, image.file);
      setUploading(false);
      if (!imageUrl) {
        setSending(false);
        toast.error(t("workspace.imageUploadFailedTitle"), {
          description: t("workspace.imageUploadFailedBody"),
        });
        return;
      }
    }
    const trimmed = text.trim();
    const validMentions = mentionIds.filter((id) => {
      const name = profiles[id]?.display_name;
      return !!name && trimmed.includes(`@${name}`);
    });
    await onSend(trimmed, imageUrl, validMentions);
    setText("");
    setImage(null);
    setMentionIds([]);
    setSending(false);
  };

  const canSend = (!!text.trim() || !!image) && !disabled;

  return (
    <div className="space-y-2">
      {activeMention && suggestions.length > 0 ? (
        <div className="rounded-2xl border border-border bg-card p-2">
          <p className="px-2 pb-1 text-[11px] font-bold text-muted-foreground">{t("workspace.mentionHeader")}</p>
          <div className="flex flex-col">
            {suggestions.map((p) => (
              <button
                key={p.user_id}
                type="button"
                onClick={() => selectMention(p)}
                className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-left hover:bg-muted/60"
              >
                <UserAvatar name={p.display_name} avatarUrl={p.avatar_url} role={p.role} size={24} />
                <span className="truncate text-sm font-semibold text-foreground">{p.display_name}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {image ? (
        <div className="relative inline-block">
          <img src={image.url} alt="" className="h-16 w-16 rounded-xl border border-border object-cover" />
          <button
            type="button"
            onClick={() => setImage(null)}
            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-background border border-border text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickFile} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex shrink-0 items-center justify-center rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:opacity-50"
        >
          <ImagePlus className="h-5 w-5" />
        </button>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onSelect={(e) => setSelectionStart(e.currentTarget.selectionStart)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (canSend && !sending && !uploading) void send();
            }
          }}
          placeholder={placeholder || t("workspace.composerPlaceholder")}
          rows={1}
          className="min-h-[42px] max-h-[100px] flex-1 resize-none rounded-2xl border border-border bg-secondary/60 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
        />

        <Button
          onClick={send}
          disabled={!canSend || sending || uploading}
          className="shrink-0"
        >
          {sending || uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {sending || uploading ? t("common.sending") : t("common.send")}
        </Button>
      </div>

      {uploading ? (
        <p className="text-xs text-muted-foreground">{t("workspace.uploadingImage")}</p>
      ) : null}
    </div>
  );
}