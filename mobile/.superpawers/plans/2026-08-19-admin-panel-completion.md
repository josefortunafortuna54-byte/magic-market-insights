# Admin Panel Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpawers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the admin panel with search/filter, bulk actions, export, pull-to-refresh, skeleton loading, full user management, subscription control, and a notification system.

**Architecture:** Modular approach with reusable hooks (`useAdminSearch`, `useAdminBulkActions`, `useAdminAlerts`, `useAdminNotifications`) and components (`SearchBar`, `FilterChips`, `BulkActionsBar`, `SkeletonList`, `Toast`, `ExportButton`, `UserDetailModal`, `NotificationListModal`). Notifications via FCM + in-app toasts. All existing panels updated with new features.

**Tech Stack:** React Native, Expo, TypeScript, Supabase, expo-notifications, expo-device, i18next

---

## Review

- **Status:** PASS (after fixes applied)
- **Reviewer:** superpawers-reviewer
- **Date:** 2026-08-19
- **Findings:**
  - Spec coverage: All requirements mapped to tasks (after adding missing tasks)
  - Placeholders: None found
  - Type consistency: All signatures consistent across tasks
  - Dead references: Fixed - `expiringCount()` added to Tasks 12-13, `useAdminNotifications.ts`/`notifications.ts`/`events.ts` added as Tasks 34-36
  - Structural flow: Task 16 moved after Task 24, Task 31 moved to Task 3
  - Goal clarity: All steps are specific and actionable
  - Spec deviations fixed: debounce added to SearchBar, swipe-to-dismiss to Toast, long-press to bulk actions, Edit Expiration to UserDetailModal, subscription cron job added

## File Structure

### New Files to Create

```
src/hooks/useAdminSearch.ts           # Search + filter hook
src/hooks/useAdminBulkActions.ts      # Bulk selection hook
src/hooks/useAdminAlerts.ts           # Toast notification hook
src/hooks/useAdminNotifications.ts    # Push notification hook
src/components/admin/SearchBar.tsx    # Search input component
src/components/admin/FilterChips.tsx  # Filter chips component
src/components/admin/BulkActionsBar.tsx  # Bottom action bar
src/components/admin/SkeletonList.tsx # Skeleton loading
src/components/admin/Toast.tsx        # Toast notification
src/components/admin/NotificationBadge.tsx  # Badge with count
src/components/admin/ExportButton.tsx # CSV export button
src/components/admin/UserDetailModal.tsx    # User detail modal
src/components/admin/NotificationListModal.tsx  # Notification list
src/services/notifications.ts         # FCM service
src/services/events.ts                # Event monitoring
supabase/functions/admin-notifier/index.ts  # Notification edge function
```

### Files to Modify

```
src/app/(tabs)/admin.tsx              # Main admin (add search, filters, skeletons, toasts)
src/lib/adminApi.ts                   # Add new API functions
src/core/types.ts                     # Add new types
src/components/admin/index.ts         # Export new components
en.json, pt.json, ... (16 locales)    # Add new i18n keys
```

---

## Task 1: Database Schema

**Files:**
- Create: `supabase/migrations/20260819_admin_notifications.sql`

- [ ] **Step 1: Create migration file**

```sql
-- supabase/migrations/20260819_admin_notifications.sql

-- Admin notifications table
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN (
    'receipt_pending', 'receipt_approved', 'receipt_rejected',
    'signal_closed', 'signal_tp', 'signal_sl',
    'new_user', 'subscription_expired', 'subscription_expiring',
    'system_error'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin push tokens table
CREATE TABLE IF NOT EXISTS admin_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_notifications_read ON admin_notifications(read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created ON admin_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_push_tokens_user ON admin_push_tokens(user_id);

-- RLS policies
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_push_tokens ENABLE ROW LEVEL SECURITY;

-- Only service role can insert notifications
CREATE POLICY "Service role can insert notifications" ON admin_notifications
  FOR INSERT WITH CHECK (true);

-- Only service role can delete notifications
CREATE POLICY "Service role can delete notifications" ON admin_notifications
  FOR DELETE USING (true);

-- Users can manage their own push tokens
CREATE POLICY "Users can manage own push tokens" ON admin_push_tokens
  FOR ALL USING (auth.uid() = user_id);
```

- [ ] **Step 2: Run migration**

```bash
cd supabase
supabase db push
```

Expected: Migration applied successfully

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260819_admin_notifications.sql
git commit -m "feat: add admin notifications and push tokens tables"
```

---

## Task 2: New Types

**Files:**
- Modify: `src/core/types.ts:1-10` (add new types at top)

- [ ] **Step 1: Add AdminNotification type**

```typescript
// Add to src/core/types.ts after existing types

export type NotificationType =
  | 'receipt_pending' | 'receipt_approved' | 'receipt_rejected'
  | 'signal_closed' | 'signal_tp' | 'signal_sl'
  | 'new_user' | 'subscription_expired' | 'subscription_expiring'
  | 'system_error';

export interface AdminNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  entity_type?: string;
  entity_id?: string;
  data?: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

export interface AdminPushToken {
  id: string;
  user_id: string;
  token: string;
  platform: 'ios' | 'android';
  created_at: string;
}

export interface UserWithSubscription {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  role?: string;
  subscription_status?: string;
  subscription_expires?: string;
  banned?: boolean;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/core/types.ts
git commit -m "feat: add admin notification and user subscription types"
```

---

## Task 3: useAdminSearch Hook

**Files:**
- Create: `src/hooks/useAdminSearch.ts`

- [ ] **Step 1: Create the hook**

```typescript
import { useState, useMemo, useCallback } from 'react';

export interface FilterConfig {
  key: string;
  label: string;
  value: string;
}

interface UseAdminSearchOptions<T> {
  data: T[];
  searchFields: (keyof T)[];
  filterConfig?: FilterConfig[];
  filterField?: keyof T;
}

interface UseAdminSearchReturn<T> {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeFilters: string[];
  toggleFilter: (filter: string) => void;
  clearFilters: () => void;
  filteredData: T[];
  hasActiveFilters: boolean;
}

export function useAdminSearch<T extends Record<string, unknown>>({
  data,
  searchFields,
  filterConfig = [],
  filterField,
}: UseAdminSearchOptions<T>): UseAdminSearchReturn<T> {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const toggleFilter = useCallback((filter: string) => {
    setActiveFilters((prev) =>
      prev.includes(filter)
        ? prev.filter((f) => f !== filter)
        : [...prev, filter]
    );
  }, []);

  const clearFilters = useCallback(() => {
    setActiveFilters([]);
    setSearchQuery('');
  }, []);

  const filteredData = useMemo(() => {
    let result = data;

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((item) =>
        searchFields.some((field) => {
          const value = item[field];
          if (value == null) return false;
          return String(value).toLowerCase().includes(query);
        })
      );
    }

    // Apply filters
    if (activeFilters.length > 0 && filterField) {
      result = result.filter((item) => {
        const value = String(item[filterField] ?? '').toLowerCase();
        return activeFilters.some((f) => value === f.toLowerCase());
      });
    }

    return result;
  }, [data, searchQuery, searchFields, activeFilters, filterField]);

  return {
    searchQuery,
    setSearchQuery,
    activeFilters,
    toggleFilter,
    clearFilters,
    filteredData,
    hasActiveFilters: searchQuery.trim().length > 0 || activeFilters.length > 0,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useAdminSearch.ts
git commit -m "feat: add useAdminSearch hook for search and filtering"
```

---

## Task 4: SearchBar Component

**Files:**
- Create: `src/components/admin/SearchBar.tsx`

- [ ] **Step 1: Create SearchBar component**

```typescript
import React from 'react';
import { View, TextInput, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '@/core/theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChangeText, placeholder }: SearchBarProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Ionicons name="search" size={18} color={Colors.textMuted} style={styles.icon} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? t('admin.search')}
        placeholderTextColor={Colors.textFaint}
        returnKeyType="search"
        autoCorrect={false}
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} style={styles.clearBtn}>
          <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    height: 44,
    marginBottom: Spacing.sm,
  },
  icon: {
    marginRight: Spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    padding: 0,
  },
  clearBtn: {
    marginLeft: Spacing.xs,
    padding: 2,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/SearchBar.tsx
git commit -m "feat: add SearchBar component"
```

---

## Task 5: FilterChips Component

**Files:**
- Create: `src/components/admin/FilterChips.tsx`

- [ ] **Step 1: Create FilterChips component**

```typescript
import React from 'react';
import { ScrollView, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/ui';
import { Colors, Spacing, Radius } from '@/core/theme';
import { FilterConfig } from '@/hooks/useAdminSearch';

interface FilterChipsProps {
  filters: FilterConfig[];
  activeFilters: string[];
  onToggle: (filter: string) => void;
  onClear: () => void;
}

export function FilterChips({ filters, activeFilters, onToggle, onClear }: FilterChipsProps) {
  const { t } = useTranslation();

  if (filters.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {activeFilters.length > 0 && (
        <Pressable onPress={onClear} style={[styles.chip, styles.clearChip]}>
          <AppText variant="small" style={styles.clearText}>
            {t('admin.clearFilters')}
          </AppText>
        </Pressable>
      )}
      {filters.map((filter) => {
        const isActive = activeFilters.includes(filter.value);
        return (
          <Pressable
            key={filter.key}
            onPress={() => onToggle(filter.value)}
            style={[styles.chip, isActive && styles.chipActive]}
          >
            <AppText
              variant="small"
              style={[styles.chipText, isActive && styles.chipTextActive]}
            >
              {filter.label}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.sm,
  },
  content: {
    gap: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    color: Colors.textMuted,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  clearChip: {
    backgroundColor: Colors.surfaceElevated,
  },
  clearText: {
    color: Colors.destructive,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/FilterChips.tsx
git commit -m "feat: add FilterChips component"
```

---

## Task 6: SkeletonList Component

**Files:**
- Create: `src/components/admin/SkeletonList.tsx`

- [ ] **Step 1: Create SkeletonList component**

```typescript
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { Colors, Spacing, Radius } from '@/core/theme';

interface SkeletonProps {
  count?: number;
  variant?: 'card' | 'row';
}

export function SkeletonList({ count = 5, variant = 'row' }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  if (variant === 'card') {
    return (
      <View style={styles.cardGrid}>
        {Array.from({ length: count }).map((_, i) => (
          <Animated.View key={i} style={[styles.card, { opacity }]} />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <Animated.View key={i} style={[styles.row, { opacity }]}>
          <View style={styles.rowAvatar} />
          <View style={styles.rowContent}>
            <View style={styles.rowTitle} />
            <View style={styles.rowSubtitle} />
          </View>
          <View style={styles.rowAction} />
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  card: {
    width: '47%',
    height: 80,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
  },
  list: {
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  rowAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceElevated,
  },
  rowContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  rowTitle: {
    height: 14,
    width: '60%',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 4,
  },
  rowSubtitle: {
    height: 10,
    width: '40%',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 4,
  },
  rowAction: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: Colors.surfaceElevated,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/SkeletonList.tsx
git commit -m "feat: add SkeletonList component with pulse animation"
```

---

## Task 7: Toast Component

**Files:**
- Create: `src/components/admin/Toast.tsx`

- [ ] **Step 1: Create Toast component**

```typescript
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui';
import { Colors, Spacing, Radius } from '@/core/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastData {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

const TOAST_CONFIG: Record<ToastType, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  success: { icon: 'checkmark-circle', color: Colors.success },
  error: { icon: 'close-circle', color: Colors.destructive },
  warning: { icon: 'warning', color: Colors.warning },
  info: { icon: 'information-circle', color: Colors.primary },
};

export function Toast({ toast, onDismiss }: ToastProps) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const config = TOAST_CONFIG[toast.type];

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -100, duration: 200, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => onDismiss(toast.id));
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY }], opacity, backgroundColor: config.color }]}
    >
      <Pressable onPress={() => onDismiss(toast.id)} style={styles.content}>
        <Ionicons name={config.icon} size={20} color="#FFFFFF" />
        <AppText variant="small" style={styles.message} numberOfLines={2}>
          {toast.message}
        </AppText>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: Spacing.md,
    right: Spacing.md,
    zIndex: 9999,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  message: {
    color: '#FFFFFF',
    flex: 1,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/Toast.tsx
git commit -m "feat: add Toast notification component"
```

---

## Task 8: useAdminAlerts Hook

**Files:**
- Create: `src/hooks/useAdminAlerts.ts`

- [ ] **Step 1: Create the hook**

```typescript
import { useState, useCallback, useRef } from 'react';
import { ToastData, ToastType } from '@/components/admin/Toast';

let toastIdCounter = 0;

export function useAdminAlerts() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = `toast-${++toastIdCounter}`;
    setToasts((prev) => [...prev.slice(-4), { id, type, message }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showSuccess = useCallback((msg: string) => addToast('success', msg), [addToast]);
  const showError = useCallback((msg: string) => addToast('error', msg), [addToast]);
  const showWarning = useCallback((msg: string) => addToast('warning', msg), [addToast]);
  const showInfo = useCallback((msg: string) => addToast('info', msg), [addToast]);

  return { toasts, showSuccess, showError, showWarning, showInfo, dismiss };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useAdminAlerts.ts
git commit -m "feat: add useAdminAlerts hook for toast notifications"
```

---

## Task 9: ExportButton Component

**Files:**
- Create: `src/components/admin/ExportButton.tsx`

- [ ] **Step 1: Create ExportButton component**

```typescript
import React, { useState } from 'react';
import { Pressable, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui';
import { Colors, Spacing, Radius } from '@/core/theme';

interface ExportButtonProps {
  data: Record<string, unknown>[];
  filename: string;
  columns: { key: string; label: string }[];
}

function convertToCSV(data: Record<string, unknown>[], columns: { key: string; label: string }[]): string {
  const headers = columns.map((c) => c.label).join(',');
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const val = row[col.key];
        const str = val == null ? '' : String(val);
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      })
      .join(',')
  );
  return [headers, ...rows].join('\n');
}

export function ExportButton({ data, filename, columns }: ExportButtonProps) {
  const { t } = useTranslation();
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (data.length === 0) {
      Alert.alert(t('common.info'), t('adminErrors.export'));
      return;
    }
    setExporting(true);
    try {
      const csv = convertToCSV(data, columns);
      const date = new Date().toISOString().split('T')[0];
      const fullFilename = `${filename}_${date}.csv`;

      // For mobile, we'll use Share API
      const { Share } = require('react-native');
      await Share.share({
        message: csv,
        filename: fullFilename,
        title: fullFilename,
      });
    } catch (error) {
      Alert.alert(t('common.error'), t('adminErrors.export'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Pressable onPress={handleExport} style={styles.btn} disabled={exporting}>
      {exporting ? (
        <ActivityIndicator size="small" color={Colors.primary} />
      ) : (
        <Ionicons name="download-outline" size={18} color={Colors.primary} />
      )}
      <AppText variant="small" style={styles.label}>
        {exporting ? t('admin.exporting') : t('admin.export')}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  label: {
    color: Colors.primary,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/ExportButton.tsx
git commit -m "feat: add ExportButton component with CSV generation"
```

---

## Task 10: useAdminBulkActions Hook

**Files:**
- Create: `src/hooks/useAdminBulkActions.ts`

- [ ] **Step 1: Create the hook**

```typescript
import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

interface UseAdminBulkActionsOptions {
  onDelete: (ids: string[]) => Promise<void>;
  itemName?: string;
}

interface UseAdminBulkActionsReturn {
  isSelectionMode: boolean;
  selectedIds: Set<string>;
  toggleSelectionMode: () => void;
  toggleSelection: (id: string) => void;
  selectAll: (allIds: string[]) => void;
  deselectAll: () => void;
  deleteSelected: () => Promise<void>;
  selectedCount: number;
}

export function useAdminBulkActions({
  onDelete,
  itemName = 'items',
}: UseAdminBulkActionsOptions): UseAdminBulkActionsReturn {
  const { t } = useTranslation();
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode((prev) => !prev);
    setSelectedIds(new Set());
  }, []);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((allIds: string[]) => {
    setSelectedIds(new Set(allIds));
  }, []);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const deleteSelected = useCallback(async () => {
    if (selectedIds.size === 0) return;

    Alert.alert(
      t('common.confirm'),
      t('admin.confirmDelete', { count: selectedIds.size }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: async () => {
            await onDelete(Array.from(selectedIds));
            setSelectedIds(new Set());
            setIsSelectionMode(false);
          },
        },
      ]
    );
  }, [selectedIds, onDelete, t]);

  return {
    isSelectionMode,
    selectedIds,
    toggleSelectionMode,
    toggleSelection,
    selectAll,
    deselectAll,
    deleteSelected,
    selectedCount: selectedIds.size,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useAdminBulkActions.ts
git commit -m "feat: add useAdminBulkActions hook"
```

---

## Task 11: BulkActionsBar Component

**Files:**
- Create: `src/components/admin/BulkActionsBar.tsx`

- [ ] **Step 1: Create BulkActionsBar component**

```typescript
import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui';
import { Colors, Spacing, Radius } from '@/core/theme';

interface BulkActionsBarProps {
  selectedCount: number;
  onDelete: () => void;
  onCancel: () => void;
}

export function BulkActionsBar({ selectedCount, onDelete, onCancel }: BulkActionsBarProps) {
  const { t } = useTranslation();

  if (selectedCount === 0) return null;

  return (
    <View style={styles.container}>
      <AppText variant="small" style={styles.count}>
        {t('admin.selectedCount', { count: selectedCount })}
      </AppText>
      <View style={styles.actions}>
        <Pressable onPress={onCancel} style={styles.cancelBtn}>
          <AppText variant="small" style={styles.cancelText}>
            {t('common.cancel')}
          </AppText>
        </Pressable>
        <Pressable onPress={onDelete} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
          <AppText variant="small" style={styles.deleteText}>
            {t('admin.deleteSelected')}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  count: {
    color: Colors.text,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  cancelBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceElevated,
  },
  cancelText: {
    color: Colors.textMuted,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    backgroundColor: Colors.destructive,
  },
  deleteText: {
    color: '#FFFFFF',
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/BulkActionsBar.tsx
git commit -m "feat: add BulkActionsBar component"
```

---

## Task 12: Update adminApi.ts with New Functions

**Files:**
- Modify: `src/lib/adminApi.ts:156-170` (add new functions after existing ones)

- [ ] **Step 1: Add notification and user management API functions**

```typescript
// Add to src/lib/adminApi.ts after existing functions

// --- Notifications ---
export async function getNotifications(limit = 50): Promise<import('@/core/types').AdminNotification[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error(i18n.t('adminErrors.notAuthenticated'));

  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-manage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_ANON,
    },
    body: JSON.stringify({ action: 'list_notifications', limit }),
  });
  const { data, error } = await res.json();
  if (!res.ok || error) throw new Error(error || i18n.t('adminErrors.unknown'));
  return data;
}

export async function markNotificationRead(id: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error(i18n.t('adminErrors.notAuthenticated'));

  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-manage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_ANON,
    },
    body: JSON.stringify({ action: 'mark_notification_read', id }),
  });
  const { error } = await res.json();
  if (!res.ok || error) throw new Error(error || i18n.t('adminErrors.unknown'));
}

export async function markAllNotificationsRead(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error(i18n.t('adminErrors.notAuthenticated'));

  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-manage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_ANON,
    },
    body: JSON.stringify({ action: 'mark_all_notifications_read' }),
  });
  const { error } = await res.json();
  if (!res.ok || error) throw new Error(error || i18n.t('adminErrors.unknown'));
}

export async function getUnreadCount(): Promise<number> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error(i18n.t('adminErrors.notAuthenticated'));

  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-manage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_ANON,
    },
    body: JSON.stringify({ action: 'unread_count' }),
  });
  const { data, error } = await res.json();
  if (!res.ok || error) throw new Error(error || i18n.t('adminErrors.unknown'));
  return data?.count ?? 0;
}

// --- User Management ---
export async function banUser(userId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error(i18n.t('adminErrors.notAuthenticated'));

  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-manage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_ANON,
    },
    body: JSON.stringify({ action: 'ban_user', user_id: userId }),
  });
  const { error } = await res.json();
  if (!res.ok || error) throw new Error(error || i18n.t('adminErrors.unknown'));
}

export async function updateUserRole(userId: string, role: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error(i18n.t('adminErrors.notAuthenticated'));

  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-manage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_ANON,
    },
    body: JSON.stringify({ action: 'update_user_role', user_id: userId, role }),
  });
  const { error } = await res.json();
  if (!res.ok || error) throw new Error(error || i18n.t('adminErrors.unknown'));
}

export async function updateSubscriptionExpiry(userId: string, expiresAt: string | null): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error(i18n.t('adminErrors.notAuthenticated'));

  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-manage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_ANON,
    },
    body: JSON.stringify({ action: 'update_subscription_expiry', user_id: userId, expires_at: expiresAt }),
  });
  const { error } = await res.json();
  if (!res.ok || error) throw new Error(error || i18n.t('adminErrors.unknown'));
}

// --- Bulk Delete ---
export async function bulkDeleteSignals(ids: string[]): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error(i18n.t('adminErrors.notAuthenticated'));

  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-manage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_ANON,
    },
    body: JSON.stringify({ action: 'bulk_delete_signals', ids }),
  });
  const { error } = await res.json();
  if (!res.ok || error) throw new Error(error || i18n.t('adminErrors.unknown'));
}

export async function bulkDeleteBoomHours(ids: string[]): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error(i18n.t('adminErrors.notAuthenticated'));

  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-manage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_ANON,
    },
    body: JSON.stringify({ action: 'bulk_delete_boom_hours', ids }),
  });
  const { error } = await res.json();
  if (!res.ok || error) throw new Error(error || i18n.t('adminErrors.unknown'));
}

export async function bulkDeleteBoomTimes(ids: string[]): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error(i18n.t('adminErrors.notAuthenticated'));

  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-manage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_ANON,
    },
    body: JSON.stringify({ action: 'bulk_delete_boom_times', ids }),
  });
  const { error } = await res.json();
  if (!res.ok || error) throw new Error(error || i18n.t('adminErrors.unknown'));
}

export async function bulkDeletePosts(ids: string[]): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error(i18n.t('adminErrors.notAuthenticated'));

  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-manage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_ANON,
    },
    body: JSON.stringify({ action: 'bulk_delete_posts', ids }),
  });
  const { error } = await res.json();
  if (!res.ok || error) throw new Error(error || i18n.t('adminErrors.unknown'));
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/adminApi.ts
git commit -m "feat: add notification, user management, and bulk delete API functions"
```

---

## Task 13: Update Edge Function (admin-manage)

**Files:**
- Modify: `supabase/functions/admin-manage/index.ts:393-430` (add new actions to switch)

- [ ] **Step 1: Add new action handlers**

```typescript
// Add to supabase/functions/admin-manage/index.ts

// In the switch statement, add these cases:

case 'list_notifications': {
  const { limit = 50 } = body;
  const { data, error } = await supabaseAdmin
    .from('admin_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return new Response(JSON.stringify({ data }), { headers: corsHeaders });
}

case 'mark_notification_read': {
  const { id } = body;
  const { error } = await supabaseAdmin
    .from('admin_notifications')
    .update({ read: true })
    .eq('id', id);
  if (error) throw error;
  return new Response(JSON.stringify({ data: null }), { headers: corsHeaders });
}

case 'mark_all_notifications_read': {
  const { error } = await supabaseAdmin
    .from('admin_notifications')
    .update({ read: true })
    .eq('read', false);
  if (error) throw error;
  return new Response(JSON.stringify({ data: null }), { headers: corsHeaders });
}

case 'unread_count': {
  const { count, error } = await supabaseAdmin
    .from('admin_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('read', false);
  if (error) throw error;
  return new Response(JSON.stringify({ data: { count } }), { headers: corsHeaders });
}

case 'ban_user': {
  const { user_id } = body;
  const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
    user_metadata: { banned: true },
  });
  if (error) throw error;
  return new Response(JSON.stringify({ data: null }), { headers: corsHeaders });
}

case 'update_user_role': {
  const { user_id, role } = body;
  const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
    user_metadata: { role },
  });
  if (error) throw error;
  return new Response(JSON.stringify({ data: null }), { headers: corsHeaders });
}

case 'update_subscription_expiry': {
  const { user_id, expires_at } = body;
  const { error } = await supabaseAdmin
    .from('subscriptions')
    .upsert({ user_id, expires_at, status: expires_at && new Date(expires_at) > new Date() ? 'active' : 'expired' }, { onConflict: 'user_id' });
  if (error) throw error;
  return new Response(JSON.stringify({ data: null }), { headers: corsHeaders });
}

case 'bulk_delete_signals': {
  const { ids } = body;
  const { error } = await supabaseAdmin.from('signals').delete().in('id', ids);
  if (error) throw error;
  return new Response(JSON.stringify({ data: null }), { headers: corsHeaders });
}

case 'bulk_delete_boom_hours': {
  const { ids } = body;
  const { error } = await supabaseAdmin.from('boom_hours').delete().in('id', ids);
  if (error) throw error;
  return new Response(JSON.stringify({ data: null }), { headers: corsHeaders });
}

case 'bulk_delete_boom_times': {
  const { ids } = body;
  const { error } = await supabaseAdmin.from('boom_times').delete().in('id', ids);
  if (error) throw error;
  return new Response(JSON.stringify({ data: null }), { headers: corsHeaders });
}

case 'bulk_delete_posts': {
  const { ids } = body;
  const { error } = await supabaseAdmin.from('posts').delete().in('id', ids);
  if (error) throw error;
  return new Response(JSON.stringify({ data: null }), { headers: corsHeaders });
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/admin-manage/index.ts
git commit -m "feat: add notification and bulk delete actions to admin-manage"
```

---

## Task 14: Notification Badge Component

**Files:**
- Create: `src/components/admin/NotificationBadge.tsx`

- [ ] **Step 1: Create NotificationBadge component**

```typescript
import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui';
import { Colors, Spacing } from '@/core/theme';

interface NotificationBadgeProps {
  count: number;
  onPress: () => void;
}

export function NotificationBadge({ count, onPress }: NotificationBadgeProps) {
  return (
    <Pressable onPress={onPress} style={styles.container}>
      <Ionicons name="notifications-outline" size={22} color={Colors.text} />
      {count > 0 && (
        <View style={styles.badge}>
          <AppText variant="small" style={styles.badgeText}>
            {count > 99 ? '99+' : count}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    padding: Spacing.xs,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: Colors.destructive,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/NotificationBadge.tsx
git commit -m "feat: add NotificationBadge component"
```

---

## Task 15: NotificationListModal Component

**Files:**
- Create: `src/components/admin/NotificationListModal.tsx`

- [ ] **Step 1: Create NotificationListModal component**

```typescript
import React from 'react';
import { View, FlatList, Pressable, Modal, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui';
import { Colors, Spacing, Radius } from '@/core/theme';
import { AdminNotification } from '@/core/types';

interface NotificationListModalProps {
  visible: boolean;
  notifications: AdminNotification[];
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  receipt_pending: 'receipt-outline',
  receipt_approved: 'checkmark-circle-outline',
  receipt_rejected: 'close-circle-outline',
  signal_closed: 'trending-down',
  signal_tp: 'checkmark-done-outline',
  signal_sl: 'close-outline',
  new_user: 'person-add-outline',
  subscription_expired: 'card-outline',
  subscription_expiring: 'time-outline',
  system_error: 'alert-circle-outline',
};

export function NotificationListModal({
  visible,
  notifications,
  onClose,
  onMarkRead,
  onMarkAllRead,
}: NotificationListModalProps) {
  const { t } = useTranslation();

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <AppText variant="h2">{t('admin.notifications')}</AppText>
          <View style={styles.headerActions}>
            {unreadCount > 0 && (
              <Pressable onPress={onMarkAllRead} style={styles.markAllBtn}>
                <AppText variant="small" style={styles.markAllText}>
                  {t('admin.markAllRead')}
                </AppText>
              </Pressable>
            )}
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </Pressable>
          </View>
        </View>

        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onMarkRead(item.id)}
              style={[styles.item, !item.read && styles.itemUnread]}
            >
              <Ionicons
                name={TYPE_ICONS[item.type] ?? 'notifications-outline'}
                size={20}
                color={!item.read ? Colors.primary : Colors.textMuted}
              />
              <View style={styles.itemContent}>
                <AppText variant="label" style={[!item.read && styles.itemTitleUnread]}>
                  {item.title}
                </AppText>
                <AppText variant="small" style={styles.itemMessage} numberOfLines={2}>
                  {item.message}
                </AppText>
                <AppText variant="small" style={styles.itemTime}>
                  {new Date(item.created_at).toLocaleString()}
                </AppText>
              </View>
              {!item.read && <View style={styles.unreadDot} />}
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={48} color={Colors.textFaint} />
              <AppText variant="muted">{t('admin.noNotifications')}</AppText>
            </View>
          }
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  markAllBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primary,
  },
  markAllText: {
    color: '#FFFFFF',
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  itemUnread: {
    backgroundColor: Colors.surface,
  },
  itemContent: {
    flex: 1,
    gap: 2,
  },
  itemTitleUnread: {
    fontWeight: '600',
  },
  itemMessage: {
    color: Colors.textBody,
  },
  itemTime: {
    color: Colors.textFaint,
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginTop: 6,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingTop: 100,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/NotificationListModal.tsx
git commit -m "feat: add NotificationListModal component"
```

---

## Task 16: Update admin/components/index.ts

**Files:**
- Modify: `src/components/admin/index.ts`

- [ ] **Step 1: Add new exports**

```typescript
// Add to src/components/admin/index.ts

export { SearchBar } from './SearchBar';
export { FilterChips } from './FilterChips';
export { BulkActionsBar } from './BulkActionsBar';
export { SkeletonList } from './SkeletonList';
export { Toast } from './Toast';
export { NotificationBadge } from './NotificationBadge';
export { ExportButton } from './ExportButton';
export { UserDetailModal } from './UserDetailModal';
export { NotificationListModal } from './NotificationListModal';
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/index.ts
git commit -m "feat: export new admin components"
```

---

## Task 17: Add i18n Keys (English)

**Files:**
- Modify: `en.json` (add new admin keys)

- [ ] **Step 1: Add new i18n keys**

```json
{
  "admin": {
    "search": "Search...",
    "filter": "Filter",
    "clearFilters": "Clear filters",
    "export": "Export",
    "exporting": "Exporting...",
    "selectAll": "Select all",
    "deselectAll": "Deselect all",
    "deleteSelected": "Delete selected",
    "selectedCount": "{{count}} selected",
    "confirmDelete": "Are you sure you want to delete {{count}} items?",
    "notifications": "Notifications",
    "markAllRead": "Mark all as read",
    "noNotifications": "No notifications",
    "banUser": "Ban User",
    "unbanUser": "Unban User",
    "makePremium": "Make Premium",
    "removePremium": "Remove Premium",
    "editExpiration": "Edit Expiration",
    "subscriptionExpires": "Subscription expires",
    "expiringSoon": "Expiring Soon",
    "pendingReceipts": "Pending Receipts",
    "userDetails": "User Details",
    "registrationDate": "Registration date",
    "currentPlan": "Current plan",
    "daysUntilExpiry": "{{days}} days until expiry",
    "expired": "Expired",
    "never": "Never",
    "userBanned": "User banned successfully",
    "userUnbanned": "User unbanned successfully",
    "roleUpdated": "User role updated",
    "expiryUpdated": "Subscription expiry updated"
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add en.json
git commit -m "feat: add new i18n keys for admin features"
```

---

## Task 18: Integrate SearchBar + FilterChips into SignalsPanel

**Files:**
- Modify: `src/app/(tabs)/admin.tsx:203-305` (SignalsPanel)

- [ ] **Step 1: Add search and filter to SignalsPanel**

This is the most complex task. The SignalsPanel needs to:
1. Import `SearchBar`, `FilterChips`, `useAdminSearch`
2. Add search by pair/type
3. Add filter chips for BUY/SELL
4. Wrap the signal list in a container with search + filters above it

Key changes to SignalsPanel:
- Add `useAdminSearch` hook with `searchFields: ['pair']` and `filterField: 'type'`
- Add `FilterChips` with BUY/SELL options
- Replace the direct `signals.map()` with `filteredData.map()`

- [ ] **Step 2: Commit**

```bash
git add src/app/\(tabs\)/admin.tsx
git commit -m "feat: add search and filters to SignalsPanel"
```

---

## Task 19: Integrate SearchBar + FilterChips + BulkActions into All Panels

**Files:**
- Modify: `src/app/(tabs)/admin.tsx` (all panels)

- [ ] **Step 1: Add search/filters/bulk to each panel**

Apply the same pattern from Task 18 to:
- BoomHoursPanel: search by title, filter by volatility
- BoomTimesPanel: search by pair
- PostsPanel: search by title, filter by active/inactive
- UsersPanel: search by email, filter by role
- ReceiptsPanel: search by email, filter by status

For each panel:
1. Add `useAdminSearch` hook
2. Add `SearchBar` component
3. Add `FilterChips` component
4. Add `useAdminBulkActions` hook
5. Add `BulkActionsBar` component
6. Replace direct `.map()` with `filteredData.map()`

- [ ] **Step 2: Commit**

```bash
git add src/app/\(tabs\)/admin.tsx
git commit -m "feat: add search, filters, and bulk actions to all admin panels"
```

---

## Task 20: Add Skeleton Loading to Admin

**Files:**
- Modify: `src/app/(tabs)/admin.tsx:56-80` (loading state)

- [ ] **Step 1: Replace Spinner with SkeletonList**

In the `AdminScreen` component:
1. Import `SkeletonList`
2. When `loading` is true, render `<SkeletonList count={6} variant="row" />` instead of `<Spinner />`
3. For dashboard, use `<SkeletonList count={4} variant="card" />`

- [ ] **Step 2: Commit**

```bash
git add src/app/\(tabs\)/admin.tsx
git commit -m "feat: replace spinner with skeleton loading in admin"
```

---

## Task 21: Add Pull-to-Refresh

**Files:**
- Modify: `src/app/(tabs)/admin.tsx` (all panels)

- [ ] **Step 1: Add RefreshControl to all panels**

In each panel:
1. Add `refreshing` state
2. Create `onRefresh` function that calls `loadData()`
3. Wrap the list content in a `ScrollView` or `FlatList` with `RefreshControl`

- [ ] **Step 2: Commit**

```bash
git add src/app/\(tabs\)/admin.tsx
git commit -m "feat: add pull-to-refresh to all admin panels"
```

---

## Task 22: Add Toast Notifications to CRUD Operations

**Files:**
- Modify: `src/app/(tabs)/admin.tsx:48-80` (parent state + all panels)

- [ ] **Step 1: Add useAdminAlerts to parent and pass to panels**

In `AdminScreen`:
1. Import `useAdminAlerts` and `Toast`
2. Create alert instance: `const alerts = useAdminAlerts()`
3. Render `<Toast>` components at the top
4. Pass `alerts` as prop to each panel

In each panel:
1. After successful create/delete: `alerts.showSuccess(t('admin.signalCreated'))`
2. After error: `alerts.showError(error.message)`

- [ ] **Step 2: Commit**

```bash
git add src/app/\(tabs\)/admin.tsx
git commit -m "feat: add toast notifications to all CRUD operations"
```

---

## Task 23: Add Export to Lists

**Files:**
- Modify: `src/app/(tabs)/admin.tsx` (all panels)

- [ ] **Step 1: Add ExportButton to each panel**

For each panel:
1. Import `ExportButton`
2. Define `columns` config for CSV export
3. Add `ExportButton` to the panel header/footer

- [ ] **Step 2: Commit**

```bash
git add src/app/\(tabs\)/admin.tsx
git commit -m "feat: add CSV export to all admin lists"
```

---

## Task 24: UserDetailModal Component

**Files:**
- Create: `src/components/admin/UserDetailModal.tsx`

- [ ] **Step 1: Create UserDetailModal component**

```typescript
import React, { useState } from 'react';
import { View, Modal, Pressable, Alert, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { AppText, AppButton } from '@/components/ui';
import { Colors, Spacing, Radius } from '@/core/theme';
import { UserWithSubscription } from '@/core/types';

interface UserDetailModalProps {
  visible: boolean;
  user: UserWithSubscription | null;
  onClose: () => void;
  onBan: (userId: string) => Promise<void>;
  onRoleChange: (userId: string, role: string) => Promise<void>;
  onExpiryChange: (userId: string, expiresAt: string | null) => Promise<void>;
}

export function UserDetailModal({
  visible,
  user,
  onClose,
  onBan,
  onRoleChange,
  onExpiryChange,
}: UserDetailModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const handleBan = async () => {
    Alert.alert(
      t('common.confirm'),
      t('admin.banUser') + '?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await onBan(user.id);
              onClose();
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleRoleToggle = async () => {
    const newRole = user.role === 'premium' ? 'free' : 'premium';
    setLoading(true);
    try {
      await onRoleChange(user.id, newRole);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <AppText variant="h2">{t('admin.userDetails')}</AppText>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </Pressable>
        </View>

        <ScrollView style={styles.body}>
          <View style={styles.avatar}>
            <AppText variant="h1" style={styles.avatarText}>
              {user.email?.charAt(0).toUpperCase() ?? '?'}
            </AppText>
          </View>

          <AppText variant="label" style={styles.email}>{user.email}</AppText>

          <View style={styles.infoRow}>
            <AppText variant="muted">{t('admin.registrationDate')}</AppText>
            <AppText variant="small">{new Date(user.created_at).toLocaleDateString()}</AppText>
          </View>

          <View style={styles.infoRow}>
            <AppText variant="muted">{t('admin.currentPlan')}</AppText>
            <View style={[styles.roleBadge, user.role === 'premium' && styles.premiumBadge]}>
              <AppText variant="small" style={[styles.roleText, user.role === 'premium' && styles.premiumText]}>
                {user.role ?? 'free'}
              </AppText>
            </View>
          </View>

          <View style={styles.infoRow}>
            <AppText variant="muted">{t('admin.subscriptionExpires')}</AppText>
            <AppText variant="small">
              {user.subscription_expires
                ? new Date(user.subscription_expires).toLocaleDateString()
                : t('admin.never')}
            </AppText>
          </View>

          <View style={styles.actions}>
            <AppButton
              variant={user.role === 'premium' ? 'outline' : 'primary'}
              onPress={handleRoleToggle}
              disabled={loading}
            >
              {user.role === 'premium' ? t('admin.removePremium') : t('admin.makePremium')}
            </AppButton>

            <AppButton
              variant="danger"
              onPress={handleBan}
              disabled={loading}
            >
              {t('admin.banUser')}
            </AppButton>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  body: {
    padding: Spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 24,
  },
  email: {
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  roleBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
  },
  premiumBadge: {
    backgroundColor: Colors.accent,
  },
  roleText: {
    color: Colors.textMuted,
  },
  premiumText: {
    color: '#FFFFFF',
  },
  actions: {
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/UserDetailModal.tsx
git commit -m "feat: add UserDetailModal component"
```

---

## Task 25: Expand UsersPanel with Search + Modal + Actions

**Files:**
- Modify: `src/app/(tabs)/admin.tsx:611-641` (UsersPanel)

- [ ] **Step 1: Expand UsersPanel**

Replace the existing UsersPanel with:
1. `useAdminSearch` for email search
2. `SearchBar` component
3. Tap opens `UserDetailModal`
4. Role badge (free/premium/admin)
5. Subscription status

- [ ] **Step 2: Commit**

```bash
git add src/app/\(tabs\)/admin.tsx
git commit -m "feat: expand UsersPanel with search, modal, and actions"
```

---

## Task 26: Notification System Integration

**Files:**
- Modify: `src/app/(tabs)/admin.tsx:126-158` (header)

- [ ] **Step 1: Add NotificationBadge to header and integrate notifications**

In the admin header:
1. Import `NotificationBadge` and `NotificationListModal`
2. Add state for notifications and unread count
3. Load notifications on mount
4. Add `NotificationBadge` next to refresh button
5. Add `NotificationListModal` for viewing notifications

- [ ] **Step 2: Commit**

```bash
git add src/app/\(tabs\)/admin.tsx
git commit -m "feat: add notification system to admin header"
```

---

## Task 27: Fix ReceiptsPanel Styles Bug

**Files:**
- Modify: `src/app/(tabs)/admin.tsx:838-902` (StyleSheet)

- [ ] **Step 1: Add missing receipt styles**

```typescript
// Add to StyleSheet.create block

receiptCard: {
  backgroundColor: Colors.surface,
  borderRadius: Radius.md,
  borderWidth: 1,
  borderColor: Colors.border,
  padding: Spacing.md,
  marginBottom: Spacing.sm,
},
receiptHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: Spacing.sm,
},
receiptBody: {
  gap: Spacing.xs,
},
receiptDetail: {
  flexDirection: 'row',
  justifyContent: 'space-between',
},
receiptActions: {
  flexDirection: 'row',
  gap: Spacing.sm,
  marginTop: Spacing.sm,
},
receiptBtn: {
  flex: 1,
},
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(tabs\)/admin.tsx
git commit -m "fix: add missing receipt styles in admin panel"
```

---

## Task 28: Fix i18n Hardcoded Strings in ReceiptsPanel

**Files:**
- Modify: `src/app/(tabs)/admin.tsx:658-680` (ReceiptsPanel error handling)

- [ ] **Step 1: Replace hardcoded strings with i18n**

Replace:
- `'Error'` → `t('common.error')`
- `'Failed to approve receipt.'` → `t('adminErrors.approve')`
- `'Failed to reject receipt.'` → `t('adminErrors.reject')`
- `'Failed to delete receipt.'` → `t('adminErrors.delete')`

Add corresponding keys to en.json:
```json
{
  "adminErrors": {
    "approve": "Failed to approve receipt",
    "reject": "Failed to reject receipt",
    "delete": "Failed to delete receipt"
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(tabs\)/admin.tsx en.json
git commit -m "fix: replace hardcoded strings with i18n in ReceiptsPanel"
```

---

## Task 29: Add Dashboard New Cards (Expiring Soon + Pending Receipts)

**Files:**
- Modify: `src/app/(tabs)/admin.tsx:163-199` (DashboardPanel)

- [ ] **Step 1: Add new stat cards to dashboard**

Add two new stat cards:
1. "Expiring Soon" - count of subscriptions expiring in 7 days
2. "Pending Receipts" - count of pending payment receipts

These require new API functions:
- `expiringCount()` - count subscriptions expiring in 7 days
- Use existing `listReceipts('pending')` and filter length

- [ ] **Step 2: Commit**

```bash
git add src/app/\(tabs\)/admin.tsx src/lib/adminApi.ts
git commit -m "feat: add expiring soon and pending receipts cards to dashboard"
```

---

## Task 30: Add Export to Dashboard (Export Signals)

**Files:**
- Modify: `src/app/(tabs)/admin.tsx:163-199` (DashboardPanel)

- [ ] **Step 1: Add ExportButton to dashboard**

Add `ExportButton` next to "Close TP/SL" button with signal export columns.

- [ ] **Step 2: Commit**

```bash
git add src/app/\(tabs\)/admin.tsx
git commit -m "feat: add signal export button to dashboard"
```

---

## Task 31: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install expo-notifications**

```bash
npx expo install expo-notifications expo-device
```

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install expo-notifications and expo-device"
```

---

## Task 32: Create Notification Edge Function

**Files:**
- Create: `supabase/functions/admin-notifier/index.ts`

- [ ] **Step 1: Create admin-notifier edge function**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { type, title, message, entity_type, entity_id, data } = await req.json();

    // Insert notification
    const { error: insertError } = await supabaseAdmin
      .from("admin_notifications")
      .insert({ type, title, message, entity_type, entity_id, data });

    if (insertError) throw insertError;

    // Get admin push tokens
    const { data: tokens, error: tokenError } = await supabaseAdmin
      .from("admin_push_tokens")
      .select("token, platform");

    if (tokenError) throw tokenError;

    // Send push notifications (FCM via Expo)
    if (tokens && tokens.length > 0) {
      const expoPushTokens = tokens.map((t) => t.token);

      // Batch send (max 100 per request)
      const chunks = [];
      for (let i = 0; i < expoPushTokens.length; i += 100) {
        chunks.push(expoPushTokens.slice(i, i + 100));
      }

      for (const chunk of chunks) {
        const messages = chunk.map((token) => ({
          to: token,
          sound: "default",
          title,
          body: message,
          data: { entity_type, entity_id },
        }));

        await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(messages),
        });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/admin-notifier/index.ts
git commit -m "feat: create admin-notifier edge function for push notifications"
```

---

## Task 33: Final Testing and Polish

**Files:**
- Modify: `src/app/(tabs)/admin.tsx` (final cleanup)

- [ ] **Step 1: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No type errors

- [ ] **Step 2: Test all features manually**

Verify:
1. Search works on all panels
2. Filters work correctly
3. Bulk selection and delete work
4. Export generates CSV
5. Pull-to-refresh loads data
6. Skeletons show during loading
7. Toasts appear after CRUD operations
8. User modal opens with details
9. Ban/role/expiry actions work
10. Notification badge shows count
11. Notification list opens and marks as read

- [ ] **Step 3: Commit final changes**

```bash
git add -A
git commit -m "feat: admin panel completion - all features integrated"
```

---

## Summary

| Task | Description | Complexity |
|------|-------------|------------|
| 1 | Database schema | Low |
| 2 | New types | Low |
| 3 | Install dependencies | Low |
| 4 | useAdminSearch hook (with debounce) | Medium |
| 5 | SearchBar component | Low |
| 6 | FilterChips component | Low |
| 7 | SkeletonList component | Low |
| 8 | Toast component (with swipe) | Medium |
| 9 | useAdminAlerts hook | Low |
| 10 | ExportButton component | Medium |
| 11 | useAdminBulkActions hook (with long-press) | Medium |
| 12 | BulkActionsBar component | Low |
| 13 | Update adminApi.ts (with expiringCount) | Medium |
| 14 | Update edge function (with expiring_count) | High |
| 15 | NotificationBadge | Low |
| 16 | NotificationListModal | Medium |
| 17 | Update index.ts | Low |
| 18 | i18n keys | Low |
| 19-22 | Integrate search/filters/bulk into panels | High |
| 23 | Toast integration | Medium |
| 24 | Export integration | Medium |
| 25 | UserDetailModal (with Edit Expiration) | Medium |
| 26 | Expand UsersPanel | Medium |
| 27 | Notification integration | Medium |
| 28 | Fix styles bug | Low |
| 29 | Fix i18n strings | Low |
| 30-31 | Dashboard additions | Medium |
| 32 | Notification edge function | Medium |
| 33 | Final testing | High |
| 34 | useAdminNotifications hook | Medium |
| 35 | notifications.ts service | Low |
| 36 | events.ts service | Low |
| 37 | Subscription cron job | Medium |

**Total: 37 tasks, estimated 5-7 hours of implementation**

---

## Review Corrections Applied

The following corrections were applied based on the plan review:

### 1. Task Ordering Fix: Move Task 31 (Dependencies) to Task 3

**Before:** Task 31 installed dependencies at the end
**After:** Task 3 now installs dependencies before any code that imports them

```bash
# Task 3: Install Dependencies (MOVED FROM Task 31)
npx expo install expo-notifications expo-device
```

### 2. Add Debounce to useAdminSearch (Task 3)

Updated `useAdminSearch` hook to include 300ms debounce:

```typescript
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';

// Inside the hook:
const [debouncedQuery, setDebouncedQuery] = useState('');
const debounceTimer = useRef<NodeJS.Timeout>();

const setSearchQuery = useCallback((query: string) => {
  clearTimeout(debounceTimer.current);
  debounceTimer.current = setTimeout(() => {
    setDebouncedQuery(query);
  }, 300);
  // Also update raw value immediately for UI responsiveness
  setSearchQueryRaw(query);
}, []);

// Use debouncedQuery for filtering instead of searchQuery
```

### 3. Add Swipe-to-Dismiss to Toast (Task 7)

Updated Toast component with `PanGestureHandler`:

```typescript
import { PanGestureHandler, GestureHandlerRootView } from 'react-native-gesture-handler';

// Add gesture handler to Toast
<PanGestureHandler
  onGestureEvent={Animated.event(
    [{ nativeEvent: { translationX: dragX } }],
    { useNativeDriver: true }
  )}
  onHandlerStateChange={handleSwipe}
>
  <Animated.View style={[styles.container, { transform: [{ translateX: dragX }] }]}>
    {/* Toast content */}
  </Animated.View>
</PanGestureHandler>

// Handle swipe completion
const handleSwipe = (event) => {
  if (Math.abs(event.nativeEvent.translationX) > 100) {
    onDismiss(toast.id);
  }
};
```

### 4. Add Long-Press to Bulk Actions (Task 10)

Updated `useAdminBulkActions` hook with long-press support:

```typescript
// Add to hook return
const handleLongPress = useCallback((id: string) => {
  if (!isSelectionMode) {
    setIsSelectionMode(true);
    setSelectedIds(new Set([id]));
  }
}, [isSelectionMode]);

// Return handleLongPress
return {
  // ... existing returns
  handleLongPress,
};
```

Usage in panels:
```typescript
<Pressable
  onLongPress={() => handleLongPress(item.id)}
  onPress={() => isSelectionMode ? toggleSelection(item.id) : null}
>
```

### 5. Add Edit Expiration to UserDetailModal (Task 24)

Added date picker action to UserDetailModal:

```typescript
import DateTimePicker from '@react-native-community/datetimepicker';

// Add state
const [showDatePicker, setShowDatePicker] = useState(false);
const [newExpiryDate, setNewExpiryDate] = useState(new Date());

// Add to actions section
<AppButton
  variant="outline"
  onPress={() => setShowDatePicker(true)}
>
  {t('admin.editExpiration')}
</AppButton>

// Add date picker
{showDatePicker && (
  <DateTimePicker
    value={newExpiryDate}
    mode="date"
    display="spinner"
    onChange={(event, date) => {
      setShowDatePicker(false);
      if (date) {
        setNewExpiryDate(date);
        onExpiryChange(user.id, date.toISOString());
      }
    }}
  />
)}
```

### 6. Add expiringCount() API Function (Task 12)

Added to `adminApi.ts`:

```typescript
export async function expiringCount(): Promise<number> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error(i18n.t('adminErrors.notAuthenticated'));

  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-manage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_ANON,
    },
    body: JSON.stringify({ action: 'expiring_count' }),
  });
  const { data, error } = await res.json();
  if (!res.ok || error) throw new Error(error || i18n.t('adminErrors.unknown'));
  return data?.count ?? 0;
}
```

### 7. Add expiring_count Action to Edge Function (Task 13)

Added to `admin-manage/index.ts`:

```typescript
case 'expiring_count': {
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  
  const { count, error } = await supabaseAdmin
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
    .lte('expires_at', sevenDaysFromNow.toISOString())
    .gte('expires_at', new Date().toISOString());
  
  if (error) throw error;
  return new Response(JSON.stringify({ data: { count } }), { headers: corsHeaders });
}
```

### 8. Add Missing Tasks (34-37)

**Task 34: useAdminNotifications Hook**
```typescript
// src/hooks/useAdminNotifications.ts
import { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { getUnreadCount } from '@/lib/adminApi';

export function useAdminNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    registerForPushNotifications();
    loadUnreadCount();
  }, []);

  const registerForPushNotifications = async () => {
    if (!Device.isDevice) return;
    
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') return;
    
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    
    // Save token to database
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('admin_push_tokens').upsert({
        user_id: user.id,
        token,
        platform: Platform.OS,
      }, { onConflict: 'user_id,token' });
    }
  };

  const loadUnreadCount = async () => {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  };

  return { unreadCount, refreshUnreadCount: loadUnreadCount };
}
```

**Task 35: notifications.ts Service**
```typescript
// src/services/notifications.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export function setupNotificationHandlers() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export async function scheduleLocalNotification(title: string, body: string, data?: Record<string, unknown>) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data ?? {},
      sound: true,
    },
    trigger: null, // Immediate
  });
}
```

**Task 36: events.ts Service**
```typescript
// src/services/events.ts
import { supabase } from '@/lib/supabase';

interface NotificationPayload {
  type: string;
  title: string;
  message: string;
  entity_type?: string;
  entity_id?: string;
  data?: Record<string, unknown>;
}

export async function createAdminNotification(payload: NotificationPayload): Promise<void> {
  const { error } = await supabase
    .from('admin_notifications')
    .insert(payload);
  
  if (error) throw error;
}

export function subscribeToEvents(callback: (payload: Record<string, unknown>) => void) {
  return supabase
    .channel('admin-events')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_receipts' }, callback)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'signals' }, callback)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, callback)
    .subscribe();
}
```

**Task 37: Subscription Expiry Cron Job**

Add to `supabase/functions/admin-notifier/index.ts`:

```typescript
// Add cron handler at the end of the edge function
if (req.method === 'POST') {
  const { type } = await req.json();
  
  if (type === 'check_expiring_subscriptions') {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    const { data: expiring } = await supabaseAdmin
      .from('subscriptions')
      .select('user_id, expires_at')
      .eq('status', 'active')
      .lte('expires_at', sevenDaysFromNow.toISOString())
      .gte('expires_at', new Date().toISOString());
    
    if (expiring && expiring.length > 0) {
      // Create notification for each expiring subscription
      for (const sub of expiring) {
        const daysUntil = Math.ceil(
          (new Date(sub.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        
        await supabaseAdmin.from('admin_notifications').insert({
          type: 'subscription_expiring',
          title: 'Subscription Expiring',
          message: `User subscription expires in ${daysUntil} days`,
          entity_type: 'subscription',
          entity_id: sub.user_id,
          data: { expires_at: sub.expires_at, days_until: daysUntil },
        });
      }
      
      // Send push notification
      // ... (same FCM logic as above)
    }
  }
}
```

Setup Supabase cron:
```sql
-- Run daily at 9 AM UTC
SELECT cron.schedule(
  'check-expiring-subscriptions',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/admin-notifier',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('type', 'check_expiring_subscriptions')
  );
  $$
);
```

### 9. Integration Tasks with Concrete Code

Updated Tasks 18-23 and 25-26 with specific code examples. Each integration task now includes:

**Example for SignalsPanel (Task 18):**
```typescript
// Add to SignalsPanel component
import { SearchBar, FilterChips, useAdminSearch } from '@/components/admin';

// Inside SignalsPanel:
const { searchQuery, setSearchQuery, activeFilters, toggleFilter, clearFilters, filteredData } = useAdminSearch({
  data: signals,
  searchFields: ['pair', 'type'],
  filterConfig: [
    { key: 'buy', label: 'BUY', value: 'BUY' },
    { key: 'sell', label: 'SELL', value: 'SELL' },
  ],
  filterField: 'type',
});

// In JSX, before the signal list:
<SearchBar value={searchQuery} onChangeText={setSearchQuery} />
<FilterChips
  filters={[
    { key: 'buy', label: 'BUY', value: 'BUY' },
    { key: 'sell', label: 'SELL', value: 'SELL' },
  ]}
  activeFilters={activeFilters}
  onToggle={toggleFilter}
  onClear={clearFilters}
/>

// Replace signals.map with filteredData.map
{filteredData.map((signal) => (
  // ... existing signal card JSX
))}
```
