"use client";

import { Download, GraduationCap, Library, PenLine, Plus, Upload } from "lucide-react";
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
import { useFormat } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { isLearned } from "@/lib/srs";
import {
  dueCount,
  exportData,
  importData,
  parseBackup,
  useHydrated,
  useStore,
  useToday,
  type Data,
} from "@/lib/store";
import { decks as decksMessages } from "@/messages/decks";

export default function DecksPage() {
  const store = useStore();
  const { decks, cards } = store;
  const today = useToday();
  const hydrated = useHydrated();
  const t = useT(decksMessages);
  const fmt = useFormat();
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
    } catch {
      // parseBackup's errors are English; any failure means the file isn't usable.
      toast.error(t("invalidBackup"));
    }
  }

  function confirmImport() {
    if (!pending) return;
    setImportOpen(false);
    if (importData(pending.backup)) toast.success(t("restored"));
    else toast.error(t("saveRefused"));
  }

  return (
    <div className="grid gap-8">
      <div className="grid gap-1">
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("intro")}</p>
      </div>

      {/* Three ways to add words. Ready-made lists are the start for beginners, so they get the big tile. */}
      <section aria-labelledby="ways-title" className="grid gap-3">
        <h2 id="ways-title" className="text-sm text-muted-foreground">
          {t("waysTitle")}
        </h2>
        <div className="grid gap-3 md:grid-cols-[1.4fr_1fr]">
          <Link
            href="/words"
            className="group grid content-between gap-6 rounded-3xl border-2 border-primary/40 bg-primary/5 p-6 transition-colors hover:border-primary hover:bg-primary/10"
          >
            <span className="grid gap-2">
              <Library className="size-9 text-primary" aria-hidden />
              <span className="font-display text-2xl font-semibold">{t("readyTitle")}</span>
              <span className="text-muted-foreground">{t("readyText")}</span>
            </span>
            <span className={buttonVariants({ className: "justify-self-start" })}>{t("readyCta")}</span>
          </Link>
          <div className="grid gap-3">
            <Link
              href="/add"
              className="grid gap-1 rounded-2xl border bg-card p-5 transition-colors hover:border-primary/60 hover:bg-muted/50"
            >
              <span className="flex items-center gap-2 font-display text-lg font-semibold">
                <PenLine className="size-5 text-primary" aria-hidden /> {t("ownTitle")}
              </span>
              <span className="text-sm text-muted-foreground">{t("ownText")}</span>
            </Link>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="grid gap-1 rounded-2xl border bg-card p-5 text-start transition-colors hover:border-primary/60 hover:bg-muted/50"
            >
              <span className="flex items-center gap-2 font-display text-lg font-semibold">
                <Plus className="size-5 text-primary" aria-hidden /> {t("emptyListTitle")}
              </span>
              <span className="text-sm text-muted-foreground">{t("emptyListText")}</span>
            </button>
          </div>
        </div>
      </section>

      {hydrated && decks.length > 0 && (
        <h2 className="font-display text-2xl font-semibold">{t("yourLists", { count: decks.length })}</h2>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {decks.map((d) => {
          const deckCards = cards.filter((c) => c.deckId === d.id);
          const due = dueCount(store, today, d.id);
          const learned = deckCards.filter((c) => isLearned(c.srs)).length;
          return (
            <Card key={d.id} className="transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">
                  <Link href={`/deck?id=${d.id}`} className="hover:underline">
                    {d.name}
                  </Link>
                </CardTitle>
                <CardDescription>{fmt.pairLabel(d)}</CardDescription>
              </CardHeader>
              <div className="grid grid-cols-3 px-6 text-center">
                <Stat label={t("statCards", { count: deckCards.length })} value={fmt.number(deckCards.length)} />
                <Stat label={t("statDue", { count: due })} value={fmt.number(due)} accent={due > 0} />
                <Stat label={t("statLearned", { count: learned })} value={fmt.number(learned)} />
              </div>
              <CardFooter className="gap-2">
                <Link
                  href={`/study?deck=${d.id}`}
                  className={buttonVariants({ size: "sm", variant: due > 0 ? "default" : "outline" })}
                >
                  <GraduationCap /> {t("study")}
                </Link>
                <Link href={`/quiz?deck=${d.id}`} className={buttonVariants({ size: "sm", variant: "outline" })}>
                  {t("quiz")}
                </Link>
                <Link href={`/deck?id=${d.id}`} className={buttonVariants({ size: "sm", variant: "ghost" })}>
                  {t("manage")}
                </Link>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <section aria-labelledby="backup-title" className="grid gap-2 border-t pt-6">
        <h2 id="backup-title" className="font-medium">
          {t("backupTitle")}
        </h2>
        <p className="max-w-[60ch] text-sm text-muted-foreground">{t("savedLocally")}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={download} title={t("exportTitle")}>
            <Download /> {t("export")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} title={t("importTitle")}>
            <Upload /> {t("import")}
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
        </div>
      </section>

      <NewDeckDialog open={open} onOpenChange={setOpen} />

      <AlertDialog open={importOpen} onOpenChange={setImportOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("replaceTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("backupHas", {
                decks: t("deckCount", { count: pending?.backup.decks.length ?? 0 }),
                cards: t("cardCount", { count: pending?.backup.cards.length ?? 0 }),
                reviews: t("reviewCount", { count: pending?.backup.reviews.length ?? 0 }),
              })}{" "}
              {t("replacesNow", {
                decks: t("deckCount", { count: pending?.decks ?? 0 }),
                cards: t("cardCount", { count: pending?.cards ?? 0 }),
              })}{" "}
              {t("exportFirst")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <Button variant="outline" onClick={download}>
              <Download /> {t("exportCurrent")}
            </Button>
            <AlertDialogAction variant="destructive" onClick={confirmImport}>
              {t("replace")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className={`text-2xl font-semibold tabular-nums ${accent ? "text-primary" : ""}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
