'use client';

import { create } from 'zustand';

/** Transient UI state: settings dialog visibility (never persisted). */
type SettingsDialogState = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

export const useSettingsDialog = create<SettingsDialogState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));

export function openSettingsDialog() {
  useSettingsDialog.getState().setOpen(true);
}
