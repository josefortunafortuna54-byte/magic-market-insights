import { useEffect, useState } from "react";
import { Clock, Pause, Play } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabaseClient";
import type { Message } from "@/lib/types";

interface BoomTime {
  id: string;
  pair: string;
  boom_time: string;
  image_url: string;
  audio_url: string;
  confidence: number;
  result: "BUY" | "SELL" | "NEUTRO" | null;
  is_active: boolean;
  created_at: string;
}

function BoomStatusBadge({ boomTime }: { boomTime: string }) {
  const { t } = useTranslation();
  const now = Date.now();
  const boom = new Date(boomTime).getTime();
  const diff = boom - now;
  if (diff > 0 && diff <= 15 * 60 * 1000) {
    return (
      <span className="rounded-full border border-destructive/30 bg-destructive/20 px-2 py-0.5 text-[10px] font-extrabold text-destructive animate-pulse">
        {"🚨 "}{t("comunidade.liveBadge")}
      </span>
    );
  }
  if (diff > 0) {
    return (
      <span className="rounded-full border border-warning/30 bg-warning/20 px-2 py-0.5 text-[10px] font-extrabold text-warning">
        {"⏳ "}{t("comunidade.nextBoom")}
      </span>
    );
  }
  return (
    <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-extrabold text-muted-foreground">
      {t("comunidade.expired")}
    </span>
  );
}

function AudioPlayer({ url }: { url: string }) {
  const { t } = useTranslation();
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const toggle = () => {
    const audio = new Audio(url);
    audio.onplay = () => setPlaying(true);
    audio.onpause = () => setPlaying(false);
    audio.onended = () => { setPlaying(false); setProgress(0); };
    audio.ontimeupdate = () => setProgress((audio.currentTime / audio.duration) * 100);
    if (playing) audio.pause();
    else {
      audio.currentTime = audio.currentTime || 0;
      void audio.play();
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/50 px-3 py-2">
      <button
        type="button"
        onClick={toggle}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-white hover:opacity-90"
      >
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="ml-0.5 h-3.5 w-3.5" />}
      </button>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
        <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
      </div>
      <span className="text-[10px] text-muted-foreground">{t("comunidade.audio")}</span>
    </div>
  );
}

export function BoomMessage({ message }: { message: Message }) {
  const { t } = useTranslation();
  const [boom, setBoom] = useState<BoomTime | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("boom_times")
        .select("*")
        .eq("id", message.boom_id)
        .maybeSingle();
      if (!cancelled) setBoom(data as BoomTime | null);
    })();
    return () => { cancelled = true; };
  }, [message.boom_id]);

  if (!boom) {
    return <p className="text-xs text-muted-foreground">{t("workspace.loading")}</p>;
  }

  const d = new Date(boom.boom_time);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card/80 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="font-display text-lg font-bold text-primary">{boom.pair}</span>
          {boom.confidence ? (
            <span className="ml-2 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
              {t("comunidade.confidence", { value: boom.confidence })}
            </span>
          ) : null}
        </div>
        <BoomStatusBadge boomTime={boom.boom_time} />
      </div>

      <p className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        {d.toLocaleDateString("pt-PT")} {t("comunidade.at")} {String(d.getHours()).padStart(2, "0")}:
        {String(d.getMinutes()).padStart(2, "0")}
      </p>

      {boom.image_url ? (
        <img src={boom.image_url} alt="" className="mb-2 max-h-32 w-full rounded-xl object-cover" />
      ) : null}

      {boom.audio_url ? <AudioPlayer url={boom.audio_url} /> : null}

      {boom.result ? (
        <p
          className={`mt-2 rounded-xl border px-3 py-2 text-center text-xs font-bold ${
            boom.result === "BUY" ? "border-success/30 bg-success/10 text-success" : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          {boom.result === "BUY" ? "✅ BUY" : boom.result === "SELL" ? "❌ SELL" : "NEUTRO"}
        </p>
      ) : null}
    </div>
  );
}