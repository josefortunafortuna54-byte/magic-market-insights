import { supabase } from "./supabaseClient";

const adminEmails: string[] =
  import.meta.env.VITE_ADMIN_EMAILS?.split(",").map((e: string) => e.trim()).filter(Boolean) ?? [];

export function isAdminEmail(email: string | undefined): boolean {
  return !!email && adminEmails.includes(email);
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase.rpc("is_admin");
  if (!error) return !!data || isAdminEmail(user.email);

  return isAdminEmail(user.email);
}
