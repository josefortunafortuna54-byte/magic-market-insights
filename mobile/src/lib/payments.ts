import { File } from 'expo-file-system';
import { supabase } from '@/lib/supabase';

export interface ReceiptFile {
  uri: string;
  mimeType: string;
  fileName: string;
}

export async function uploadReceipt(
  userId: string,
  receipt: ReceiptFile,
): Promise<{ url: string | null; error?: string }> {
  try {
    const ext = (receipt.fileName.split('.').pop() || 'jpg').toLowerCase();
    const name = `proof-${Date.now()}.${ext}`;
    const path = `${userId}/${name}`;
    const mimeType = receipt.mimeType || 'image/jpeg';

    const file = new File(receipt.uri);

    const { error } = await supabase.storage
      .from('payment-proofs')
      .upload(path, file, { contentType: mimeType, upsert: false });
    if (error) {
      console.warn('[uploadReceipt] Supabase error:', error.message);
      return { url: null, error: error.message };
    }
    const { data: urlData } = supabase.storage.from('payment-proofs').getPublicUrl(path);
    if (!urlData?.publicUrl) return { url: null, error: 'Public URL not generated' };
    return { url: urlData.publicUrl };
  } catch (err: any) {
    console.warn('[uploadReceipt] Exception:', err);
    return { url: null, error: err?.message || 'Unknown error' };
  }
}
