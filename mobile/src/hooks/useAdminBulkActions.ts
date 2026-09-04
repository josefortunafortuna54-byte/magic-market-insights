import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

interface UseAdminBulkActionsOptions {
  onDelete: (ids: string[]) => Promise<void>;
}

interface UseAdminBulkActionsReturn {
  isSelectionMode: boolean;
  selectedIds: Set<string>;
  toggleSelectionMode: () => void;
  toggleSelection: (id: string) => void;
  handleLongPress: (id: string) => void;
  selectAll: (allIds: string[]) => void;
  deselectAll: () => void;
  deleteSelected: () => Promise<void>;
  selectedCount: number;
}

export function useAdminBulkActions({
  onDelete,
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
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleLongPress = useCallback((id: string) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedIds(new Set([id]));
    }
  }, [isSelectionMode]);

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
    handleLongPress,
    selectAll,
    deselectAll,
    deleteSelected,
    selectedCount: selectedIds.size,
  };
}
