import { useMemo, useState } from "react";
import { MoreVertical, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { UserAvatar } from "@/components/community/UserAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { REACTION_EMOJIS, isUserOnline, reportMessage } from "@/lib/community";
import { timeAgo } from "@/lib/format";
import type { Message, MessageReaction, UserProfile } from "@/lib/types";

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const REPORT_OPTIONS = [
  { value: "Spam", labelKey: "workspace.reportReasonSpam" },
  { value: "Assédio", labelKey: "workspace.reportReasonHarassment" },
  { value: "Inadequado", labelKey: "workspace.reportReasonInappropriate" },
  { value: "Outro", labelKey: "workspace.reportReasonOther" },
] as const;

function MentionedText({ text, mentionNames }: { text: string; mentionNames: string[] }) {
  if (mentionNames.length === 0) return <p className="whitespace-pre-wrap break-words text-sm">{text}</p>;
  const names = [...mentionNames].sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`(${names.map((n) => `@${escapeRegex(n)}`).join("|")})`, "g");
  const parts = text.split(pattern);
  const isMention = (part: string) => names.some((n) => part === `@${n}`);
  return (
    <p className="whitespace-pre-wrap break-words text-sm">
      {parts.map((part, i) =>
        isMention(part) ? (
          <span key={i} className="font-bold text-primary">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </p>
  );
}

export function MessageBubble({
  message,
  reactions,
  mentionNames = [],
  profile,
  currentUserId,
  onToggleReaction,
  onRetry,
  onDelete,
  onEdit,
  onOpenProfile,
}: {
  message: Message;
  reactions: MessageReaction[];
  mentionNames?: string[];
  profile?: UserProfile;
  currentUserId: string | null;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onRetry: (message: Message) => void;
  onDelete: (message: Message) => void;
  onEdit: (message: Message, text: string) => void;
  onOpenProfile?: (userId: string) => void;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [showReactions, setShowReactions] = useState(false);

  const isOwn = message.user_id === currentUserId;
  const name = profile?.display_name || t("common.trader");
  const editable = isOwn && !message.boom_id && !message.pending && !message.failed;

  const grouped = useMemo(() => {
    const g = new Map<string, { count: number; mine: boolean }>();
    for (const r of reactions) {
      const row = g.get(r.emoji) || { count: 0, mine: false };
      row.count += 1;
      if (r.user_id === currentUserId) row.mine = true;
      g.set(r.emoji, row);
    }
    return [...g.entries()];
  }, [reactions, currentUserId]);

  const handleReport = async (reason: string) => {
    try {
      await reportMessage(message.id, reason);
      toast.success(t("workspace.reportSent"));
    } catch {
      toast.error(t("workspace.reportFailed"));
    }
  };

  const saveEdit = () => {
    if (!draft.trim()) return;
    onEdit(message, draft);
    setEditing(false);
    setDraft("");
  };

  return (
    <div className={`flex items-start gap-2 ${isOwn ? "justify-end" : ""}`}>
      {!isOwn ? (
        <UserAvatar
          name={name}
          avatarUrl={profile?.avatar_url || null}
          role={profile?.role}
          size={28}
          online={isUserOnline(profile)}
          onPress={profile && onOpenProfile ? () => onOpenProfile(profile.user_id) : undefined}
          className="mt-0.5"
        />
      ) : null}

      <div
        className={`relative max-w-[82%] rounded-2xl px-3 py-2 ${isOwn ? "bg-card border border-border" : "bg-secondary/70"}`}
      >
        <div className="mb-0.5 flex items-center gap-1.5">
          {!isOwn ? (
            <span
              className="cursor-pointer text-xs font-bold text-foreground hover:underline"
              onClick={() => profile && onOpenProfile && onOpenProfile(profile.user_id)}
            >
              {name}
            </span>
          ) : null}
          {profile?.role === "admin" ? (
            <span className="rounded-full bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-extrabold tracking-wide text-amber-400">
              {t("workspace.bot")}
            </span>
          ) : null}
          <span className="text-[11px] text-muted-foreground">{timeAgo(message.created_at)}</span>
          {message.edited_at ? (
            <span className="text-[11px] italic text-muted-foreground">{t("workspace.edited")}</span>
          ) : null}
        </div>

        {message.image_url ? (
          <img
            src={message.image_url}
            alt=""
            className="mb-1 max-h-40 w-auto max-w-full rounded-xl object-cover"
          />
        ) : null}

        {editing ? (
          <div className="space-y-1.5">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t("workspace.editPlaceholder")}
              autoFocus
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary/50 focus:outline-none"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={saveEdit} disabled={!draft.trim()}>
                {t("workspace.save")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setDraft(""); }}>
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        ) : message.text ? (
          <MentionedText text={message.text} mentionNames={mentionNames} />
        ) : null}

        {message.failed ? (
          <button
            type="button"
            onClick={() => onRetry(message)}
            className="mt-1 flex items-center gap-1 text-xs font-semibold text-destructive hover:underline"
          >
            <RefreshCw className="h-3 w-3" />
            {t("workspace.failed")} — {t("workspace.retry")}
          </button>
        ) : message.pending ? (
          <p className="mt-1 text-[11px] text-muted-foreground">{t("workspace.loading")}</p>
        ) : null}

        {editable || grouped.length > 0 || !isOwn ? (
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {grouped.map(([emoji, g]) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onToggleReaction(message.id, emoji)}
                className={`rounded-full px-2 py-0.5 text-xs ${
                  g.mine
                    ? "border border-primary/60 bg-primary/25 text-foreground"
                    : "bg-primary/10 text-foreground hover:bg-primary/20"
                }`}
              >
                {emoji} {g.count}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowReactions((s) => !s)}
              className="flex h-5 w-5 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground"
            >
              +
            </button>
            {showReactions ? (
              <span className="flex items-center gap-1">
                {REACTION_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      onToggleReaction(message.id, emoji);
                      setShowReactions(false);
                    }}
                    className="hover:scale-110 transition-transform text-sm"
                  >
                    {emoji}
                  </button>
                ))}
              </span>
            ) : null}
          </div>
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-muted-foreground opacity-0 transition-opacity hover:opacity-100 focus:opacity-100"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-40">
            {isOwn ? (
              <>
                {editable ? (
                  <DropdownMenuItem
                    onClick={() => { setDraft(message.text); setEditing(true); }}
                  >
                    {t("workspace.edit")}
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDelete(message)}
                >
                  {t("workspace.deleteMessage")}
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuLabel>{t("workspace.reportMessage")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {REPORT_OPTIONS.map((opt) => (
                  <DropdownMenuItem key={opt.value} onClick={() => handleReport(opt.value)}>
                    {t(opt.labelKey)}
                  </DropdownMenuItem>
                ))}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}