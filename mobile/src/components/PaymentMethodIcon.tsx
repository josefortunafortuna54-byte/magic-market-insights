import { Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ImageSourcePropType } from 'react-native';
import type { PaymentMethodInfo } from '@/lib/plans';

interface Props {
  method: PaymentMethodInfo | null | undefined;
  size: number;
  /** Cor do glyph Ionicons. Ignorado quando o metodo tem logo. */
  color?: string;
  /** Glyph usado quando nao ha metodo. */
  fallbackIcon?: keyof typeof Ionicons.glyphMap;
}

/**
 * Icone de um metodo de pagamento.
 *
 * Metodos com `iconImage` (logotipo oficial) sao renderizados como imagem; os
 * restantes usam o glyph Ionicons. O logotipo nunca e recolorido — e uma marca,
 * nao um pictograma — por isso o parametro `color` so afecta o fallback.
 */
export function PaymentMethodIcon({ method, size, color, fallbackIcon = 'card' }: Props) {
  if (method?.iconImage) {
    const source: ImageSourcePropType = method.iconImage;
    return (
      <Image
        source={source}
        style={{ width: size, height: size }}
        resizeMode="contain"
        accessible={false}
      />
    );
  }
  return <Ionicons name={method?.icon ?? fallbackIcon} size={size} color={color} />;
}
