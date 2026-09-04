import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { Card, AppButton, AppText } from '@/components/ui';
import { SearchBar } from './SearchBar';
import { Toast, type ToastData } from './Toast';
import { listUsers, sendDm, sendPush } from '@/lib/adminApi';
import { useAdminSearch } from '@/hooks/useAdminSearch';
import { Spacing, Radius, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';

type Tab = 'dm' | 'push';

export function MessagingPanel() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
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
                <AppText variant="small" style={{ color: colors.primary }}>{users.find(u => u.id === dmUserId)?.email}</AppText>
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
              {u.subscription_status === 'active' && <AppText variant="small" style={{ color: colors.warning }}>⭐</AppText>}
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

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    container: { flex: 1 },
    tabRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
    tabBtn: { flex: 1, padding: Spacing.sm, borderRadius: Radius.md, alignItems: 'center', backgroundColor: c.surface },
    tabActive: { backgroundColor: c.primary },
    tabActiveText: { color: '#fff', fontWeight: '600' },
    list: { flex: 1 },
    section: { padding: Spacing.md, marginBottom: Spacing.md },
    label: { color: c.textMuted, marginBottom: Spacing.sm },
    input: { borderWidth: 1, borderColor: c.border, borderRadius: Radius.sm, padding: Spacing.sm, color: c.text, marginBottom: Spacing.sm },
    selected: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.sm, marginBottom: Spacing.sm },
    targetRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
    targetBtn: { flex: 1, padding: Spacing.sm, borderRadius: Radius.sm, alignItems: 'center', backgroundColor: c.surface },
    listTitle: { color: c.textMuted, marginBottom: Spacing.sm },
    userRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.sm, borderBottomWidth: 1, borderBottomColor: c.border },
    userSelected: { backgroundColor: c.primaryDim },
  });
