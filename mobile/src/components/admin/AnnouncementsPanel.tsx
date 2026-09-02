import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert, TextInput, Modal, Switch } from 'react-native';
import { Card, AppButton, AppText } from '@/components/ui';
import { Toast, type ToastData } from './Toast';
import { timeAgo } from '@/core/format';
import {
  listAnnouncements,
  upsertAnnouncement,
  deleteAnnouncement,
  type AdminAnnouncement,
} from '@/lib/adminApi';
import { Spacing, Radius, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';

let toastSeq = 0;
const nextToastId = () => `${++toastSeq}`;

interface Draft {
  id?: string;
  title: string;
  body: string;
  image_url: string;
  link: string;
  link_label: string;
  sort_order: string;
  is_active: boolean;
}

const EMPTY_DRAFT: Draft = {
  title: '',
  body: '',
  image_url: '',
  link: '',
  link_label: '',
  sort_order: '0',
  is_active: true,
};

export function AnnouncementsPanel() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [items, setItems] = useState<AdminAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try { setItems(await listAnnouncements()); }
    catch (e: any) { setToast({ id: nextToastId(), type: 'error', message: e.message }); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };
  const show = (type: 'success' | 'error', message: string) => setToast({ id: nextToastId(), type, message });

  const handleSave = async () => {
    if (!draft || !draft.title.trim()) return;
    setSaving(true);
    try {
      await upsertAnnouncement({
        id: draft.id,
        title: draft.title.trim(),
        body: draft.body.trim() || null,
        image_url: draft.image_url.trim() || null,
        link: draft.link.trim() || null,
        link_label: draft.link_label.trim() || null,
        is_active: draft.is_active,
        sort_order: parseInt(draft.sort_order, 10) || 0,
      });
      show('success', draft.id ? 'Anúncio atualizado!' : 'Anúncio criado!');
      setDraft(null);
      load();
    } catch (e: any) {
      show('error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (a: AdminAnnouncement) => {
    Alert.alert('Apagar Anúncio', `"${a.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: async () => {
        try { await deleteAnnouncement(a.id); show('success', 'Apagado'); load(); }
        catch (e: any) { show('error', e.message); }
      }},
    ]);
  };

  const openEdit = (a: AdminAnnouncement) => {
    setDraft({
      id: a.id,
      title: a.title,
      body: a.body ?? '',
      image_url: a.image_url ?? '',
      link: a.link ?? '',
      link_label: a.link_label ?? '',
      sort_order: String(a.sort_order ?? 0),
      is_active: a.is_active,
    });
  };

  return (
    <View style={styles.container}>
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
      <AppButton title="+ Novo Anúncio" variant="primary" onPress={() => setDraft({ ...EMPTY_DRAFT })} style={styles.newBtn} />
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} style={styles.list}>
        {loading ? <AppText variant="muted" style={styles.center}>A carregar...</AppText> : items.length === 0 ? (
          <AppText variant="muted" style={styles.center}>
            Nenhum anúncio. Crie pelo menos dois para o card rodar automaticamente.
          </AppText>
        ) : (
          items.map((a) => (
            <Card key={a.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <AppText variant="body" numberOfLines={1}>{a.title}</AppText>
                  {!!a.body && <AppText variant="small" style={styles.label} numberOfLines={2}>{a.body}</AppText>}
                  <AppText variant="small" style={styles.label}>
                    #{a.sort_order} • {timeAgo(a.created_at)}{a.link ? ` • ${a.link}` : ''}
                  </AppText>
                </View>
                {!a.is_active && <AppText variant="small" style={{ color: colors.textMuted }}>Inativo</AppText>}
              </View>
              <View style={styles.actions}>
                <AppButton title="Editar" onPress={() => openEdit(a)} style={styles.btn} variant="ghost" />
                <AppButton
                  title={a.is_active ? 'Desativar' : 'Ativar'}
                  onPress={() => {
                    upsertAnnouncement({ ...a, is_active: !a.is_active })
                      .then(() => { show('success', 'Atualizado'); load(); })
                      .catch((e: any) => show('error', e.message));
                  }}
                  style={styles.btn}
                  variant="ghost"
                />
                <AppButton title="Apagar" onPress={() => handleDelete(a)} style={styles.btn} variant="danger" />
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      <Modal visible={!!draft} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
            <AppText variant="h2">{draft?.id ? 'Editar Anúncio' : 'Novo Anúncio'}</AppText>
            <TextInput style={styles.input} value={draft?.title ?? ''} onChangeText={(v) => setDraft((d) => d && { ...d, title: v })} placeholder="Título *" placeholderTextColor={colors.textFaint} />
            <TextInput style={[styles.input, { minHeight: 80 }]} value={draft?.body ?? ''} onChangeText={(v) => setDraft((d) => d && { ...d, body: v })} placeholder="Descrição (opcional)" placeholderTextColor={colors.textFaint} multiline />
            <TextInput style={styles.input} value={draft?.image_url ?? ''} onChangeText={(v) => setDraft((d) => d && { ...d, image_url: v })} placeholder="URL da imagem (opcional)" placeholderTextColor={colors.textFaint} autoCapitalize="none" />
            <TextInput style={styles.input} value={draft?.link ?? ''} onChangeText={(v) => setDraft((d) => d && { ...d, link: v })} placeholder="Link ao tocar (/planos ou https://…)" placeholderTextColor={colors.textFaint} autoCapitalize="none" />
            <TextInput style={styles.input} value={draft?.link_label ?? ''} onChangeText={(v) => setDraft((d) => d && { ...d, link_label: v })} placeholder="Texto do botão do link (opcional)" placeholderTextColor={colors.textFaint} />
            <TextInput style={styles.input} value={draft?.sort_order ?? '0'} onChangeText={(v) => setDraft((d) => d && { ...d, sort_order: v.replace(/\D/g, '') })} placeholder="Ordem (0 = primeiro)" placeholderTextColor={colors.textFaint} keyboardType="number-pad" />
            <View style={styles.switchRow}>
              <AppText variant="body">Ativo</AppText>
              <Switch
                value={draft?.is_active ?? true}
                onValueChange={(v) => setDraft((d) => d && { ...d, is_active: v })}
                trackColor={{ true: colors.primary }}
              />
            </View>
            <View style={styles.modalActions}>
              <AppButton title="Cancelar" onPress={() => setDraft(null)} variant="ghost" />
              <AppButton title="Guardar" onPress={handleSave} loading={saving} disabled={!draft?.title.trim()} />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    container: { flex: 1 },
    list: { flex: 1 },
    newBtn: { marginBottom: Spacing.md },
    sectionTitle: { color: c.textMuted, marginBottom: Spacing.sm },
    card: { marginBottom: Spacing.sm, padding: Spacing.md },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    label: { color: c.textMuted, marginTop: 2 },
    actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
    btn: { flex: 1 },
    center: { textAlign: 'center', marginTop: Spacing.xl },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' },
    modalScroll: { flexGrow: 0, marginHorizontal: Spacing.lg, maxHeight: '85%', borderRadius: Radius.lg },
    modalContent: { backgroundColor: c.bg, borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.xs },
    input: { borderWidth: 1, borderColor: c.border, borderRadius: Radius.sm, padding: Spacing.sm, color: c.text },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm, marginTop: Spacing.sm },
  });
