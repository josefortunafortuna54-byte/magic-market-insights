import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui';
import { Spacing, Radius, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';

interface BulkActionsBarProps {
  selectedCount: number;
  onDelete: () => void;
  onCancel: () => void;
}

export function BulkActionsBar({ selectedCount, onDelete, onCancel }: BulkActionsBarProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  if (selectedCount === 0) return null;

  return (
    <View style={styles.container}>
      <AppText variant="small" style={styles.count}>
        {t('admin.selectedCount', { count: selectedCount })}
      </AppText>
      <View style={styles.actions}>
        <Pressable onPress={onCancel} style={styles.cancelBtn}>
          <AppText variant="small" style={styles.cancelText}>{t('common.cancel')}</AppText>
        </Pressable>
        <Pressable onPress={onDelete} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
          <AppText variant="small" style={styles.deleteText}>{t('admin.deleteSelected')}</AppText>
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border,
      paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    },
    count: { color: c.text, fontWeight: '600' },
    actions: { flexDirection: 'row', gap: Spacing.sm },
    cancelBtn: {
      paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs,
      borderRadius: Radius.sm, backgroundColor: c.surfaceElevated,
    },
    cancelText: { color: c.textMuted },
    deleteBtn: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
      paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs,
      borderRadius: Radius.sm, backgroundColor: c.destructive,
    },
    deleteText: { color: '#FFFFFF' },
  });
