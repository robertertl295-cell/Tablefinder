import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import type { ColorValue } from 'react-native';

/** Feste Icon-Auswahl: SF Symbols auf iOS, Material Symbols auf Android/Web. */
const ICONS = {
  search: { ios: 'magnifyingglass', android: 'search' },
  close: { ios: 'xmark.circle.fill', android: 'cancel' },
  location: { ios: 'location.fill', android: 'my_location' },
  list: { ios: 'list.bullet', android: 'list' },
  map: { ios: 'map', android: 'map' },
  star: { ios: 'star.fill', android: 'star' },
  warning: { ios: 'exclamationmark.triangle', android: 'warning' },
  offline: { ios: 'wifi.slash', android: 'wifi_off' },
  empty: { ios: 'fork.knife', android: 'restaurant' },
  photo: { ios: 'photo', android: 'image' },
  refresh: { ios: 'arrow.clockwise', android: 'refresh' },
  filter: { ios: 'line.3.horizontal.decrease', android: 'filter_list' },
  back: { ios: 'chevron.left', android: 'arrow_back' },
  phone: { ios: 'phone.fill', android: 'call' },
  website: { ios: 'globe', android: 'language' },
  directions: { ios: 'arrow.triangle.turn.up.right.diamond.fill', android: 'directions' },
  check: { ios: 'checkmark', android: 'check' },
  cross: { ios: 'xmark', android: 'close' },
  clock: { ios: 'clock', android: 'schedule' },
  pin: { ios: 'mappin.and.ellipse', android: 'location_on' },
  external: { ios: 'arrow.up.right.square', android: 'open_in_new' },
} as const satisfies Record<string, { ios: SFSymbol; android: AndroidSymbol }>;

export type IconName = keyof typeof ICONS;

type Props = { name: IconName; size?: number; color: ColorValue };

export function Icon({ name, size = 20, color }: Props) {
  const icon = ICONS[name];
  return (
    <SymbolView
      name={{ ios: icon.ios, android: icon.android, web: icon.android }}
      size={size}
      tintColor={color}
      // Icons sind Dekoration; Bedeutung steht immer im Label des Elternelements.
      accessible={false}
      importantForAccessibility="no"
    />
  );
}
