# Home Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpawers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconstruir a aba Início como um dashboard modular alimentado por dados reais, com componentes reutilizáveis de design system e rota autenticada apontando para o Início.

**Architecture:** Início passa a ser composto por secções — TopBar (`DashboardHeader`), hero de desempenho (`PerformanceCard`), ticker de mercado (`PriceTicker`), próxima janela (`NextBoomCard`), últimos sinais (reusa `SignalCard`) e CTA premium (reusa `PremiumLock`). Quatro componentes novos de design system são primitivas sem dependências de dados; os três específicos do home consomem hooks. Helpers puros de core (`boomEpochMs`, `getNextBoomHour`, `formatPips`) são extraídos e partilhados com `horarios.tsx`.

**Tech Stack:** React Native 0.85 + Expo SDK 56 (expo-router, expo-linear-gradient), react-query (`@tanstack/react-query`), Supabase, `@expo/vector-icons`. Sem harness de testes (verificação via `tsc --noEmit` + `expo lint` + manual no Expo Go).

**Verificação (aplicável a todas as tarefas):**
```powershell
# na raiz do repo: C:\Users\Luar Studio Angola\Desktop\DEV\TMT\mobile
npx tsc --noEmit
# esperado: sem output, exit 0

npx expo lint
# esperado: sem erros, exit 0
```

**Convenções do repo (não violar):**
- Imports de módulos internos usam alias `@/` (ex.: `@/core/theme`, `@/components/ui`).
- Todas as strings de UI em português de Angola (pt-PT), sem acentos desnecessários.
- Cores/espaços/radii via tokens `Colors`, `Spacing`, `Radius` de `@/core/theme`; nunca hexes soltos fora de caso justificado (gradientes translúcidos).
- Componentes que navegam usam `useRouter` de `expo-router`; componentes de apresentação recebem dados por props (padrão de `SignalCard`).
- Sem comentários no código.

---

## Review

- **Status:** ISSUES_FOUND
- **Reviewer:** superpawers-reviewer
- **Date:** 2026-08-12
- **Findings:**
  - Spec coverage: PASS — todos os requisitos mapeados: DashboardHeader (saudação/avatar/sino/badge PRO), PerformanceCard (win rate + barras TP/SL + MetricGrid), PriceTicker com preços ao vivo, NextBoomCard (countdown + pares), Últimos Sinais reutilizando SignalCard, PremiumLock só quando `!isPremium`, pull-to-refresh, routing (index.tsx/login.tsx/admin.tsx/`_layout.tsx` com `headerShown:false`), helpers `boomEpochMs`/`getNextBoomHour`/`formatPips`, refactor de `horarios.tsx`.
  - Placeholders: PASS — nenhum TBD/TODO/"implement later"; todos os passos têm código completo.
  - Type consistency: PASS — assinaturas verificadas contra o repo: `useSignals`/`useBoomHours`/`useLivePrices` expõem `refetch`; `useHistory` expõe `stats`/`loading` (sem `refetch`, e o plano não o usa); `useSubscription` expõe `isPremium`/`loading`; `useAuth` expõe `user`/`initializing`; `PremiumLock` aceita `label`/`description`; `SignalCard` aceita `signal`/`onPress`; `Screen` aceita `refreshControl`; `AppText` aceita `numberOfLines`; `Card` aceita `style`; tokens `Colors`/`Spacing`/`Radius` existem; tipos `PriceData`/`HistoryStats`/`BoomHour` e `ALL_PAIRS` corretos.
  - Dead references: PASS — `boomEpochMs`/`getNextBoomHour`/`formatPips` (Task 1), `GradientCard`/`MetricGrid`/`SectionHeader` (Task 3), `PriceTicker` (Task 4), `DashboardHeader` (Task 5), `PerformanceCard` (Task 6), `NextBoomCard` (Task 7) — todos definidos antes de serem usados em Task 8.
  - Structural flow: PASS — ordem correta: helpers → refactor horarios → primitivas → ticker → header → hero → boom → dashboard → routing → verificação. Números de linha em index.tsx/login.tsx/admin.tsx/`_layout.tsx`/horarios.tsx verificados contra o repo (conteúdo exato dos ANTES confere).
  - Goal clarity: PASS — cada passo especifica ficheiro, linhas e código final; estados de loading/erro/vazio definidos por secção.
  - **MAJOR — Task 1 Step 1: mudança silenciosa de comportamento em `getBoomStatus`.** O plano manda substituir `booms.ts` inteiro e a nota afirma "mantém-se tudo, apenas se adicionam as duas funções novas", mas o conteúdo proposto altera a semântica de `getBoomStatus`: hoje `live` = 15 min **antes** do boom (`diff > 0 && diff <= LIVE_WINDOW_MS`); no plano `live` = 15 min **depois** (`ms > -BOOM_LIVE_WINDOW_MINUTES * 60_000`). `getBoomStatus` é consumido por `comunidade.tsx` (badge de contagem AO VIVO, filtro `live`) e `BoomCard.tsx` (badge "🚨 AO VIVO", cor do countdown), portanto a aba Comunidade muda de comportamento sem ser documentado — contradiz a nota do próprio plano e o não-objetivo do spec. Como nenhum componente novo usa `getBoomStatus`, manter a implementação atual intacta (ou documentar explicitamente a alteração).
  - **MINOR — Task 10 Step 2: contagem de commits errada.** O plano espera "8 commits da feature (Tasks 1-9)", mas há 9 passos de commit (um por tarefa, Tasks 1–9). Deve ser 9.

---

## Task 1: Helpers de core — booms e format

**Files:**
- Modify: `src/core/booms.ts`
- Modify: `src/core/format.ts`

- [ ] **Step 1: Adicionar `boomEpochMs` e `getNextBoomHour` a `src/core/booms.ts`**

Adicionar `boomEpochMs` e `getNextBoomHour` no fim de `src/core/booms.ts`. **IMPORTANTE:** as funções existentes (`getBoomStatus`, `boomCountdown`, `msUntil`, `BOOM_LIVE_WINDOW_MINUTES`, `LIVE_WINDOW_MS`) são usadas por `comunidade.tsx`/`BoomCard.tsx` e devem permanecer **verbatim** — `getBoomStatus` trata `live` como os 15 min *antes* de `boom_time`. Apenas se acrescenta o import de tipo e as duas funções novas.

Conteúdo final de `src/core/booms.ts` (substituir o ficheiro inteiro; as funções existentes ficam intactas):

```ts
import type { BoomHour, BoomStatus } from './types';

const LIVE_WINDOW_MS = 15 * 60 * 1000;
export const BOOM_LIVE_WINDOW_MINUTES = 15;

export function getBoomStatus(boomTime: string): BoomStatus {
  const now = Date.now();
  const boom = new Date(boomTime).getTime();
  const diff = boom - now;
  if (diff > 0 && diff <= LIVE_WINDOW_MS) return 'live';
  if (diff > 0) return 'upcoming';
  return 'expired';
}

export function boomCountdown(boomTime: string): string {
  const diff = new Date(boomTime).getTime() - Date.now();
  if (diff <= 0) return '00:00:00';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function msUntil(boomTime: string): number {
  return new Date(boomTime).getTime() - Date.now();
}

export function boomEpochMs(now: Date, timeWat: string): number {
  const [h, m] = (timeWat || '00:00').split(':').map(Number);
  const wat = new Date(now.getTime() + (now.getTimezoneOffset() + 60) * 60000);
  return Date.UTC(wat.getFullYear(), wat.getMonth(), wat.getDate(), h || 0, m || 0) - 3600_000;
}

export function getNextBoomHour(hours: BoomHour[], now: Date): BoomHour | undefined {
  const future = hours
    .map((h) => ({ hour: h, epoch: boomEpochMs(now, h.time_wat) }))
    .filter((x) => x.epoch >= now.getTime())
    .sort((a, b) => a.epoch - b.epoch);
  if (future.length > 0) return future[0].hour;
  return [...hours].sort((a, b) => boomEpochMs(now, a.time_wat) - boomEpochMs(now, b.time_wat))[0];
}
```

> Nota: `getBoomStatus`/`boomCountdown`/`msUntil` são usados por `comunidade.tsx`/`BoomCard.tsx` — mantidos intactos; apenas se adicionam as duas funções novas e o `import type` unificado.

- [ ] **Step 2: Adicionar `formatPips` a `src/core/format.ts`**

Adicionar no fim de `src/core/format.ts`:

```ts
export function formatPips(n: number): string {
  if (!isFinite(n)) return '—';
  const v = Math.round(n * 10) / 10;
  return v > 0 ? `+${v}` : `${v}`;
}
```

- [ ] **Step 3: Verificar**

```powershell
npx tsc --noEmit
# esperado: exit 0, sem output

npx expo lint
# esperado: exit 0, sem erros
```

- [ ] **Step 4: Commit**

```bash
git add src/core/booms.ts src/core/format.ts
git commit -m "feat(core): add boomEpochMs, getNextBoomHour and formatPips helpers"
```

---

## Task 2: Refactor `horarios.tsx` para usar `boomEpochMs`

**Files:**
- Modify: `src/app/(tabs)/horarios.tsx:18-26,139`

- [ ] **Step 1: Remover `boomEpoch` local e importar `boomEpochMs`**

Em `src/app/(tabs)/horarios.tsx`:

1. Apagar a função local `boomEpoch` (linhas 22-26). `watDate` (linhas 18-20) permanece — é usada pelo `Clock`.
2. Adicionar o import de `@/core/booms` (junto aos outros imports, ex.: linha 8):
```ts
import { boomEpochMs } from '@/core/booms';
```
3. Substituir a chamada na linha 139:
```ts
// ANTES:
boomTime={new Date(boomEpoch(now, h.time_wat)).toISOString()}
// DEPOIS:
boomTime={new Date(boomEpochMs(now, h.time_wat)).toISOString()}
```

- [ ] **Step 2: Verificar**

```powershell
npx tsc --noEmit
# esperado: exit 0 (se "boomEpoch is not defined" aparecer, a substituição ficou incompleta)

npx expo lint
# esperado: exit 0
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(tabs\)/horarios.tsx
git commit -m "refactor(horarios): reuse boomEpochMs from core/booms"
```

---

## Task 3: Primitivas de design system — GradientCard, MetricGrid, SectionHeader

**Files:**
- Create: `src/components/GradientCard.tsx`
- Create: `src/components/MetricGrid.tsx`
- Create: `src/components/SectionHeader.tsx`

- [ ] **Step 1: Criar `src/components/GradientCard.tsx`**

```tsx
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radius, Spacing } from '@/core/theme';

export function GradientCard({
  children,
  colors,
  start,
  end,
  style,
}: {
  children: ReactNode;
  colors?: readonly [string, string];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  style?: object;
}) {
  return (
    <LinearGradient
      colors={colors ?? [Colors.surface, Colors.surfaceElevated]}
      start={start ?? { x: 0, y: 0 }}
      end={end ?? { x: 1, y: 1 }}
      style={[styles.card, style]}>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
});
```

- [ ] **Step 2: Criar `src/components/MetricGrid.tsx`**

```tsx
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { Colors, Spacing } from '@/core/theme';

export interface MetricItem {
  label: string;
  value: string;
  accent?: string;
}

export function MetricGrid({ items }: { items: MetricItem[] }) {
  return (
    <View style={styles.row}>
      {items.map((m) => (
        <View key={m.label} style={styles.item}>
          <AppText variant="h1" style={[styles.value, { color: m.accent ?? Colors.text }]} numberOfLines={1}>
            {m.value}
          </AppText>
          <AppText variant="small" style={styles.label}>{m.label}</AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.sm },
  item: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  value: { fontSize: 18 },
  label: { color: Colors.textMuted, textAlign: 'center' },
});
```

- [ ] **Step 3: Criar `src/components/SectionHeader.tsx`**

```tsx
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { Colors, Spacing } from '@/core/theme';

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.row}>
      <View style={styles.textWrap}>
        <AppText variant="h2">{title}</AppText>
        {subtitle ? <AppText variant="small" style={styles.subtitle}>{subtitle}</AppText> : null}
      </View>
      {action ? (
        <Pressable onPress={action.onPress} hitSlop={8}>
          <AppText variant="small" style={styles.action}>{action.label}</AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  textWrap: { flex: 1, gap: 2 },
  subtitle: { color: Colors.textMuted },
  action: { color: Colors.primary, fontWeight: '700' },
});
```

- [ ] **Step 4: Verificar**

```powershell
npx tsc --noEmit
# esperado: exit 0

npx expo lint
# esperado: exit 0
```

- [ ] **Step 5: Commit**

```bash
git add src/components/GradientCard.tsx src/components/MetricGrid.tsx src/components/SectionHeader.tsx
git commit -m "feat(design): add GradientCard, MetricGrid and SectionHeader primitives"
```

---

## Task 4: PriceTicker

**Files:**
- Create: `src/components/PriceTicker.tsx`

- [ ] **Step 1: Criar `src/components/PriceTicker.tsx`**

```tsx
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { AppText } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/core/theme';
import type { PriceData } from '@/core/types';

export function PriceTicker({
  pairs,
  prices,
  onPressPair,
  loading,
}: {
  pairs: string[];
  prices: Record<string, PriceData>;
  onPressPair?: (pair: string) => void;
  loading?: boolean;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {pairs.map((pair) => {
        const data = prices[pair] ?? { price: '—', change: 0 };
        const up = data.change > 0;
        const changeColor = data.change === 0 ? Colors.textMuted : up ? Colors.success : Colors.destructive;
        const changeText = data.change === 0 ? '0.00%' : `${up ? '+' : ''}${data.change.toFixed(2)}%`;
        return (
          <Pressable
            key={pair}
            disabled={!onPressPair}
            onPress={onPressPair ? () => onPressPair(pair) : undefined}
            style={styles.chip}>
            <AppText variant="small" style={styles.pair}>{pair}</AppText>
            <AppText variant="mono" style={styles.price}>{loading ? '—' : data.price}</AppText>
            <AppText variant="small" style={[styles.change, { color: changeColor }]}>
              {loading ? '—' : changeText}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: Spacing.sm },
  chip: {
    minWidth: 96,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    gap: 2,
  },
  pair: { color: Colors.textMuted, fontWeight: '600' },
  price: { color: Colors.text, fontSize: 15, fontWeight: '700' },
  change: { fontWeight: '700' },
});
```

- [ ] **Step 2: Verificar**

```powershell
npx tsc --noEmit
# esperado: exit 0

npx expo lint
# esperado: exit 0
```

- [ ] **Step 3: Commit**

```bash
git add src/components/PriceTicker.tsx
git commit -m "feat(design): add PriceTicker live market strip"
```

---

## Task 5: DashboardHeader

**Files:**
- Create: `src/components/DashboardHeader.tsx`

- [ ] **Step 1: Criar `src/components/DashboardHeader.tsx`**

```tsx
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AppText, Badge } from '@/components/ui';
import { avatarLetter, displayName } from '@/core/format';
import { Colors, Spacing } from '@/core/theme';
import { useAuth } from '@/hooks/useAuth';

export function DashboardHeader({ isPremium }: { isPremium: boolean }) {
  const router = useRouter();
  const { user } = useAuth();
  const firstName = (displayName(user) || 'Trader').split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 20 ? 'Boa tarde' : 'Boa noite';

  return (
    <View style={styles.row}>
      <View style={styles.userWrap}>
        <View style={styles.avatar}>
          <AppText style={styles.avatarText}>{avatarLetter(user)}</AppText>
        </View>
        <View style={styles.textWrap}>
          <AppText variant="small" style={styles.greeting}>
            {greeting}{user ? `, ${firstName}` : ''}
          </AppText>
          <AppText variant="h2">The Magic Trader</AppText>
        </View>
      </View>
      <View style={styles.right}>
        {isPremium ? (
          <Badge color={Colors.accent} bg={`${Colors.accent}1F`}>PRO</Badge>
        ) : null}
        <Pressable hitSlop={8} onPress={() => router.push('/(tabs)/horarios')}>
          <Ionicons name="notifications" size={20} color={Colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  userWrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryDim,
    borderColor: Colors.primary,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: Colors.text, fontWeight: '800', fontSize: 16 },
  textWrap: { gap: 1 },
  greeting: { color: Colors.textMuted },
  right: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
});
```

- [ ] **Step 2: Verificar**

```powershell
npx tsc --noEmit
# esperado: exit 0

npx expo lint
# esperado: exit 0
```

- [ ] **Step 3: Commit**

```bash
git add src/components/DashboardHeader.tsx
git commit -m "feat(home): add DashboardHeader with greeting, avatar, bell and PRO badge"
```

---

## Task 6: PerformanceCard (hero)

**Files:**
- Create: `src/components/PerformanceCard.tsx`

- [ ] **Step 1: Criar `src/components/PerformanceCard.tsx`**

```tsx
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { GradientCard } from '@/components/GradientCard';
import { MetricGrid } from '@/components/MetricGrid';
import { formatPips } from '@/core/format';
import { Colors, Spacing } from '@/core/theme';
import type { HistoryStats } from '@/core/types';

export function PerformanceCard({
  stats,
  activeCount,
  loading,
  onPress,
}: {
  stats: HistoryStats;
  activeCount: number;
  loading: boolean;
  onPress: () => void;
}) {
  const total = stats.total || 0;
  const tpPct = total > 0 ? Math.round((stats.tp / total) * 100) : 0;
  const slPct = total > 0 ? Math.round((stats.sl / total) * 100) : 0;

  return (
    <Pressable onPress={onPress}>
      <GradientCard
        colors={[Colors.primaryDim, 'rgba(16,139,177,0.18)']}
        style={styles.card}>
        <View style={styles.header}>
          <AppText variant="small" style={styles.eyebrow}>DESEMPENHO</AppText>
          <AppText variant="small" style={styles.link}>Ver histórico ›</AppText>
        </View>

        <View style={styles.winRow}>
          <AppText variant="title" style={styles.win}>
            {loading ? '—' : `${stats.winRate}%`}
          </AppText>
          <AppText variant="muted" style={styles.winLabel}>Taxa de acerto</AppText>
        </View>

        <View style={styles.bars}>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { backgroundColor: Colors.success, width: `${tpPct}%` }]} />
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { backgroundColor: Colors.destructive, width: `${slPct}%` }]} />
          </View>
        </View>
        <View style={styles.barLegend}>
          <AppText variant="small" style={{ color: Colors.success }}>TP {tpPct}%</AppText>
          <AppText variant="small" style={{ color: Colors.destructive }}>SL {slPct}%</AppText>
        </View>

        <MetricGrid
          items={[
            { label: 'Pips totais', value: loading ? '—' : formatPips(stats.totalPips), accent: Colors.accent },
            { label: 'Sinais totais', value: loading ? '—' : String(stats.total) },
            { label: 'Ativos agora', value: String(activeCount), accent: activeCount > 0 ? Colors.success : undefined },
          ]}
        />
      </GradientCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: Spacing.lg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  eyebrow: { color: Colors.textMuted, fontWeight: '700', letterSpacing: 1 },
  link: { color: Colors.textMuted },
  winRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  win: { fontSize: 48 },
  winLabel: { flex: 1 },
  bars: { gap: 6, marginBottom: Spacing.sm },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 3 },
  barLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
});
```

- [ ] **Step 2: Verificar**

```powershell
npx tsc --noEmit
# esperado: exit 0

npx expo lint
# esperado: exit 0
```

- [ ] **Step 3: Commit**

```bash
git add src/components/PerformanceCard.tsx
git commit -m "feat(home): add PerformanceCard hero with win rate, TP/SL bars and metrics"
```

---

## Task 7: NextBoomCard

**Files:**
- Create: `src/components/NextBoomCard.tsx`

- [ ] **Step 1: Criar `src/components/NextBoomCard.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Badge, Card } from '@/components/ui';
import { boomEpochMs } from '@/core/booms';
import { pad2 } from '@/core/format';
import { Colors, Radius, Spacing } from '@/core/theme';
import type { BoomHour } from '@/core/types';

export function NextBoomCard({ hour, onPress }: { hour: BoomHour; onPress: () => void }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const target = boomEpochMs(now, hour.time_wat);
  const msLeft = target - now.getTime();
  const inWindow = msLeft < 0 && msLeft > -3600_000;
  const tomorrow = msLeft <= -3600_000;

  const abs = Math.abs(msLeft);
  const hh = pad2(Math.floor(abs / 3600_000));
  const mm = pad2(Math.floor((abs % 3600_000) / 60_000));
  const ss = pad2(Math.floor((abs % 60_000) / 1000));

  const badge =
    inWindow
      ? { label: 'AGORA', color: Colors.live, bg: `${Colors.live}1F` }
      : tomorrow
        ? { label: 'AMANHÃ', color: Colors.textMuted, bg: `${Colors.textMuted}1F` }
        : { label: 'PRÓXIMO', color: Colors.warning, bg: `${Colors.warning}1F` };

  return (
    <Pressable onPress={onPress}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <AppText variant="h2">{hour.title}</AppText>
            <AppText variant="small" style={{ color: Colors.textMuted }}>
              Janela de alta volatilidade
            </AppText>
          </View>
          <Badge color={badge.color} bg={badge.bg}>{badge.label}</Badge>
        </View>

        <View style={styles.countRow}>
          {tomorrow ? (
            <AppText style={styles.timeBig}>{hour.time_wat}</AppText>
          ) : (
            <AppText variant="mono" style={styles.countdown}>
              {hh}:{mm}:{ss}
            </AppText>
          )}
          <View>
            <AppText variant="small" style={{ color: Colors.textMuted }}>WAT</AppText>
            <AppText variant="small" style={{ color: Colors.textMuted }}>{hour.time_wat}</AppText>
          </View>
        </View>

        <View style={styles.pairs}>
          {(hour.pairs || []).slice(0, 4).map((p) => (
            <View key={p} style={styles.pairChip}>
              <AppText variant="small" style={styles.pairText}>{p}</AppText>
            </View>
          ))}
          {(hour.pairs || []).length > 4 ? (
            <AppText variant="small" style={{ color: Colors.textMuted }}>
              +{hour.pairs.length - 4}
            </AppText>
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.md, marginBottom: Spacing.lg },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  headerText: { flex: 1, gap: 2 },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  countdown: { fontSize: 30, fontWeight: '800', color: Colors.accent },
  timeBig: { fontSize: 30, fontWeight: '800', color: Colors.accent, fontFamily: 'monospace' },
  pairs: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  pairChip: {
    backgroundColor: `${Colors.success}1A`,
    borderColor: `${Colors.success}40`,
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pairText: { color: Colors.success, fontWeight: '700' },
});
```

- [ ] **Step 2: Verificar**

```powershell
npx tsc --noEmit
# esperado: exit 0

npx expo lint
# esperado: exit 0
```

- [ ] **Step 3: Commit**

```bash
git add src/components/NextBoomCard.tsx
git commit -m "feat(home): add NextBoomCard with WAT countdown and pair chips"
```

---

## Task 8: Reescrever `inicio.tsx` como dashboard

**Files:**
- Modify: `src/app/(tabs)/inicio.tsx` (reescrita completa)
- Modify: `src/app/(tabs)/_layout.tsx:20-26`

- [ ] **Step 1: Reescrita de `src/app/(tabs)/inicio.tsx`**

Substituir o conteúdo inteiro de `src/app/(tabs)/inicio.tsx` por:

```tsx
import { useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { EmptyState, Screen, Spinner } from '@/components/ui';
import { SignalCard } from '@/components/SignalCard';
import { PremiumLock } from '@/components/PremiumLock';
import { DashboardHeader } from '@/components/DashboardHeader';
import { PerformanceCard } from '@/components/PerformanceCard';
import { NextBoomCard } from '@/components/NextBoomCard';
import { PriceTicker } from '@/components/PriceTicker';
import { SectionHeader } from '@/components/SectionHeader';
import { ALL_PAIRS } from '@/core/gating';
import { getNextBoomHour } from '@/core/booms';
import { Colors, Spacing } from '@/core/theme';
import { useSubscription } from '@/hooks/useSubscription';
import { useSignals } from '@/hooks/useSignals';
import { useHistory } from '@/hooks/useHistory';
import { useBoomHours } from '@/hooks/useBoomHours';
import { useLivePrices } from '@/hooks/useLivePrices';

export default function InicioScreen() {
  const router = useRouter();
  const { isPremium, loading: subLoading } = useSubscription();
  const { signals, loading: signalsLoading, error: signalsError, refetch: refetchSignals } = useSignals();
  const { stats, loading: historyLoading } = useHistory();
  const { hours, loading: boomLoading, refetch: refetchBoom } = useBoomHours();
  const { prices, loading: pricesLoading, refetch: refetchPrices } = useLivePrices(ALL_PAIRS);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchSignals(), refetchBoom(), refetchPrices()]);
    setRefreshing(false);
  };

  const activeCount = signals.filter((s) => s.status === 'active').length;
  const nextHour = getNextBoomHour(hours, new Date());
  const recentSignals = signals.slice(0, 3);
  const showUpgrade = !isPremium && !subLoading;

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
      }>
      <DashboardHeader isPremium={isPremium} />

      <PerformanceCard
        stats={stats}
        activeCount={activeCount}
        loading={historyLoading}
        onPress={() => router.push('/(tabs)/historico')}
      />

      <SectionHeader
        title="Mercado"
        subtitle="Preços ao vivo"
        action={{ label: 'Análises', onPress: () => router.push('/(tabs)/analises') }}
      />
      <PriceTicker
        pairs={ALL_PAIRS}
        prices={prices}
        loading={pricesLoading}
        onPressPair={() => router.push('/(tabs)/analises')}
      />

      {!boomLoading && nextHour ? (
        <View style={styles.boomSection}>
          <SectionHeader
            title="Hora do Boom"
            subtitle="Próxima janela"
            action={{ label: 'Horários', onPress: () => router.push('/(tabs)/horarios') }}
          />
          <NextBoomCard hour={nextHour} onPress={() => router.push('/(tabs)/horarios')} />
        </View>
      ) : null}

      <View style={styles.section}>
        <SectionHeader
          title="Últimos Sinais"
          subtitle="Análises recentes"
          action={{ label: 'Ver tudo', onPress: () => router.push('/(tabs)/analises') }}
        />
        {signalsLoading ? (
          <Spinner label="A carregar sinais…" />
        ) : signalsError ? (
          <EmptyState title="Erro" subtitle={signalsError} />
        ) : recentSignals.length === 0 ? (
          <EmptyState title="Sem sinais" subtitle="Ainda não há análises publicadas." />
        ) : (
          recentSignals.map((s) => (
            <SignalCard key={s.id} signal={s} onPress={() => router.push(`/sinal/${s.id}`)} />
          ))
        )}
      </View>

      {showUpgrade ? (
        <View style={styles.upgrade}>
          <PremiumLock
            label="Desbloqueia todos os sinais"
            description="Acesso a todos os pares e timeframes com o plano PRO."
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  boomSection: { marginTop: Spacing.xl },
  section: { marginTop: Spacing.xl },
  upgrade: { marginTop: Spacing.md },
});
```

- [ ] **Step 2: Ocultar o header nativo da tab `inicio` em `src/app/(tabs)/_layout.tsx`**

Em `src/app/(tabs)/_layout.tsx`, no `Tabs.Screen name="inicio"` (linhas 20-26), adicionar `headerShown: false`:

```tsx
<Tabs.Screen
  name="inicio"
  options={{
    title: 'Início',
    headerShown: false,
    tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
  }}
/>
```

O `Screen` usa `SafeAreaView` de `react-native-safe-area-context`, que cobre o topo sem header.

- [ ] **Step 3: Verificar**

```powershell
npx tsc --noEmit
# esperado: exit 0

npx expo lint
# esperado: exit 0
```

- [ ] **Step 4: Verificação manual no Expo Go**

```powershell
npm start
```

Abri no Expo Go e confirmar: TopBar com avatar/saudação; hero com taxa de acerto e métricas; ticker com preços (pode demorar alguns segundos); countdown da próxima janela a contar; 3 sinais recentes; PremiumLock visível quando não-PRO; pull-to-refresh funciona; toque no hero abre Histórico e nos sinais abre a análise.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(tabs)/inicio.tsx" "src/app/(tabs)/_layout.tsx"
git commit -m "feat(home): rebuild Início as data-driven dashboard"
```

---

## Task 9: Routing — autenticados vão para o Início

**Files:**
- Modify: `src/app/index.tsx:33,37`
- Modify: `src/app/(auth)/login.tsx:25`
- Modify: `src/app/(tabs)/admin.tsx:75`

- [ ] **Step 1: `src/app/index.tsx` — redirecionar sempre para o Início e remover `user` não usado**

Na linha 33, substituir:
```ts
// ANTES:
      () => router.replace(user ? '/(tabs)/analises' : '/(tabs)/inicio'),
// DEPOIS:
      () => router.replace('/(tabs)/inicio'),
```

Na linha 12, remover `user` do destructure:
```ts
// ANTES:
  const { user, initializing } = useAuth();
// DEPOIS:
  const { initializing } = useAuth();
```

Na linha 37, remover `user` do array de dependências do effect:
```ts
// ANTES:
  }, [opacity, scale, router, user]);
// DEPOIS:
  }, [opacity, scale, router]);
```

- [ ] **Step 2: `src/app/(auth)/login.tsx` — redirect para o Início**

Na linha 25, substituir:
```ts
// ANTES:
    if (user) router.replace('/(tabs)/analises');
// DEPOIS:
    if (user) router.replace('/(tabs)/inicio');
```

- [ ] **Step 3: `src/app/(tabs)/admin.tsx` — redirect de não-admin para o Início**

Na linha 75, substituir:
```ts
// ANTES:
      router.replace('/(tabs)/analises');
// DEPOIS:
      router.replace('/(tabs)/inicio');
```

- [ ] **Step 4: Verificar**

```powershell
npx tsc --noEmit
# esperado: exit 0

npx expo lint
# esperado: exit 0
```

- [ ] **Step 5: Verificação manual**

No Expo Go: com sessão iniciada, o splash termina no Início (não em Análises); fazer login/registo encaminha para o Início; um admin a entrar no admin continua no admin, um não-admin volta ao Início.

- [ ] **Step 6: Commit**

```bash
git add src/app/index.tsx "src/app/(auth)/login.tsx" "src/app/(tabs)/admin.tsx"
git commit -m "feat(routing): route authenticated users to the new Início dashboard"
```

---

## Task 10: Verificação final do branch

- [ ] **Step 1: Typecheck e lint completos**

```powershell
npx tsc --noEmit
# esperado: exit 0

npx expo lint
# esperado: exit 0
```

- [ ] **Step 2: Confirmar estado do branch**

```powershell
git log --oneline -10
# esperado: 9 commits da feature (Tasks 1-9) por cima de 30668a5 "Initial commit"
```

- [ ] **Step 3: Smoke test manual**

Verificar em Expo Go que nenhuma das outras abas regressou (Histórico, Análises, Horários, Comunidade, Perfil) e que `horarios.tsx` continua a agendar alarmes corretamente (usando `boomEpochMs`).

---

## Riscos / notas para o executor

- `expo lint` na primeira execução pode demorar (download de deps); dar timeout generoso (≥300 s).
- O PowerShell trata o stderr do `git` como erro — o texto "Switched to a new branch…" não é falha.
- Se `tsc` falhar com erro em ficheiro não tocado pelo plano, parar e reportar (problema pré-existente), não contornar.
- Não alterar nada em `analises.tsx`, `historico.tsx`, `comunidade.tsx`, `perfil.tsx` ou `theme.ts`/`ui.tsx`.
