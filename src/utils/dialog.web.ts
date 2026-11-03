import { dialogStore, type DialogButton } from '@/store/dialog-store';

export type { DialogButton };

/**
 * Im Browser ist `Alert.alert` wirkungslos → eigener Dialog (siehe DialogHost).
 * Ohne Buttons gibt es ein einfaches „OK“.
 */
export function showDialog(title: string, message?: string, buttons?: DialogButton[]): void {
  dialogStore.setState({
    current: { title, message, buttons: buttons?.length ? buttons : [{ text: 'OK' }] },
  });
}
