'use client';

import { createContext, useContext, ReactNode } from 'react';
import { ValidTimezone } from '@/lib/timezones';
import { useFilterStore } from '@/stores/filterStore';

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
  const filterInternal = useFilterStore((s) => s.filterInternal);
  const setFilterInternal = useFilterStore((s) => s.setFilterInternal);
  const filterFree = useFilterStore((s) => s.filterFree);
  const setFilterFree = useFilterStore((s) => s.setFilterFree);
  const timezone = useFilterStore((s) => s.timezone);
  const setTimezone = useFilterStore((s) => s.setTimezone);

  return (
    <FilterContext.Provider
      value={{
        filterInternal,
        setFilterInternal,
        filterFree,
        setFilterFree,
        timezone,
        setTimezone,
      }}
    >
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
