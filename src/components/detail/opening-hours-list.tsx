import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { OpeningHours } from '@/types/place';
import { splitWeekdayDescription, weekdayIndexMondayFirst } from '@/utils/opening-hours';

/** Wochenübersicht, der heutige Tag ist hervorgehoben. */
export function OpeningHoursList({ hours, now }: { hours: OpeningHours; now: Date }) {
  const theme = useTheme();
  const today = weekdayIndexMondayFirst(now);
  return (
    <View>
      {hours.weekdayDescriptions.map((line, i) => {
        const { day, hours: time } = splitWeekdayDescription(line);
        const isToday = i === today;
        return (
          <View
            key={line}
            style={[styles.row, isToday && { backgroundColor: theme.backgroundElement }]}
            accessible
            accessibilityLabel={`${isToday ? 'Heute, ' : ''}${day}: ${time.replace('–', ' bis ')}`}>
            <ThemedText type={isToday ? 'smallBold' : 'small'} style={styles.day}>
              {day}
              {isToday ? ' (heute)' : ''}
            </ThemedText>
            <ThemedText
              type={isToday ? 'smallBold' : 'small'}
              themeColor={isToday ? 'text' : 'textSecondary'}
              style={styles.time}>
              {time}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.small,
  },
  day: { flexShrink: 0 },
  time: { flex: 1, textAlign: 'right' },
});
