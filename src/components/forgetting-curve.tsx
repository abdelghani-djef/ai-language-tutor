"use client";

// An illustration of spaced review: memory of a new word fades quickly without
// review; each review at the right moment restores it and it then fades more
// slowly. Modelled as exponential forgetting, R = e^(-t/S), with stability S
// growing after every review. Shapes are illustrative, not data from a study.

const DAYS = 30;
const W = 560;
const H = 260;
const PAD = { top: 16, right: 16, bottom: 34, left: 16 };
const REVIEWS = [1, 3, 7, 16];
const STABILITY = [1.2, 3, 7, 16, 45];

const x = (day: number) => PAD.left + (day / DAYS) * (W - PAD.left - PAD.right);
const y = (r: number) => PAD.top + (1 - r) * (H - PAD.top - PAD.bottom);

function path(points: [number, number][]): string {
  return points.map(([d, r], i) => `${i ? "L" : "M"}${x(d).toFixed(1)},${y(r).toFixed(1)}`).join(" ");
}

function withoutReview(): string {
  const pts: [number, number][] = [];
  for (let d = 0; d <= DAYS; d += 0.25) pts.push([d, Math.exp(-d / STABILITY[0])]);
  return path(pts);
}

function withReview(): string {
  const pts: [number, number][] = [];
  let last = 0;
  let stage = 0;
  for (let d = 0; d <= DAYS + 1e-9; d += 0.25) {
    if (stage < REVIEWS.length && d >= REVIEWS[stage]) {
      // Just before the review, then straight back up to full recall.
      pts.push([REVIEWS[stage], Math.exp(-(REVIEWS[stage] - last) / STABILITY[stage])]);
      last = REVIEWS[stage];
      stage++;
      pts.push([last, 1]);
    }
    pts.push([d, Math.exp(-(d - last) / STABILITY[stage])]);
  }
  return path(pts);
}

const NO_REVIEW = withoutReview();
const REVIEWED = withReview();

export function ForgettingCurve({
  labels,
}: {
  labels: { title: string; withReview: string; withoutReview: string; review: string; ticks: [string, string, string, string] };
}) {
  return (
    // Time runs left to right in every language, like the axis of any chart.
    <figure dir="ltr" className="grid gap-3">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={labels.title} className="h-auto w-full overflow-visible">
        <line x1={x(0)} x2={x(DAYS)} y1={y(0)} y2={y(0)} className="stroke-border" strokeWidth={1} />
        {[0, 7, 14, 30].map((d, i) => (
          <text
            key={d}
            x={x(d)}
            y={H - 10}
            textAnchor={i === 0 ? "start" : i === 3 ? "end" : "middle"}
            className="fill-muted-foreground text-[13px]"
          >
            {labels.ticks[i]}
          </text>
        ))}
        <path d={NO_REVIEW} fill="none" strokeWidth={2.5} strokeDasharray="6 6" className="stroke-muted-foreground/50" />
        <path
          d={REVIEWED}
          fill="none"
          strokeWidth={3.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          pathLength={1}
          className="curve-draw stroke-primary"
        />
        {REVIEWS.map((d, i) => (
          <g key={d} className="curve-dot" style={{ animationDelay: `${0.35 + (d / DAYS) * 1.6}s` }}>
            <circle cx={x(d)} cy={y(1)} r={6} className="fill-primary stroke-card" strokeWidth={2.5} />
            <title>{`${labels.review} ${i + 1}`}</title>
          </g>
        ))}
      </svg>
      <figcaption className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground" dir="auto">
        <span className="flex items-center gap-2">
          <span className="h-1 w-6 rounded-full bg-primary" aria-hidden />
          {labels.withReview}
        </span>
        <span className="flex items-center gap-2">
          <span className="w-6 border-t-2 border-dashed border-muted-foreground/60" aria-hidden />
          {labels.withoutReview}
        </span>
      </figcaption>
    </figure>
  );
}
