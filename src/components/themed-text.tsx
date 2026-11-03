import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'subtitle' | 'small' | 'smallBold' | 'link' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const color = type === 'link' && !themeColor ? theme.accent : theme[themeColor ?? 'text'];

  return <Text style={[{ color }, styles[type], style]} {...rest} />;
}

const styles = StyleSheet.create({
  default: { fontSize: 16, lineHeight: 24, fontWeight: 400 },
  small: { fontSize: 14, lineHeight: 20, fontWeight: 400 },
  smallBold: { fontSize: 14, lineHeight: 20, fontWeight: 600 },
  title: { fontSize: 32, lineHeight: 38, fontWeight: 700 },
  subtitle: { fontSize: 20, lineHeight: 28, fontWeight: 600 },
  link: { fontSize: 16, lineHeight: 24, fontWeight: 500 },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
