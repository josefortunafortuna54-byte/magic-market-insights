import { supabase } from "./supabaseClient";

const adminEmails: string[] =
  import.meta.env.VITE_ADMIN_EMAILS?.split(",").map((e: string) => e.trim()).filter(Boolean) ?? [];

export function isAdminEmail(email: string | undefined): boolean {
  return !!email && adminEmails.includes(email);
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  return isAdminEmail(user?.email);
}
