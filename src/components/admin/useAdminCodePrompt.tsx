import { useCallback, useState } from "react";
import { AdminCodePrompt } from "@/components/admin/AdminCodePrompt";

interface PendingConfirmation {
  description: string;
  resolve: (ok: boolean) => void;
}

export function useAdminCodePrompt() {
  const [pending, setPending] = useState<PendingConfirmation | null>(null);

  const confirm = useCallback(
    (description: string) =>
      new Promise<boolean>((resolve) => {
        setPending({ description, resolve });
      }),
    [],
  );

  const finish = (ok: boolean) => {
    if (!pending) return;
    const current = pending;
    setPending(null);
    current.resolve(ok);
  };

  const prompt = (
    <AdminCodePrompt
      open={pending !== null}
      description={pending?.description ?? ""}
      onCancel={() => finish(false)}
      onConfirmed={() => finish(true)}
    />
  );

  return [confirm, prompt] as const;
}
