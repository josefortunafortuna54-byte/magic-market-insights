import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, MessageCircle, Mic, MicOff,
  Send, Play, Pause, Clock, Zap, Crown, Users, ChevronDown, ChevronUp
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { supabase } from "@/lib/supabaseClient";

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

interface BoomComment {
  id: string;
  boom_id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  text: string;
  audio_url: string;
  is_premium: boolean;
  created_at: string;
}

interface BoomVote {
  boom_id: string;
  user_id: string;
  vote: "BUY" | "SELL";
}

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "agora mesmo";
  if (diff < 3600) return `há ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
  return `há ${Math.floor(diff / 86400)}d`;
}

function getBoomStatus(boomTime: string): "upcoming" | "live" | "expired" {
  const now = Date.now();
  const boom = new Date(boomTime).getTime();
  const diff = boom - now;
  if (diff > 0 && diff <= 15 * 60 * 1000) return "live";
  if (diff > 0) return "upcoming";
  return "expired";
}

function CountdownTimer({ boomTime, onExpire }: { boomTime: string; onExpire: () => void }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const update = () => {
      const diff = new Date(boomTime).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("00:00:00"); onExpire(); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
      setIsUrgent(diff < 5 * 60 * 1000);
    };
    update();
    const i = setInterval(update, 1000);
    return () => clearInterval(i);
  }, [boomTime]);

  return (
    <motion.div animate={isUrgent ? { scale: [1, 1.05, 1] } : {}}
      transition={{ repeat: Infinity, duration: 1 }}
      className={`font-mono text-2xl font-bold tracking-widest ${isUrgent ? "text-destructive" : "text-primary"}`}>
      {timeLeft}
    </motion.div>
  );
}

function AudioPlayer({ url }: { url: string }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  return (
    <div className="flex items-center gap-3 bg-secondary/60 rounded-2xl px-4 py-3 border border-border/40">
      <button onClick={toggle}
        className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0 hover:opacity-90 transition-all">
        {playing ? <Pause className="h-4 w-4 text-white" /> : <Play className="h-4 w-4 text-white ml-0.5" />}
      </button>
      <div className="flex-1">
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <span className="text-xs text-muted-foreground">Áudio</span>
      <audio ref={audioRef} src={url}
        onTimeUpdate={e => setProgress((e.currentTarget.currentTime / e.currentTarget.duration) * 100)}
        onEnded={() => { setPlaying(false); setProgress(0); }} />
    </div>
  );
}

function BoomCard({ boom, user, isPremium }: { boom: BoomTime; user: any; isPremium: boolean }) {
  const [votes, setVotes] = useState<BoomVote[]>([]);
  const [comments, setComments] = useState<BoomComment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [userVote, setUserVote] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(getBoomStatus(boom.boom_time));
  const [justVoted, setJustVoted] = useState<string | null>(null);

  useEffect(() => {
    loadVotes();
    loadComments();
    const timer = setInterval(() => setStatus(getBoomStatus(boom.boom_time)), 10000);
    const channel = supabase.channel(`boom-${boom.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "boom_votes", filter: `boom_id=eq.${boom.id}` }, loadVotes)
      .on("postgres_changes", { event: "*", schema: "public", table: "boom_comments", filter: `boom_id=eq.${boom.id}` }, loadComments)
      .subscribe();
    return () => { supabase.removeChannel(channel); clearInterval(timer); };
  }, [boom.id]);

  const loadVotes = async () => {
    const { data } = await supabase.from("boom_votes").select("*").eq("boom_id", boom.id);
    setVotes(data || []);
    if (user) {
      const myVote = (data || []).find((v: BoomVote) => v.user_id === user.id);
      setUserVote(myVote?.vote || null);
    }
  };

  const loadComments = async () => {
    const { data } = await supabase.from("boom_comments").select("*")
      .eq("boom_id", boom.id).order("created_at", { ascending: true });
    setComments(data || []);
  };

  const vote = async (type: "BUY" | "SELL") => {
    if (!user) { alert("Faz login para votar!"); return; }
    if (status === "expired") return;
    if (userVote === type) {
      await supabase.from("boom_votes").delete().eq("boom_id", boom.id).eq("user_id", user.id);
      setUserVote(null);
    } else {
      await supabase.from("boom_votes").upsert(
        { boom_id: boom.id, user_id: user.id, vote: type },
        { onConflict: "boom_id,user_id" }
      );
      setUserVote(type);
      setJustVoted(type);
      setTimeout(() => setJustVoted(null), 1500);
    }
    loadVotes();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      mr.ondataavailable = e => chunks.push(e.data);
      mr.onstop = () => {
        setAudioBlob(new Blob(chunks, { type: "audio/webm" }));
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      setMediaRecorder(mr);
      setRecording(true);
    } catch { alert("Sem acesso ao microfone!"); }
  };

  const stopRecording = () => { mediaRecorder?.stop(); setRecording(false); };

  const sendComment = async () => {
    if (!user) { alert("Faz login para comentar!"); return; }
    if (!commentText && !audioBlob) return;
    setSubmitting(true);
    let audio_url = "";
    if (audioBlob) {
      const filename = `${user.id}/${Date.now()}.webm`;
      const { data } = await supabase.storage.from("comments-audio").upload(filename, audioBlob);
      if (data) {
        const { data: urlData } = supabase.storage.from("comments-audio").getPublicUrl(filename);
        audio_url = urlData.publicUrl;
      }
    }
    await supabase.from("boom_comments").insert([{
      boom_id: boom.id,
      user_id: user.id,
      user_name: user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Trader",
      user_avatar: user?.user_metadata?.avatar_url || "",
      text: commentText,
      audio_url,
      is_premium: isPremium,
    }]);
    setCommentText("");
    setAudioBlob(null);
    setSubmitting(false);
  };

  const buyVotes = votes.filter(v => v.vote === "BUY").length;
  const sellVotes = votes.filter(v => v.vote === "SELL").length;
  const total = buyVotes + sellVotes || 1;
  const buyPct = Math.round((buyVotes / total) * 100);
  const sellPct = 100 - buyPct;
  const boomDate = new Date(boom.boom_time);

  const statusConfig = {
    upcoming: { label: "Próximo Boom", color: "bg-warning/20 text-warning border-warning/30", dot: "bg-warning" },
    live: { label: "🚨 AO VIVO", color: "bg-destructive/20 text-destructive border-destructive/30 animate-pulse", dot: "bg-destructive animate-pulse" },
    expired: { label: "Expirado", color: "bg-muted/50 text-muted-foreground border-border", dot: "bg-muted-foreground" },
  };

  const cfg = statusConfig[status];

  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-3xl border mb-6 ${
        status === "live"
          ? "border-primary/40 shadow-[0_0_40px_hsl(142_70%_45%/0.2)]"
          : status === "expired" ? "border-border/30 opacity-70" : "border-border/50"
      } bg-card/80 backdrop-blur-xl`}>

      {/* Status badge */}
      <div className="absolute top-4 right-4 z-10">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${cfg.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
      </div>

      {/* Imagem */}
      {boom.image_url && (
        <div className="relative h-52 overflow-hidden">
          <img src={boom.image_url} alt={boom.pair} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
          {status === "live" && (
            <div className="absolute inset-0 border-2 border-primary/50 rounded-none animate-pulse" />
          )}
        </div>
      )}

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-display text-2xl font-bold text-primary">{boom.pair}</span>
              {boom.confidence && (
                <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">
                  {boom.confidence}% confiança
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Clock className="h-3.5 w-3.5" />
              <span>{boomDate.toLocaleDateString("pt-PT")} às {String(boomDate.getHours()).padStart(2,"0")}:{String(boomDate.getMinutes()).padStart(2,"0")} WAT</span>
            </div>
          </div>
        </div>

        {/* Countdown */}
        {status !== "expired" && (
          <div className="glass-card p-4 mb-5 text-center border border-primary/20 bg-primary/5 rounded-2xl">
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-widest">
              {status === "live" ? "🚨 BOOM ATIVO" : "Começa em"}
            </p>
            <CountdownTimer boomTime={boom.boom_time} onExpire={() => setStatus("expired")} />
          </div>
        )}

        {/* Resultado se expirado */}
        {status === "expired" && boom.result && (
          <div className={`rounded-2xl p-4 mb-5 text-center border ${
            boom.result === "BUY" ? "bg-success/10 border-success/30" : "bg-destructive/10 border-destructive/30"
          }`}>
            <p className="text-xs text-muted-foreground mb-1">Resultado</p>
            <p className={`font-display text-xl font-bold ${boom.result === "BUY" ? "text-success" : "text-destructive"}`}>
              {boom.result === "BUY" ? "✅ BUY" : "❌ SELL"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {boom.result === "BUY" ? buyPct : sellPct}% dos traders acertaram
            </p>
          </div>
        )}

        {/* Áudio */}
        {boom.audio_url && <div className="mb-5"><AudioPlayer url={boom.audio_url} /></div>}

        {/* Votação */}
        <div className="mb-5">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">A tua previsão</p>
          <div className="flex gap-3 mb-3">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => vote("BUY")}
              disabled={status === "expired"}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm transition-all ${
                userVote === "BUY"
                  ? "bg-success text-white shadow-[0_0_20px_hsl(142_70%_42%/0.4)]"
                  : "bg-success/10 text-success border border-success/30 hover:bg-success/20"
              } disabled:opacity-40 disabled:cursor-not-allowed`}>
              <TrendingUp className="h-4 w-4" />
              BUY
              {buyVotes > 0 && <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-xs">{buyVotes}</span>}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => vote("SELL")}
              disabled={status === "expired"}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm transition-all ${
                userVote === "SELL"
                  ? "bg-destructive text-white shadow-[0_0_20px_hsl(4_86%_58%/0.4)]"
                  : "bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20"
              } disabled:opacity-40 disabled:cursor-not-allowed`}>
              <TrendingDown className="h-4 w-4" />
              SELL
              {sellVotes > 0 && <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-xs">{sellVotes}</span>}
            </motion.button>
          </div>

          {/* Barra */}
          {(buyVotes + sellVotes) > 0 && (
            <div className="space-y-2">
              <div className="flex h-2 rounded-full overflow-hidden bg-secondary">
                <motion.div className="bg-success" initial={{ width: 0 }}
                  animate={{ width: `${buyPct}%` }} transition={{ duration: 0.5 }} />
                <motion.div className="bg-destructive" initial={{ width: 0 }}
                  animate={{ width: `${sellPct}%` }} transition={{ duration: 0.5 }} />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-success font-bold">{buyPct}% BUY</span>
                <span className="text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" /> {buyVotes + sellVotes} votos
                </span>
                <span className="text-destructive font-bold">{sellPct}% SELL</span>
              </div>
            </div>
          )}

          <AnimatePresence>
            {justVoted && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className={`mt-3 text-center text-sm font-semibold ${justVoted === "BUY" ? "text-success" : "text-destructive"}`}>
                ✓ Votaste {justVoted}!
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Comentários toggle */}
        <button onClick={() => setShowComments(!showComments)}
          className="w-full flex items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors py-2 border-t border-border/40">
          <span className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            {comments.length} comentário{comments.length !== 1 ? "s" : ""}
          </span>
          {showComments ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        <AnimatePresence>
          {showComments && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="pt-4 space-y-3 max-h-64 overflow-y-auto">
                {comments.map(c => (
                  <div key={c.id} className="flex gap-3">
                    <div className="shrink-0">
                      {c.user_avatar ? (
                        <img src={c.user_avatar} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                          {(c.user_name || "T")[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 bg-secondary/40 rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold">{c.user_name || "Trader"}</span>
                        {c.is_premium && <Crown className="h-3 w-3 text-accent" />}
                        <span className="text-xs text-muted-foreground ml-auto">{timeAgo(c.created_at)}</span>
                      </div>
                      {c.text && <p className="text-sm">{c.text}</p>}
                      {c.audio_url && <div className="mt-2"><AudioPlayer url={c.audio_url} /></div>}
                    </div>
                  </div>
                ))}
              </div>

              {user ? (
                <div className="pt-4 space-y-3 border-t border-border/40 mt-3">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {(user?.user_metadata?.full_name || user?.email || "T")[0].toUpperCase()}
                    </div>
                    <textarea value={commentText} onChange={e => setCommentText(e.target.value)}
                      className="flex-1 bg-secondary/60 border border-border/60 rounded-2xl px-4 py-3 text-sm resize-none h-16 focus:border-primary/50 focus:outline-none transition-colors"
                      placeholder="Partilha a tua análise..." />
                  </div>
                  {audioBlob && (
                    <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-3 py-2 ml-11">
                      <Mic className="h-4 w-4 text-primary" />
                      <span className="text-xs text-primary">Áudio pronto</span>
                      <button onClick={() => setAudioBlob(null)} className="ml-auto text-xs text-destructive">✕</button>
                    </div>
                  )}
                  <div className="flex gap-2 ml-11">
                    <button onClick={recording ? stopRecording : startRecording}
                      className={`p-2.5 rounded-xl border transition-all ${
                        recording
                          ? "bg-destructive/20 border-destructive text-destructive animate-pulse"
                          : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                      }`}>
                      {recording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </button>

                    <button onClick={sendComment} disabled={submitting || (!commentText && !audioBlob)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-all">
                      <Send className="h-4 w-4" />
                      {submitting ? "A enviar..." : "Enviar"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 text-center py-4 border border-border/40 rounded-2xl">
                  <p className="text-sm text-muted-foreground">Faz <a href="/login" className="text-primary font-semibold">login</a> para comentar</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default function Comunidade() {
  const [booms, setBooms] = useState<BoomTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [filter, setFilter] = useState<"all" | "upcoming" | "live" | "expired">("all");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      if (session?.user) checkPremium(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null);
      if (session?.user) checkPremium(session.user.id);
      else setIsPremium(false);
    });

    loadBooms();

    const channel = supabase.channel("booms-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "boom_times" }, loadBooms)
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  const loadBooms = async () => {
    const { data } = await supabase.from("boom_times").select("*")
      .eq("is_active", true).order("boom_time", { ascending: false });
    setBooms(data || []);
    setLoading(false);
  };

  const filtered = booms.filter(b => {
    if (filter === "all") return true;
    return getBoomStatus(b.boom_time) === filter;
  });

  const liveCount = booms.filter(b => getBoomStatus(b.boom_time) === "live").length;

  return (
    <Layout>
      <section className="pt-8 pb-24">
        <div className="container mx-auto px-4 max-w-2xl">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="font-display text-2xl font-bold">Comunidade</h1>
                  <p className="text-xs text-muted-foreground">The Magic Trader</p>
                </div>
              </div>
              {liveCount > 0 && (
                <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}
                  className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 text-destructive px-3 py-1.5 rounded-full text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                  {liveCount} AO VIVO
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Filtros */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {[
              { key: "all", label: "Todos" },
              { key: "live", label: "🚨 Ao Vivo" },
              { key: "upcoming", label: "⏳ Próximos" },
              { key: "expired", label: "✓ Histórico" },
            ].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key as any)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  filter === f.key ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}>
                {f.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-muted-foreground text-sm">A carregar booms...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24">
              <Zap className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-20" />
              <h3 className="font-display text-lg font-semibold mb-2">Nenhum boom encontrado</h3>
              <p className="text-sm text-muted-foreground">A equipa irá publicar em breve!</p>
            </div>
          ) : (
            filtered.map(boom => <BoomCard key={boom.id} boom={boom} user={user} isPremium={isPremium} />)
          )}
        </div>
      </section>
    </Layout>
  );
}
