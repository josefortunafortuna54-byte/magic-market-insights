import { useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { AppButton, AppText } from '@/components/ui';
import { Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import type { ReceiptFile } from '@/lib/payments';
import {
  PAYMENT_METHODS,
  planLabel,
  type Currency,
  type PaymentMethod,
  type PaymentMethodInfo,
  type PlanId,
} from '@/lib/plans';

interface PaymentModalProps {
  plan: Exclude<PlanId, 'free'>;
  currency: Currency;
  price: string;
  onClose: () => void;
  onConfirm: (proof: ReceiptFile | null) => void;
  method?: PaymentMethod;
  onMethodSelect: (method: PaymentMethod | undefined) => void;
  availableMethods?: PaymentMethodInfo[];
  initialProof?: ReceiptFile | null;
  busy?: boolean;
  titleText?: string;
}

export function PaymentModal({
  plan,
  currency: _currency,
  price,
  onClose,
  onConfirm,
  method,
  onMethodSelect,
  availableMethods = PAYMENT_METHODS,
  initialProof = null,
  busy = false,
  titleText,
}: PaymentModalProps) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { t } = useTranslation();
  const selectedMethod = method ? availableMethods.find((m) => m.id === method) : null;
  const [proof, setProof] = useState<ReceiptFile | null>(initialProof);
  const [copied, setCopied] = useState(false);

  const copyValue = async () => {
    if (!selectedMethod) return;
    await Clipboard.setStringAsync(selectedMethod.copyValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const assetToReceipt = (asset: ImagePicker.ImagePickerAsset): ReceiptFile => {
    const ext = (asset.uri.split('.').pop() || 'jpg').toLowerCase();
    return {
      uri: asset.uri,
      mimeType: asset.mimeType || `image/${ext}`,
      fileName: `proof-${Date.now()}.${ext}`,
    };
  };

  const launchPicker = async (): Promise<ReceiptFile | null> => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return null;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return null;
    return assetToReceipt(result.assets[0]);
  };

  const pickProof = async () => {
    const receipt = await launchPicker();
    if (receipt) setProof(receipt);
  };

  const handleConfirm = async () => {
    if (proof) {
      onConfirm(proof);
      return;
    }
    const receipt = await launchPicker();
    if (receipt) {
      setProof(receipt);
      onConfirm(receipt);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <AppText variant="h2">{titleText ?? t('planos.paymentTitle', { plan: planLabel(plan) })}</AppText>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8} disabled={busy}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>

          <View style={styles.modalBody}>
            <AppText variant="label" style={styles.modalLabel}>{t('planos.paymentAmount', { amount: price })}</AppText>

            {!method ? (
              <>
                <AppText variant="label" style={styles.modalLabel}>{t('planos.chooseMethod')}</AppText>
                <View style={styles.methodGrid}>
                  {availableMethods.map((m) => (
                    <Pressable
                      key={m.id}
                      onPress={() => onMethodSelect(m.id)}
                      style={[
                        styles.methodCard,
                        {
                          borderColor: m.color,
                          borderWidth: 2,
                        },
                      ]}>
                      <View style={[styles.methodIcon, { backgroundColor: `${m.color}1A` }]}>
                        <Ionicons name={m.icon} size={28} color={m.color} />
                      </View>
                      <AppText variant="label" style={{ color: m.color, fontWeight: '800' }}>
                        {m.label}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : (
              <>
                <View style={styles.selectedMethod}>
                  <View style={[styles.selectedMethodIcon, { backgroundColor: `${selectedMethod?.color}1A` }]}>
                    <Ionicons name={selectedMethod?.icon ?? 'card'} size={24} color={selectedMethod?.color} />
                  </View>
                  <View style={styles.selectedMethodInfo}>
                    <AppText variant="label" style={{ color: selectedMethod?.color, fontWeight: '800' }}>
                      {selectedMethod?.label}
                    </AppText>
                    <AppText variant="small" style={{ color: colors.textMuted }}>
                      {selectedMethod?.getDetails(t)}
                    </AppText>
                  </View>
                  <Pressable onPress={() => onMethodSelect(undefined)} style={styles.changeMethodBtn} disabled={busy}>
                    <AppText variant="small" style={{ color: colors.primary }}>{t('planos.change')}</AppText>
                  </Pressable>
                </View>

                <View style={styles.copyBox}>
                  <AppText style={styles.copyValue} selectable>
                    {selectedMethod?.copyValue}
                  </AppText>
                  <Pressable onPress={copyValue} style={styles.copyBtn} disabled={busy}>
                    <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color="#05110A" />
                    <AppText style={styles.copyBtnText}>
                      {copied ? t('depositos.numberCopied') : t('depositos.copyNumber')}
                    </AppText>
                  </Pressable>
                </View>

                <View style={styles.detailsBox}>
                  <AppText style={styles.detailsText}>
                    {t('planos.payInstructions')}
                  </AppText>
                </View>

                {!proof ? (
                  <Pressable onPress={pickProof} style={styles.proofPick} disabled={busy}>
                    <View style={styles.proofPickIcon}>
                      <Ionicons name="images-outline" size={20} color={colors.primary} />
                    </View>
                    <View style={styles.proofPickText}>
                      <AppText style={styles.proofPickTitle}>{t('depositos.sendProof')}</AppText>
                      <AppText variant="small" style={{ color: colors.textMuted }}>
                        {t('depositos.sendProofHint')}
                      </AppText>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
                  </Pressable>
                ) : (
                  <View style={styles.proofPreview}>
                    <Image source={{ uri: proof.uri }} style={styles.proofThumb} />
                    <View style={styles.proofPreviewInfo}>
                      <AppText variant="label" style={{ color: colors.success }}>{t('depositos.proofAttached')}</AppText>
                      <AppText variant="small" numberOfLines={1} style={{ color: colors.textMuted }}>
                        {proof.fileName}
                      </AppText>
                    </View>
                    <Pressable onPress={() => setProof(null)} hitSlop={8} style={styles.proofRemove} disabled={busy}>
                      <Ionicons name="close" size={18} color={colors.textMuted} />
                    </Pressable>
                  </View>
                )}

                <AppText variant="small" style={styles.instructions}>
                  {t('planos.afterPayment')}
                </AppText>
              </>
            )}
          </View>

          <View style={styles.modalActions}>
            <AppButton title={t('planos.cancel')} variant="ghost" onPress={onClose} disabled={busy} />
            {method ? (
              <AppButton
                title={t('planos.receiptSent')}
                variant="primary"
                onPress={handleConfirm}
                disabled={busy}
                icon={
                  busy ? <ActivityIndicator size="small" color="#05110A" /> : undefined
                }
              />
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      padding: Spacing.md,
    },
    modalContent: {
      backgroundColor: c.surface,
      borderRadius: 20,
      padding: Spacing.lg,
      gap: Spacing.md,
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
      paddingBottom: Spacing.md,
    },
    closeBtn: {
      padding: Spacing.xs,
    },
    modalBody: {
      gap: Spacing.sm,
    },
    modalLabel: {
      color: c.textMuted,
    },
    detailsBox: {
      backgroundColor: c.surfaceElevated,
      borderRadius: 12,
      padding: Spacing.md,
      borderWidth: 1,
      borderColor: c.border,
    },
    detailsText: {
      fontSize: 18,
      fontWeight: '700',
      color: c.accent,
      textAlign: 'center',
    },
    instructions: {
      color: c.textMuted,
      textAlign: 'center',
      lineHeight: 20,
    },
    modalActions: {
      flexDirection: 'row',
      gap: Spacing.md,
      marginTop: Spacing.md,
    },
    methodGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
      marginTop: Spacing.xs,
    },
    methodCard: {
      flex: 1,
      minWidth: 100,
      maxWidth: 120,
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      borderRadius: 16,
      backgroundColor: c.surface,
      borderWidth: 2,
      padding: Spacing.md,
    },
    methodIcon: {
      width: 60,
      height: 60,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    selectedMethod: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      padding: Spacing.md,
      backgroundColor: c.surfaceElevated,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
    },
    selectedMethodIcon: {
      width: 50,
      height: 50,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    selectedMethodInfo: { flex: 1, gap: 2 },
    changeMethodBtn: { padding: Spacing.xs },
    copyBox: {
      backgroundColor: c.surfaceElevated,
      borderRadius: 12,
      padding: Spacing.md,
      gap: Spacing.sm,
      borderWidth: 1,
      borderColor: 'rgba(0,200,83,0.35)',
    },
    copyValue: {
      color: c.text,
      fontSize: 22,
      fontWeight: '800',
      letterSpacing: 1,
      textAlign: 'center',
      fontVariant: ['tabular-nums'],
    },
    copyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      alignSelf: 'center',
      minWidth: 132,
      paddingVertical: 10,
      paddingHorizontal: Spacing.md,
      borderRadius: 12,
      backgroundColor: c.primary,
    },
    copyBtnText: {
      color: '#05110A',
      fontSize: 14,
      fontWeight: '800',
    },
    proofPick: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      padding: Spacing.md,
      backgroundColor: c.surfaceElevated,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      borderStyle: 'dashed',
    },
    proofPickIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: 'rgba(22,164,58,0.14)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    proofPickText: { flex: 1, gap: 2 },
    proofPickTitle: { color: c.primary, fontWeight: '700', fontSize: 14 },
    proofPreview: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      padding: Spacing.sm,
      backgroundColor: c.surfaceElevated,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(0,200,83,0.40)',
    },
    proofThumb: {
      width: 56,
      height: 56,
      borderRadius: 10,
      backgroundColor: c.bg,
    },
    proofPreviewInfo: { flex: 1, gap: 2 },
    proofRemove: {
      padding: Spacing.xs,
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderRadius: 8,
    },
  });
