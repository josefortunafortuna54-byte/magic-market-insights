import { supabase } from "@/lib/supabaseClient";

let unlocked = false;

export function isAdminUnlocked(): boolean {
  return unlocked;
}

export async function verifyAdminCode(code: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("verify_admin_access_code", {
    p_code: code,
  });
  if (error) {
    console.warn("[verifyAdminCode] rpc error:", error.message);
    return false;
  }
  return data === true;
}

export function unlockAdmin(): void {
  unlocked = true;
}

export function lockAdmin(): void {
  unlocked = false;
}
