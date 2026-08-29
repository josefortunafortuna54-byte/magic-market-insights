import { supabase } from "./supabaseClient";

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-manage`;

async function callAdminFn(action: string, payload: Record<string, unknown> = {}): Promise<any> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Não autenticado");

  const res = await fetch(FUNCTIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ action, ...payload }),
  });

  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || "Erro desconhecido");
  return data;
}

export async function addSignal(signal: {
  symbol: string; timeframe: string; signal_type: string;
  entry_price: number; stop_loss: number; target_price: number;
  confidence: number; reasons: string[];
}) {
  return callAdminFn("add_signal", signal);
}

export async function deleteSignal(id: string) {
  return callAdminFn("delete_signal", { id });
}

export async function updateSignalStatus(id: string, status: string) {
  return callAdminFn("update_status", { id, status });
}

export async function deleteAllActiveSignals() {
  return callAdminFn("delete_all_active");
}

export async function addBoomHour(data: {
  title: string; time_gmt: string; time_wat: string;
  pairs: string[]; days: string; description: string;
  volatility: number; badge: string;
}) {
  return callAdminFn("add_boom_hour", data);
}

export async function deleteBoomHour(id: string) {
  return callAdminFn("delete_boom_hour", { id });
}

export async function addPost(data: {
  title: string; content: string; pair: string;
  signal_type: string; image_url: string; audio_url: string;
}) {
  return callAdminFn("add_post", data);
}

export async function deletePost(id: string) {
  return callAdminFn("delete_post", { id });
}

export async function addBoomTime(data: {
  pair: string; boom_time: string; confidence: number;
  result: string; image_url: string; audio_url: string;
}) {
  return callAdminFn("add_boom_time", data);
}

export async function updateBoomResult(id: string, result: string) {
  return callAdminFn("update_boom_result", { id, result });
}

export async function deleteBoomTime(id: string) {
  return callAdminFn("delete_boom_time", { id });
}

export async function uploadFile(bucket: string, path: string, file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(",")[1];
        const data = await callAdminFn("upload_file", {
          bucket, path, file_base64: base64, content_type: file.type,
        });
        resolve(data.url);
      } catch (err) { reject(err); }
    };
    reader.onerror = () => reject(new Error("Erro ao ler ficheiro"));
    reader.readAsDataURL(file);
  });
}
