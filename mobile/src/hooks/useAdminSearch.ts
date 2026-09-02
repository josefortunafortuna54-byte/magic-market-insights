import { useState, useMemo, useCallback, useRef, useEffect } from 'react';

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
  const [rawQuery, setRawQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedQuery(rawQuery);
    }, 300);
    return () => clearTimeout(debounceTimer.current);
  }, [rawQuery]);

  const setSearchQuery = useCallback((query: string) => {
    setRawQuery(query);
  }, []);

  const toggleFilter = useCallback((filter: string) => {
    setActiveFilters((prev) =>
      prev.includes(filter)
        ? prev.filter((f) => f !== filter)
        : [...prev, filter]
    );
  }, []);

  const clearFilters = useCallback(() => {
    setActiveFilters([]);
    setRawQuery('');
    setDebouncedQuery('');
  }, []);

  const filteredData = useMemo(() => {
    let result = data;

    if (debouncedQuery.trim()) {
      const query = debouncedQuery.toLowerCase().trim();
      result = result.filter((item) =>
        searchFields.some((field) => {
          const value = item[field];
          if (value == null) return false;
          return String(value).toLowerCase().includes(query);
        })
      );
    }

    if (activeFilters.length > 0 && filterField) {
      result = result.filter((item) => {
        const value = String(item[filterField] ?? '').toLowerCase();
        return activeFilters.some((f) => value === f.toLowerCase());
      });
    }

    return result;
  }, [data, debouncedQuery, searchFields, activeFilters, filterField]);

  return {
    searchQuery: rawQuery,
    setSearchQuery,
    activeFilters,
    toggleFilter,
    clearFilters,
    filteredData,
    hasActiveFilters: rawQuery.trim().length > 0 || activeFilters.length > 0,
  };
}
