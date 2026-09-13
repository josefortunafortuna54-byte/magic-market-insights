import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, Sparkles, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { askAssistant, type AiMessage } from "@/lib/aiSupport";

const STORAGE_KEY = "tmt_ai_chat";

const SUGGESTION_KEYS = [
  "suporteIa.suggestion1",
  "suporteIa.suggestion2",
  "suporteIa.suggestion3",
  "suporteIa.suggestion4",
] as const;

function isAiMessage(v: unknown): v is AiMessage {
  return (
    !!v &&
    typeof v === "object" &&
    "text" in v &&
    typeof (v as AiMessage).text === "string" &&
    ((v as AiMessage).role === "user" || (v as AiMessage).role === "model")
  );
}

function readChat(): AiMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isAiMessage).slice(-40) : [];
  } catch {
    return [];
  }
}

function writeChat(messages: AiMessage[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {
    return;
  }
}

export default function SuporteIa() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(readChat());
  }, []);

  useEffect(() => {
    writeChat(messages);
  }, [messages]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  const send = useCallback(
    async (raw?: string) => {
      const text = (raw ?? input).trim();
      if (!text || sending) return;
      setInput("");
      setError(null);
      const next: AiMessage[] = [...messages, { role: "user", text }];
      setMessages(next);
      setSending(true);
      const result = await askAssistant(next);
      if (result.error) {
        setError(result.error);
      } else {
        setMessages([...next, { role: "model", text: result.reply }]);
        setRemaining(result.remainingChat ?? null);
      }
      setSending(false);
    },
    [input, sending, messages],
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return (
    <Layout>
      <section className="h-[calc(100vh-5rem)] flex flex-col">
        <div className="container mx-auto px-4 max-w-2xl flex-1 min-h-0 flex flex-col">
          <div className="flex items-center gap-3 py-4 border-b border-border">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-xl font-bold leading-tight">{t("suporteIa.title")}</h1>
              <p className="text-xs text-muted-foreground truncate">
                {remaining !== null
                  ? t("suporteIa.remainingChat", { count: remaining })
                  : t("suporteIa.subtitle")}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={clearChat} aria-label={t("suporteIa.clear")}>
              <Trash2 className="h-4 w-4" />
              {t("suporteIa.clear")}
            </Button>
          </div>

          <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto py-4 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <h2 className="font-display text-xl font-bold">{t("suporteIa.welcome")}</h2>
                <p className="text-sm text-muted-foreground">
                  {t("suporteIa.welcomeDesc")}
                </p>
                <div className="flex flex-col items-center gap-2 pt-2">
                  {SUGGESTION_KEYS.map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => send(t(k))}
                      disabled={sending}
                      className="px-4 py-2 rounded-xl bg-card border border-primary/35 text-primary text-sm font-semibold hover:opacity-70 disabled:opacity-50 transition-opacity">
                      {t(k)}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => <MessageBubble key={`${i}-${m.role}`} item={m} />)
            )}
          </div>

          {sending ? (
            <div className="flex items-center gap-2 py-3">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center shrink-0">
                <Sparkles className="h-3 w-3 text-white" />
              </div>
              <div className="rounded-lg bg-card border border-border px-4 py-2 min-w-14 flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="flex items-start gap-2 mb-3 bg-destructive/10 border border-destructive/40 rounded-lg p-3">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive flex-1">{error}</p>
            </div>
          ) : null}

          <div className="flex items-center gap-2 py-3 border-t border-border">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={t("suporteIa.placeholder")}
              maxLength={2000}
              className="flex-1"
            />
            <Button onClick={() => send()} disabled={!input.trim() || sending} aria-label={t("suporteIa.send")}>
              {t("suporteIa.send")}
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
}

function MessageBubble({ item }: { item: AiMessage }) {
  if (item.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[78%] rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm leading-relaxed whitespace-pre-wrap">
          {item.text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-end gap-2 justify-start">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center shrink-0">
        <Sparkles className="h-3 w-3 text-white" />
      </div>
      <div className="max-w-[78%] rounded-xl bg-card border border-border px-4 py-2 text-sm leading-relaxed whitespace-pre-wrap">
        {item.text}
      </div>
    </div>
  );
}