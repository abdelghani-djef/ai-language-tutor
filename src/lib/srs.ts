import { DefaultScheduler, Rating, State, type DefaultSchedulerCard, type Grade } from 'ts-fsrs';

export { Rating, State, type Grade };

type Scheduler = Awaited<ReturnType<typeof DefaultScheduler<'FSRS-7'>>>;
export type SrsCard = DefaultSchedulerCard;

export type GradeLabelKey = 'gradeAgain' | 'gradeHard' | 'gradeGood' | 'gradeEasy';

// labelKey names the button text in src/messages/study.ts.
export const GRADES: { grade: Grade; labelKey: GradeLabelKey; key: string }[] = [
  { grade: Rating.Again, labelKey: 'gradeAgain', key: '1' },
  { grade: Rating.Hard, labelKey: 'gradeHard', key: '2' },
  { grade: Rating.Good, labelKey: 'gradeGood', key: '3' },
  { grade: Rating.Easy, labelKey: 'gradeEasy', key: '4' },
];

let scheduler: Scheduler | null = null;

export async function getScheduler(): Promise<Scheduler> {
  scheduler ??= await DefaultScheduler({
    version: 'FSRS-7',
    desiredRetention: 0.9,
    enableFuzz: true,
    enableShortTerm: true,
    learningSteps: ['1m', '10m'],
    relearningSteps: ['10m'],
  });
  return scheduler;
}

export async function newSrsCard(now = new Date()): Promise<SrsCard> {
  return (await getScheduler()).newCard({ now });
}

export async function reviewSrsCard(card: SrsCard, grade: Grade, now = new Date()): Promise<SrsCard> {
  return (await getScheduler()).review({ card, grade, now }).card;
}

/** How long until the card would be due after each grade, in milliseconds. */
export async function previewIntervals(card: SrsCard, now = new Date()): Promise<Record<number, number>> {
  const out: Record<number, number> = {};
  for (const p of (await getScheduler()).preview({ card, now })) {
    out[p.grade] = new Date(p.card.dueAt).getTime() - now.getTime();
  }
  return out;
}

export type IntervalUnit = 'minute' | 'hour' | 'day' | 'month' | 'year';

/** Rounds a duration to the one unit people would say it in, e.g. 3 days or 1.5 months. */
export function intervalParts(ms: number): { value: number; unit: IntervalUnit } {
  const min = Math.max(1, Math.round(ms / 60_000));
  if (min < 60) return { value: min, unit: 'minute' };
  const h = Math.round(min / 60);
  if (h < 24) return { value: h, unit: 'hour' };
  const d = Math.round(h / 24);
  if (d < 30) return { value: d, unit: 'day' };
  const mo = Math.round((d / 30) * 10) / 10;
  if (mo < 12) return { value: mo, unit: 'month' };
  return { value: Math.round((d / 365) * 10) / 10, unit: 'year' };
}

/** A short interval label in the given Intl locale, e.g. "3 days" or "3 j". */
export function formatInterval(ms: number, locale = 'en'): string {
  const { value, unit } = intervalParts(ms);
  return new Intl.NumberFormat(locale, { style: 'unit', unit, unitDisplay: 'short', maximumFractionDigits: 1 }).format(value);
}

/** A card counts as "learned" once it has graduated to the Review state. */
export function isLearned(card: SrsCard): boolean {
  return card.state === State.Review;
}
