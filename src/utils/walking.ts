/**
 * Geschätzte Gehzeit aus der Luftlinie: Straßen sind im Schnitt ~30 % länger als die
 * Luftlinie, Gehtempo ~4,8 km/h (80 m/min). Ohne Routing-Dienst, also ohne Kosten.
 */
const DETOUR_FACTOR = 1.3;
const METERS_PER_MINUTE = 80;

export function walkingMinutes(distanceMeters: number): number {
  return Math.max(1, Math.round((distanceMeters * DETOUR_FACTOR) / METERS_PER_MINUTE));
}

/** „6 Min.“, „1 Std. 5 Min.“ */
export function formatWalkingTime(distanceMeters: number): string {
  const min = walkingMinutes(distanceMeters);
  if (min < 60) return `${min} Min.`;
  const h = Math.floor(min / 60);
  const rest = min % 60;
  return rest === 0 ? `${h} Std.` : `${h} Std. ${rest} Min.`;
}

/** Für Screenreader: „6 Minuten zu Fuß“. */
export function spokenWalkingTime(distanceMeters: number): string {
  const min = walkingMinutes(distanceMeters);
  return min === 1 ? '1 Minute zu Fuß' : `${min} Minuten zu Fuß`;
}
