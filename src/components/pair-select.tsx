"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PAIRS, pairLabel } from "@/lib/languages";

const ITEMS = PAIRS.map((p) => ({ value: p.id, label: pairLabel(p) }));

export function PairSelect({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <Select items={ITEMS} value={value} onValueChange={(v) => v && onChange(v)}>
      <SelectTrigger className={className} aria-label="Language pair">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ITEMS.map((i) => (
          <SelectItem key={i.value} value={i.value}>
            {i.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
