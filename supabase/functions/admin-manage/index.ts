import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAILS = (Deno.env.get("ADMIN_EMAILS") || "")
  .split(",")
  .map((e: string) => e.trim())
  .filter(Boolean);

async function verifyAdmin(req: Request): Promise<{ ok: boolean; error?: string }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return { ok: false, error: "Não autenticado" };

  const PROJECT_URL = Deno.env.get("PROJECT_URL") || Deno.env.get("SUPABASE_URL");
  const ANON_KEY = Deno.env.get("ANON_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
  if (!PROJECT_URL || !ANON_KEY) return { ok: false, error: "Missing env" };

  const token = authHeader.replace("Bearer ", "");
  const userRes = await fetch(`${PROJECT_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: ANON_KEY },
  });
  if (!userRes.ok) return { ok: false, error: "Auth failed" };

  const user = await userRes.json();
  if (!ADMIN_EMAILS.includes(user.email)) {
    return { ok: false, error: "Não autorizado" };
  }
  return { ok: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const auth = await verifyAdmin(req);
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const PROJECT_URL = Deno.env.get("PROJECT_URL") || Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!PROJECT_URL || !SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Missing env keys" }), { status: 500, headers: corsHeaders });
    }

    const supabase = createClient(PROJECT_URL, SERVICE_ROLE_KEY);
    const body = await req.json();
    const { action } = body;

    if (action === "add_signal") {
      const { symbol, timeframe, signal_type, entry_price, stop_loss, target_price, confidence, reasons } = body;
      if (!entry_price || !stop_loss || !target_price) {
        return new Response(JSON.stringify({ error: "Campos obrigatórios em falta" }), { status: 400, headers: corsHeaders });
      }
      const { data, error } = await supabase.from("signals").insert([{
        symbol, timeframe, signal_type, entry_price, stop_loss, target_price,
        confidence: Number(confidence) || 75,
        reasons: reasons ?? ["Sinal manual"],
        status: "active",
      }]).select();
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      return new Response(JSON.stringify({ success: true, signal: data?.[0] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "delete_signal") {
      const { id } = body;
      if (!id) return new Response(JSON.stringify({ error: "ID em falta" }), { status: 400, headers: corsHeaders });
      const { error } = await supabase.from("signals").delete().eq("id", id);
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "update_status") {
      const { id, status } = body;
      if (!id || !status) return new Response(JSON.stringify({ error: "Campos obrigatórios em falta" }), { status: 400, headers: corsHeaders });
      const { error } = await supabase.from("signals").update({ status }).eq("id", id);
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "delete_all_active") {
      const { error } = await supabase.from("signals").delete().eq("status", "active");
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "add_boom_hour") {
      const { title, time_gmt, time_wat, pairs, days, description, volatility, badge } = body;
      if (!title || !time_gmt || !time_wat) {
        return new Response(JSON.stringify({ error: "Campos obrigatórios em falta" }), { status: 400, headers: corsHeaders });
      }
      const { data, error } = await supabase.from("boom_hours").insert([{
        title, time_gmt, time_wat, pairs: pairs ?? [], days: days ?? "",
        description: description ?? "", volatility: Number(volatility) || 4,
        badge: badge ?? "", is_active: true,
      }]).select();
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      return new Response(JSON.stringify({ success: true, data: data?.[0] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "delete_boom_hour") {
      const { id } = body;
      if (!id) return new Response(JSON.stringify({ error: "ID em falta" }), { status: 400, headers: corsHeaders });
      const { error } = await supabase.from("boom_hours").delete().eq("id", id);
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "add_post") {
      const { title, content, pair, signal_type, image_url, audio_url } = body;
      if (!title) return new Response(JSON.stringify({ error: "Título obrigatório" }), { status: 400, headers: corsHeaders });
      const { data, error } = await supabase.from("posts").insert([{
        title, content: content ?? "", pair: pair ?? "", signal_type: signal_type ?? "NEUTRO",
        image_url: image_url ?? "", audio_url: audio_url ?? "", is_active: true,
      }]).select();
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      return new Response(JSON.stringify({ success: true, data: data?.[0] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "delete_post") {
      const { id } = body;
      if (!id) return new Response(JSON.stringify({ error: "ID em falta" }), { status: 400, headers: corsHeaders });
      const { error } = await supabase.from("posts").delete().eq("id", id);
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "add_boom_time") {
      const { pair, boom_time, confidence, result, image_url, audio_url } = body;
      if (!pair || !boom_time) {
        return new Response(JSON.stringify({ error: "Par e hora obrigatórios" }), { status: 400, headers: corsHeaders });
      }
      const { data, error } = await supabase.from("boom_times").insert([{
        pair, boom_time, confidence: Number(confidence) || 75,
        result: result || null, image_url: image_url ?? "", audio_url: audio_url ?? "",
        is_active: true,
      }]).select();
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      return new Response(JSON.stringify({ success: true, data: data?.[0] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "update_boom_result") {
      const { id, result } = body;
      if (!id) return new Response(JSON.stringify({ error: "ID em falta" }), { status: 400, headers: corsHeaders });
      const { error } = await supabase.from("boom_times").update({ result: result || null }).eq("id", id);
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "delete_boom_time") {
      const { id } = body;
      if (!id) return new Response(JSON.stringify({ error: "ID em falta" }), { status: 400, headers: corsHeaders });
      const { error } = await supabase.from("boom_times").delete().eq("id", id);
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "upload_file") {
      const { bucket, path, file_base64, content_type } = body;
      if (!bucket || !path || !file_base64) {
        return new Response(JSON.stringify({ error: "Campos obrigatórios em falta" }), { status: 400, headers: corsHeaders });
      }
      const binary = Uint8Array.from(atob(file_base64), c => c.charCodeAt(0));
      const { error } = await supabase.storage.from(bucket).upload(path, binary, {
        contentType: content_type || "application/octet-stream",
      });
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
      return new Response(JSON.stringify({ success: true, url: urlData.publicUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Ação desconhecida" }), { status: 400, headers: corsHeaders });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
