import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import { Platform, Text, type ColorValue } from 'react-native';

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
  external: { ios: 'arrow.up.right.square', android: 'open_in_new' },
  heart: { ios: 'heart', android: 'favorite' },
  heartFill: { ios: 'heart.fill', android: 'favorite' },
  trash: { ios: 'trash', android: 'delete' },
  share: { ios: 'square.and.arrow.up', android: 'share' },
  import: { ios: 'square.and.arrow.down', android: 'download' },
  plus: { ios: 'plus', android: 'add' },
  sort: { ios: 'arrow.up.arrow.down', android: 'sort' },
} as const satisfies Record<string, { ios: SFSymbol; android: AndroidSymbol }>;

export type IconName = keyof typeof ICONS;

/**
 * Material Symbols werden von expo-symbols nur als Umriss gezeichnet. Für Icons, die gefüllt
 * sein müssen (Sterne, gemerktes Herz), außerhalb von iOS ein Textzeichen verwenden.
 * U+FE0E erzwingt die Text- statt der Emoji-Darstellung.
 */
const FILLED_GLYPH: Partial<Record<IconName, string>> = {
  star: '\u2605',
  heartFill: '\u2665\uFE0E',
};

type Props = { name: IconName; size?: number; color: ColorValue };

export function Icon({ name, size = 20, color }: Props) {
  const glyph = Platform.OS === 'ios' ? undefined : FILLED_GLYPH[name];
  if (glyph) {
    return (
      <Text
        accessible={false}
        importantForAccessibility="no"
        allowFontScaling={false}
        style={{
          color,
          fontSize: size,
          lineHeight: size * 1.15,
          width: size,
          textAlign: 'center',
          includeFontPadding: false,
        }}>
        {glyph}
      </Text>
    );
  }
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
