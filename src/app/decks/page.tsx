"use client";

import { Download, GraduationCap, Plus, Upload } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { NewDeckDialog } from "@/components/new-deck-dialog";
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
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { pairLabel } from "@/lib/languages";
import { isLearned } from "@/lib/srs";
import { dueToday, exportData, importData, parseBackup, useHydrated, useStore, type Data } from "@/lib/store";

export default function DecksPage() {
  const { decks, cards } = useStore();
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // A checked backup waiting for the user to confirm it should replace everything,
  // with the current counts captured when the dialog opened. Kept while the dialog
  // animates closed so its text doesn't change.
  const [pending, setPending] = useState<{ backup: Data; decks: number; cards: number } | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  function download() {
    const url = URL.createObjectURL(new Blob([exportData()], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `linguacards-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function upload(file: File) {
    try {
      setPending({ backup: parseBackup(await file.text()), decks: decks.length, cards: cards.length });
      setImportOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read that file");
    }
  }

  function confirmImport() {
    if (!pending) return;
    setImportOpen(false);
    if (importData(pending.backup)) toast.success("Backup restored");
    else toast.error("The backup is loaded but your browser refused to save it. Free some space and try again.");
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Decks</h1>
          <p className="text-muted-foreground">Everything is saved in this browser’s local storage.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={download} title="Download a JSON backup">
            <Download /> Export
          </Button>
          <Button
            variant="ghost"
            onClick={() => fileRef.current?.click()}
            title="Restore from a JSON backup (replaces current data)"
          >
            <Upload /> Import
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = "";
            }}
          />
          <Button onClick={() => setOpen(true)}>
            <Plus /> New deck
          </Button>
        </div>
      </div>

      {hydrated && decks.length === 0 && (
        <Card className="items-center py-12 text-center">
          <CardHeader className="w-full">
            <CardTitle>No decks yet</CardTitle>
            <CardDescription>Create one, then save translations into it from the Translate page.</CardDescription>
          </CardHeader>
          <Button onClick={() => setOpen(true)}>
            <Plus /> Create your first deck
          </Button>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {decks.map((d) => {
          const deckCards = cards.filter((c) => c.deckId === d.id);
          const due = dueToday(deckCards).length;
          const learned = deckCards.filter((c) => isLearned(c.srs)).length;
          return (
            <Card key={d.id} className="transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">
                  <Link href={`/deck?id=${d.id}`} className="hover:underline">
                    {d.name}
                  </Link>
                </CardTitle>
                <CardDescription>{pairLabel(d)}</CardDescription>
              </CardHeader>
              <div className="grid grid-cols-3 px-6 text-center">
                <Stat label="cards" value={deckCards.length} />
                <Stat label="due" value={due} accent={due > 0} />
                <Stat label="learned" value={learned} />
              </div>
              <CardFooter className="gap-2">
                <Link
                  href={`/study?deck=${d.id}`}
                  className={buttonVariants({ size: "sm", variant: due > 0 ? "default" : "outline" })}
                >
                  <GraduationCap /> Study
                </Link>
                <Link href={`/quiz?deck=${d.id}`} className={buttonVariants({ size: "sm", variant: "outline" })}>
                  Quiz
                </Link>
                <Link href={`/deck?id=${d.id}`} className={buttonVariants({ size: "sm", variant: "ghost" })}>
                  Manage
                </Link>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <NewDeckDialog open={open} onOpenChange={setOpen} />

      <AlertDialog open={importOpen} onOpenChange={setImportOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace all your data?</AlertDialogTitle>
            <AlertDialogDescription>
              The backup has {count(pending?.backup.decks.length ?? 0, "deck")},{" "}
              {count(pending?.backup.cards.length ?? 0, "card")} and {count(pending?.backup.reviews.length ?? 0, "review")}.
              It replaces what is in this browser now ({count(pending?.decks ?? 0, "deck")},{" "}
              {count(pending?.cards ?? 0, "card")}). Export first if you want to keep the current data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="outline" onClick={download}>
              <Download /> Export current
            </Button>
            <AlertDialogAction variant="destructive" onClick={confirmImport}>
              Replace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function count(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div>
      <div className={`text-2xl font-semibold tabular-nums ${accent ? "text-primary" : ""}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
