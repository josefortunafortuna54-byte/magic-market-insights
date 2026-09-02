# Admin Panel Redesign - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpawers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the admin panel with smart presets, quick-select chips, and intuitive forms to make adding boom hours, boom times, signals, and posts fast and error-free.

**Architecture:** Extract trading presets (pairs, sessions, timeframes) into a constants file. Create reusable chip-based UI components for quick selection. Refactor each admin panel form to use presets + chips instead of raw text inputs. Add GMT auto-calculation from WAT.

**Tech Stack:** React Native, Expo, TypeScript, react-i18next, existing UI components (AppButton, AppInput, Chip, Badge)

---

## File Structure

| File | Purpose |
|------|---------|
| `src/core/presets.ts` | **NEW** — Trading pairs, sessions, timeframes, volatility levels, confidence presets |
| `src/components/admin/PairChips.tsx` | **NEW** — Reusable pair quick-select chip grid |
| `src/components/admin/SessionPresets.tsx` | **NEW** — Boom hour session presets (Tokyo, London, NY) |
| `src/components/admin/ConfidencePresets.tsx` | **NEW** — Quick confidence level buttons (Low/Medium/High) |
| `src/components/admin/TimePresets.tsx` | **NEW** — Quick time offset buttons (30min, 1h, 2h, 4h) |
| `src/components/admin/SignalTypeToggle.tsx` | **NEW** — BUY/SELL toggle buttons |
| `src/app/(tabs)/admin.tsx` | **MODIFY** — Refactor BoomHoursPanel, BoomTimesPanel, SignalsPanel, PostsPanel |
| `src/lib/i18n/locales/pt.json` | **MODIFY** — Add new translation keys |
| `src/lib/i18n/locales/en.json` | **MODIFY** — Add new translation keys |

---

## Task 1: Create Trading Presets Constants

**Files:**
- Create: `src/core/presets.ts`

- [ ] **Step 1: Create presets file with all trading constants**

```typescript
// src/core/presets.ts

export const POPULAR_PAIRS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF',
  'AUDUSD', 'USDCAD', 'NZDUSD', 'EURGBP',
] as const;

export type TradingPair = typeof POPULAR_PAIRS[number];

export interface SessionPreset {
  key: string;
  labelKey: string;
  title: string;
  time_wat: string;
  time_gmt: string;
  pairs: string[];
  volatility: number;
  badge: string;
  description: string;
}

export const SESSION_PRESETS: SessionPreset[] = [
  {
    key: 'tokyo',
    labelKey: 'admin.presetTokyo',
    title: 'Boom de Tokyo',
    time_wat: '02:00',
    time_gmt: '01:00',
    pairs: ['USDJPY', 'AUDUSD', 'NZDUSD'],
    volatility: 2,
    badge: '🇯🇵',
    description: 'Sessão asiática — pares com JPY',
  },
  {
    key: 'london',
    labelKey: 'admin.presetLondon',
    title: 'Boom de Londres',
    time_wat: '10:00',
    time_gmt: '09:00',
    pairs: ['EURUSD', 'GBPUSD', 'EURGBP'],
    volatility: 4,
    badge: '🇬🇧',
    description: 'Alta liquidez — pares com EUR/GBP',
  },
  {
    key: 'newyork',
    labelKey: 'admin.presetNewYork',
    title: 'Boom de Nova York',
    time_wat: '15:00',
    time_gmt: '14:00',
    pairs: ['EURUSD', 'GBPUSD', 'USDCAD'],
    volatility: 5,
    badge: '🇺🇸',
    description: 'Maior volatilidade do dia',
  },
];

export const TIMEFRAME_OPTIONS = ['M15', 'M30', 'H1', 'H4', 'D1'] as const;

export const VOLATILITY_LEVELS = [
  { value: 1, label: 'Baixa', color: '#34C759' },
  { value: 2, label: 'Moderada', color: '#30D158' },
  { value: 3, label: 'Média', color: '#FF9F0A' },
  { value: 4, label: 'Alta', color: '#FF6B35' },
  { value: 5, label: 'Muito Alta', color: '#FF453A' },
] as const;

export const CONFIDENCE_PRESETS = [
  { value: 50, label: 'Baixa', color: '#98989D' },
  { value: 70, label: 'Média', color: '#FF9F0A' },
  { value: 85, label: 'Alta', color: '#34C759' },
  { value: 95, label: 'Muito Alta', color: '#16A43A' },
] as const;

export const TIME_OFFSETS = [
  { minutes: 30, label: '30min' },
  { minutes: 60, label: '1h' },
  { minutes: 120, label: '2h' },
  { minutes: 240, label: '4h' },
  { minutes: 480, label: '8h' },
] as const;

export const BADGE_OPTIONS = ['⚡', '🔥', '🎯', '💎', '🚀', '📊', '💰', '🏆'] as const;
```

- [ ] **Step 2: Commit**

```bash
git add src/core/presets.ts
git commit -m "feat: add trading presets constants for admin panel"
```

---

## Task 2: Create Reusable Admin UI Components

**Files:**
- Create: `src/components/admin/PairChips.tsx`
- Create: `src/components/admin/ConfidencePresets.tsx`
- Create: `src/components/admin/TimePresets.tsx`
- Create: `src/components/admin/SignalTypeToggle.tsx`
- Create: `src/components/admin/SessionPresets.tsx`
- Create: `src/components/admin/index.ts`

- [ ] **Step 1: Create PairChips component**

```typescript
// src/components/admin/PairChips.tsx
import { View, Pressable, StyleSheet } from 'react-native';
import { AppText } from '@/components/ui';
import { Colors, Spacing } from '@/core/theme';
import { POPULAR_PAIRS } from '@/core/presets';

interface PairChipsProps {
  selected: string;
  onSelect: (pair: string) => void;
}

export function PairChips({ selected, onSelect }: PairChipsProps) {
  return (
    <View style={styles.container}>
      <AppText variant="label" style={styles.label}>PARES RÁPIDOS</AppText>
      <View style={styles.grid}>
        {POPULAR_PAIRS.map((pair) => (
          <Pressable
            key={pair}
            onPress={() => onSelect(pair)}
            style={[
              styles.chip,
              selected === pair
                ? styles.chipActive
                : styles.chipInactive,
            ]}>
            <AppText
              variant="small"
              style={[
                styles.chipText,
                { color: selected === pair ? '#1A1A2E' : Colors.textMuted },
              ]}>
              {pair}
            </AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.md },
  label: { color: Colors.textMuted, marginBottom: Spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  chipInactive: { backgroundColor: Colors.surfaceElevated, borderColor: Colors.border },
  chipText: { fontWeight: '600' },
});
```

- [ ] **Step 2: Create ConfidencePresets component**

```typescript
// src/components/admin/ConfidencePresets.tsx
import { View, Pressable, StyleSheet } from 'react-native';
import { AppText } from '@/components/ui';
import { Colors, Spacing } from '@/core/theme';
import { CONFIDENCE_PRESETS } from '@/core/presets';

interface ConfidencePresetsProps {
  value: number;
  onChange: (value: number) => void;
}

export function ConfidencePresets({ value, onChange }: ConfidencePresetsProps) {
  return (
    <View style={styles.container}>
      <AppText variant="label" style={styles.label}>CONFIANÇA</AppText>
      <View style={styles.row}>
        {CONFIDENCE_PRESETS.map((preset) => (
          <Pressable
            key={preset.value}
            onPress={() => onChange(preset.value)}
            style={[
              styles.chip,
              value === preset.value
                ? { backgroundColor: preset.color, borderColor: preset.color }
                : styles.chipInactive,
            ]}>
            <AppText
              variant="small"
              style={[
                styles.chipText,
                { color: value === preset.value ? '#1A1A2E' : Colors.textMuted },
              ]}>
              {preset.label} ({preset.value}%)
            </AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.md },
  label: { color: Colors.textMuted, marginBottom: Spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipInactive: { backgroundColor: Colors.surfaceElevated, borderColor: Colors.border },
  chipText: { fontWeight: '600' },
});
```

- [ ] **Step 3: Create TimePresets component**

```typescript
// src/components/admin/TimePresets.tsx
import { View, Pressable, StyleSheet } from 'react-native';
import { AppText } from '@/components/ui';
import { Colors, Spacing } from '@/core/theme';
import { TIME_OFFSETS } from '@/core/presets';

interface TimePresetsProps {
  value: number;
  onChange: (minutes: number) => void;
}

export function TimePresets({ value, onChange }: TimePresetsProps) {
  return (
    <View style={styles.container}>
      <AppText variant="label" style={styles.label}>DAQUI A</AppText>
      <View style={styles.row}>
        {TIME_OFFSETS.map((offset) => (
          <Pressable
            key={offset.minutes}
            onPress={() => onChange(offset.minutes)}
            style={[
              styles.chip,
              value === offset.minutes
                ? styles.chipActive
                : styles.chipInactive,
            ]}>
            <AppText
              variant="small"
              style={[
                styles.chipText,
                { color: value === offset.minutes ? '#1A1A2E' : Colors.textMuted },
              ]}>
              {offset.label}
            </AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.md },
  label: { color: Colors.textMuted, marginBottom: Spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipInactive: { backgroundColor: Colors.surfaceElevated, borderColor: Colors.border },
  chipText: { fontWeight: '600' },
});
```

- [ ] **Step 4: Create SignalTypeToggle component**

```typescript
// src/components/admin/SignalTypeToggle.tsx
import { View, Pressable, StyleSheet } from 'react-native';
import { AppText } from '@/components/ui';
import { Colors, Spacing } from '@/core/theme';

type SignalType = 'BUY' | 'SELL';

interface SignalTypeToggleProps {
  value: SignalType;
  onChange: (type: SignalType) => void;
}

export function SignalTypeToggle({ value, onChange }: SignalTypeToggleProps) {
  return (
    <View style={styles.container}>
      <AppText variant="label" style={styles.label}>TIPO</AppText>
      <View style={styles.row}>
        <Pressable
          onPress={() => onChange('BUY')}
          style={[
            styles.chip,
            value === 'BUY' ? styles.buyActive : styles.chipInactive,
          ]}>
          <AppText
            variant="small"
            style={[
              styles.chipText,
              { color: value === 'BUY' ? '#1A1A2E' : Colors.textMuted },
            ]}>
            📈 BUY
          </AppText>
        </Pressable>
        <Pressable
          onPress={() => onChange('SELL')}
          style={[
            styles.chip,
            value === 'SELL' ? styles.sellActive : styles.chipInactive,
          ]}>
          <AppText
            variant="small"
            style={[
              styles.chipText,
              { color: value === 'SELL' ? '#1A1A2E' : Colors.textMuted },
            ]}>
            📉 SELL
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.md },
  label: { color: Colors.textMuted, marginBottom: Spacing.sm },
  row: { flexDirection: 'row', gap: Spacing.sm },
  chip: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  buyActive: { backgroundColor: Colors.success, borderColor: Colors.success },
  sellActive: { backgroundColor: Colors.destructive, borderColor: Colors.destructive },
  chipInactive: { backgroundColor: Colors.surfaceElevated, borderColor: Colors.border },
  chipText: { fontWeight: '700' },
});
```

- [ ] **Step 5: Create SessionPresets component**

```typescript
// src/components/admin/SessionPresets.tsx
import { View, Pressable, StyleSheet } from 'react-native';
import { AppText } from '@/components/ui';
import { Colors, Spacing } from '@/core/theme';
import { SESSION_PRESETS, type SessionPreset } from '@/core/presets';

interface SessionPresetsProps {
  onSelect: (preset: SessionPreset) => void;
}

export function SessionPresets({ onSelect }: SessionPresetsProps) {
  return (
    <View style={styles.container}>
      <AppText variant="label" style={styles.label}>SESSÕES RÁPIDAS</AppText>
      <View style={styles.grid}>
        {SESSION_PRESETS.map((preset) => (
          <Pressable
            key={preset.key}
            onPress={() => onSelect(preset)}
            style={styles.card}>
            <AppText variant="h2" style={styles.badge}>{preset.badge}</AppText>
            <AppText variant="label" style={styles.title}>{preset.title}</AppText>
            <AppText variant="small" style={styles.time}>
              {preset.time_wat} WAT · Vol {preset.volatility}
            </AppText>
            <AppText variant="small" style={styles.pairs}>
              {preset.pairs.join(', ')}
            </AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.md },
  label: { color: Colors.textMuted, marginBottom: Spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  card: {
    width: '30%',
    flexGrow: 1,
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  badge: { fontSize: 20 },
  title: { fontSize: 11, textAlign: 'center' },
  time: { color: Colors.textMuted, fontSize: 10 },
  pairs: { color: Colors.accent, fontSize: 10, fontWeight: '600' },
});
```

- [ ] **Step 6: Create index barrel export**

```typescript
// src/components/admin/index.ts
export { PairChips } from './PairChips';
export { ConfidencePresets } from './ConfidencePresets';
export { TimePresets } from './TimePresets';
export { SignalTypeToggle } from './SignalTypeToggle';
export { SessionPresets } from './SessionPresets';
```

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/
git commit -m "feat: add reusable admin UI components (chips, presets, toggles)"
```

---

## Task 3: Add i18n Translations

**Files:**
- Modify: `src/lib/i18n/locales/pt.json` (lines 207-294)
- Modify: `src/lib/i18n/locales/en.json` (lines 210-289)

- [ ] **Step 1: Add Portuguese translations**

In `src/lib/i18n/locales/pt.json`, inside the `"admin"` object, add these keys after `"userRole"`:

```json
    "quickPairs": "PARES RÁPIDOS",
    "volatility": "VOLATILIDADE",
    "volLow": "Baixa",
    "volMedium": "Média",
    "volHigh": "Alta",
    "volVeryHigh": "Muito Alta",
    "confidenceLevel": "CONFIANÇA",
    "confLow": "Baixa",
    "confMedium": "Média",
    "confHigh": "Alta",
    "confVeryHigh": "Muito Alta",
    "timeOffset": "DAQUI A",
    "typeToggle": "TIPO",
    "presetSessions": "SESSÕES RÁPIDAS",
    "presetTokyo": "🇯🇵 Tokyo",
    "presetLondon": "🇬🇧 Londres",
    "presetNewYork": "🇺🇸 Nova York",
    "customTime": "Tempo personalizado",
    "autoGmt": "GMT calculado automaticamente",
    "badgeSelect": "ÍCONE"
```

- [ ] **Step 2: Add English translations**

In `src/lib/i18n/locales/en.json`, inside the `"admin"` object, add these keys after `"userRole"`:

```json
    "quickPairs": "QUICK PAIRS",
    "volatility": "VOLATILITY",
    "volLow": "Low",
    "volMedium": "Medium",
    "volHigh": "High",
    "volVeryHigh": "Very High",
    "confidenceLevel": "CONFIDENCE",
    "confLow": "Low",
    "confMedium": "Medium",
    "confHigh": "High",
    "confVeryHigh": "Very High",
    "timeOffset": "IN",
    "typeToggle": "TYPE",
    "presetSessions": "QUICK SESSIONS",
    "presetTokyo": "🇯🇵 Tokyo",
    "presetLondon": "🇬🇧 London",
    "presetNewYork": "🇺🇸 New York",
    "customTime": "Custom time",
    "autoGmt": "GMT calculated automatically",
    "badgeSelect": "ICON"
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/i18n/locales/pt.json src/lib/i18n/locales/en.json
git commit -m "feat: add i18n translations for admin presets"
```

---

## Task 4: Refactor BoomHoursPanel with Session Presets

**Files:**
- Modify: `src/app/(tabs)/admin.tsx` (lines 273-337)

- [ ] **Step 1: Replace BoomHoursPanel with preset-powered version**

Replace the entire `BoomHoursPanel` function (lines 273-337) with:

```typescript
function BoomHoursPanel({ hours, onRefresh }: { hours: BoomHour[]; onRefresh: () => void }) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [timeWat, setTimeWat] = useState('');
  const [timeGmt, setTimeGmt] = useState('');
  const [pairs, setPairs] = useState('');
  const [vol, setVol] = useState('3');
  const [badge, setBadge] = useState('⚡');

  const applyPreset = (preset: import('@/core/presets').SessionPreset) => {
    setTitle(preset.title);
    setTimeWat(preset.time_wat);
    setTimeGmt(preset.time_gmt);
    setPairs(preset.pairs.join(', '));
    setVol(String(preset.volatility));
    setBadge(preset.badge);
  };

  const handleWatChange = (text: string) => {
    setTimeWat(text);
    if (text.match(/^\d{2}:\d{2}$/)) {
      const [h, m] = text.split(':').map(Number);
      const gmtH = h - 1;
      setTimeGmt(`${String(gmtH < 0 ? gmtH + 24 : gmtH).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  };

  const add = async () => {
    try {
      await adminApi.addBoomHour({
        title,
        time_wat: timeWat,
        time_gmt: timeGmt,
        pairs: pairs.split(',').map((p) => p.trim()).filter(Boolean),
        days: '',
        description: '',
        volatility: Number(vol) || 1,
        badge,
      });
      setTitle(''); setTimeWat(''); setTimeGmt(''); setPairs(''); setVol('3'); setBadge('⚡');
      onRefresh();
    } catch (e: any) {
      Alert.alert(t('admin.errorTitle'), e?.message || t('admin.addHourError'));
    }
  };

  return (
    <View>
      <SessionPresets onSelect={applyPreset} />

      <AppText variant="label" style={{ color: Colors.textMuted, marginVertical: Spacing.sm }}>
        {t('admin.newHour')}
      </AppText>
      <AppInput label={t('admin.titleLabel')} value={title} onChangeText={setTitle} placeholder={t('admin.titlePlaceholder')} />
      <View style={styles.inlineRow}>
        <View style={{ flex: 1 }}>
          <AppInput label={t('admin.watLabel')} value={timeWat} onChangeText={handleWatChange} placeholder="09:00" />
        </View>
        <View style={{ flex: 1 }}>
          <AppInput label={`${t('admin.gmtLabel')} ✓`} value={timeGmt} onChangeText={setTimeGmt} placeholder="08:00" />
        </View>
      </View>

      <PairChips selected={pairs.split(',')[0]?.trim() || ''} onSelect={(p) => setPairs(pairs ? `${pairs}, ${p}` : p)} />

      <View style={styles.volRow}>
        <AppText variant="label" style={{ color: Colors.textMuted }}>{t('admin.volLabel')}</AppText>
        <View style={{ flexDirection: 'row', gap: Spacing.xs }}>
          {VOLATILITY_LEVELS.map((level) => (
            <Pressable
              key={level.value}
              onPress={() => setVol(String(level.value))}
              style={[
                styles.volChip,
                Number(vol) === level.value
                  ? { backgroundColor: level.color, borderColor: level.color }
                  : { backgroundColor: Colors.surfaceElevated, borderColor: Colors.border },
              ]}>
              <AppText variant="small" style={{
                color: Number(vol) === level.value ? '#1A1A2E' : Colors.textMuted,
                fontWeight: '600',
              }}>
                {level.value}
              </AppText>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.badgeRow}>
        <AppText variant="label" style={{ color: Colors.textMuted }}>{t('admin.badgeSelect')}</AppText>
        <View style={{ flexDirection: 'row', gap: Spacing.xs }}>
          {BADGE_OPTIONS.map((emoji) => (
            <Pressable
              key={emoji}
              onPress={() => setBadge(emoji)}
              style={[
                styles.badgeChip,
                badge === emoji
                  ? { backgroundColor: Colors.accent, borderColor: Colors.accent }
                  : { backgroundColor: Colors.surfaceElevated, borderColor: Colors.border },
              ]}>
              <AppText variant="body">{emoji}</AppText>
            </Pressable>
          ))}
        </View>
      </View>

      <AppButton title={t('admin.addHour')} onPress={add} />

      <AppText variant="label" style={{ color: Colors.textMuted, marginVertical: Spacing.md }}>
        {t('admin.hoursList', { count: hours.length })}
      </AppText>
      {hours.length === 0 ? <EmptyState title={t('admin.noHours')} /> : hours.map((h) => (
        <View key={h.id} style={styles.row}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="label">{h.badge} {h.title}</AppText>
            <AppText variant="small" style={{ color: Colors.textMuted }}>
              {h.time_wat} WAT · Vol {h.volatility} · {h.pairs.join(', ')}
            </AppText>
          </View>
          <Pressable
            onPress={() =>
              Alert.alert(t('admin.deleteHourTitle'), t('admin.deleteConfirm'), [
                { text: t('admin.cancel'), style: 'cancel' },
                { text: t('admin.delete'), style: 'destructive', onPress: () => adminApi.deleteBoomHour(h.id).then(onRefresh) },
              ])
            }
            hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color={Colors.textMuted} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}
```

- [ ] **Step 2: Add missing imports at top of admin.tsx**

Add these imports at the top of `admin.tsx`:

```typescript
import { PairChips, ConfidencePresets, TimePresets, SignalTypeToggle, SessionPresets } from '@/components/admin';
import { VOLATILITY_LEVELS, BADGE_OPTIONS } from '@/core/presets';
import { Pressable } from 'react-native';
```

- [ ] **Step 3: Add new styles to StyleSheet**

Add these styles to the `styles` StyleSheet object:

```typescript
  volRow: { marginBottom: Spacing.md },
  volChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  badgeRow: { marginBottom: Spacing.md },
  badgeChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(tabs\)/admin.tsx
git commit -m "feat: refactor BoomHoursPanel with session presets and smart inputs"
```

---

## Task 5: Refactor BoomTimesPanel with Time Presets

**Files:**
- Modify: `src/app/(tabs)/admin.tsx` (lines 340-403)

- [ ] **Step 1: Replace BoomTimesPanel with preset-powered version**

Replace the entire `BoomTimesPanel` function (lines 340-403) with:

```typescript
function BoomTimesPanel({ times, onRefresh }: { times: BoomTime[]; onRefresh: () => void }) {
  const { t } = useTranslation();
  const [pair, setPair] = useState('EURUSD');
  const [confidence, setConfidence] = useState(75);
  const [inMinutes, setInMinutes] = useState(120);

  const add = async () => {
    const boomTime = new Date(Date.now() + inMinutes * 60_000).toISOString();
    try {
      await adminApi.addBoomTime({
        pair,
        boom_time: boomTime,
        confidence,
        result: '',
        image_url: '',
        audio_url: '',
      });
      onRefresh();
    } catch (e: any) {
      Alert.alert(t('admin.errorTitle'), e?.message || t('admin.addBoomTimeError'));
    }
  };

  const formatTime = (mins: number) => {
    const d = new Date(Date.now() + mins * 60_000);
    return d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View>
      <AppText variant="label" style={{ color: Colors.textMuted, marginVertical: Spacing.sm }}>
        {t('admin.newBoomTime')}
      </AppText>

      <PairChips selected={pair} onSelect={setPair} />

      <ConfidencePresets value={confidence} onChange={setConfidence} />

      <TimePresets value={inMinutes} onChange={setInMinutes} />

      <View style={styles.timePreview}>
        <Ionicons name="time-outline" size={14} color={Colors.accent} />
        <AppText variant="small" style={{ color: Colors.accent }}>
          Boom às {formatTime(inMinutes)}
        </AppText>
      </View>

      <AppButton title={t('admin.addBoomTime')} onPress={add} />

      <AppText variant="label" style={{ color: Colors.textMuted, marginVertical: Spacing.md }}>
        {t('admin.boomTimesList', { count: times.length })}
      </AppText>
      {times.length === 0 ? <EmptyState title={t('admin.noBoomTimes')} /> : times.map((b) => (
        <View key={b.id} style={styles.row}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="label">{formatSymbol(b.pair)}</AppText>
            <AppText variant="small" style={{ color: Colors.textMuted }}>
              {new Date(b.boom_time).toLocaleString()} · {b.confidence}%
            </AppText>
          </View>
          <Pressable onPress={() => adminApi.updateBoomResult(b.id, b.result === 'BUY' ? 'SELL' : 'BUY').then(onRefresh)} hitSlop={8}>
            <Badge color={b.result === 'BUY' ? Colors.success : b.result === 'SELL' ? Colors.destructive : Colors.textMuted}>
              {b.result || '?'}
            </Badge>
          </Pressable>
          <Pressable
            onPress={() =>
              Alert.alert(t('admin.deleteBoomTimeTitle'), t('admin.deleteConfirm'), [
                { text: t('admin.cancel'), style: 'cancel' },
                { text: t('admin.delete'), style: 'destructive', onPress: () => adminApi.deleteBoomTime(b.id).then(onRefresh) },
              ])
            }
            hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color={Colors.textMuted} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}
```

- [ ] **Step 2: Add timePreview style**

Add to the `styles` StyleSheet:

```typescript
  timePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.accentDim,
    borderRadius: 8,
  },
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(tabs\)/admin.tsx
git commit -m "feat: refactor BoomTimesPanel with confidence/time presets and pair chips"
```

---

## Task 6: Refactor SignalsPanel with Quick Select

**Files:**
- Modify: `src/app/(tabs)/admin.tsx` (lines 196-271)

- [ ] **Step 1: Replace SignalsPanel with preset-powered version**

Replace the entire `SignalsPanel` function (lines 196-271) with:

```typescript
function SignalsPanel({ signals, onRefresh }: { signals: any[]; onRefresh: () => void }) {
  const { t } = useTranslation();
  const [symbol, setSymbol] = useState('EURUSD');
  const [signalType, setSignalType] = useState<'BUY' | 'SELL'>('BUY');
  const [entry, setEntry] = useState('');
  const [sl, setSl] = useState('');
  const [tp, setTp] = useState('');
  const [confidence, setConfidence] = useState(75);
  const [reason, setReason] = useState('');

  const add = async () => {
    try {
      await adminApi.addSignal({
        symbol,
        timeframe: '1h',
        signal_type: signalType,
        entry_price: Number(entry),
        stop_loss: Number(sl),
        target_price: Number(tp),
        confidence,
        reasons: reason.split('\n').map((r) => r.trim()).filter(Boolean),
      });
      setEntry(''); setSl(''); setTp(''); setReason('');
      onRefresh();
    } catch (e: any) {
      Alert.alert(t('admin.errorTitle'), e?.message || t('admin.addSignalError'));
    }
  };

  return (
    <View>
      <AppText variant="label" style={{ color: Colors.textMuted, marginVertical: Spacing.sm }}>
        {t('admin.newSignal')}
      </AppText>

      <PairChips selected={symbol} onSelect={setSymbol} />

      <SignalTypeToggle value={signalType} onChange={setSignalType} />

      <ConfidencePresets value={confidence} onChange={setConfidence} />

      <View style={styles.inlineRow}>
        <View style={{ flex: 1 }}>
          <AppInput label={t('admin.entryLabel')} value={entry} onChangeText={setEntry} keyboardType="numeric" placeholder="1.0850" />
        </View>
        <View style={{ flex: 1 }}>
          <AppInput label={t('admin.slLabel')} value={sl} onChangeText={setSl} keyboardType="numeric" placeholder="1.0800" />
        </View>
        <View style={{ flex: 1 }}>
          <AppInput label={t('admin.tpLabel')} value={tp} onChangeText={setTp} keyboardType="numeric" placeholder="1.0920" />
        </View>
      </View>

      <AppInput label={t('admin.reasonsLabel')} value={reason} onChangeText={setReason} multiline numberOfLines={3} placeholder="Suporte em 1.0820\nRejeição na resistência" />
      <AppButton title={t('admin.addSignal')} onPress={add} />

      <AppText variant="label" style={{ color: Colors.textMuted, marginVertical: Spacing.md }}>
        {t('admin.signalsList', { count: signals.length })}
      </AppText>
      {signals.length === 0 ? <EmptyState title={t('admin.noSignalsAdmin')} /> : signals.map((s) => (
        <View key={s.id} style={styles.row}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="label">{formatSymbol(s.symbol)} · {formatTimeframe(s.timeframe)}</AppText>
            <AppText variant="small" style={{ color: Colors.textMuted }}>{s.signal_type} · {s.confidence}% · E{s.entry_price}</AppText>
          </View>
          <Badge color={s.status === 'active' ? Colors.success : s.status === 'tp' ? Colors.success : s.status === 'sl' ? Colors.destructive : Colors.textMuted}>
            {s.status}
          </Badge>
          <Pressable onPress={() => adminApi.updateSignalStatus(s.id, s.status === 'tp' ? 'active' : 'tp').then(onRefresh)} hitSlop={8}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
          </Pressable>
          <Pressable onPress={() => adminApi.updateSignalStatus(s.id, s.status === 'sl' ? 'active' : 'sl').then(onRefresh)} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={Colors.destructive} />
          </Pressable>
          <Pressable
            onPress={() =>
              Alert.alert(t('admin.deleteSignalTitle'), t('admin.deleteConfirm'), [
                { text: t('admin.cancel'), style: 'cancel' },
                { text: t('admin.delete'), style: 'destructive', onPress: () => adminApi.deleteSignal(s.id).then(onRefresh) },
              ])
            }
            hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color={Colors.textMuted} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(tabs\)/admin.tsx
git commit -m "feat: refactor SignalsPanel with pair chips, type toggle, confidence presets"
```

---

## Task 7: Refactor PostsPanel with Quick Pair Select

**Files:**
- Modify: `src/app/(tabs)/admin.tsx` (lines 405-470)

- [ ] **Step 1: Replace PostsPanel with pair chips**

Replace the entire `PostsPanel` function (lines 405-470) with:

```typescript
function PostsPanel({ posts, onRefresh }: { posts: PostRow[]; onRefresh: () => void }) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pair, setPair] = useState('');
  const [signalType, setSignalType] = useState('NEUTRO');

  const add = async () => {
    if (!title.trim()) {
      Alert.alert(t('admin.titleRequired'), t('admin.titleRequiredMsg'));
      return;
    }
    try {
      await adminApi.addPost({
        title: title.trim(),
        content: content.trim(),
        pair: pair.trim().toUpperCase(),
        signal_type: signalType.toUpperCase(),
      });
      setTitle(''); setContent(''); setPair(''); setSignalType('NEUTRO');
      onRefresh();
    } catch (e: any) {
      Alert.alert(t('admin.errorTitle'), e?.message || t('admin.addPostError'));
    }
  };

  return (
    <View>
      <AppText variant="label" style={{ color: Colors.textMuted, marginVertical: Spacing.sm }}>
        {t('admin.newPost')}
      </AppText>
      <AppInput label={t('admin.titleLabel')} value={title} onChangeText={setTitle} placeholder={t('admin.postTitlePlaceholder')} />

      <PairChips selected={pair} onSelect={setPair} />

      <View style={styles.inlineRow}>
        <View style={{ flex: 1 }}>
          <AppInput label={t('admin.typeLabel')} value={signalType} onChangeText={setSignalType} autoCapitalize="characters" />
        </View>
      </View>

      <AppInput label={t('admin.contentLabel')} value={content} onChangeText={setContent} multiline numberOfLines={3} placeholder={t('admin.contentPlaceholder')} />
      <AppButton title={t('admin.publishPost')} onPress={add} />

      <AppText variant="label" style={{ color: Colors.textMuted, marginVertical: Spacing.md }}>
        {t('admin.postsList', { count: posts.length })}
      </AppText>
      {posts.length === 0 ? <EmptyState title={t('admin.noPosts')} /> : posts.map((p) => (
        <View key={p.id} style={styles.row}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="label">{p.title}</AppText>
            <AppText variant="small" style={{ color: Colors.textMuted }}>
              {p.pair ? `${p.pair} · ` : ''}{new Date(p.created_at).toLocaleString()}
            </AppText>
          </View>
          <Badge color={p.is_active === false ? Colors.textMuted : Colors.success}>
            {p.is_active === false ? t('admin.postInactive') : t('admin.postActive')}
          </Badge>
          <Pressable
            onPress={() =>
              Alert.alert(t('admin.deletePostTitle'), t('admin.deleteConfirm'), [
                { text: t('admin.cancel'), style: 'cancel' },
                { text: t('admin.delete'), style: 'destructive', onPress: () => adminApi.deletePost(p.id).then(onRefresh) },
              ])
            }
            hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color={Colors.textMuted} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(tabs\)/admin.tsx
git commit -m "feat: refactor PostsPanel with pair chips for quick selection"
```

---

## Task 8: Type Check and Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Run TypeScript type check**

```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 2: Run linter**

```bash
npx eslint src/app/\(tabs\)/admin.tsx src/components/admin/ src/core/presets.ts
```

Expected: No errors or warnings

- [ ] **Step 3: Verify imports are correct**

Check that `admin.tsx` has all necessary imports:
- `PairChips, ConfidencePresets, TimePresets, SignalTypeToggle, SessionPresets` from `@/components/admin`
- `VOLATILITY_LEVELS, BADGE_OPTIONS` from `@/core/presets`
- `Pressable` from `react-native` (already imported)

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: resolve type/lint issues in admin panel redesign"
```

---

## Summary of Changes

| Area | Before | After |
|------|--------|-------|
| **Boom Hours** | Manual text for title, WAT, GMT, pairs, vol, badge | Session presets (Tokyo/London/NY) auto-fill all fields; WAT auto-calculates GMT; pair chips; volatility buttons; badge emoji picker |
| **Boom Times** | Manual text for pair, confidence, minutes | Pair chips; confidence presets (50/70/85/95%); time presets (30min/1h/2h/4h/8h); live time preview |
| **Signals** | Manual text for pair, type, confidence | Pair chips; BUY/SELL toggle; confidence presets; entry/SL/TP kept as numeric input |
| **Posts** | Manual text for pair | Pair chips for quick selection |
| **UX overall** | All raw text inputs | Visual chips, presets, toggles — fewer taps, fewer errors |
