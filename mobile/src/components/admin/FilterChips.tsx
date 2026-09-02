import React from 'react';
import { ScrollView, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/ui';
import { Spacing, Radius, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import { FilterConfig } from '@/hooks/useAdminSearch';

interface FilterChipsProps {
  filters: FilterConfig[];
  activeFilters: string[];
  onToggle: (filter: string) => void;
  onClear: () => void;
}

export function FilterChips({ filters, activeFilters, onToggle, onClear }: FilterChipsProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

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

const makeStyles = (c: Palette) =>
  StyleSheet.create({
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
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    chipActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    chipText: {
      color: c.textMuted,
    },
    chipTextActive: {
      color: '#FFFFFF',
    },
    clearChip: {
      backgroundColor: c.surfaceElevated,
    },
    clearText: {
      color: c.destructive,
    },
  });
