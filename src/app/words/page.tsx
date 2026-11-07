"use client";

import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useId, useMemo, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { isAdvanced, packWords, STARTER_PACKS, type StarterPack } from "@/data/starter-packs";
import { useLocale, useT } from "@/lib/i18n";
import { packProgress, sortedPacks } from "@/lib/mywords";
import { useStarterWords } from "@/lib/starter-words";
import { useHydrated, useStore, type LearnerLang } from "@/lib/store";
import { cn } from "@/lib/utils";
import { wordHref } from "@/lib/word/target";
import { words as messages } from "@/messages/words";

const PREVIEW = 8;

type Progress = ReturnType<typeof packProgress>;

// Regular lists first, then the advanced ones. This is also the order the
// ticked lists are sorted in.
const REGULAR = STARTER_PACKS.filter((p) => !isAdvanced(p.id));
const ADVANCED = STARTER_PACKS.filter((p) => isAdvanced(p.id));
const ORDERED = [...REGULAR, ...ADVANCED];

export default function PickListsPage() {
  const t = useT(messages);
  const [locale] = useLocale();
  const hydrated = useHydrated();
  const data = useStore();
  const router = useRouter();
  const idBase = useId();
  // The setup gate makes sure there is a profile on this page.
  const lang: LearnerLang = data.profile?.lang ?? "fr";
  const [picked, setPicked] = useState<ReadonlySet<string>>(() => new Set());
  // The lists' words: the previews and how far each list is sorted. The lists show once they are here.
  const words = useStarterWords();
  const ready = hydrated && !!words;

  const progress = useMemo(
    () => new Map(words ? STARTER_PACKS.map((p) => [p.id, packProgress(data, p.id, words)]) : []),
    [data, words],
  );
  const anySorted = useMemo(() => !!words && sortedPacks(data, words).size > 0, [data, words]);

  // A list sorted to the end since it was ticked (say, in another tab) drops out.
  const chosen = ORDERED.filter((p) => picked.has(p.id) && (progress.get(p.id)?.left ?? 0) > 0);
  const count = chosen.reduce((sum, p) => sum + (progress.get(p.id)?.left ?? 0), 0);

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  // Card titles are h2 among the regular lists and h3 under the advanced heading.
  const card = (pack: StarterPack, Heading: "h2" | "h3" = "h2") => {
    const rows = (words && packWords(words, pack.id)) ?? [];
    const p: Progress = progress.get(pack.id) ?? { total: rows.length, known: 0, learn: 0, left: rows.length };
    const done = p.left === 0;
    const checked = !done && picked.has(pack.id);
    const inputId = `${idBase}-${pack.id}`;
    const statusId = `${inputId}-status`;
    return (
      <li
        key={pack.id}
        // The title's label stretches over the whole card (its ::after), so a
        // click anywhere ticks the box; the box and the word links sit above it.
        className={cn(
          "relative grid content-start gap-3 rounded-2xl border bg-card p-5 transition-colors",
          "has-[input:focus-visible]:ring-3 has-[input:focus-visible]:ring-ring/50",
          checked && "border-primary/60 bg-primary/5 ring-3 ring-primary/15",
          done && "bg-muted/40",
          !done && !checked && "hover:border-primary/40",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <Heading className="font-display text-xl font-semibold">
            <label
              htmlFor={inputId}
              className={cn(
                "flex items-center gap-2 after:absolute after:inset-0 after:rounded-2xl",
                done ? "cursor-default" : "cursor-pointer",
              )}
            >
              <span className="text-2xl" aria-hidden>
                {pack.emoji}
              </span>
              {pack.title[locale]}
            </label>
          </Heading>
          <input
            id={inputId}
            type="checkbox"
            checked={checked}
            disabled={done}
            onChange={() => toggle(pack.id)}
            aria-describedby={statusId}
            className="relative z-10 mt-1 size-5 shrink-0 scroll-mb-28 cursor-pointer accent-primary disabled:cursor-default"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {/* The English list is its own left-to-right run inside the page's direction. */}
          <bdi lang="en" dir="ltr">
            {rows.slice(0, PREVIEW).map(([en], i) => (
              <Fragment key={en}>
                {i > 0 && ", "}
                <Link
                  href={wordHref({ word: en, lang: "en", to: lang, pack: pack.id })}
                  className="relative z-10 scroll-mb-28 underline-offset-2 hover:text-foreground hover:underline"
                >
                  {en}
                </Link>
              </Fragment>
            ))}
          </bdi>{" "}
          {t("andMore", { count: rows.length - PREVIEW })}
        </p>
        <p id={statusId} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span>{t("wordCount", { count: p.total })}</span>
          {done ? (
            <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
              <Check className="size-4" aria-hidden /> {t("allSorted", { known: p.known, learn: p.learn })}
            </span>
          ) : (
            p.left < p.total && <span className="font-medium text-foreground">{t("leftToSort", { count: p.left })}</span>
          )}
        </p>
      </li>
    );
  };

  return (
    <div className="grid gap-8">
      <div className="grid max-w-2xl gap-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("intro")}</p>
        <p className="font-medium">{t("pickHint")}</p>
      </div>

      {ready && (
        // The bar is the last thing in this block, so it stops above the footer.
        <div className="grid gap-8">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{REGULAR.map((p) => card(p))}</ul>

          {ADVANCED.length > 0 && (
            <section className="grid gap-4" aria-labelledby={`${idBase}-advanced`}>
              <h2 id={`${idBase}-advanced`} className="font-display text-2xl font-semibold">
                {t("advancedTitle")}
              </h2>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{ADVANCED.map((p) => card(p, "h3"))}</ul>
            </section>
          )}

          <div className="sticky bottom-[max(1rem,env(safe-area-inset-bottom))] z-20 flex justify-end rounded-2xl border bg-background/95 p-3 shadow-lg backdrop-blur">
            <Button
              size="lg"
              className="h-11 w-full px-5 text-base sm:w-auto"
              disabled={chosen.length === 0}
              onClick={() => router.push("/sort/?lists=" + chosen.map((p) => p.id).join(","))}
            >
              {t("continueWith", { count })} <ArrowRight className="rtl:rotate-180" aria-hidden />
            </Button>
          </div>
        </div>
      )}

      <section className="grid max-w-2xl gap-2">
        <h2 className="font-display text-xl font-semibold">{t("why")}</h2>
        <p className="text-muted-foreground">{t("whyText")}</p>
        {ready && anySorted && (
          <div className="mt-2 flex flex-wrap gap-2">
            <Link href="/study" className={buttonVariants()}>
              {t("study")}
            </Link>
            <Link href="/story" className={buttonVariants({ variant: "outline" })}>
              {t("stories")}
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
