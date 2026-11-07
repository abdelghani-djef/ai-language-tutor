"use client";

import { MessageSquareQuote, NotebookPen, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { SpeakButton } from "@/components/speak-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFormat } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { State } from "@/lib/srs";
import { deleteCard, dueTime, restoreCard, type Flashcard } from "@/lib/store";
import { cardHref } from "@/lib/word/target";
import { cards as cardMessages } from "@/messages/cards";
import { common } from "@/messages/common";
import { mywords as messages } from "@/messages/mywords";

const STATE_LABEL = {
  [State.New]: "stateNew",
  [State.Learning]: "stateLearning",
  [State.Review]: "stateReview",
  [State.Relearning]: "stateRelearning",
} as const;

/**
 * One saved word: its two sides (the first links to its word page), speakers,
 * tags and, for a Should learn word, its progress and when it is due. `action`
 * sits before the edit and delete buttons, e.g. a button that moves the word.
 */
export function WordRow({
  card,
  onEdit,
  action,
}: {
  card: Flashcard;
  onEdit: (c: Flashcard) => void;
  action?: ReactNode;
}) {
  const tc = useT(cardMessages);
  const t = useT(messages);
  const tcommon = useT(common);
  const fmt = useFormat();
  const [now] = useState(Date.now);
  const dueIn = dueTime(card) - now;
  // Already know words don't come up in Study, so they have no progress or due time to show.
  const learning = card.status === "learn";

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3">
      <div className="flex min-w-0 flex-1 basis-56 items-center gap-3">
        {card.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- a local data: URL, nothing to optimize
          <img
            src={card.image}
            alt={tc("pictureAlt", { word: card.back })}
            className="size-10 shrink-0 rounded-md border object-cover"
          />
        ) : (
          card.emoji && (
            <span className="w-10 shrink-0 text-center text-2xl leading-none" aria-hidden>
              {card.emoji}
            </span>
          )
        )}
        <div className="grid min-w-0 flex-1 gap-1">
          <div className="grid gap-0.5 sm:grid-cols-2 sm:gap-4">
            <span className="flex min-w-0 items-center gap-1 font-medium" dir="auto" lang={card.src}>
              <Link href={cardHref(card)} className="truncate underline-offset-2 hover:underline">
                {card.front}
              </Link>
              <SpeakButton text={card.front} lang={card.src} label={tcommon("pronounceWord", { word: card.front })} />
            </span>
            <span className="flex min-w-0 items-center gap-1 text-muted-foreground" dir="auto" lang={card.tgt}>
              <span className="truncate">{card.back}</span>
              <SpeakButton text={card.back} lang={card.tgt} label={tcommon("pronounceWord", { word: card.back })} />
            </span>
          </div>
          {(card.tags?.length || card.example || card.notes) && (
            <div className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
              {card.example && <MessageSquareQuote className="size-3.5" aria-label={tc("hasExample")} />}
              {card.notes && <NotebookPen className="size-3.5" aria-label={tc("hasNotes")} />}
              {card.tags?.map((tagName) => (
                <Badge key={tagName} variant="secondary" className="h-4 px-1.5 text-[11px]" dir="auto">
                  #{tagName}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="ms-auto flex items-center gap-1">
        {learning && (
          <>
            <Badge variant="outline" className="me-2 hidden sm:inline-flex">
              {t(STATE_LABEL[card.srs.state])}
            </Badge>
            <span className="me-1 w-16 text-end text-xs text-muted-foreground tabular-nums">
              {dueIn <= 0 ? t("due") : t("dueIn", { interval: fmt.interval(dueIn) })}
            </span>
          </>
        )}
        {action}
        <Button variant="ghost" size="icon-sm" aria-label={t("editCard", { word: card.front })} onClick={() => onEdit(card)}>
          <Pencil />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("deleteCard", { word: card.front })}
          onClick={() => {
            deleteCard(card.id);
            toast(t("cardDeleted"), { action: { label: t("undo"), onClick: () => restoreCard(card) } });
          }}
        >
          <Trash2 />
        </Button>
      </div>
    </li>
  );
}
