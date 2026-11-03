import type { OpeningPeriod } from '@/types/place';

/**
 * Parser für die gängige Teilmenge des OSM-Formats `opening_hours`
 * (https://wiki.openstreetmap.org/wiki/Key:opening_hours):
 *
 *   24/7
 *   Mo-Fr 08:00-18:00; Sa 10:00-14:00
 *   Mo,We,Fr 12:00-15:00,18:00-23:00
 *   Tu-Su 18:00-02:00          (über Mitternacht)
 *   Mo-Su 10:00-22:00; Mo off  (spätere Regeln überschreiben frühere)
 *   PH off                     (Feiertagsregeln werden übersprungen)
 *
 * Alles andere (Monate, Kalenderwochen, Sonnenauf-/-untergang, Kommentare, „+“, „||“)
 * ergibt `null` = unbekannt. Lieber keine Angabe als eine falsche.
 */

const DAY_INDEX: Record<string, number> = { Su: 0, Mo: 1, Tu: 2, We: 3, Th: 4, Fr: 5, Sa: 6 };
const DAY_NAME = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0];
const MINUTES_PER_DAY = 24 * 60;

type Interval = { start: number; end: number };

export type OsmOpeningHours = {
  periods: OpeningPeriod[];
  /** Montag zuerst, z. B. „Montag: 08:00–18:00“ */
  weekdayDescriptions: string[];
};

const UNSUPPORTED =
  /[[\]"]|\|\||sunrise|sunset|dawn|dusk|\bweek\b|\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b|\+|\b\d{4}\b|easter/i;

const DAY_PART = '(?:Mo|Tu|We|Th|Fr|Sa|Su|PH|SH)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?';
const RULE = new RegExp(`^((?:${DAY_PART})(?:\\s*,\\s*${DAY_PART})*)?\\s*(.*)$`);
const TIME_RANGE = /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/;

const pad = (n: number) => String(n).padStart(2, '0');
const clock = (minutes: number) => {
  const m = minutes % MINUTES_PER_DAY;
  // 24:00 als Ende bleibt lesbar „24:00“.
  if (minutes === MINUTES_PER_DAY) return '24:00';
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
};

/** „Mo-Fr,Su“ → [1,2,3,4,5,0]; Feiertage (PH/SH) werden ignoriert. */
function parseDays(selector: string): number[] | 'holiday-only' {
  const days = new Set<number>();
  let onlyHolidays = true;
  for (const part of selector.split(',').map((p) => p.trim())) {
    if (part === 'PH' || part === 'SH') continue;
    onlyHolidays = false;
    const [from, to] = part.split('-') as [string, string | undefined];
    const start = DAY_INDEX[from]!;
    const end = to ? DAY_INDEX[to]! : start;
    // Bereiche dürfen über das Wochenende laufen (Sa-Mo).
    for (let d = start; ; d = (d + 1) % 7) {
      days.add(d);
      if (d === end) break;
    }
  }
  return onlyHolidays ? 'holiday-only' : [...days];
}

function parseTimes(text: string): Interval[] | null {
  const intervals: Interval[] = [];
  for (const range of text.split(',').map((t) => t.trim())) {
    const m = TIME_RANGE.exec(range);
    if (!m) return null;
    const [sh, sm, eh, em] = [m[1], m[2], m[3], m[4]].map(Number) as [
      number,
      number,
      number,
      number,
    ];
    if (sh > 24 || eh > 48 || sm > 59 || em > 59) return null;
    const start = sh * 60 + sm;
    let end = eh * 60 + em;
    if (end <= start) end += MINUTES_PER_DAY; // über Mitternacht
    intervals.push({ start, end });
  }
  return intervals;
}

export function parseOsmOpeningHours(input: string | undefined | null): OsmOpeningHours | null {
  const value = input?.trim();
  if (!value) return null;

  if (value === '24/7') {
    return {
      periods: [{ open: { day: 0, hour: 0, minute: 0 }, close: null }],
      weekdayDescriptions: MONDAY_FIRST.map((d) => `${DAY_NAME[d]}: 24 Stunden geöffnet`),
    };
  }
  if (UNSUPPORTED.test(value)) return null;

  const week: Interval[][] = Array.from({ length: 7 }, () => []);
  const rules = value
    .split(';')
    .map((r) => r.trim())
    .filter(Boolean);
  if (rules.length === 0) return null;

  for (const rule of rules) {
    const m = RULE.exec(rule);
    if (!m) return null;
    const selector = m[1]?.trim() ?? '';
    const rest = (m[2] ?? '').trim();

    const days = selector ? parseDays(selector) : [0, 1, 2, 3, 4, 5, 6];
    if (days === 'holiday-only') continue;
    // „Mo-Fr“ ohne Uhrzeit ist selten und mehrdeutig → unbekannt.
    if (!rest) return null;

    if (rest === 'off' || rest === 'closed') {
      for (const d of days) week[d] = [];
      continue;
    }
    const intervals = parseTimes(rest);
    if (!intervals) return null;
    for (const d of days) week[d] = intervals;
  }

  const periods: OpeningPeriod[] = [];
  for (let day = 0; day < 7; day++) {
    for (const { start, end } of week[day]!) {
      const closeDay = end >= MINUTES_PER_DAY ? (day + 1) % 7 : day;
      const closeMin = end % MINUTES_PER_DAY;
      periods.push({
        open: { day, hour: Math.floor(start / 60), minute: start % 60 },
        close: { day: closeDay, hour: Math.floor(closeMin / 60), minute: closeMin % 60 },
      });
    }
  }

  return {
    periods,
    weekdayDescriptions: MONDAY_FIRST.map((d) => {
      const intervals = week[d]!;
      const text = intervals.length
        ? intervals.map((i) => `${clock(i.start)}–${clock(i.end)}`).join(', ')
        : 'Geschlossen';
      return `${DAY_NAME[d]}: ${text}`;
    }),
  };
}
