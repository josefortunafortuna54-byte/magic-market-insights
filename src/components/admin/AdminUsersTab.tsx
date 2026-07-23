import { Users } from "lucide-react";

interface Props {
  usersList: any[];
  subsData: any[];
}

export function AdminUsersTab({ usersList, subsData }: Props) {
  return (
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
              {["Utilizador","Email","Registado","Último acesso","Premium"].map(h => (
                <th key={h} className="text-left p-3 text-xs text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {usersList.map(u => {
              const isPrem = subsData?.find((s: any) => s.user_id === u.id && s.status === "active");
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
