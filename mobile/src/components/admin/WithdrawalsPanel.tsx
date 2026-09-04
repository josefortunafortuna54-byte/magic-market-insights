import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Card, AppButton, AppText } from '@/components/ui';
import { SearchBar } from './SearchBar';
import { FilterChips } from './FilterChips';
import { Toast, type ToastData } from './Toast';
import { timeAgo } from '@/core/format';
import { listWithdrawals, approveWithdrawal, rejectWithdrawalWithNotes, markWithdrawalPaid, type WithdrawalRequest } from '@/lib/adminApi';
import { useAdminSearch } from '@/hooks/useAdminSearch';
import { Spacing, Radius, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';

const METHOD_ICONS: Record<string, string> = {
  binance: '💰', rodotpay: '💳', express: '💸',
};

export function WithdrawalsPanel() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  const {
    searchQuery, setSearchQuery, activeFilters, toggleFilter, clearFilters, filteredData,
  } = useAdminSearch({
    data: withdrawals as (WithdrawalRequest & Record<string, unknown>)[],
    searchFields: ['method', 'currency'],
    filterConfig: [
      { key: 'pending', label: 'Pendente', value: 'pending' },
      { key: 'approved', label: 'Aprovado', value: 'approved' },
      { key: 'rejected', label: 'Rejeitado', value: 'rejected' },
      { key: 'paid', label: 'Pago', value: 'paid' },
    ],
    filterField: 'status',
  });

  const load = useCallback(async () => {
    try { setWithdrawals(await listWithdrawals()); }
    catch (e: any) { setToast({ id: Date.now().toString(), type: 'error', message: e.message }); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const pending = withdrawals.filter(w => w.status === 'pending');
  const approved = withdrawals.filter(w => w.status === 'approved');
  const paid = withdrawals.filter(w => w.status === 'paid');
  const totalVolume = approved.reduce((sum, w) => sum + Number(w.amount), 0);

  const handleApprove = (id: string) => {
    Alert.alert('Aprovar', 'Aprovar este pedido?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Aprovar', onPress: async () => {
        try { await approveWithdrawal(id); setToast({ id: Date.now().toString(), type: 'success', message: 'Aprovado!' }); load(); }
        catch (e: any) { setToast({ id: Date.now().toString(), type: 'error', message: e.message }); }
      }},
    ]);
  };

  const handleReject = (id: string) => {
    Alert.alert('Rejeitar', 'Rejeitar este pedido?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Rejeitar', style: 'destructive', onPress: async () => {
        try { await rejectWithdrawalWithNotes(id); setToast({ id: Date.now().toString(), type: 'success', message: 'Rejeitado' }); load(); }
        catch (e: any) { setToast({ id: Date.now().toString(), type: 'error', message: e.message }); }
      }},
    ]);
  };

  const handleMarkPaid = (id: string) => {
    Alert.alert('Marcar como Pago', 'Confirmar?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', onPress: async () => {
        try { await markWithdrawalPaid(id); setToast({ id: Date.now().toString(), type: 'success', message: 'Marcado como pago!' }); load(); }
        catch (e: any) { setToast({ id: Date.now().toString(), type: 'error', message: e.message }); }
      }},
    ]);
  };

  const statusColor = (s: string) =>
    s === 'pending' ? colors.warning : s === 'approved' ? colors.success : s === 'paid' ? colors.primary : colors.destructive;
  const statusLabel = (s: string) =>
    s === 'pending' ? 'Pendente' : s === 'approved' ? 'Aprovado' : s === 'paid' ? 'Pago' : 'Rejeitado';

  return (
    <View style={styles.container}>
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
      <View style={styles.summaryRow}>
        <Card style={styles.summaryCard}><AppText variant="h1">{pending.length}</AppText><AppText variant="small" style={styles.label}>Pendentes</AppText></Card>
        <Card style={styles.summaryCard}><AppText variant="h1" style={{ color: colors.success }}>{approved.length}</AppText><AppText variant="small" style={styles.label}>Aprovados</AppText></Card>
        <Card style={styles.summaryCard}><AppText variant="h1" style={{ color: colors.primary }}>{paid.length}</AppText><AppText variant="small" style={styles.label}>Pagos</AppText></Card>
        <Card style={styles.summaryCard}><AppText variant="h1">${totalVolume.toFixed(2)}</AppText><AppText variant="small" style={styles.label}>Volume</AppText></Card>
      </View>
      <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="Pesquisar..." />
      <FilterChips
        filters={[
          { key: 'pending', label: 'Pendente', value: 'pending' },
          { key: 'approved', label: 'Aprovado', value: 'approved' },
          { key: 'rejected', label: 'Rejeitado', value: 'rejected' },
          { key: 'paid', label: 'Pago', value: 'paid' },
        ]}
        activeFilters={activeFilters}
        onToggle={toggleFilter}
        onClear={clearFilters}
      />
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} style={styles.list}>
        {loading ? <AppText variant="muted" style={styles.center}>A carregar...</AppText>
        : filteredData.length === 0 ? <AppText variant="muted" style={styles.center}>Sem pedidos</AppText>
        : filteredData.map(w => (
          <Card key={w.id} style={styles.itemCard}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <AppText variant="body">{METHOD_ICONS[w.method] || '💸'} {w.method}</AppText>
                <AppText variant="small" style={styles.label}>{w.currency.toUpperCase()} • {timeAgo(w.created_at)}</AppText>
              </View>
              <View style={[styles.badge, { backgroundColor: statusColor(w.status) + '20' }]}>
                <AppText variant="small" style={{ color: statusColor(w.status) }}>{statusLabel(w.status)}</AppText>
              </View>
            </View>
            <AppText variant="h1" style={{ marginTop: Spacing.sm }}>${Number(w.amount).toFixed(2)}</AppText>
            {w.details && <AppText variant="small" style={styles.label}>{w.details}</AppText>}
            {w.status === 'pending' && (
              <View style={styles.actions}>
                <AppButton title="Aprovar" onPress={() => handleApprove(w.id)} style={styles.btn} />
                <AppButton title="Rejeitar" onPress={() => handleReject(w.id)} style={styles.btn} variant="danger" />
              </View>
            )}
            {w.status === 'approved' && (
              <View style={styles.actions}>
                <AppButton title="Marcar Pago" onPress={() => handleMarkPaid(w.id)} style={styles.btn} />
              </View>
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
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm },
    actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
    btn: { flex: 1 },
    center: { textAlign: 'center', marginTop: Spacing.xl },
  });
