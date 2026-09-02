import { Platform } from 'react-native';

export interface PreparedImage {
  base64: string;
  uri: string;
  mimeType: string;
}

// expo-file-system não suporta web — lê o blob via fetch + FileReader.
async function blobToBase64(uri: string): Promise<string> {
  const res = await fetch(uri);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = String(reader.result || '');
      resolve(dataUrl.includes(',') ? dataUrl.split(',')[1] : '');
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function readBase64(uri: string): Promise<string> {
  if (Platform.OS === 'web') return blobToBase64(uri);
  const { File } = await import('expo-file-system');
  return new File(uri).base64();
}

/**
 * Prepara uma imagem para análise pela IA: redimensiona para <=1280px e
 * comprime em JPEG quando o módulo nativo está disponível (requer rebuild do
 * dev client/APK após instalar expo-image-manipulator). Em builds antigas sem
 * o módulo, cai para leitura direta do ficheiro — a edge function rejeita
 * imagens demasiado grandes com mensagem clara.
 */
export async function prepareImageForAnalysis(
  uri: string,
  mimeType: string,
): Promise<PreparedImage> {
  try {
    if (Platform.OS !== 'web') {
      const ImageManipulator = await import('expo-image-manipulator');
      const out = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1280 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true },
      );
      if (out.base64) {
        return { base64: out.base64, uri: out.uri, mimeType: 'image/jpeg' };
      }
    }
  } catch {
    // Módulo nativo indisponível (build antiga) — usa o ficheiro original.
  }

  const base64 = await readBase64(uri);
  return { base64, uri, mimeType };
}
