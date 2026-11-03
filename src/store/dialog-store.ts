import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

export type DialogButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

export type Dialog = { title: string; message?: string; buttons: DialogButton[] };

/** Offener Dialog in der Web-Version (nativ übernimmt das System-Alert). */
export const dialogStore = createStore<{ current: Dialog | null }>()(() => ({ current: null }));

export function useCurrentDialog(): Dialog | null {
  return useStore(dialogStore, (s) => s.current);
}
