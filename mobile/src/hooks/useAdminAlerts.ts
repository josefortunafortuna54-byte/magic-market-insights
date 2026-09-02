import { useState, useCallback } from 'react';
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
