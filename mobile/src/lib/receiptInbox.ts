import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ReceiptFile } from '@/lib/payments';

const RECEIPT_INBOX_KEY = 'payment_receipt_inbox';

export async function saveReceiptInbox(receipt: ReceiptFile): Promise<void> {
  await AsyncStorage.setItem(RECEIPT_INBOX_KEY, JSON.stringify(receipt));
}

export async function getReceiptInbox(): Promise<ReceiptFile | null> {
  const raw = await AsyncStorage.getItem(RECEIPT_INBOX_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ReceiptFile;
  } catch {
    return null;
  }
}

export async function clearReceiptInbox(): Promise<void> {
  await AsyncStorage.removeItem(RECEIPT_INBOX_KEY);
}
