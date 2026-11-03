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
 * Study days in a row, where one missed day doesn't break the run; two in a row
 * do. A missed day shouldn't wipe out progress (habits take weeks to form), and
 * today doesn't count against you until it is over.
 */
export function studyStreak(days: Iterable<string>, today = new Date()): number {
  const set = new Set(days);
  if (set.size === 0) return 0;
  const first = [...set].sort()[0];
  let streak = 0;
  let missed = 0;
  for (let d = today, isToday = true; dayKey(d) >= first; d = addDays(d, -1), isToday = false) {
    if (set.has(dayKey(d))) {
      streak++;
      missed = 0;
    } else if (!isToday && ++missed === 2) {
      break;
    }
  }
  return streak;
}

/** The longest run of study days with the same rule: one missed day in between is allowed. */
export function longestStreak(days: Iterable<string>): number {
  const sorted = [...new Set(days)].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    const gapOk = prev !== null && dayKey(addDays(new Date(`${prev}T12:00:00`), 2)) >= d;
    run = gapOk ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

/** Every day with at least one review, ever. */
export function totalStudyDays(days: Iterable<string>): number {
  return new Set(days).size;
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
