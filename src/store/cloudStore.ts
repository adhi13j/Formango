import { create } from 'zustand';
import type { FormDoc } from '@/types/doc';

export interface CloudMeta {
  formId: string;
  published: boolean;
  slug: string | null;
  formRev: number;
  /** What respondents currently see. Null before the first publish. */
  publishedDoc: FormDoc | null;
}

interface CloudState {
  /** Set while the builder is editing a saved form. Null for the guest builder. */
  meta: CloudMeta | null;
  setMeta: (meta: CloudMeta | null) => void;
  /** Saves pending edits right now. Resolves true when everything is saved. Set by the autosaver. */
  flush: () => Promise<boolean>;
  setFlush: (flush: () => Promise<boolean>) => void;
}

export const useCloudStore = create<CloudState>((set) => ({
  meta: null,
  setMeta: (meta) => set({ meta }),
  flush: () => Promise.resolve(true),
  setFlush: (flush) => set({ flush }),
}));
