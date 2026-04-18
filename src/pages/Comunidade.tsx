import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, MessageCircle, Mic, MicOff, Send, Play, Pause, Clock } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { supabase } from "@/lib/supabaseClient";

interface Post {
  id: string;
  title: string;
  content: string;
  image_url: string;
  audio_url: string;
  signal_type: "BUY" | "SELL" | "NEUTRO";
  pair: string;
  created_at: string;
}

interface Vote {
  post_id: string;
  user_id: string;
  vote: "BUY" | "SELL";
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  text: string;
  audio_url: string;
  created_at: string;
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "short" }) + " " +
    d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
}

function AudioPlayer({ url }: { url: string }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };
  return (
    <div className="flex items-center gap-2 bg-secondary/60 rounded-xl px-3 py-2">
      <button onClick={toggle} className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
        {playing ? <Pause className="h-4 w-4 text-white" /> : <Play className="h-4 w-4 text-white" />}
      </button>
      <span className="text-xs text-muted-foreground">Áudio</span>
      <audio ref={audioRef} src={url} onEnded={() => setPlaying(false)} />
    </div>
  );
}

function PostCard({ post, user }: { post: Post; user: any }) {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [userVote, setUserVote] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadVotes();
    loadComments();
    const channel = supabase.channel(`post-${post.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "post_votes", filter: `post_id=eq.${post.id}` }, loadVotes)
      .on("postgres_changes", { event: "*", schema: "public", table: "post_comments", filter: `post_id=eq.${post.id}` }, loadComments)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [post.id]);

  const loadVotes = async () => {
    const { data } = await supabase.from("post_votes").select("*").eq("post_id", post.id);
    setVotes(data || []);
    if (user) {
      const myVote = (data || []).find((v: Vote) => v.user_id === user.id);
      setUserVote(myVote?.vote || null);
    }
  };

  const loadComments = async () => {
    const { data } = await supabase.from("post_comments").select("*").eq("post_id", post.id).order("created_at", { ascending: true });
    setComments(data || []);
  };

  const vote = async (type: "BUY" | "SELL") => {
    if (!user) { alert("Faz login para votar!"); return; }
    if (userVote === type) {
      await supabase.from("post_votes").delete().eq("post_id", post.id).eq("user_id", user.id);
      setUserVote(null);
    } else {
      await supabase.from("post_votes").upsert({ post_id: post.id, user_id: user.id, vote: type }, { onConflict: "post_id,user_id" });
      setUserVote(type);
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
        const blob = new Blob(chunks, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      setMediaRecorder(mr);
      setRecording(true);
    } catch { alert("Sem acesso ao microfone!"); }
  };

  const stopRecording = () => {
    mediaRecorder?.stop();
    setRecording(false);
  };

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
    await supabase.from("post_comments").insert([{ post_id: post.id, user_id: user.id, text: commentText, audio_url }]);
    setCommentText("");
    setAudioBlob(null);
    setSubmitting(false);
    loadComments();
  };

  const buyVotes = votes.filter(v => v.vote === "BUY").length;
  const sellVotes = votes.filter(v => v.vote === "SELL").length;
  const total = buyVotes + sellVotes || 1;
  const buyPct = Math.round((buyVotes / total) * 100);
  const sellPct = Math.round((sellVotes / total) * 100);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="glass-card overflow-hidden mb-6">

      {/* Imagem */}
      {post.image_url && (
        <img src={post.image_url} alt={post.title} className="w-full h-48 object-cover" />
      )}

      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {post.pair && <span className="font-mono font-bold text-primary">{post.pair}</span>}
            {post.signal_type !== "NEUTRO" && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${post.signal_type === "BUY" ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}`}>
                {post.signal_type}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatTime(post.created_at)}
          </div>
        </div>

        <h3 className="font-display font-bold text-lg mb-2">{post.title}</h3>
        {post.content && <p className="text-sm text-muted-foreground mb-3">{post.content}</p>}
        {post.audio_url && <div className="mb-3"><AudioPlayer url={post.audio_url} /></div>}

        {/* Votação */}
        <div className="mb-4">
          <div className="flex gap-2 mb-2">
            <button onClick={() => vote("BUY")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all ${userVote === "BUY" ? "bg-success text-white" : "bg-success/10 text-success border border-success/30 hover:bg-success/20"}`}>
              <TrendingUp className="h-4 w-4" /> BUY {buyVotes > 0 && `(${buyVotes})`}
            </button>
            <button onClick={() => vote("SELL")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all ${userVote === "SELL" ? "bg-destructive text-white" : "bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20"}`}>
              <TrendingDown className="h-4 w-4" /> SELL {sellVotes > 0 && `(${sellVotes})`}
            </button>
          </div>

          {/* Barra de percentagem */}
          {(buyVotes + sellVotes) > 0 && (
            <div className="space-y-1">
              <div className="flex h-2 rounded-full overflow-hidden">
                <div className="bg-success transition-all" style={{ width: `${buyPct}%` }} />
                <div className="bg-destructive transition-all" style={{ width: `${sellPct}%` }} />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="text-success font-semibold">{buyPct}% BUY</span>
                <span className="text-muted-foreground">{buyVotes + sellVotes} votos</span>
                <span className="text-destructive font-semibold">{sellPct}% SELL</span>
              </div>
            </div>
          )}
        </div>

        {/* Botão comentários */}
        <button onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <MessageCircle className="h-4 w-4" />
          {comments.length} comentário{comments.length !== 1 ? "s" : ""}
        </button>

        {/* Comentários */}
        <AnimatePresence>
          {showComments && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }} className="mt-4 space-y-3">

              {comments.map(c => (
                <div key={c.id} className="bg-secondary/40 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">{formatTime(c.created_at)}</p>
                  {c.text && <p className="text-sm">{c.text}</p>}
                  {c.audio_url && <div className="mt-2"><AudioPlayer url={c.audio_url} /></div>}
                </div>
              ))}

              {/* Input comentário */}
              {user ? (
                <div className="border-t border-border/40 pt-3 space-y-2">
                  <textarea value={commentText} onChange={e => setCommentText(e.target.value)}
                    className="w-full bg-secondary/60 border border-border rounded-xl px-3 py-2 text-sm resize-none h-16"
                    placeholder="Escreve um comentário..." />
                  {audioBlob && (
                    <div className="flex items-center gap-2 bg-primary/10 rounded-xl px-3 py-2">
                      <Mic className="h-4 w-4 text-primary" />
                      <span className="text-xs text-primary">Áudio gravado</span>
                      <button onClick={() => setAudioBlob(null)} className="ml-auto text-xs text-destructive">Remover</button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button onClick={recording ? stopRecording : startRecording}
                      className={`p-2 rounded-xl border transition-all ${recording ? "bg-destructive/20 border-destructive text-destructive animate-pulse" : "border-border text-muted-foreground hover:border-primary hover:text-primary"}`}>
                      {recording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </button>
                    <button onClick={sendComment} disabled={submitting || (!commentText && !audioBlob)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50">
                      <Send className="h-4 w-4" />
                      {submitting ? "A enviar..." : "Enviar"}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">Faz login para comentar</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default function Comunidade() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    supabase.auth.onAuthStateChange((_, session) => setUser(session?.user || null));
    loadPosts();
    const channel = supabase.channel("posts-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, loadPosts)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadPosts = async () => {
    const { data } = await supabase.from("posts").select("*").eq("is_active", true).order("created_at", { ascending: false });
    setPosts(data || []);
    setLoading(false);
  };

  return (
    <Layout>
      <section className="pt-8 pb-24">
        <div className="container mx-auto px-4 max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="font-display text-2xl font-bold mb-1">💬 Comunidade</h1>
            <p className="text-muted-foreground text-sm">Análises e discussões da equipa The Magic Trader</p>
          </motion.div>

          {loading ? (
            <div className="glass-card p-12 text-center">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
            </div>
          ) : posts.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
              <p className="text-muted-foreground">Ainda sem posts. A equipa irá publicar em breve!</p>
            </div>
          ) : (
            posts.map(post => <PostCard key={post.id} post={post} user={user} />)
          )}
        </div>
      </section>
    </Layout>
  );
}
