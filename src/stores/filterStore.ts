'use client';

import { create } from 'zustand';
import { persist, type StorageValue } from 'zustand/middleware';
import { DEFAULT_TIMEZONE, ValidTimezone, sanitizeTimezone } from '@/lib/timezones';

interface FilterState {
  filterInternal: boolean;
  setFilterInternal: (value: boolean) => void;
  filterFree: boolean;
  setFilterFree: (value: boolean) => void;
  timezone: ValidTimezone;
  setTimezone: (value: ValidTimezone) => void;
}

type PersistedState = Pick<FilterState, 'filterInternal' | 'filterFree' | 'timezone'>;

const FILTER_SESSION_KEY = 'filter-store-session';
const TIMEZONE_LOCAL_KEY = 'timezone-store';

const customStorage = {
  getItem: (name: string): StorageValue<PersistedState> | null => {
    if (typeof window === 'undefined') return null;
    try {
      const filterRaw = sessionStorage.getItem(FILTER_SESSION_KEY);
      const tzRaw = localStorage.getItem(TIMEZONE_LOCAL_KEY);
      const filters = filterRaw ? JSON.parse(filterRaw) : null;
      const tz = tzRaw ? JSON.parse(tzRaw) : null;
      if (!filters && !tz) return null;
      return {
        state: {
          filterInternal: filters?.state?.filterInternal ?? true,
          filterFree: filters?.state?.filterFree ?? false,
          timezone: sanitizeTimezone(tz?.state?.timezone ?? null),
        },
        version: 0,
      };
    } catch {
      return null;
    }
  },
  setItem: (_name: string, value: StorageValue<PersistedState>): void => {
    if (typeof window === 'undefined') return;
    const { filterInternal, filterFree, timezone } = value.state;
    sessionStorage.setItem(
      FILTER_SESSION_KEY,
      JSON.stringify({ state: { filterInternal, filterFree }, version: 0 })
    );
    localStorage.setItem(
      TIMEZONE_LOCAL_KEY,
      JSON.stringify({ state: { timezone }, version: 0 })
    );
  },
  removeItem: (_name: string): void => {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(FILTER_SESSION_KEY);
    localStorage.removeItem(TIMEZONE_LOCAL_KEY);
  },
};

export const useFilterStore = create<FilterState>()(
  persist(
    (set) => ({
      filterInternal: true,
      setFilterInternal: (value) => set({ filterInternal: value }),
      filterFree: false,
      setFilterFree: (value) => set({ filterFree: value }),
      timezone: DEFAULT_TIMEZONE,
      setTimezone: (value) => set({ timezone: value }),
    }),
    {
      name: 'filter-store',
      storage: customStorage,
      partialize: (state): PersistedState => ({
        filterInternal: state.filterInternal,
        filterFree: state.filterFree,
        timezone: state.timezone,
      }),
    }
  )
);
