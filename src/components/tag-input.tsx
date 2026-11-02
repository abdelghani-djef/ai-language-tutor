"use client";

import { X } from "lucide-react";
import { useId, useState, type KeyboardEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/lib/i18n";
import { cleanTags, MAX_TAGS } from "@/lib/store";
import { cards } from "@/messages/cards";

/** Tags as removable chips, with an input that adds one on Enter or comma. */
export function TagInput({
  id,
  value,
  onChange,
  suggestions = [],
}: {
  id?: string;
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
}) {
  const t = useT(cards);
  const [draft, setDraft] = useState("");
  const listId = useId();

  function commit(text = draft) {
    if (text.trim()) onChange(cleanTags([...value, ...text.split(/[,،]/)]));
    setDraft("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    // While an IME is composing (Japanese, Chinese, Korean…), Enter confirms the
    // composition, not the tag.
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    if (e.key === "Enter" || e.key === "," || e.key === "،") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  }

  const full = value.length >= MAX_TAGS;
  const keys = new Set(value.map((v) => v.toLocaleLowerCase()));
  const options = suggestions.filter((s) => !keys.has(s.toLocaleLowerCase()));

  return (
    <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border border-input px-2 py-1.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30">
      {value.map((tag) => (
        <Badge key={tag} variant="secondary" className="gap-1 pe-1" dir="auto">
          #{tag}
          <button
            type="button"
            className="rounded-full p-0.5 hover:bg-foreground/10"
            aria-label={t("removeTag", { tag })}
            onClick={() => onChange(value.filter((x) => x !== tag))}
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      <input
        id={id}
        value={draft}
        list={options.length ? listId : undefined}
        dir={draft ? "auto" : undefined}
        onChange={(e) => {
          // Pasting "a, b" or picking a suggestion adds right away.
          const v = e.target.value;
          if (/[,،]/.test(v)) commit(v);
          else setDraft(v);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => commit()}
        disabled={full}
        aria-describedby={full ? `${listId}-full` : undefined}
        placeholder={full || value.length ? "" : t("tagPlaceholder")}
        className="min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
      {full && (
        <span id={`${listId}-full`} className="text-xs text-muted-foreground">
          {t("tagLimit", { count: MAX_TAGS })}
        </span>
      )}
      {options.length > 0 && (
        <datalist id={listId}>
          {options.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
    </div>
  );
}
