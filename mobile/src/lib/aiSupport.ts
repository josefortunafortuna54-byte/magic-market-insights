import { SUPABASE_ANON_KEY, SUPABASE_URL } from './env';
import { supabase } from './supabase';
import { i18n } from '@/lib/i18n';

export interface AiMessage {
  role: 'user' | 'model';
  text: string;
}

export interface AiResult {
  reply: string;
  error: string | null;
  remainingChat?: number;
  remainingImage?: number;
}

const AI_FN = `${SUPABASE_URL}/functions/v1/ai-support`;

const QUOTA_ERROR_KEYS = {
  auth_required: 'aiErrors.auth',
  quota_daily_chat: 'aiErrors.quotaChat',
  quota_daily_image: 'aiErrors.quotaImage',
  quota_plan_image: 'aiErrors.quotaImage',
  quota_burst: 'aiErrors.quotaBurst',
} as const;

function mapError(data: { error?: unknown; code?: unknown }): string {
  const code = typeof data.code === 'string' ? data.code : '';
  const quotaKey =
    code in QUOTA_ERROR_KEYS
      ? QUOTA_ERROR_KEYS[code as keyof typeof QUOTA_ERROR_KEYS]
      : undefined;
  if (quotaKey) return i18n.t(quotaKey);
  return typeof data.error === 'string' ? data.error : i18n.t('aiErrors.contact');
}

async function callAi(payload: Record<string, unknown>): Promise<AiResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return { reply: '', error: i18n.t('aiErrors.auth') };
    }

    const res = await fetch(AI_FN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as {
      reply?: unknown;
      error?: unknown;
      code?: unknown;
      remainingChat?: unknown;
      remainingImage?: unknown;
    };
    if (!res.ok || data.error) {
      return { reply: '', error: mapError(data) };
    }
    if (typeof data.reply !== 'string' || !data.reply.trim()) {
      return { reply: '', error: i18n.t('aiErrors.noResponse') };
    }
    return {
      reply: data.reply,
      error: null,
      remainingChat: typeof data.remainingChat === 'number' ? data.remainingChat : undefined,
      remainingImage: typeof data.remainingImage === 'number' ? data.remainingImage : undefined,
    };
  } catch {
    return { reply: '', error: i18n.t('aiErrors.connection') };
  }
}

export async function askAssistant(messages: AiMessage[]): Promise<AiResult> {
  const body = messages.slice(-20).map((m) => ({ role: m.role, text: m.text }));
  return callAi({ messages: body });
}

export async function analyzeImage(
  imageBase64: string,
  mimeType: string,
  prompt?: string,
): Promise<AiResult> {
  return callAi({
    messages: prompt ? [{ role: 'user', text: prompt }] : [],
    image: { data: imageBase64, mimeType },
  });
}
