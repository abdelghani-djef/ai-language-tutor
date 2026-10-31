import { DefaultScheduler, Rating, State, type DefaultSchedulerCard, type Grade } from 'ts-fsrs';

export { Rating, State, type Grade };

type Scheduler = Awaited<ReturnType<typeof DefaultScheduler<'FSRS-7'>>>;
export type SrsCard = DefaultSchedulerCard;

export const GRADES: { grade: Grade; label: string; key: string }[] = [
  { grade: Rating.Again, label: 'Again', key: '1' },
  { grade: Rating.Hard, label: 'Hard', key: '2' },
  { grade: Rating.Good, label: 'Good', key: '3' },
  { grade: Rating.Easy, label: 'Easy', key: '4' },
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

/** Human-readable interval each grade would produce, e.g. "10m", "3d". */
export async function previewIntervals(card: SrsCard, now = new Date()): Promise<Record<number, string>> {
  const out: Record<number, string> = {};
  for (const p of (await getScheduler()).preview({ card, now })) {
    out[p.grade] = formatInterval(new Date(p.card.dueAt).getTime() - now.getTime());
  }
  return out;
}

export function formatInterval(ms: number): string {
  const min = Math.max(1, Math.round(ms / 60_000));
  if (min < 60) return `${min}m`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d`;
  const mo = d / 30;
  if (mo < 12) return `${mo.toFixed(1).replace(/\.0$/, '')}mo`;
  return `${(d / 365).toFixed(1).replace(/\.0$/, '')}y`;
}

/** A card counts as "learned" once it has graduated to the Review state. */
export function isLearned(card: SrsCard): boolean {
  return card.state === State.Review;
}
