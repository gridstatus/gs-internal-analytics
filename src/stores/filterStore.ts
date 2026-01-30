'use client';

import { create } from 'zustand';
import { persist, type StorageValue } from 'zustand/middleware';
import { ValidTimezone, sanitizeTimezone } from '@/lib/timezones';

function getInitialFilterInternal(): boolean {
  if (typeof window === 'undefined') return true;
  const saved = localStorage.getItem('filterInternal');
  if (saved !== null) return saved === 'true';
  const legacy = localStorage.getItem('filterGridstatus');
  if (legacy !== null) return legacy === 'true';
  return true;
}

function getInitialFilterFree(): boolean {
  if (typeof window === 'undefined') return true;
  const saved = localStorage.getItem('filterFree');
  return saved !== null ? saved === 'true' : true;
}

function getInitialTimezone(): ValidTimezone {
  if (typeof window === 'undefined') return 'UTC';
  return sanitizeTimezone(localStorage.getItem('timezone'));
}

interface FilterState {
  filterInternal: boolean;
  setFilterInternal: (value: boolean) => void;
  filterFree: boolean;
  setFilterFree: (value: boolean) => void;
  timezone: ValidTimezone;
  setTimezone: (value: ValidTimezone) => void;
}

type PersistedState = Pick<FilterState, 'filterInternal' | 'filterFree' | 'timezone'>;

const storageKey = 'filter-store';

const customStorage = {
  getItem: (name: string): StorageValue<PersistedState> | null => {
    if (name !== storageKey) return null;
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(name);
    if (raw) {
      try {
        return JSON.parse(raw) as StorageValue<PersistedState>;
      } catch {
        return null;
      }
    }
    // Migrate from old keys
    const internal = getInitialFilterInternal();
    const free = getInitialFilterFree();
    const tz = getInitialTimezone();
    return {
      state: { filterInternal: internal, filterFree: free, timezone: tz },
      version: 1,
    };
  },
  setItem: (name: string, value: StorageValue<PersistedState>): void => {
    localStorage.setItem(name, JSON.stringify(value));
  },
  removeItem: (name: string): void => {
    localStorage.removeItem(name);
  },
};

export const useFilterStore = create<FilterState>()(
  persist(
    (set) => ({
      filterInternal: true,
      setFilterInternal: (value) => set({ filterInternal: value }),
      filterFree: true,
      setFilterFree: (value) => set({ filterFree: value }),
      timezone: 'UTC',
      setTimezone: (value) => set({ timezone: value }),
    }),
    {
      name: storageKey,
      storage: customStorage,
      partialize: (state): PersistedState => ({
        filterInternal: state.filterInternal,
        filterFree: state.filterFree,
        timezone: state.timezone,
      }),
    }
  )
);
