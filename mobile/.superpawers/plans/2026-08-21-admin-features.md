# Admin Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpawers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 4 admin features: Withdrawals management + Revenue analytics, DM/Push messaging, Message reporting/moderation, and Channel management.

**Architecture:** All admin features follow the existing pattern: client `callAdminFn()` → Edge Function `admin-manage` switch/case → service-role Supabase queries. New DB tables use RLS with service_role bypass. UI adds new tabs to the existing admin screen (`src/app/(tabs)/admin.tsx`).

**Tech Stack:** Expo/React Native, Supabase (Postgres + Edge Functions), React Query, Expo Router, TypeScript

**Existing patterns to follow:**
- Client wrappers: `src/lib/adminApi.ts` — `callAdminFn(action, payload)`
- Edge Function: `supabase/functions/admin-manage/index.ts` — switch/case on `action`
- Admin UI: `src/app/(tabs)/admin.tsx` — TABS array of `{ key, labelKey }` objects, ternary chain render
- Components: `src/components/admin/` — SearchBar, FilterChips (multi-select), BulkActionsBar, Toast (`<Toast toast={toastData} onDismiss={fn} />`)
- UI primitives: `Card`, `AppButton`, `AppText` from `@/components/ui`
- Theme colors: `Colors.textMuted`, `Colors.success`, `Colors.warning`, `Colors.destructive`
- Format utils: `timeAgo` from `@/core/format`
- i18n keys: `admin.tabXxx` convention (e.g. `admin.tabDashboard`)

---

## Feature 1: Withdrawals Management + Revenue Analytics

### Task 1.1: Add `mark_withdrawal_paid` Edge Function action

**Files:**
- Modify: `supabase/functions/admin-manage/index.ts:692-721`

- [ ] **Step 1: Add `mark_withdrawal_paid` case to the switch**

In `supabase/functions/admin-manage/index.ts`, after the `reject_withdrawal` case (line 721), add:

```ts
case 'mark_withdrawal_paid': {
  const { id } = body;
  if (!id) return errorJson('id em falta.');
  const { error } = await supabase.from('withdrawal_requests').update({
    status: 'paid',
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) return errorJson(error.message, 500);
  return json({ ok: true });
}
```

- [ ] **Step 2: Add `notes` support to `reject_withdrawal`**

Replace the existing `reject_withdrawal` case (lines 711-721) with:

```ts
case 'reject_withdrawal': {
  const { id, notes } = body;
  if (!id) return errorJson('id em falta.');
  const { error } = await supabase.from('withdrawal_requests').update({
    status: 'rejected',
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
    notes: notes || null,
  }).eq('id', id);
  if (error) return errorJson(error.message, 500);
  return json({ ok: true });
}
```

- [ ] **Step 3: Add `list_withdrawals` pagination**

Replace the existing `list_withdrawals` case (lines 693-699) with:

```ts
case 'list_withdrawals': {
  const limit = Math.min(Number(body.limit) || 50, 200);
  const offset = Number(body.offset) || 0;
  let query = supabase.from('withdrawal_requests').select('*').order('created_at', { ascending: false });
  if (body.status) query = query.eq('status', body.status);
  query = query.range(offset, offset + limit - 1);
  const { data, error } = await query;
  if (error) return errorJson(error.message, 500);
  return json({ withdrawals: data });
}
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/admin-manage/index.ts
git commit -m "feat(admin): add mark_withdrawal_paid, notes on reject, pagination"
```

### Task 1.2: Add client wrappers for withdrawals

**Files:**
- Modify: `src/lib/adminApi.ts:229-274`

- [ ] **Step 1: Add missing wrappers**

After the existing `rejectWithdrawal` function (line 274), add:

```ts
export async function markWithdrawalPaid(id: string): Promise<void> {
  await callAdminFn('mark_withdrawal_paid', { id });
}

export async function rejectWithdrawalWithNotes(id: string, notes?: string): Promise<void> {
  await callAdminFn('reject_withdrawal', { id, notes });
}
```

Update `listWithdrawals` to accept pagination params. Replace lines 263-266:

```ts
export async function listWithdrawals(status?: string, limit = 50, offset = 0): Promise<WithdrawalRequest[]> {
  const { withdrawals } = await callAdminFn<{ withdrawals: WithdrawalRequest[] }>('list_withdrawals', { status, limit, offset });
  return withdrawals;
}
```

- [ ] **Step 2: Add `listReceipts` pagination + update Edge Function**

In `supabase/functions/admin-manage/index.ts`, update `handleListReceipts` (lines 286-299) to accept `limit`/`offset`:

```ts
case 'list_receipts': {
  const limit = Math.min(Number(body.limit) || 50, 200);
  const offset = Number(body.offset) || 0;
  let query = supabase.from('payment_receipts').select('*').order('created_at', { ascending: false });
  if (body.status) query = query.eq('status', body.status);
  query = query.range(offset, offset + limit - 1);
  const { data, error } = await query;
  if (error) return errorJson(error.message, 500);
  return json({ receipts: data });
}
```

Update client wrapper in `src/lib/adminApi.ts` lines 143-146:

```ts
export async function listReceipts(status?: string, limit = 50, offset = 0): Promise<PaymentReceipt[]> {
  const { receipts } = await callAdminFn<{ receipts: PaymentReceipt[] }>('list_receipts', { status, limit, offset });
  return receipts;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/adminApi.ts supabase/functions/admin-manage/index.ts
git commit -m "feat(admin): add withdrawal + receipt client wrappers with pagination"
```

### Task 1.3: Create WithdrawalsPanel component

**Files:**
- Create: `src/components/admin/WithdrawalsPanel.tsx`

- [ ] **Step 1: Create WithdrawalsPanel**

Create `src/components/admin/WithdrawalsPanel.tsx`. Key API patterns to follow:
- Import `Card`, `AppButton`, `AppText` from `@/components/ui`
- Import `Toast` from `@/components/admin`
- Toast state: `{ id: string; type: 'success'|'error'; message: string }` with `onDismiss` callback
- Use `useAdminSearch` hook for search + filter (multi-select FilterChips pattern)
- Colors: use `Colors.textMuted` (not `textDim`), `Colors.success`, `Colors.warning`, `Colors.destructive`
- Import `timeAgo` from `@/core/format`

```tsx
import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Card, AppButton, AppText } from '@/components/ui';
import { SearchBar, FilterChips, Toast, type ToastData } from '@/components/admin';
import { timeAgo } from '@/core/format';
import { listWithdrawals, approveWithdrawal, rejectWithdrawalWithNotes, markWithdrawalPaid, type WithdrawalRequest } from '@/lib/adminApi';
import { useAdminSearch } from '@/hooks/useAdminSearch';
import { Colors, Spacing, Radius } from '@/core/theme';

const METHOD_ICONS: Record<string, string> = {
  binance: '💰', rodotpay: '💳', express: '💸',
};

export function WithdrawalsPanel() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  const {
    searchQuery, setSearchQuery, activeFilters, toggleFilter, clearFilters, filteredData,
  } = useAdminSearch({
    data: withdrawals,
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

  useEffect(() => { load(); }, [load]);
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
    s === 'pending' ? Colors.warning : s === 'approved' ? Colors.success : s === 'paid' ? Colors.primary : Colors.destructive;
  const statusLabel = (s: string) =>
    s === 'pending' ? 'Pendente' : s === 'approved' ? 'Aprovado' : s === 'paid' ? 'Pago' : 'Rejeitado';

  return (
    <View style={styles.container}>
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
      <View style={styles.summaryRow}>
        <Card style={styles.summaryCard}><AppText variant="h1">{pending.length}</AppText><AppText variant="small" style={styles.label}>Pendentes</AppText></Card>
        <Card style={styles.summaryCard}><AppText variant="h1" style={{ color: Colors.success }}>{approved.length}</AppText><AppText variant="small" style={styles.label}>Aprovados</AppText></Card>
        <Card style={styles.summaryCard}><AppText variant="h1" style={{ color: Colors.primary }}>{paid.length}</AppText><AppText variant="small" style={styles.label}>Pagos</AppText></Card>
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  summaryRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  summaryCard: { flex: 1, alignItems: 'center', padding: Spacing.sm },
  label: { color: Colors.textMuted },
  list: { flex: 1 },
  itemCard: { marginBottom: Spacing.sm, padding: Spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  btn: { flex: 1 },
  center: { textAlign: 'center', marginTop: Spacing.xl },
});
```

- [ ] **Step 2: Export from barrel**

Add to `src/components/admin/index.ts`:

```ts
export { WithdrawalsPanel } from './WithdrawalsPanel';
```

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/WithdrawalsPanel.tsx src/components/admin/index.ts
git commit -m "feat(admin): add WithdrawalsPanel component"
```

### Task 1.4: Wire WithdrawalsPanel into admin screen

**Files:**
- Modify: `src/app/(tabs)/admin.tsx`

- [ ] **Step 1: Add import and extend TABS**

Add import at top:

```ts
import { WithdrawalsPanel } from '@/components/admin';
```

Extend the `Tab` type (line 27):

```ts
type Tab = 'dashboard' | 'signals' | 'boom' | 'boom_times' | 'posts' | 'users' | 'receipts' | 'withdrawals' | 'messaging' | 'reports' | 'channels';
```

Add new entries to `TABS` array (after line 36):

```ts
{ key: 'withdrawals' as const, labelKey: 'admin.tabWithdrawals' as const },
{ key: 'messaging' as const, labelKey: 'admin.tabMessaging' as const },
{ key: 'reports' as const, labelKey: 'admin.tabReports' as const },
{ key: 'channels' as const, labelKey: 'admin.tabChannels' as const },
```

- [ ] **Step 2: Add ternary in render chain**

In the render section (around line 184-198), insert before the final `(` users panel `)`:

```tsx
) : tab === 'withdrawals' ? (
  <WithdrawalsPanel />
```

- [ ] **Step 3: Add translation keys**

In `src/lib/i18n/locales/pt.json`, under `admin`, add:

```json
"tabWithdrawals": "Levantamentos",
"tabMessaging": "Mensagens",
"tabReports": "Reports",
"tabChannels": "Canais"
```

In `src/lib/i18n/locales/en.json`, under `admin`, add:

```json
"tabWithdrawals": "Withdrawals",
"tabMessaging": "Messaging",
"tabReports": "Reports",
"tabChannels": "Channels"
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(tabs\)/admin.tsx src/lib/i18n/locales/pt.json src/lib/i18n/locales/en.json
git commit -m "feat(admin): wire WithdrawalsPanel + new tabs into admin screen"
```

### Task 1.5: Add revenue stats to Dashboard

**Files:**
- Modify: `supabase/functions/admin-manage/index.ts`
- Modify: `src/lib/adminApi.ts`
- Modify: `src/app/(tabs)/admin.tsx` (DashboardPanel)

- [ ] **Step 1: Add `revenue_stats` Edge Function action**

Before the `default` case in the switch, add:

```ts
case 'revenue_stats': {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

  const { data: thisMonthReceipts } = await supabase
    .from('payment_receipts')
    .select('amount, currency, plan')
    .eq('status', 'approved')
    .gte('created_at', startOfMonth);

  const { data: lastMonthReceipts } = await supabase
    .from('payment_receipts')
    .select('amount, currency, plan')
    .eq('status', 'approved')
    .gte('created_at', startOfLastMonth)
    .lt('created_at', startOfMonth);

  const { data: pendingWithdrawals } = await supabase
    .from('withdrawal_requests')
    .select('amount, currency')
    .eq('status', 'pending');

  const sumByPlan = (receipts: any[]) => {
    const byPlan: Record<string, number> = {};
    for (const r of receipts ?? []) {
      const plan = r.plan || 'unknown';
      byPlan[plan] = (byPlan[plan] || 0) + Number(r.amount);
    }
    return byPlan;
  };

  const sumByCurrency = (rows: any[]) => {
    const byCur: Record<string, number> = {};
    for (const r of rows ?? []) {
      const cur = r.currency || 'usd';
      byCur[cur] = (byCur[cur] || 0) + Number(r.amount);
    }
    return byCur;
  };

  const thisMonth = thisMonthReceipts ?? [];
  const lastMonth = lastMonthReceipts ?? [];

  return json({
    thisMonthRevenue: sumByCurrency(thisMonth),
    lastMonthRevenue: sumByCurrency(lastMonth),
    thisMonthByPlan: sumByPlan(thisMonth),
    lastMonthByPlan: sumByPlan(lastMonth),
    thisMonthCount: thisMonth.length,
    pendingWithdrawalsAmount: sumByCurrency(pendingWithdrawals ?? []),
  });
}
```

- [ ] **Step 2: Add client wrapper**

In `src/lib/adminApi.ts`, add:

```ts
export async function revenueStats(): Promise<{
  thisMonthRevenue: Record<string, number>;
  lastMonthRevenue: Record<string, number>;
  thisMonthByPlan: Record<string, number>;
  lastMonthByPlan: Record<string, number>;
  thisMonthCount: number;
  pendingWithdrawalsAmount: Record<string, number>;
}> {
  return callAdminFn('revenue_stats', {});
}
```

- [ ] **Step 3: Add revenue cards to DashboardPanel**

In `src/app/(tabs)/admin.tsx`, inside `DashboardPanel`, add a new state and useEffect:

```tsx
const [revStats, setRevStats] = useState<adminApi.Awaited<ReturnType<typeof adminApi.revenueStats>> | null>(null);
useEffect(() => { adminApi.revenueStats().then(setRevStats).catch(() => {}); }, []);
```

After the existing stat cards grid, add:

```tsx
{revStats && (
  <View style={styles.statsGrid}>
    <Card style={styles.statCard}>
      <AppText variant="small" style={styles.statLabel}>Receita (Mês)</AppText>
      <AppText variant="h1">${(revStats.thisMonthRevenue.usd ?? 0).toFixed(2)}</AppText>
      {revStats.thisMonthRevenue.aoa ? <AppText variant="small" style={styles.statLabel}>{revStats.thisMonthRevenue.aoa.toLocaleString()} Kz</AppText> : null}
    </Card>
    <Card style={styles.statCard}>
      <AppText variant="small" style={styles.statLabel}>Pagamentos</AppText>
      <AppText variant="h1">{revStats.thisMonthCount}</AppText>
    </Card>
    <Card style={styles.statCard}>
      <AppText variant="small" style={styles.statLabel}>Levantamentos Pendentes</AppText>
      <AppText variant="h1" style={{ color: Colors.warning }}>${(revStats.pendingWithdrawalsAmount.usd ?? 0).toFixed(2)}</AppText>
    </Card>
  </View>
)}
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/admin-manage/index.ts src/lib/adminApi.ts src/app/\(tabs\)/admin.tsx
git commit -m "feat(admin): add revenue stats to dashboard (dual-currency aware)"
```

---

## Feature 2: DMs & Push Notifications Admin

### Task 2.1: Add client wrappers for DMs/Push

**Files:**
- Modify: `src/lib/adminApi.ts`

- [ ] **Step 1: Add sendDm and sendPush wrappers**

```ts
export async function sendDm(userId: string, text: string): Promise<{ conversation_id: string; message_id: string; notified: number }> {
  return callAdminFn('send_dm', { user_id: userId, text });
}

export async function sendPush(userIds: string[] | null, title: string, message: string): Promise<{ notified: number; target_users: number }> {
  return callAdminFn('send_push', { user_ids: userIds, title, message });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/adminApi.ts
git commit -m "feat(admin): add sendDm and sendPush client wrappers"
```

### Task 2.2: Create MessagingPanel component

**Files:**
- Create: `src/components/admin/MessagingPanel.tsx`

- [ ] **Step 1: Create MessagingPanel**

Key patterns: `Card/AppButton/AppText` from `@/components/ui`, `Toast` with `{ id, type, message }` + `onDismiss`, `useAdminSearch` for user list, `Colors.textMuted` (not `textDim`).

```tsx
import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { Card, AppButton, AppText } from '@/components/ui';
import { SearchBar, Toast, type ToastData } from '@/components/admin';
import { listUsers, sendDm, sendPush } from '@/lib/adminApi';
import { useAdminSearch } from '@/hooks/useAdminSearch';
import { Colors, Spacing, Radius } from '@/core/theme';

type Tab = 'dm' | 'push';

export function MessagingPanel() {
  const [tab, setTab] = useState<Tab>('dm');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastData | null>(null);

  const [dmUserId, setDmUserId] = useState('');
  const [dmText, setDmText] = useState('');
  const [dmSending, setDmSending] = useState(false);

  const [pushTitle, setPushTitle] = useState('');
  const [pushMessage, setPushMessage] = useState('');
  const [pushTarget, setPushTarget] = useState<'all' | 'premium' | 'free'>('all');
  const [pushSending, setPushSending] = useState(false);

  const { searchQuery, setSearchQuery, filteredData } = useAdminSearch({
    data: users,
    searchFields: ['email'],
  });

  useEffect(() => { listUsers().then(u => { setUsers(u); setLoading(false); }).catch(() => setLoading(false)); }, []);

  const show = (type: 'success' | 'error', message: string) => setToast({ id: Date.now().toString(), type, message });

  const handleSendDm = async () => {
    if (!dmUserId || !dmText.trim()) { show('error', 'Seleciona um utilizador e escreve a mensagem'); return; }
    setDmSending(true);
    try {
      const result = await sendDm(dmUserId, dmText);
      show('success', `DM enviada! ${result.notified} notificações`);
      setDmText('');
    } catch (e: any) { show('error', e.message); }
    finally { setDmSending(false); }
  };

  const handleSendPush = async () => {
    if (!pushTitle.trim() || !pushMessage.trim()) { show('error', 'Preenche título e mensagem'); return; }
    setPushSending(true);
    try {
      let userIds: string[] | null = null;
      if (pushTarget !== 'all') {
        const isPremium = pushTarget === 'premium';
        userIds = users.filter(u => {
          const sub = u.subscription_status;
          const hasPaid = sub === 'active' || sub === 'premium' || sub === 'basic' || sub === 'pro';
          return isPremium ? hasPaid : !hasPaid;
        }).map(u => u.id);
      }
      const result = await sendPush(userIds, pushTitle, pushMessage);
      show('success', `Push enviado! ${result.notified} notificações para ${result.target_users} utilizadores`);
      setPushTitle(''); setPushMessage('');
    } catch (e: any) { show('error', e.message); }
    finally { setPushSending(false); }
  };

  return (
    <View style={styles.container}>
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
      <View style={styles.tabRow}>
        <Pressable style={[styles.tabBtn, tab === 'dm' && styles.tabActive]} onPress={() => setTab('dm')}>
          <AppText variant="small" style={tab === 'dm' ? styles.tabActiveText : undefined}>DM Direta</AppText>
        </Pressable>
        <Pressable style={[styles.tabBtn, tab === 'push' && styles.tabActive]} onPress={() => setTab('push')}>
          <AppText variant="small" style={tab === 'push' ? styles.tabActiveText : undefined}>Push Broadcast</AppText>
        </Pressable>
      </View>
      <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="Pesquisar utilizador..." />
      {tab === 'dm' ? (
        <ScrollView style={styles.list}>
          <Card style={styles.section}>
            <AppText variant="label">Enviar DM como TMT Bot</AppText>
            {dmUserId && (
              <Card style={styles.selected}>
                <AppText variant="small" style={{ color: Colors.primary }}>{users.find(u => u.id === dmUserId)?.email}</AppText>
                <AppButton title="✕" onPress={() => setDmUserId('')} variant="ghost" style={{ paddingHorizontal: 8 }} />
              </Card>
            )}
            <TextInput style={styles.input} value={dmText} onChangeText={setDmText} placeholder="Mensagem..." multiline numberOfLines={3} />
            <AppButton title={dmSending ? 'A enviar...' : 'Enviar DM'} onPress={handleSendDm} disabled={dmSending || !dmUserId || !dmText.trim()} />
          </Card>
          <AppText variant="small" style={styles.listTitle}>Utilizadores ({filteredData.length})</AppText>
          {filteredData.map(u => (
            <Pressable key={u.id} style={[styles.userRow, dmUserId === u.id && styles.userSelected]} onPress={() => setDmUserId(u.id)}>
              <AppText variant="small">{u.email}</AppText>
              {u.subscription_status === 'active' && <AppText variant="small" style={{ color: Colors.warning }}>⭐</AppText>}
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <ScrollView style={styles.list}>
          <Card style={styles.section}>
            <AppText variant="label">Enviar Push Notification</AppText>
            <TextInput style={styles.input} value={pushTitle} onChangeText={setPushTitle} placeholder="Título" />
            <TextInput style={[styles.input, { minHeight: 80 }]} value={pushMessage} onChangeText={setPushMessage} placeholder="Mensagem" multiline />
            <AppText variant="small" style={styles.label}>Enviar para:</AppText>
            <View style={styles.targetRow}>
              {(['all', 'premium', 'free'] as const).map(t => (
                <Pressable key={t} style={[styles.targetBtn, pushTarget === t && styles.tabActive]} onPress={() => setPushTarget(t)}>
                  <AppText variant="small" style={pushTarget === t ? styles.tabActiveText : undefined}>
                    {t === 'all' ? 'Todos' : t === 'premium' ? 'Premium' : 'Free'}
                  </AppText>
                </Pressable>
              ))}
            </View>
            <AppButton title={pushSending ? 'A enviar...' : 'Enviar Push'} onPress={handleSendPush} disabled={pushSending || !pushTitle.trim() || !pushMessage.trim()} />
          </Card>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  tabBtn: { flex: 1, padding: Spacing.sm, borderRadius: Radius.md, alignItems: 'center', backgroundColor: Colors.surface },
  tabActive: { backgroundColor: Colors.primary },
  tabActiveText: { color: '#fff', fontWeight: '600' },
  list: { flex: 1 },
  section: { padding: Spacing.md, marginBottom: Spacing.md },
  label: { color: Colors.textMuted, marginBottom: Spacing.sm },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, padding: Spacing.sm, color: Colors.text, marginBottom: Spacing.sm },
  selected: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.sm, marginBottom: Spacing.sm },
  targetRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  targetBtn: { flex: 1, padding: Spacing.sm, borderRadius: Radius.sm, alignItems: 'center', backgroundColor: Colors.surface },
  listTitle: { color: Colors.textMuted, marginBottom: Spacing.sm },
  userRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  userSelected: { backgroundColor: Colors.primaryDim },
});
```

- [ ] **Step 2: Export from barrel**

Add to `src/components/admin/index.ts`:

```ts
export { MessagingPanel } from './MessagingPanel';
```

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/MessagingPanel.tsx src/components/admin/index.ts
git commit -m "feat(admin): add MessagingPanel for DMs and Push"
```

### Task 2.3: Wire MessagingPanel into admin screen

This was already done in Task 1.4 Step 1-2 (TABS extended, type extended). Just verify the ternary render includes:

```tsx
) : tab === 'messaging' ? (
  <MessagingPanel />
```

- [ ] **Step 1: Commit** (if any changes needed)

```bash
git add src/app/\(tabs\)/admin.tsx
git commit -m "feat(admin): wire MessagingPanel into admin screen"
```

---

## Feature 3: Message Reporting / Moderation

### Task 3.1: Create message_reports table migration

**Files:**
- Create: `supabase/migrations/20260821000000_message_reports.sql`

- [ ] **Step 1: Create migration**

```sql
create table if not exists public.message_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null default 'other' check (reason in ('spam', 'harassment', 'inappropriate', 'other')),
  details text,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'dismissed', 'acted')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.message_reports enable row level security;

create policy "reports_insert_own" on public.message_reports
  for insert to authenticated with check (reporter_id = auth.uid());

create policy "reports_select_own" on public.message_reports
  for select to authenticated using (reporter_id = auth.uid());

create policy "reports_all_service" on public.message_reports
  for all to service_role using (true) with check (true);

create policy "reports_select_admin" on public.message_reports
  for select to authenticated
  using (exists (select 1 from public.user_profiles where user_id = auth.uid() and role = 'admin'));

create policy "reports_update_admin" on public.message_reports
  for update to authenticated
  using (exists (select 1 from public.user_profiles where user_id = auth.uid() and role = 'admin'))
  with check (true);

create index if not exists idx_reports_status on public.message_reports (status);
create index if not exists idx_reports_message on public.message_reports (message_id);
create index if not exists idx_reports_created on public.message_reports (created_at desc);
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260821000000_message_reports.sql
git commit -m "feat(admin): add message_reports table migration"
```

### Task 3.2: Add report Edge Function actions

**Files:**
- Modify: `supabase/functions/admin-manage/index.ts`

- [ ] **Step 1: Add report actions**

Before the `default` case:

```ts
case 'list_reports': {
  let query = supabase
    .from('message_reports')
    .select('*, messages!inner(text, user_id, channel_id, conversation_id), reporter:auth.users!inner(email)')
    .order('created_at', { ascending: false });
  if (body.status) query = query.eq('status', body.status);
  query = query.limit(Math.min(Number(body.limit) || 50, 200));
  const { data, error } = await query;
  if (error) return errorJson(error.message, 500);
  return json({ reports: data });
}
case 'dismiss_report': {
  const { id } = body;
  if (!id) return errorJson('id em falta.');
  const { error } = await supabase.from('message_reports').update({
    status: 'dismissed', reviewed_by: user.id, reviewed_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) return errorJson(error.message, 500);
  return json({ ok: true });
}
case 'act_on_report': {
  const { id, delete_message } = body;
  if (!id) return errorJson('id em falta.');
  const { data: report } = await supabase.from('message_reports').select('message_id').eq('id', id).single();
  if (report && delete_message) {
    await supabase.from('messages').update({ deleted_at: new Date().toISOString() }).eq('id', report.message_id);
  }
  const { error } = await supabase.from('message_reports').update({
    status: 'acted', reviewed_by: user.id, reviewed_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) return errorJson(error.message, 500);
  return json({ ok: true, message_deleted: !!delete_message });
}
case 'report_count': {
  const { count, error } = await supabase
    .from('message_reports').select('*', { count: 'exact', head: true }).eq('status', 'pending');
  if (error) return errorJson(error.message, 500);
  return json({ count: count ?? 0 });
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/admin-manage/index.ts
git commit -m "feat(admin): add report actions to Edge Function"
```

### Task 3.3: Add client wrappers for reports

**Files:**
- Modify: `src/lib/adminApi.ts`
- Modify: `src/lib/community.ts`

- [ ] **Step 1: Add report wrappers to adminApi.ts**

```ts
export interface MessageReport {
  id: string; message_id: string; reporter_id: string; reason: string;
  details: string | null; status: 'pending' | 'reviewed' | 'dismissed' | 'acted';
  reviewed_by: string | null; reviewed_at: string | null; created_at: string;
  messages?: { text: string; user_id: string; channel_id: string | null; conversation_id: string | null };
  reporter?: { email: string };
}
export async function listReports(status?: string): Promise<MessageReport[]> {
  const { reports } = await callAdminFn<{ reports: MessageReport[] }>('list_reports', { status });
  return reports;
}
export async function dismissReport(id: string): Promise<void> {
  await callAdminFn('dismiss_report', { id });
}
export async function actOnReport(id: string, deleteMessage: boolean): Promise<void> {
  await callAdminFn('act_on_report', { id, delete_message: deleteMessage });
}
export async function reportCount(): Promise<number> {
  const { count } = await callAdminFn<{ count: number }>('report_count', {});
  return count;
}
```

- [ ] **Step 2: Add reportMessage to community.ts**

```ts
export async function reportMessage(messageId: string, reason: string, details?: string): Promise<void> {
  const { error } = await supabase.from('message_reports').insert({
    message_id: messageId,
    reporter_id: (await supabase.auth.getUser()).data.user?.id,
    reason,
    details: details || null,
  });
  if (error) throw error;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/adminApi.ts src/lib/community.ts
git commit -m "feat(admin): add report client wrappers + reportMessage"
```

### Task 3.4: Add report option to MessageBubble

**Files:**
- Modify: `src/components/community/MessageBubble.tsx`

- [ ] **Step 1: Add report option to long-press menu**

In `MessageBubble.tsx`, replace the `onLongPress` handler (lines 80-101) with:

```tsx
const onLongPress = () => {
  if (isOwn) {
    const actions: AlertButton[] = [];
    if (editable) {
      actions.push({
        text: t('workspace.edit'),
        onPress: () => { setDraft(message.text); setEditing(true); },
      });
    }
    actions.push({
      text: t('workspace.deleteMessage'),
      style: 'destructive',
      onPress: () => onDelete(message),
    });
    Alert.alert(t('workspace.messageActions'), undefined, [
      ...actions,
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  } else {
    Alert.alert(t('workspace.reportMessage') || 'Reportar', undefined, [
      { text: 'Spam', onPress: () => handleReport('spam') },
      { text: 'Assédio', onPress: () => handleReport('harassment') },
      { text: 'Inadequado', onPress: () => handleReport('inappropriate') },
      { text: 'Outro', onPress: () => handleReport('other') },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }
};
```

Add the `handleReport` function inside the component:

```tsx
const handleReport = useCallback(async (reason: string) => {
  try {
    const { reportMessage } = await import('@/lib/community');
    await reportMessage(message.id, reason);
    Alert.alert(t('common.ok') || 'OK', t('workspace.reportSent') || 'Report enviado.');
  } catch {
    Alert.alert(t('common.error') || 'Erro', t('workspace.reportFailed') || 'Não foi possível enviar.');
  }
}, [message.id, t]);
```

Add `useCallback` to the existing import from React.

- [ ] **Step 2: Commit**

```bash
git add src/components/community/MessageBubble.tsx
git commit -m "feat(admin): add report option to MessageBubble long-press"
```

### Task 3.5: Create ReportsPanel component

**Files:**
- Create: `src/components/admin/ReportsPanel.tsx`

- [ ] **Step 1: Create ReportsPanel**

Follow same patterns: `Card/AppButton/AppText` from `@/components/ui`, `Toast` with `{ id, type, message }`, `useAdminSearch`, `Colors.textMuted`, `timeAgo` from `@/core/format`.

```tsx
import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Card, AppButton, AppText } from '@/components/ui';
import { FilterChips, Toast, type ToastData } from '@/components/admin';
import { timeAgo } from '@/core/format';
import { listReports, dismissReport, actOnReport, type MessageReport } from '@/lib/adminApi';
import { useAdminSearch } from '@/hooks/useAdminSearch';
import { Colors, Spacing, Radius } from '@/core/theme';

const REASON_LABELS: Record<string, string> = {
  spam: '🚫 Spam', harassment: '⚠️ Assédio', inappropriate: '🔞 Inadequado', other: '❓ Outro',
};

export function ReportsPanel() {
  const [reports, setReports] = useState<MessageReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  const { activeFilters, toggleFilter, clearFilters, filteredData } = useAdminSearch({
    data: reports,
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
    catch (e: any) { setToast({ id: Date.now().toString(), type: 'error', message: e.message }); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };
  const show = (type: 'success' | 'error', message: string) => setToast({ id: Date.now().toString(), type, message });

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
        <Card style={styles.summaryCard}><AppText variant="h1" style={{ color: Colors.warning }}>{pending.length}</AppText><AppText variant="small" style={styles.label}>Pendentes</AppText></Card>
        <Card style={styles.summaryCard}><AppText variant="h1">{filteredData.filter(r => r.status === 'dismissed').length}</AppText><AppText variant="small" style={styles.label}>Dispensados</AppText></Card>
        <Card style={styles.summaryCard}><AppText variant="h1" style={{ color: Colors.success }}>{filteredData.filter(r => r.status === 'acted').length}</AppText><AppText variant="small" style={styles.label}>Ação tomada</AppText></Card>
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
                <AppText variant="small" style={{ color: Colors.textMuted, fontStyle: 'italic' }} numberOfLines={3}>"{r.messages.text}"</AppText>
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  summaryRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  summaryCard: { flex: 1, alignItems: 'center', padding: Spacing.sm },
  label: { color: Colors.textMuted },
  list: { flex: 1 },
  itemCard: { marginBottom: Spacing.sm, padding: Spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  btn: { flex: 1 },
  center: { textAlign: 'center', marginTop: Spacing.xl },
});
```

- [ ] **Step 2: Export from barrel**

Add to `src/components/admin/index.ts`:

```ts
export { ReportsPanel } from './ReportsPanel';
```

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/ReportsPanel.tsx src/components/admin/index.ts
git commit -m "feat(admin): add ReportsPanel component"
```

### Task 3.6: Wire ReportsPanel into admin screen

Already done in Task 1.4. Verify ternary includes:

```tsx
) : tab === 'reports' ? (
  <ReportsPanel />
```

### Task 3.7: Add pending report count badge

**Files:**
- Modify: `src/app/(tabs)/admin.tsx`

- [ ] **Step 1: Add report count to header**

In `AdminScreen`, add state:

```tsx
const [pendingReports, setPendingReports] = useState(0);
```

Add useEffect:

```tsx
useEffect(() => { adminApi.reportCount().then(setPendingReports).catch(() => {}); }, []);
```

Next to the existing `NotificationBadge`, add a report badge:

```tsx
{pendingReports > 0 && (
  <Pressable onPress={() => setTab('reports')} style={styles.reportBadge}>
    <Ionicons name="flag" size={14} color={Colors.warning} />
    <AppText variant="small" style={{ color: Colors.warning }}>{pendingReports}</AppText>
  </Pressable>
)}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(tabs\)/admin.tsx
git commit -m "feat(admin): add pending report count badge to admin header"
```

---

## Feature 4: Channel Management

### Task 4.1: Add channel management columns migration

**Files:**
- Create: `supabase/migrations/20260821000001_channel_management.sql`

- [ ] **Step 1: Create migration**

```sql
alter table public.channels add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.channels add column if not exists updated_at timestamptz default now();

create or replace function public.handle_channel_updated()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists trg_channel_updated on public.channels;
create trigger trg_channel_updated before update on public.channels
  for each row execute function public.handle_channel_updated();

create policy "channels_update_admin" on public.channels
  for update to authenticated
  using (exists (select 1 from public.user_profiles where user_id = auth.uid() and role = 'admin'))
  with check (true);

create policy "channels_delete_admin" on public.channels
  for delete to authenticated
  using (exists (select 1 from public.user_profiles where user_id = auth.uid() and role = 'admin'));
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260821000001_channel_management.sql
git commit -m "feat(admin): add channel management migration"
```

### Task 4.2: Add channel management Edge Function actions

**Files:**
- Modify: `supabase/functions/admin-manage/index.ts`

- [ ] **Step 1: Add channel actions**

Before the `default` case:

```ts
case 'list_channels': {
  const { data, error } = await supabase.from('channels').select('*').order('created_at', { ascending: false });
  if (error) return errorJson(error.message, 500);
  return json({ channels: data });
}
case 'update_channel': {
  const { id, display_name, description, icon, is_premium } = body;
  if (!id) return errorJson('id em falta.');
  const updates: Record<string, any> = {};
  if (display_name !== undefined) updates.display_name = display_name;
  if (description !== undefined) updates.description = description;
  if (icon !== undefined) updates.icon = icon;
  if (is_premium !== undefined) updates.is_premium = is_premium;
  const { error } = await supabase.from('channels').update(updates).eq('id', id);
  if (error) return errorJson(error.message, 500);
  return json({ ok: true });
}
case 'delete_channel': {
  const { id } = body;
  if (!id) return errorJson('id em falta.');
  const { data: ch } = await supabase.from('channels').select('name, type').eq('id', id).single();
  if (ch?.type === 'pair') return errorJson('Pair rooms são geridos automaticamente.');
  const systemNames = ['geral', 'sinais', 'duvidas', 'resultados', 'off-topic'];
  if (systemNames.includes(ch?.name)) return errorJson('Canais do sistema não podem ser apagados.');
  const { error } = await supabase.from('channels').delete().eq('id', id);
  if (error) return errorJson(error.message, 500);
  return json({ ok: true });
}
case 'toggle_channel_premium': {
  const { id } = body;
  if (!id) return errorJson('id em falta.');
  const { data: ch } = await supabase.from('channels').select('is_premium').eq('id', id).single();
  if (!ch) return errorJson('Canal não encontrado.', 404);
  const { error } = await supabase.from('channels').update({ is_premium: !ch.is_premium }).eq('id', id);
  if (error) return errorJson(error.message, 500);
  return json({ ok: true, is_premium: !ch.is_premium });
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/admin-manage/index.ts
git commit -m "feat(admin): add channel management actions"
```

### Task 4.3: Add client wrappers for channels

**Files:**
- Modify: `src/lib/adminApi.ts`

- [ ] **Step 1: Add wrappers**

```ts
export interface AdminChannel {
  id: string; name: string; display_name: string; description: string | null;
  icon: string | null; type: string; is_premium: boolean; created_at: string; updated_at: string | null;
}
export async function listChannels(): Promise<AdminChannel[]> {
  const { channels } = await callAdminFn<{ channels: AdminChannel[] }>('list_channels', {});
  return channels;
}
export async function updateChannel(id: string, updates: { display_name?: string; description?: string; icon?: string; is_premium?: boolean }): Promise<void> {
  await callAdminFn('update_channel', { id, ...updates });
}
export async function deleteChannel(id: string): Promise<void> {
  await callAdminFn('delete_channel', { id });
}
export async function toggleChannelPremium(id: string): Promise<{ is_premium: boolean }> {
  return callAdminFn('toggle_channel_premium', { id });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/adminApi.ts
git commit -m "feat(admin): add channel management wrappers"
```

### Task 4.4: Create ChannelsPanel component

**Files:**
- Create: `src/components/admin/ChannelsPanel.tsx`

- [ ] **Step 1: Create ChannelsPanel**

Follow same patterns: `Card/AppButton/AppText`, `Toast` with `{ id, type, message }`, `useAdminSearch`, `Colors.textMuted`, `timeAgo` from `@/core/format`.

```tsx
import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert, TextInput, Modal, Pressable } from 'react-native';
import { Card, AppButton, AppText } from '@/components/ui';
import { SearchBar, Toast, type ToastData } from '@/components/admin';
import { timeAgo } from '@/core/format';
import { listChannels, updateChannel, deleteChannel, toggleChannelPremium, type AdminChannel } from '@/lib/adminApi';
import { useAdminSearch } from '@/hooks/useAdminSearch';
import { Colors, Spacing, Radius } from '@/core/theme';

export function ChannelsPanel() {
  const [channels, setChannels] = useState<AdminChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [editCh, setEditCh] = useState<AdminChannel | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const { searchQuery, setSearchQuery, filteredData } = useAdminSearch({
    data: channels,
    searchFields: ['display_name', 'name'],
  });

  const load = useCallback(async () => {
    try { setChannels(await listChannels()); }
    catch (e: any) { setToast({ id: Date.now().toString(), type: 'error', message: e.message }); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };
  const show = (type: 'success' | 'error', message: string) => setToast({ id: Date.now().toString(), type, message });

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
        {ch.is_premium && <AppText variant="small" style={{ color: Colors.warning }}>⭐ PREMIUM</AppText>}
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { flex: 1 },
  sectionTitle: { color: Colors.textMuted, marginBottom: Spacing.sm },
  card: { marginBottom: Spacing.sm, padding: Spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  label: { color: Colors.textMuted, marginTop: 2 },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  btn: { flex: 1 },
  center: { textAlign: 'center', marginTop: Spacing.xl },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: Spacing.lg },
  modalContent: { backgroundColor: Colors.bg, borderRadius: Radius.lg, padding: Spacing.lg },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, padding: Spacing.sm, color: Colors.text, marginBottom: Spacing.sm },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm, marginTop: Spacing.md },
});
```

- [ ] **Step 2: Export from barrel**

Add to `src/components/admin/index.ts`:

```ts
export { ChannelsPanel } from './ChannelsPanel';
```

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/ChannelsPanel.tsx src/components/admin/index.ts
git commit -m "feat(admin): add ChannelsPanel component"
```

### Task 4.5: Wire ChannelsPanel into admin screen

Already done in Task 1.4. Verify ternary includes:

```tsx
) : tab === 'channels' ? (
  <ChannelsPanel />
```

---

## Final Steps

### Task 5.1: Apply migrations to Supabase

- [ ] **Step 1: Apply message_reports migration** via Supabase SQL Editor
- [ ] **Step 2: Apply channel_management migration** via Supabase SQL Editor
- [ ] **Step 3: Deploy Edge Function** — `cd supabase && supabase functions deploy admin-manage`

### Task 5.2: Test all features

- [ ] **Step 1:** Withdrawals tab — create test withdrawal, approve/reject/mark-paid
- [ ] **Step 2:** Revenue stats — verify dashboard shows dual-currency amounts
- [ ] **Step 3:** DM — send DM as TMT Bot, verify it appears in user's DMs
- [ ] **Step 4:** Push — broadcast to all/premium/free users
- [ ] **Step 5:** Reports — long-press message → report, verify in Reports tab
- [ ] **Step 6:** Moderation — dismiss/act on report, verify message soft-deleted
- [ ] **Step 7:** Channels — edit name/desc, toggle premium, delete user-created channel

---

## Summary

| Feature | Tasks | New Files | Modified Files | New Migration |
|---|---|---|---|---|
| Withdrawals + Revenue | 5 | 1 component | 4 files | 0 |
| DMs/Push Admin | 3 | 1 component | 2 files | 0 |
| Reports/Flags | 7 | 1 component | 3 files | 1 |
| Channel Management | 5 | 1 component | 2 files | 1 |
| **Total** | **20** | **4 components** | **~8 files** | **2 migrations** |
