"use client";

import { ArrowRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPair, LANGUAGE_CODES, LANGUAGES, pairId } from "@/lib/languages";
import { cn } from "@/lib/utils";

const ITEMS = LANGUAGE_CODES.map((code) => ({ value: code, label: LANGUAGES[code].name }));

/** Two language pickers, "from" and "to". Picking the same language on both sides swaps them. */
export function PairSelect({
  value,
  onChange,
  disabled,
  className,
}: {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const { src, tgt } = getPair(value);

  function setSrc(code: string) {
    onChange(code === tgt ? pairId(tgt, src) : pairId(code, tgt));
  }
  function setTgt(code: string) {
    onChange(code === src ? pairId(tgt, src) : pairId(src, code));
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <LanguageSelect value={src} onChange={setSrc} disabled={disabled} label="From language" />
      <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <LanguageSelect value={tgt} onChange={setTgt} disabled={disabled} label="To language" />
    </div>
  );
}

function LanguageSelect({
  value,
  onChange,
  disabled,
  label,
}: {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <Select items={ITEMS} value={value} onValueChange={(v) => v && onChange(v)} disabled={disabled}>
      <SelectTrigger className="min-w-0 flex-1" aria-label={label}>
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
