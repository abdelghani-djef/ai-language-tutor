export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

/**
 * Consecutive days with at least one review, ending today. If today has no
 * reviews yet the streak still counts from yesterday, so it isn't "lost"
 * until the day is over.
 */
export function studyStreak(days: Iterable<string>, today = new Date()): number {
  const set = new Set(days);
  let cursor = set.has(dayKey(today)) ? today : addDays(today, -1);
  let streak = 0;
  while (set.has(dayKey(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function longestStreak(days: Iterable<string>): number {
  const sorted = [...new Set(days)].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    run = prev !== null && dayKey(addDays(new Date(`${prev}T12:00:00`), 1)) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

export function countByDay(days: Iterable<string>): Map<string, number> {
  const m = new Map<string, number>();
  for (const d of days) m.set(d, (m.get(d) ?? 0) + 1);
  return m;
}

/**
 * Columns of 7 days (Sunday first) covering the last `weeks` weeks up to today,
 * like the GitHub contribution graph. Future days in the last column are null.
 */
export function heatmapGrid(weeks: number, today = new Date()): (string | null)[][] {
  const start = addDays(today, -today.getDay() - (weeks - 1) * 7);
  const todayKey = dayKey(today);
  const cols: (string | null)[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: (string | null)[] = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(start, w * 7 + i);
      const k = dayKey(d);
      col.push(k > todayKey ? null : k);
    }
    cols.push(col);
  }
  return cols;
}
