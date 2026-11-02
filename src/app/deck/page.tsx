"use client";

import { ArrowLeft, Check, MessageSquareQuote, NotebookPen, Pencil, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { CardEditor } from "@/components/card-editor";
import { SpeakButton } from "@/components/speak-button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useFormat } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { State } from "@/lib/srs";
import {
  addCard,
  deleteCard,
  deleteDeck,
  dueTime,
  hasTag,
  renameDeck,
  restoreCard,
  useHydrated,
  useStore,
  type Flashcard,
} from "@/lib/store";
import { cn } from "@/lib/utils";
import { cards as cardMessages } from "@/messages/cards";
import { deck as deckMessages } from "@/messages/deck";

const STATE_LABEL = {
  [State.New]: "stateNew",
  [State.Learning]: "stateLearning",
  [State.Review]: "stateReview",
  [State.Relearning]: "stateRelearning",
} as const;

export default function DeckPageWrapper() {
  return (
    <Suspense>
      <DeckPage />
    </Suspense>
  );
}

function DeckPage() {
  const id = useSearchParams().get("id");
  const router = useRouter();
  const { decks, cards } = useStore();
  const hydrated = useHydrated();
  const deck = decks.find((d) => d.id === id);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  // The card being edited, or "new" for a new card with all its details.
  const [editing, setEditing] = useState<Flashcard | "new" | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const tc = useT(cardMessages);
  const t = useT(deckMessages);
  const fmt = useFormat();

  if (!hydrated) return null;
  if (!deck) {
    return (
      <div className="grid justify-items-start gap-3">
        <p>{t("notFound")}</p>
        <Link href="/decks" className={buttonVariants({ variant: "outline" })}>
          {t("backToDecks")}
        </Link>
      </div>
    );
  }

  const deckCards = cards.filter((c) => c.deckId === deck.id).sort((a, b) => b.createdAt - a.createdAt);
  const tagCounts = new Map<string, { tag: string; n: number }>();
  for (const c of deckCards) {
    for (const tagName of c.tags ?? []) {
      const key = tagName.toLocaleLowerCase();
      tagCounts.set(key, { tag: tagCounts.get(key)?.tag ?? tagName, n: (tagCounts.get(key)?.n ?? 0) + 1 });
    }
  }
  const allTags = [...tagCounts.values()].sort((a, b) => b.n - a.n || a.tag.localeCompare(b.tag));
  // A filter tag that no card has any more (deleted or renamed) is dropped.
  const activeTag = tag && tagCounts.has(tag.toLocaleLowerCase()) ? tag : null;
  const q = query.trim().toLocaleLowerCase();
  const shown = deckCards.filter(
    (c) =>
      hasTag(c, activeTag) &&
      (!q ||
        [c.front, c.back, c.example, c.notes, ...(c.tags ?? [])].some((f) => f?.toLocaleLowerCase().includes(q))),
  );
  const tagQuery = activeTag ? `&tag=${encodeURIComponent(activeTag)}` : "";

  function openEditor(target: Flashcard | "new") {
    setEditing(target);
    setEditorOpen(true);
  }

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!deck || !front.trim() || !back.trim()) return;
    // Clear first so anything typed while the card is being created isn't wiped.
    setFront("");
    setBack("");
    // While a tag filter is on, new cards get that tag so they stay in view.
    await addCard(deck.id, front, back, deck.src, deck.tgt, { tags: activeTag ? [activeTag] : undefined });
  }

  return (
    <div className="grid gap-6">
      <Link href="/decks" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4 rtl:rotate-180" /> {t("allDecks")}
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {renaming ? (
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (name.trim()) renameDeck(deck.id, name);
                setRenaming(false);
              }}
            >
              <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus className="h-10 text-xl" />
              <Button type="submit" size="icon" aria-label={t("saveName")}>
                <Check />
              </Button>
            </form>
          ) : (
            <h1 className="flex items-center gap-2 font-display text-3xl font-semibold tracking-tight">
              {deck.name}
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("renameDeck")}
                onClick={() => {
                  setName(deck.name);
                  setRenaming(true);
                }}
              >
                <Pencil />
              </Button>
            </h1>
          )}
          <p className="text-muted-foreground">
            {t("summary", { pair: fmt.pairLabel(deck), count: deckCards.length })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/study?deck=${deck.id}${tagQuery}`} className={buttonVariants()}>
            {activeTag ? tc("studyTag", { tag: fmt.tag(activeTag) }) : t("study")}
          </Link>
          <Link href={`/quiz?deck=${deck.id}${tagQuery}`} className={buttonVariants({ variant: "outline" })}>
            {activeTag ? tc("quizTag", { tag: fmt.tag(activeTag) }) : t("quiz")}
          </Link>
          <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 /> {t("deleteDeck")}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("addManually")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={add} className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder={t("frontPlaceholder", { lang: fmt.languageName(deck.src) })}
              value={front}
              // Empty, it follows the page so the translated placeholder reads right.
              dir={front ? "auto" : undefined}
              onChange={(e) => setFront(e.target.value)}
            />
            <Input
              placeholder={t("backPlaceholder", { lang: fmt.languageName(deck.tgt) })}
              value={back}
              dir={back ? "auto" : undefined}
              onChange={(e) => setBack(e.target.value)}
            />
            <Button type="submit" disabled={!front.trim() || !back.trim()}>
              <Plus /> {t("add")}
            </Button>
            <Button type="button" variant="outline" onClick={() => openEditor("new")}>
              {tc("moreDetails")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {deckCards.length > 0 && (
        <div className="grid gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute inset-s-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tc("search")}
              aria-label={tc("search")}
              className="ps-8"
            />
          </div>
          {allTags.length > 0 && (
            <div role="group" aria-label={tc("filterByTag")} className="flex flex-wrap gap-1.5">
              <TagChip active={!activeTag} onClick={() => setTag(null)}>
                {tc("allTags")}
              </TagChip>
              {allTags.map(({ tag: tagName, n }) => (
                <TagChip
                  key={tagName}
                  active={activeTag?.toLocaleLowerCase() === tagName.toLocaleLowerCase()}
                  onClick={() => setTag(tagName)}
                >
                  #{tagName} <span className="opacity-60">{fmt.number(n)}</span>
                </TagChip>
              ))}
            </div>
          )}
          {(q || activeTag) && (
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {tc("shown", { shown: shown.length, count: deckCards.length })}
            </p>
          )}
        </div>
      )}

      {deckCards.length === 0 ? (
        <p className="text-muted-foreground">
          {t.rich("empty", {
            link: (
              <Link href="/" className="underline">
                {t("emptyLink")}
              </Link>
            ),
          })}
        </p>
      ) : shown.length === 0 ? (
        <p className="text-muted-foreground">{tc("noMatches")}</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {shown.map((c) => (
            <CardRow key={c.id} card={c} onEdit={() => openEditor(c)} />
          ))}
        </ul>
      )}

      <CardEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        deck={deck}
        card={editing === "new" ? undefined : (editing ?? undefined)}
        initial={editing === "new" ? { front, back, tags: activeTag ? [activeTag] : [] } : undefined}
        suggestions={allTags.map((x) => x.tag)}
        onSaved={() => {
          if (editing === "new") {
            setFront("");
            setBack("");
          }
        }}
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle", { name: deck.name })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDescription", { count: deckCards.length })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                deleteDeck(deck.id);
                router.push("/decks");
              }}
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CardRow({ card, onEdit }: { card: Flashcard; onEdit: () => void }) {
  const tc = useT(cardMessages);
  const t = useT(deckMessages);
  const fmt = useFormat();
  const [now] = useState(Date.now);
  const dueIn = dueTime(card) - now;

  return (
    <li className="flex items-center gap-3 p-3">
      {card.image && (
        // eslint-disable-next-line @next/next/no-img-element -- a local data: URL, nothing to optimize
        <img
          src={card.image}
          alt={tc("pictureAlt", { word: card.back })}
          className="size-10 shrink-0 rounded-md border object-cover"
        />
      )}
      <div className="grid min-w-0 flex-1 gap-1">
        <div className="grid gap-0.5 sm:grid-cols-2 sm:gap-4">
          <span className="flex min-w-0 items-center gap-1 font-medium" dir="auto" lang={card.src}>
            <span className="truncate">{card.front}</span>
            <SpeakButton text={card.front} lang={card.src} />
          </span>
          <span className="flex min-w-0 items-center gap-1 text-muted-foreground" dir="auto" lang={card.tgt}>
            <span className="truncate">{card.back}</span>
            <SpeakButton text={card.back} lang={card.tgt} />
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
      <Badge variant="outline" className="hidden sm:inline-flex">
        {t(STATE_LABEL[card.srs.state])}
      </Badge>
      <span className="w-16 text-end text-xs text-muted-foreground tabular-nums">
        {dueIn <= 0 ? t("due") : t("dueIn", { interval: fmt.interval(dueIn) })}
      </span>
      <Button variant="ghost" size="icon-sm" aria-label={t("editCard")} onClick={onEdit}>
        <Pencil />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t("deleteCard")}
        onClick={() => {
          deleteCard(card.id);
          toast(t("cardDeleted"), { action: { label: t("undo"), onClick: () => restoreCard(card) } });
        }}
      >
        <Trash2 />
      </Button>
    </li>
  );
}

function TagChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      dir="auto"
      className={cn(
        "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}
