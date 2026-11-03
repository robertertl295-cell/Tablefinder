import type { OpeningPeriod } from '@/types/place';

const MINUTES_PER_DAY = 24 * 60;
const MINUTES_PER_WEEK = 7 * MINUTES_PER_DAY;
const SHORT_DAY = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

/** Index in `weekdayDescriptions` (Montag = 0 … Sonntag = 6). */
export function weekdayIndexMondayFirst(date: Date): number {
  return (date.getDay() + 6) % 7;
}

const pad = (n: number) => String(n).padStart(2, '0');
const minuteOfWeek = (day: number, hour: number, minute: number) =>
  day * MINUTES_PER_DAY + hour * 60 + minute;

function clock(minuteOfWeekValue: number): string {
  const m = ((minuteOfWeekValue % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

export type OpenState = {
  open: boolean;
  /** z. B. „Schließt um 22:30“, „Öffnet morgen um 12:00“, „Durchgehend geöffnet“ */
  detail: string | null;
};

/**
 * Leitet aus den Öffnungszeiträumen ab, ob gerade geöffnet ist und wann sich das ändert.
 * Rechnet in Minuten der Woche (So 00:00 = 0), damit Zeiten über Mitternacht
 * und über das Wochenende hinweg funktionieren. Verwendet die Gerätezeit.
 */
export function describeOpenState(periods: OpeningPeriod[], now: Date): OpenState | null {
  if (periods.length === 0) return null;

  // Google: ein Zeitraum ohne Ende = durchgehend geöffnet.
  if (periods.some((p) => p.close === null)) return { open: true, detail: 'Durchgehend geöffnet' };

  const nowMin = minuteOfWeek(now.getDay(), now.getHours(), now.getMinutes());
  const ranges = periods.map((p) => {
    const start = minuteOfWeek(p.open.day, p.open.hour, p.open.minute);
    const close = p.close!;
    let end = minuteOfWeek(close.day, close.hour, close.minute);
    if (end <= start) end += MINUTES_PER_WEEK; // über Mitternacht Sa → So
    return { start, end };
  });

  for (const { start, end } of ranges) {
    for (const t of [nowMin, nowMin + MINUTES_PER_WEEK]) {
      if (t >= start && t < end) {
        return {
          open: true,
          detail: `Schließt ${dayPrefix(end - (t - nowMin), nowMin)}${clock(end)}`,
        };
      }
    }
  }

  const next = Math.min(
    ...ranges.map(({ start }) => (start > nowMin ? start : start + MINUTES_PER_WEEK)),
  );
  return { open: false, detail: `Öffnet ${dayPrefix(next, nowMin)}${clock(next)}` };
}

/** „um “, „morgen um “ oder „Di um “ – relativ zum aktuellen Tag. */
function dayPrefix(targetMin: number, nowMin: number): string {
  const nowDay = Math.floor(nowMin / MINUTES_PER_DAY);
  const targetDay = Math.floor(targetMin / MINUTES_PER_DAY);
  const diff = targetDay - nowDay;
  if (diff === 0) return 'um ';
  if (diff === 1) return 'morgen um ';
  return `${SHORT_DAY[targetDay % 7]} um `;
}

/** Zerlegt „Montag: 12:00–22:00“ in Tag und Zeiten. */
export function splitWeekdayDescription(line: string): { day: string; hours: string } {
  const index = line.indexOf(':');
  if (index === -1) return { day: line, hours: '' };
  return { day: line.slice(0, index).trim(), hours: line.slice(index + 1).trim() };
}
