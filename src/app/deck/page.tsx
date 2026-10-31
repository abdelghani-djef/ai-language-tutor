"use client";

import { ArrowLeft, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { toast } from "sonner";
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
import { LANGUAGES, pairLabel } from "@/lib/languages";
import { formatInterval, State } from "@/lib/srs";
import {
  addCard,
  deleteCard,
  deleteDeck,
  dueTime,
  renameDeck,
  restoreCard,
  updateCard,
  useHydrated,
  useStore,
  type Flashcard,
} from "@/lib/store";

const STATE_LABEL: Record<number, string> = {
  [State.New]: "New",
  [State.Learning]: "Learning",
  [State.Review]: "Review",
  [State.Relearning]: "Relearning",
};

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

  if (!hydrated) return null;
  if (!deck) {
    return (
      <div className="grid justify-items-start gap-3">
        <p>That deck doesn’t exist.</p>
        <Link href="/decks" className={buttonVariants({ variant: "outline" })}>
          Back to decks
        </Link>
      </div>
    );
  }

  const deckCards = cards.filter((c) => c.deckId === deck.id).sort((a, b) => b.createdAt - a.createdAt);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!deck || !front.trim() || !back.trim()) return;
    // Clear first so anything typed while the card is being created isn't wiped.
    setFront("");
    setBack("");
    await addCard(deck.id, front, back, deck.src, deck.tgt);
  }

  return (
    <div className="grid gap-6">
      <Link href="/decks" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All decks
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
              <Button type="submit" size="icon" aria-label="Save name">
                <Check />
              </Button>
            </form>
          ) : (
            <h1 className="flex items-center gap-2 font-display text-3xl font-semibold tracking-tight">
              {deck.name}
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Rename deck"
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
            {pairLabel(deck)} · {deckCards.length} cards
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/study?deck=${deck.id}`} className={buttonVariants()}>
            Study
          </Link>
          <Link href={`/quiz?deck=${deck.id}`} className={buttonVariants({ variant: "outline" })}>
            Quiz
          </Link>
          <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 /> Delete deck
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add a card manually</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={add} className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder={`${LANGUAGES[deck.src].name} (front)`}
              value={front}
              dir="auto"
              onChange={(e) => setFront(e.target.value)}
            />
            <Input
              placeholder={`${LANGUAGES[deck.tgt].name} (back)`}
              value={back}
              dir="auto"
              onChange={(e) => setBack(e.target.value)}
            />
            <Button type="submit" disabled={!front.trim() || !back.trim()}>
              <Plus /> Add
            </Button>
          </form>
        </CardContent>
      </Card>

      {deckCards.length === 0 ? (
        <p className="text-muted-foreground">
          No cards yet. Add one above or save translations from the{" "}
          <Link href="/" className="underline">
            Translate
          </Link>{" "}
          page.
        </p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {deckCards.map((c) => (
            <CardRow key={c.id} card={c} />
          ))}
        </ul>
      )}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deck.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the deck and its {deckCards.length} cards. Days you studied still count toward your streak and
              heatmap. Export a backup first if you might want the cards back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                deleteDeck(deck.id);
                router.push("/decks");
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CardRow({ card }: { card: Flashcard }) {
  const [editing, setEditing] = useState(false);
  const [front, setFront] = useState(card.front);
  const [back, setBack] = useState(card.back);
  const [now] = useState(Date.now);
  const dueIn = dueTime(card) - now;

  if (editing) {
    return (
      <li className="flex flex-col gap-2 p-3 sm:flex-row">
        <Input value={front} dir="auto" onChange={(e) => setFront(e.target.value)} />
        <Input value={back} dir="auto" onChange={(e) => setBack(e.target.value)} />
        <div className="flex gap-1">
          <Button
            size="icon"
            aria-label="Save"
            onClick={() => {
              updateCard(card.id, front, back);
              setEditing(false);
            }}
          >
            <Check />
          </Button>
          <Button size="icon" variant="ghost" aria-label="Cancel" onClick={() => setEditing(false)}>
            <X />
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3 p-3">
      <div className="grid min-w-0 flex-1 gap-0.5 sm:grid-cols-2 sm:gap-4">
        <span className="flex items-center gap-1 truncate font-medium" dir="auto">
          {card.front}
          <SpeakButton text={card.front} lang={card.src} />
        </span>
        <span className="flex items-center gap-1 truncate text-muted-foreground" dir="auto">
          {card.back}
          <SpeakButton text={card.back} lang={card.tgt} />
        </span>
      </div>
      <Badge variant="outline" className="hidden sm:inline-flex">
        {STATE_LABEL[card.srs.state]}
      </Badge>
      <span className="w-16 text-right text-xs text-muted-foreground tabular-nums">
        {dueIn <= 0 ? "due" : `in ${formatInterval(dueIn)}`}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Edit card"
        onClick={() => {
          setFront(card.front);
          setBack(card.back);
          setEditing(true);
        }}
      >
        <Pencil />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Delete card"
        onClick={() => {
          deleteCard(card.id);
          toast("Card deleted", { action: { label: "Undo", onClick: () => restoreCard(card) } });
        }}
      >
        <Trash2 />
      </Button>
    </li>
  );
}
