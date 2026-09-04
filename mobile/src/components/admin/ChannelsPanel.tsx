import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert, TextInput, Modal } from 'react-native';
import { Card, AppButton, AppText } from '@/components/ui';
import { SearchBar } from './SearchBar';
import { Toast, type ToastData } from './Toast';
import { timeAgo } from '@/core/format';
import { listChannels, updateChannel, deleteChannel, toggleChannelPremium, type AdminChannel } from '@/lib/adminApi';
import { useAdminSearch } from '@/hooks/useAdminSearch';
import { Spacing, Radius, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';

let toastSeq = 0;
const nextToastId = () => `${++toastSeq}`;

export function ChannelsPanel() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [channels, setChannels] = useState<AdminChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [editCh, setEditCh] = useState<AdminChannel | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const { searchQuery, setSearchQuery, filteredData } = useAdminSearch({
    data: channels as (AdminChannel & Record<string, unknown>)[],
    searchFields: ['display_name', 'name'],
  });

  const load = useCallback(async () => {
    try { setChannels(await listChannels()); }
    catch (e: any) { setToast({ id: nextToastId(), type: 'error', message: e.message }); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };
  const show = (type: 'success' | 'error', message: string) => setToast({ id: nextToastId(), type, message });

  const regular = filteredData.filter(ch => ch.type === 'regular');
  const pairRooms = filteredData.filter(ch => ch.type === 'pair');

  const handleTogglePremium = (ch: AdminChannel) => {
    Alert.alert(ch.is_premium ? 'Remover Premium' : 'Tornar Premium', `"${ch.display_name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', onPress: async () => {
        try { await toggleChannelPremium(ch.id); show('success', 'Atualizado'); load(); }
        catch (e: any) { show('error', e.message); }
      }},
    ]);
  };

  const handleSaveEdit = async () => {
    if (!editCh) return;
    try { await updateChannel(editCh.id, { display_name: editName, description: editDesc }); show('success', 'Canal atualizado!'); setEditCh(null); load(); }
    catch (e: any) { show('error', e.message); }
  };

  const handleDelete = (ch: AdminChannel) => {
    Alert.alert('Apagar Canal', `"${ch.display_name}"? Mensagens serão apagadas.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: async () => {
        try { await deleteChannel(ch.id); show('success', 'Apagado'); load(); }
        catch (e: any) { show('error', e.message); }
      }},
    ]);
  };

  const renderChannel = (ch: AdminChannel) => (
    <Card key={ch.id} style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <AppText variant="body">{ch.display_name}</AppText>
          <AppText variant="small" style={styles.label}>/{ch.name} • {ch.type} • {timeAgo(ch.created_at)}</AppText>
          {ch.description && <AppText variant="small" style={styles.label} numberOfLines={2}>{ch.description}</AppText>}
        </View>
        {ch.is_premium && <AppText variant="small" style={{ color: colors.warning }}>⭐ PREMIUM</AppText>}
      </View>
      <View style={styles.actions}>
        <AppButton title="Editar" onPress={() => { setEditCh(ch); setEditName(ch.display_name); setEditDesc(ch.description || ''); }} style={styles.btn} variant="ghost" />
        <AppButton title={ch.is_premium ? 'Rem. Premium' : 'Premium'} onPress={() => handleTogglePremium(ch)} style={styles.btn} variant="ghost" />
        {ch.type !== 'pair' && <AppButton title="Apagar" onPress={() => handleDelete(ch)} style={styles.btn} variant="danger" />}
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
      <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="Pesquisar canais..." />
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} style={styles.list}>
        {loading ? <AppText variant="muted" style={styles.center}>A carregar...</AppText> : (
          <>
            <AppText variant="small" style={styles.sectionTitle}>Canais Regulares ({regular.length})</AppText>
            {regular.map(renderChannel)}
            <AppText variant="small" style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>Pair Rooms ({pairRooms.length})</AppText>
            {pairRooms.map(renderChannel)}
          </>
        )}
      </ScrollView>
      <Modal visible={!!editCh} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <AppText variant="h2">Editar Canal</AppText>
            <TextInput style={styles.input} value={editName} onChangeText={setEditName} placeholder="Nome" />
            <TextInput style={[styles.input, { minHeight: 80 }]} value={editDesc} onChangeText={setEditDesc} placeholder="Descrição" multiline />
            <View style={styles.modalActions}>
              <AppButton title="Cancelar" onPress={() => setEditCh(null)} variant="ghost" />
              <AppButton title="Guardar" onPress={handleSaveEdit} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    container: { flex: 1 },
    list: { flex: 1 },
    sectionTitle: { color: c.textMuted, marginBottom: Spacing.sm },
    card: { marginBottom: Spacing.sm, padding: Spacing.md },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    label: { color: c.textMuted, marginTop: 2 },
    actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
    btn: { flex: 1 },
    center: { textAlign: 'center', marginTop: Spacing.xl },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: Spacing.lg },
    modalContent: { backgroundColor: c.bg, borderRadius: Radius.lg, padding: Spacing.lg },
    input: { borderWidth: 1, borderColor: c.border, borderRadius: Radius.sm, padding: Spacing.sm, color: c.text, marginBottom: Spacing.sm },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm, marginTop: Spacing.md },
  });
