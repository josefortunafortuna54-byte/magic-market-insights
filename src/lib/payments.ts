import { supabase } from "./supabaseClient";

export interface ReceiptFile {
  uri: string;
  mimeType: string;
  fileName: string;
}

export function fileToReceipt(file: File): ReceiptFile {
  return {
    uri: URL.createObjectURL(file),
    mimeType: file.type || "image/jpeg",
    fileName: file.name || `proof-${Date.now()}.jpg`,
  };
}

export async function uploadReceipt(
  userId: string,
  receipt: ReceiptFile,
): Promise<{ url: string | null; error?: string }> {
  try {
    const ext = (receipt.fileName.split(".").pop() || "jpg").toLowerCase();
    const name = `proof-${Date.now()}.${ext}`;
    const path = `${userId}/${name}`;
    const mimeType = receipt.mimeType || "image/jpeg";

    const resp = await fetch(receipt.uri);
    const blob = await resp.blob();

    const { error } = await supabase.storage
      .from("payment-proofs")
      .upload(path, blob, { contentType: mimeType, upsert: false });
    if (error) {
      console.warn("[uploadReceipt] Supabase error:", error.message);
      return { url: null, error: error.message };
    }
    const { data: urlData } = supabase.storage.from("payment-proofs").getPublicUrl(path);
    if (!urlData?.publicUrl) return { url: null, error: "Public URL not generated" };
    return { url: urlData.publicUrl };
  } catch (err: unknown) {
    console.warn("[uploadReceipt] Exception:", err);
    return { url: null, error: err instanceof Error ? err.message : "Unknown error" };
  }
}