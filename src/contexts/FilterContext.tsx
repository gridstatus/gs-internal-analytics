'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface FilterContextType {
  filterGridstatus: boolean;
  setFilterGridstatus: (value: boolean) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filterGridstatus, setFilterGridstatus] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('filterGridstatus');
      return saved === 'true';
    }
    return true; // Default to filtering
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('filterGridstatus', String(filterGridstatus));
    }
  }, [filterGridstatus]);

  return (
    <FilterContext.Provider value={{ filterGridstatus, setFilterGridstatus }}>
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

