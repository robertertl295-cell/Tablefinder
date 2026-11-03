import { Alert } from 'react-native';

import type { DialogButton } from '@/store/dialog-store';

export type { DialogButton };

/** Systemdialog (iOS/Android); Argumente unverändert an `Alert.alert`. Web: dialog.web.ts. */
export function showDialog(
  ...args: [title: string, message?: string, buttons?: DialogButton[]]
): void {
  Alert.alert(...args);
}
