'use client';

import { create } from 'zustand';
import { getQuerySource, type QuerySource } from '@/lib/query-sources';

export type { QuerySource } from '@/lib/query-sources';

export interface ActiveQuery {
  id: number;
  url: string;
  source: QuerySource;
}

interface ActiveQueriesState {
  activeQueries: ActiveQuery[];
  nextId: number;
  registerQuery: (url: string) => number;
  unregisterQuery: (id: number) => void;
}

export const useActiveQueriesStore = create<ActiveQueriesState>()((set) => ({
  activeQueries: [],
  nextId: 1,
  registerQuery: (url) => {
    let id: number;
    const source = getQuerySource(url);
    set((state) => {
      id = state.nextId;
      return {
        activeQueries: [...state.activeQueries, { id, url, source }],
        nextId: state.nextId + 1,
      };
    });
    return id!;
  },
  unregisterQuery: (id) =>
    set((state) => ({
      activeQueries: state.activeQueries.filter((q) => q.id !== id),
    })),
}));
