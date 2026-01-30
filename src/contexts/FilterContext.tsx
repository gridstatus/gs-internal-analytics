'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ValidTimezone, sanitizeTimezone } from '@/lib/timezones';

interface FilterContextType {
  filterInternal: boolean;
  setFilterInternal: (value: boolean) => void;
  filterFree: boolean;
  setFilterFree: (value: boolean) => void;
  timezone: ValidTimezone;
  setTimezone: (value: ValidTimezone) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filterInternal, setFilterInternal] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('filterInternal');
      if (saved !== null) return saved === 'true';
      const legacy = localStorage.getItem('filterGridstatus');
      if (legacy !== null) return legacy === 'true';
    }
    return true; // Default to filtering
  });

  const [filterFree, setFilterFree] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('filterFree');
      return saved !== null ? saved === 'true' : true;
    }
    return true; // Default to filtering
  });

  const [timezone, setTimezone] = useState<ValidTimezone>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('timezone');
      return sanitizeTimezone(saved);
    }
    return 'UTC';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('filterInternal', String(filterInternal));
    }
  }, [filterInternal]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('filterFree', String(filterFree));
    }
  }, [filterFree]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('timezone', timezone);
    }
  }, [timezone]);

  return (
    <FilterContext.Provider value={{ filterInternal, setFilterInternal, filterFree, setFilterFree, timezone, setTimezone }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilter() {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilter must be used within a FilterProvider');
  }
  return context;
}
