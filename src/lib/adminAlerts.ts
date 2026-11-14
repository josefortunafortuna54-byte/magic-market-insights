import { supabase } from "@/lib/supabaseClient";

export type AdminAlertType =
  | "new_user"
  | "receipt_pending"
  | "receipt_approved"
  | "receipt_rejected"
  | "withdrawal_pending"
  | "withdrawal_approved"
  | "withdrawal_rejected"
  | "withdrawal_paid"
  | "management_request_pending"
  | "management_request_approved"
  | "management_request_rejected"
  | "message_report_pending"
  | "system_error";

export interface AdminAlertPayload {
  type: AdminAlertType;
  title: string;
  message: string;
  entity_type?: string;
  entity_id?: string;
  data?: Record<string, unknown>;
}

export async function notifyAdmins(payload: AdminAlertPayload): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke("admin-alert", {
      body: payload,
    });
    if (error) {
      console.warn("[adminAlerts] fan-out falhou:", error.message);
    }
  } catch (err) {
    console.warn(
      "[adminAlerts] fan-out falhou:",
      err instanceof Error ? err.message : err,
    );
  }
}
