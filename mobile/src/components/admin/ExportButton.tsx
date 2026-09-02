import React, { useState } from 'react';
import { Pressable, Alert, StyleSheet, ActivityIndicator, Share } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui';
import { Spacing, Radius, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';

interface ExportButtonProps {
  data: Record<string, unknown>[];
  filename: string;
  columns: { key: string; label: string }[];
  label?: string;
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

export function ExportButton({ data, filename, columns, label }: ExportButtonProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (data.length === 0) {
      Alert.alert(t('common.ok'), t('adminErrors.export'));
      return;
    }
    setExporting(true);
    try {
      const csv = convertToCSV(data, columns);
      const date = new Date().toISOString().split('T')[0];
      const fullFilename = `${filename}_${date}.csv`;
      await Share.share({ message: csv, title: fullFilename });
    } catch (error) {
      Alert.alert(t('admin.errorTitle'), t('adminErrors.export'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Pressable onPress={handleExport} style={styles.btn} disabled={exporting}>
      {exporting ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Ionicons name="download-outline" size={18} color={colors.primary} />
      )}
      <AppText variant="small" style={styles.label}>
        {exporting ? t('admin.exporting') : (label ?? t('admin.exportSignals'))}
      </AppText>
    </Pressable>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    btn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs,
      borderRadius: Radius.sm,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    label: { color: c.primary },
  });
