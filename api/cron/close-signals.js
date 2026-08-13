// Vercel Cron → dispara a edge function close-signals do Supabase.
// Necessita de env vars no Vercel:
//   SERVICE_ROLE_KEY (service_role key do Supabase)
//   VITE_SUPABASE_URL (URL do projeto)
// Agendado em vercel.json (a cada 30 min; no plano Hobby o Vercel limita a 1x/dia).
export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SERVICE_ROLE_KEY;

  if (!url || !key) {
    res.status(500).json({ error: "Missing SERVICE_ROLE_KEY / VITE_SUPABASE_URL env" });
    return;
  }

  try {
    const r = await fetch(`${url}/functions/v1/close-signals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
        "apikey": key,
      },
      body: JSON.stringify({}),
    });
    const data = await r.json();
    res.status(200).json({ ok: true, status: r.status, ...data });
  } catch (err) {
    res.status(500).json({ error: String(err && err.message ? err.message : err) });
  }
}
