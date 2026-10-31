"use client";

import { heatmapGrid } from "@/lib/stats";
import { cn } from "@/lib/utils";

// Single-hue sequential scale: empty, then four steps of the primary color.
const LEVELS = ["bg-muted", "bg-primary/25", "bg-primary/50", "bg-primary/75", "bg-primary"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function level(count: number, max: number): number {
  if (count === 0) return 0;
  return Math.min(4, Math.ceil((count / Math.max(max, 1)) * 4));
}

export function Heatmap({ counts, weeks = 26 }: { counts: Map<string, number>; weeks?: number }) {
  const grid = heatmapGrid(weeks);
  const max = Math.max(0, ...counts.values());

  return (
    <div className="grid gap-2">
      <div className="overflow-x-auto pb-1">
        <div className="inline-grid gap-1" style={{ gridTemplateColumns: `auto repeat(${grid.length}, 0.875rem)` }}>
          {/* month labels */}
          <span />
          {grid.map((col, i) => {
            const first = col.find(Boolean);
            const m = first ? Number(first.slice(5, 7)) - 1 : -1;
            const prev = i > 0 ? grid[i - 1].find(Boolean) : null;
            const show = first && (!prev || prev.slice(5, 7) !== first.slice(5, 7));
            return (
              <span key={i} className="h-4 overflow-visible text-[10px] whitespace-nowrap text-muted-foreground">
                {show ? MONTHS[m] : ""}
              </span>
            );
          })}
          {/* rows: Sunday..Saturday */}
          {Array.from({ length: 7 }, (_, row) => (
            <Row key={row} row={row} grid={grid} counts={counts} max={max} />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1 self-end text-xs text-muted-foreground">
        Less
        {LEVELS.map((c) => (
          <span key={c} className={cn("size-3 rounded-[3px]", c)} />
        ))}
        More
      </div>
    </div>
  );
}

function Row({
  row,
  grid,
  counts,
  max,
}: {
  row: number;
  grid: (string | null)[][];
  counts: Map<string, number>;
  max: number;
}) {
  return (
    <>
      <span className="pr-1 text-[10px] leading-3.5 text-muted-foreground">
        {row === 1 ? "Mon" : row === 3 ? "Wed" : row === 5 ? "Fri" : ""}
      </span>
      {grid.map((col, i) => {
        const day = col[row];
        if (!day) return <span key={i} className="size-3.5" />;
        const n = counts.get(day) ?? 0;
        const label = `${n} review${n === 1 ? "" : "s"} on ${new Date(`${day}T12:00:00`).toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
        })}`;
        return <span key={i} title={label} aria-label={label} className={cn("size-3.5 rounded-[3px]", LEVELS[level(n, max)])} />;
      })}
    </>
  );
}
