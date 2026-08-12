import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const ENV_ADMIN_EMAILS = (Deno.env.get("ADMIN_EMAILS") || "")
  .split(",")
  .map((e: string) => e.trim())
  .filter(Boolean);

async function isAdminEmail(email: string): Promise<boolean> {
  if (ENV_ADMIN_EMAILS.includes(email)) return true;

  const PROJECT_URL = Deno.env.get("PROJECT_URL") || Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!PROJECT_URL || !SERVICE_ROLE_KEY) return false;

  const adminClient = createClient(PROJECT_URL, SERVICE_ROLE_KEY);
  const { data, error } = await adminClient
    .from("admins")
    .select("email")
    .eq("email", email)
    .maybeSingle();

  return !error && !!data;
}

export async function verifyAdminRequest(req: Request): Promise<{ ok: boolean; error?: string }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return { ok: false, error: "Não autenticado" };

  const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (SERVICE_ROLE_KEY && authHeader === `Bearer ${SERVICE_ROLE_KEY}`) return { ok: true };

  const PROJECT_URL = Deno.env.get("PROJECT_URL") || Deno.env.get("SUPABASE_URL");
  const ANON_KEY = Deno.env.get("ANON_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
  if (!PROJECT_URL || !ANON_KEY) return { ok: false, error: "Missing env" };

  const token = authHeader.replace("Bearer ", "");
  const userRes = await fetch(`${PROJECT_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: ANON_KEY },
  });
  if (!userRes.ok) return { ok: false, error: "Auth failed" };

  const user = await userRes.json() as { email?: string };
  if (!user.email || !(await isAdminEmail(user.email))) {
    return { ok: false, error: "Não autorizado" };
  }
  return { ok: true };
}
