import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Card, AppButton, AppText } from '@/components/ui';
import { FilterChips } from './FilterChips';
import { Toast, type ToastData } from './Toast';
import { timeAgo } from '@/core/format';
import { listReports, dismissReport, actOnReport, type MessageReport } from '@/lib/adminApi';
import { useAdminSearch } from '@/hooks/useAdminSearch';
import { Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';

const REASON_LABELS: Record<string, string> = {
  spam: '🚫 Spam', harassment: '⚠️ Assédio', inappropriate: '🔞 Inadequado', other: '❓ Outro',
};

let toastSeq = 0;
const nextToastId = () => `${++toastSeq}`;

export function ReportsPanel() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [reports, setReports] = useState<MessageReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  const { activeFilters, toggleFilter, clearFilters, filteredData } = useAdminSearch({
    data: reports as (MessageReport & Record<string, unknown>)[],
    searchFields: ['reason', 'details'],
    filterConfig: [
      { key: 'pending', label: 'Pendente', value: 'pending' },
      { key: 'dismissed', label: 'Dispensado', value: 'dismissed' },
      { key: 'acted', label: 'Ação tomada', value: 'acted' },
    ],
    filterField: 'status',
  });

  const load = useCallback(async () => {
    try { setReports(await listReports()); }
    catch (e: any) { setToast({ id: nextToastId(), type: 'error', message: e.message }); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };
  const show = (type: 'success' | 'error', message: string) => setToast({ id: nextToastId(), type, message });

  const pending = filteredData.filter(r => r.status === 'pending');

  const handleDismiss = (id: string) => {
    Alert.alert('Dispensar', 'Marcar como dispensado?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Dispensar', onPress: async () => {
        try { await dismissReport(id); show('success', 'Dispensado'); load(); }
        catch (e: any) { show('error', e.message); }
      }},
    ]);
  };

  const handleAct = (id: string) => {
    Alert.alert('Ação', 'O que queres fazer?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar mensagem', style: 'destructive', onPress: async () => {
        try { await actOnReport(id, true); show('success', 'Mensagem apagada'); load(); }
        catch (e: any) { show('error', e.message); }
      }},
      { text: 'Marcar como visto', onPress: async () => {
        try { await actOnReport(id, false); show('success', 'Processado'); load(); }
        catch (e: any) { show('error', e.message); }
      }},
    ]);
  };

  return (
    <View style={styles.container}>
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
      <View style={styles.summaryRow}>
        <Card style={styles.summaryCard}><AppText variant="h1" style={{ color: colors.warning }}>{pending.length}</AppText><AppText variant="small" style={styles.label}>Pendentes</AppText></Card>
        <Card style={styles.summaryCard}><AppText variant="h1">{filteredData.filter(r => r.status === 'dismissed').length}</AppText><AppText variant="small" style={styles.label}>Dispensados</AppText></Card>
        <Card style={styles.summaryCard}><AppText variant="h1" style={{ color: colors.success }}>{filteredData.filter(r => r.status === 'acted').length}</AppText><AppText variant="small" style={styles.label}>Ação tomada</AppText></Card>
      </View>
      <FilterChips
        filters={[
          { key: 'pending', label: 'Pendente', value: 'pending' },
          { key: 'dismissed', label: 'Dispensado', value: 'dismissed' },
          { key: 'acted', label: 'Ação tomada', value: 'acted' },
        ]}
        activeFilters={activeFilters}
        onToggle={toggleFilter}
        onClear={clearFilters}
      />
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} style={styles.list}>
        {loading ? <AppText variant="muted" style={styles.center}>A carregar...</AppText>
        : filteredData.length === 0 ? <AppText variant="muted" style={styles.center}>Sem reports</AppText>
        : filteredData.map(r => (
          <Card key={r.id} style={styles.itemCard}>
            <View style={styles.row}>
              <AppText variant="body">{REASON_LABELS[r.reason] || r.reason}</AppText>
              <AppText variant="small" style={styles.label}>{timeAgo(r.created_at)}</AppText>
            </View>
            {r.messages && (
              <Card style={{ marginTop: Spacing.sm, padding: Spacing.sm }}>
                <AppText variant="small" style={{ color: colors.textMuted, fontStyle: 'italic' }} numberOfLines={3}>“{r.messages.text}”</AppText>
              </Card>
            )}
            <AppText variant="small" style={styles.label}>Reportado por: {r.reporter?.email || 'desconhecido'}</AppText>
            {r.status === 'pending' ? (
              <View style={styles.actions}>
                <AppButton title="Apagar Msg" onPress={() => handleAct(r.id)} style={styles.btn} variant="danger" />
                <AppButton title="Dispensar" onPress={() => handleDismiss(r.id)} style={styles.btn} variant="ghost" />
              </View>
            ) : (
              <AppText variant="small" style={styles.label}>{r.status === 'acted' ? '✅ Ação tomada' : '⬜ Dispensado'}</AppText>
            )}
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    container: { flex: 1 },
    summaryRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
    summaryCard: { flex: 1, alignItems: 'center', padding: Spacing.sm },
    label: { color: c.textMuted },
    list: { flex: 1 },
    itemCard: { marginBottom: Spacing.sm, padding: Spacing.md },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
    btn: { flex: 1 },
    center: { textAlign: 'center', marginTop: Spacing.xl },
  });
