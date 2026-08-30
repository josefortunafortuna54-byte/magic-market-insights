import { toast } from "sonner";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastData {
  id: string;
  type: ToastType;
  message: string;
}

export function useAdminAlerts() {
  const showSuccess = (msg: string) => toast.success(msg);
  const showError = (msg: string) => toast.error(msg);
  const showWarning = (msg: string) => toast.warning(msg);
  const showInfo = (msg: string) => toast.info(msg);
  // sonner dismisses a specific toast by id, or all toasts when called with no argument.
  const dismiss = (id?: string | number) => {
    if (id == null) toast.dismiss();
    else toast.dismiss(id);
  };

  return { showSuccess, showError, showWarning, showInfo, dismiss };
}

export type UseAdminAlertsReturn = ReturnType<typeof useAdminAlerts>;
