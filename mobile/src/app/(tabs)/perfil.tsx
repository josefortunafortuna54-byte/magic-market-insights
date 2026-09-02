import { useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppButton, AppInput, AppText, Badge, Screen } from '@/components/ui';
import { GradientCard } from '@/components/GradientCard';
import { PremiumLock } from '@/components/PremiumLock';
import { SectionHeader } from '@/components/SectionHeader';
import { WalletCard } from '@/components/WalletCard';
import { avatarLetter, avatarUrl, contactInfo, displayName, isEmailVerified } from '@/core/format';
import { Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { useBanca } from '@/hooks/useBanca';
import { useSubscription } from '@/hooks/useSubscription';
import { useTourTarget } from '@/components/tour/registry';
import { useTranslation } from 'react-i18next';
import { i18n } from '@/lib/i18n';
import { isAdminEmail } from '@/lib/supabase';

function MenuRow({
  icon,
  label,
  color,
  onPress,
  danger,
  right,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color?: string;
  onPress?: () => void;
  danger?: boolean;
  right?: React.ReactNode;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const tint = danger ? colors.destructive : (color ?? colors.secondary);
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.menuRow,
        disabled && styles.menuRowDisabled,
        pressed && !disabled && { backgroundColor: colors.surfaceElevated },
      ]}>
      <View style={[styles.menuIcon, { backgroundColor: `${tint}1A` }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <AppText style={{ flex: 1, color: disabled ? colors.textFaint : danger ? colors.destructive : colors.textBody }}>{label}</AppText>
      {right ?? (disabled ? <Ionicons name="lock-closed" size={14} color={colors.textFaint} /> : null)}
      <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
    </Pressable>
  );
}

export default function PerfilScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, signOut, updateProfile } = useAuth();
  const { isPremium, planTier, canAccessBanca, subscription, loading: subLoading } = useSubscription();
  const { config: banca } = useBanca();
  const walletRef = useTourTarget('tour:perfil-wallet');
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [signOutVisible, setSignOutVisible] = useState(false);

  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString(i18n.language)
    : null;

  const photo = avatarUrl(user);

  const beginEdit = () => {
    setNameInput(displayName(user));
    setEditing(true);
  };

  const commitName = async () => {
    const name = nameInput.trim();
    if (!name) {
      Alert.alert(t('perfil.nameEmpty'));
      return;
    }
    setSavingName(true);
    const { ok } = await updateProfile({ full_name: name });
    setSavingName(false);
    if (!ok) {
      Alert.alert(t('perfil.nameSaveError'));
      return;
    }
    setEditing(false);
    Alert.alert(t('perfil.nameSaved'));
  };

  const confirmSignOut = () => {
    setSignOutVisible(true);
  };

  return (
    <Screen scroll={false} safeTop>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <GradientCard
          colors={[colors.primaryDim, 'rgba(255,159,10,0.07)']}
          style={styles.identity}>
          <View style={styles.glowOne} pointerEvents="none" />
          <View style={styles.glowTwo} pointerEvents="none" />
          <View style={styles.avatarWrap}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.avatarImg} />
            ) : (
              <View style={[styles.avatar, { borderColor: colors.primary, backgroundColor: colors.surfaceElevated }]}>
                <AppText style={[styles.avatarText, { color: colors.text }]}>{user ? avatarLetter(user) : t('perfil.fallbackAvatar')}</AppText>
              </View>
            )}
            {user ? (
              <Pressable
                onPress={beginEdit}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('perfil.editName')}
                style={[styles.editBtn, { backgroundColor: colors.accent, borderColor: colors.bg }]}>
                <Ionicons name="pencil" size={13} color="#1A1A2E" />
              </Pressable>
            ) : null}
          </View>

          {editing && user ? (
            <View style={styles.editWrap}>
              <AppInput
                label={t('perfil.nameLabel')}
                value={nameInput}
                onChangeText={setNameInput}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={commitName}
              />
              <View style={styles.editActions}>
                <AppButton title={t('common.cancel')} variant="ghost" onPress={() => setEditing(false)} style={styles.editActionBtn} />
                <AppButton title={t('common.save')} loading={savingName} onPress={commitName} style={styles.editActionBtn} />
              </View>
            </View>
          ) : (
            <>
              <AppText variant="h1">{user ? displayName(user) : t('perfil.trader')}</AppText>
              {user ? (
                <View style={styles.contactRow}>
                  <AppText variant="muted">{contactInfo(user) ?? t('perfil.verified')}</AppText>
                  {isEmailVerified(user) ? (
                    <Ionicons name="checkmark-circle" size={15} color={colors.success} />
                  ) : null}
                </View>
              ) : (
                <AppText variant="muted">{t('perfil.notAuthed')}</AppText>
              )}
              {user ? (
                <AppText variant="small" style={styles.memberSince}>
                  {t('perfil.memberSince', { date: new Date(user.created_at).toLocaleDateString(i18n.language) })}
                </AppText>
              ) : null}
              <View style={styles.badgeWrap}>
                {isPremium ? (
                  <Badge color={colors.accent} bg={`${colors.accent}20`}>
                    {periodEnd ? t('perfil.premiumUntil', { date: periodEnd }) : t('perfil.premium')}
                  </Badge>
                ) : (
                  <Badge color={colors.textMuted} bg={`${colors.textMuted}20`}>{t('perfil.freePlan')}</Badge>
                )}
              </View>
            </>
          )}
        </GradientCard>

        <View ref={walletRef} collapsable={false} style={styles.section}>
          <SectionHeader
            title={t('perfil.walletSection')}
            subtitle={
              canAccessBanca
                ? t('perfil.bancaManagement')
                : subLoading
                  ? undefined
                  : t('perfil.availablePremium')
            }
            action={
              canAccessBanca ? { label: t('perfil.viewBanca'), onPress: () => router.push('/banca') } : undefined
            }
          />
          {canAccessBanca ? (
            <WalletCard config={banca} />
          ) : subLoading ? null : (
            <PremiumLock
              compact
              label={t('perfil.walletLockTitle')}
              description={t('perfil.walletLockDesc')}
            />
          )}
        </View>

        <View style={styles.section}>
          <AppText variant="label" style={styles.sectionLabel}>{t('perfil.sectionAccount')}</AppText>
          <View style={styles.menu}>
            <MenuRow icon="trophy" label={t('perfil.mySubscription')} onPress={() => router.push('/planos')} right={
              isPremium ? (
                <Badge color={colors.accent} bg={`${colors.accent}20`}>
                  {planTier === 'basic'
                    ? t('components.dashboardHeader.basic')
                    : planTier === 'pro'
                      ? t('components.dashboardHeader.pro')
                      : t('components.dashboardHeader.premium')}
                </Badge>
              ) : null
            } />
            <MenuRow icon="wallet" label={t('perfil.banca')} color={colors.success} onPress={() => router.push('/banca')} disabled={!subLoading && !canAccessBanca} />
            <MenuRow icon="book" label={t('perfil.diario')} color={colors.accent} onPress={() => router.push('/diario-trader')} />
          </View>
        </View>

        <View style={styles.section}>
          <AppText variant="label" style={styles.sectionLabel}>{t('perfil.sectionPreferences')}</AppText>
          <View style={styles.menu}>
            <MenuRow icon="notifications" label={t('perfil.notifications')} onPress={() => router.push('/notificacoes')} />
            <MenuRow icon="alarm" label={t('perfil.manageAlerts')} onPress={() => router.push('/horarios')} disabled={!isPremium} />
            <MenuRow icon="contrast" label={t('theme.title')} onPress={() => router.push('/tema')} />
            <MenuRow icon="globe" label={t('language.title')} onPress={() => router.push('/idioma')} />
          </View>
        </View>

        {user ? (
          <>
            {isAdminEmail(user.email) ? (
              <View style={styles.section}>
                <AppText variant="label" style={styles.sectionLabel}>{t('perfil.sectionAdmin')}</AppText>
                <View style={styles.menu}>
                  <MenuRow
                    icon="shield"
                    label={t('perfil.adminArea')}
                    color={colors.accent}
                    onPress={() => router.push('/admin-gate')}
                    right={<Badge color={colors.accent} bg={`${colors.accent}20`}>{t('perfil.adminBadge')}</Badge>}
                  />
                </View>
              </View>
            ) : null}
            <MenuRow icon="log-out" label={t('perfil.signOut')} danger onPress={confirmSignOut} />
          </>
        ) : (
          <MenuRow icon="log-in" label={t('perfil.signIn')} color={colors.primary} onPress={() => router.push('/login')} />
        )}

        <AppText variant="small" style={styles.version}>{t('perfil.version')}</AppText>
      </ScrollView>

      <Modal
        visible={signOutVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setSignOutVisible(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setSignOutVisible(false)}>
          <Pressable style={styles.signOutCard} onPress={() => {}}>
            <View style={[styles.signOutIcon, { backgroundColor: `${colors.destructive}1A`, borderColor: `${colors.destructive}44` }]}>
              <Ionicons name="log-out-outline" size={26} color={colors.destructive} />
            </View>
            <AppText variant="h2" style={styles.signOutTitle}>{t('perfil.signOutTitle')}</AppText>
            <AppText variant="small" style={styles.signOutBody}>{t('perfil.signOutBody')}</AppText>
            <View style={styles.signOutActions}>
              <AppButton
                title={t('common.cancel')}
                variant="outline"
                onPress={() => setSignOutVisible(false)}
                style={styles.signOutCancelBtn}
              />
              <AppButton
                title={t('perfil.signOut')}
                variant="danger"
                onPress={() => {
                  setSignOutVisible(false);
                  signOut();
                }}
                style={styles.signOutConfirmBtn}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    content: { paddingTop: Spacing.xl, paddingBottom: Spacing.xl },
    identity: {
      alignItems: 'center',
      gap: Spacing.xs,
      paddingTop: Spacing.md,
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.lg,
      marginBottom: Spacing.lg,
      overflow: 'hidden',
    },
    glowOne: {
      position: 'absolute',
      top: -100,
      right: -60,
      width: 220,
      height: 220,
      borderRadius: 110,
      backgroundColor: `${c.primary}12`,
    },
    glowTwo: {
      position: 'absolute',
      bottom: -90,
      left: -50,
      width: 200,
      height: 200,
      borderRadius: 100,
      backgroundColor: 'rgba(255,159,10,0.08)',
    },
    avatarWrap: {
      marginBottom: Spacing.sm,
    },
    avatar: {
      width: 84,
      height: 84,
      borderRadius: 42,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarImg: {
      width: 84,
      height: 84,
      borderRadius: 42,
      borderWidth: 2,
      borderColor: c.primary,
    },
    avatarText: { fontSize: 32, fontWeight: '800' },
    editBtn: {
      position: 'absolute',
      right: -2,
      bottom: -2,
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    contactRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    memberSince: {
      color: c.textFaint,
    },
    editWrap: {
      alignSelf: 'stretch',
      marginTop: Spacing.xs,
    },
    editActions: {
      flexDirection: 'row',
      gap: Spacing.md,
    },
    editActionBtn: { flex: 1 },
    badgeWrap: { marginTop: Spacing.sm },
    section: { marginBottom: Spacing.lg },
    sectionLabel: {
      color: c.textFaint,
      marginBottom: Spacing.sm,
      letterSpacing: 0.5,
    },
    menu: {
      backgroundColor: c.surface,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: 16,
      overflow: 'hidden',
    },
    menuRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      padding: Spacing.md,
      borderBottomColor: c.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    menuRowDisabled: {
      opacity: 0.45,
    },
    menuIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    version: { textAlign: 'center', color: c.textFaint, marginTop: Spacing.lg },
    sheetBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.lg,
    },
    signOutCard: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: c.surfaceElevated,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: Spacing.xl,
      paddingHorizontal: Spacing.lg,
      alignItems: 'center',
      gap: Spacing.sm,
    },
    signOutIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.xs,
    },
    signOutTitle: { textAlign: 'center' },
    signOutBody: { color: c.textMuted, textAlign: 'center', lineHeight: 20 },
    signOutActions: {
      flexDirection: 'row',
      gap: Spacing.sm,
      width: '100%',
      marginTop: Spacing.md,
    },
    signOutCancelBtn: { flex: 1 },
    signOutConfirmBtn: { flex: 1 },
  });
