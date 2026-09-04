import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

export interface AiMessage {
  role: "user" | "model";
  text: string;
}

export interface AiResult {
  reply: string;
  error: string | null;
  remainingChat?: number;
  remainingImage?: number;
}

const AI_FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-support`;

const QUOTA_ERRORS: Record<string, string> = {
  auth_required: "Inicia sessão para usares o assistente de IA.",
  quota_daily_chat: "Atingiste o limite diário do teu plano. Faz upgrade para continuares a conversar.",
  quota_daily_image: "As análises de imagem requerem um plano pago. Faz upgrade no separador Planos.",
  quota_plan_image: "As análises de imagem requerem um plano pago. Faz upgrade no separador Planos.",
  quota_burst: "Muitos pedidos seguidos. Aguarda alguns minutos e tenta de novo.",
};

function mapError(data: { error?: unknown; code?: unknown }): string {
  if (data && typeof data.code === "string" && QUOTA_ERRORS[data.code]) return QUOTA_ERRORS[data.code];
  if (data && typeof data.error === "string" && data.error) return data.error;
  return "Erro ao contactar o suporte. Tenta novamente.";
}

async function callAi(payload: Record<string, unknown>): Promise<AiResult> {
  const { data } = await supabase.auth.getSession();
  const session: Session | null = data.session;
  if (!session?.access_token) {
    return { reply: "", error: "Inicia sessão para usares o assistente de IA." };
  }
  let res: Response;
  try {
    res = await fetch(AI_FN, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    return { reply: "", error: "Erro de ligação. Verifica a tua internet e tenta novamente." };
  }
  let dataJson: Record<string, unknown>;
  try {
    dataJson = await res.json();
  } catch {
    dataJson = {};
  }
  if (!res.ok || dataJson.error) {
    return { reply: "", error: mapError(dataJson) };
  }
  const reply = typeof dataJson.reply === "string" ? dataJson.reply : "";
  if (!reply) {
    return { reply: "", error: "A IA não devolveu uma resposta." };
  }
  return {
    reply,
    error: null,
    remainingChat: typeof dataJson.remainingChat === "number" ? dataJson.remainingChat : undefined,
    remainingImage: typeof dataJson.remainingImage === "number" ? dataJson.remainingImage : undefined,
  };
}

export async function askAssistant(messages: AiMessage[]): Promise<AiResult> {
  return callAi({ messages: messages.slice(-20) });
}