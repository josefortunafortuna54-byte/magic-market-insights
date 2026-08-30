import { useState } from "react";
import { Users, Eye } from "lucide-react";
import * as adminApi from "@/lib/adminApi";
import type { UserWithSubscription } from "@/lib/adminApi";
import { UserDetailModal } from "@/components/admin/UserDetailModal";

// Admin passes these as `Record<string, unknown>[]` (from the get_all_users RPC
// and subscriptions table), so we keep props untyped and cast rows locally.
interface UserRow {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  last_sign_in?: string | null;
}

interface SubRow {
  user_id: string;
  status?: string;
  current_period_end?: string | null;
}

interface Props {
  usersList: Record<string, unknown>[];
  subsData: Record<string, unknown>[];
  onRefresh: () => Promise<void>;
}

export function AdminUsersTab({ usersList, subsData, onRefresh }: Props) {
  const [selectedUser, setSelectedUser] = useState<UserWithSubscription | null>(null);
  const [open, setOpen] = useState(false);
  const subs = subsData as unknown as SubRow[];

  // usersList comes from the `get_all_users` RPC (id, email, full_name,
  // avatar_url, created_at, last_sign_in). role / subscription_expires are
  // derived from the subscriptions lookup (subsData) the same way the tab
  // already did for the "Premium" column. `banned` is not available from
  // either source on the web, so it defaults to false (ban/unban still work).
  const toModalUser = (u: UserRow): UserWithSubscription => {
    const sub = subs.find((s) => s.user_id === u.id && s.status === "active");
    return {
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in ?? null,
      role: sub ? "premium" : "free",
      subscription_status: sub?.status,
      subscription_expires: sub?.current_period_end ?? undefined,
      banned: false,
    };
  };

  const openDetail = (row: UserRow) => {
    setSelectedUser(toModalUser(row));
    setOpen(true);
  };

  return (
    <>
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border/50">
          <h3 className="font-display font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Utilizadores ({usersList.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                {["Utilizador","Email","Registado","Último acesso","Premium","Ações"].map(h => (
                  <th key={h} className="text-left p-3 text-xs text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usersList.map((raw) => {
                const u = raw as unknown as UserRow;
                const isPrem = subs.find((s) => s.user_id === u.id && s.status === "active");
                return (
                  <tr key={u.id} className="border-b border-border/30 hover:bg-secondary/20">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} className="w-8 h-8 rounded-full object-cover" alt="" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                            {(u.full_name || u.email || "U")[0].toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium">{u.full_name || "—"}</span>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">{u.email}</td>
                    <td className="p-3 text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString("pt-PT")}</td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {u.last_sign_in ? new Date(u.last_sign_in).toLocaleDateString("pt-PT") : "—"}
                    </td>
                    <td className="p-3">
                      {isPrem ? (
                        <span className="text-xs bg-success/20 text-success px-2 py-1 rounded-lg font-semibold">✓ Premium</span>
                      ) : (
                        <span className="text-xs bg-secondary text-muted-foreground px-2 py-1 rounded-lg">Free</span>
                      )}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => openDetail(u)}
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Eye className="h-3.5 w-3.5" /> Ver detalhes
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <UserDetailModal
        user={selectedUser}
        open={open}
        onClose={() => { setOpen(false); setSelectedUser(null); }}
        onBan={async (userId) => { await adminApi.banUser(userId); await onRefresh(); }}
        onRoleChange={async (userId, role) => { await adminApi.updateUserRole(userId, role); await onRefresh(); }}
        onExpiryChange={async (userId, expiresAt) => { await adminApi.updateSubscriptionExpiry(userId, expiresAt); await onRefresh(); }}
      />
    </>
  );
}
