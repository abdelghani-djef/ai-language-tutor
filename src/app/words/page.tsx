"use client";

import { Check, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { STARTER_LANGS, STARTER_PACKS, type StarterLang, type StarterPack } from "@/data/starter-packs";
import { useFormat } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n";
import { addCards, createDeck, saveFailed, useHydrated, usePref, useStore, type Deck } from "@/lib/store";
import { cn } from "@/lib/utils";
import { cards as cardMessages } from "@/messages/cards";
import { words as messages } from "@/messages/words";

const LANG_KEY = "linguacards:starter-lang";
/** JSON map of translation language → the starter deck's id. */
const DECK_KEY = "linguacards:starter-decks";
const PREVIEW = 8;

const isStarterLang = (v: string): v is StarterLang => (STARTER_LANGS as readonly string[]).includes(v);

export default function StarterWordsPage() {
  const t = useT(messages);
  const tc = useT(cardMessages);
  const fmt = useFormat();
  const [locale] = useLocale();
  const hydrated = useHydrated();
  const { decks, cards, settings } = useStore();
  // Translations default to the interface language when the packs have it.
  const [langPref, setLangPref] = usePref(LANG_KEY, "");
  const lang: StarterLang = isStarterLang(langPref) ? langPref : isStarterLang(locale) ? locale : "fr";
  const [deckPref, setDeckPref] = usePref(DECK_KEY, "{}");
  const [adding, setAdding] = useState<string | null>(null);
  const router = useRouter();

  let deckIds: Record<string, string> = {};
  try {
    deckIds = JSON.parse(deckPref);
  } catch {
    // A damaged preference just means the deck is looked up again.
  }
  // The saved deck, or after a restore (preferences aren't in backups) the deck that holds this language's pack cards.
  const deck: Deck | undefined =
    decks.find((d) => d.id === deckIds[lang] && d.src === "en" && d.tgt === lang) ??
    decks.find((d) => d.src === "en" && d.tgt === lang && cards.some((c) => c.deckId === d.id && c.pack));
  const addedPacks = new Set(cards.filter((c) => deck && c.deckId === deck.id && c.pack).map((c) => c.pack));
  const firstNotAdded = STARTER_PACKS.find((p) => !addedPacks.has(p.id))?.id;

  async function addPack(pack: StarterPack) {
    if (adding) return;
    setAdding(pack.id);
    try {
      const target = deck ?? createDeck(t("deckName", { lang: fmt.languageNameInline(lang) }), "en", lang);
      if (!deck) setDeckPref(JSON.stringify({ ...deckIds, [lang]: target.id }));
      const made = await addCards(
        target.id,
        "en",
        lang,
        pack.words.map(([en, fr, ar, emoji, example]) => ({
          front: en,
          back: lang === "fr" ? fr : ar,
          pack: pack.id,
          exampleLang: "en",
          details: { example, emoji: emoji || undefined, tags: [pack.title[locale]] },
        })),
      );
      if (saveFailed()) toast.error(tc("saveFailed"));
      else
        toast.success(t("addedToast", { count: made.length, deck: target.name }), {
          description: t("addedHint", { count: settings.newPerDay }),
          action: { label: t("study"), onClick: () => router.push(`/study?deck=${target.id}`) },
        });
    } finally {
      setAdding(null);
    }
  }

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid max-w-2xl gap-2">
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("intro")}</p>
        </div>
        <div className="grid gap-1.5">
          <span id="starter-lang" className="text-sm text-muted-foreground">
            {t("translations")}
          </span>
          <Tabs value={lang} onValueChange={(v) => isStarterLang(String(v)) && setLangPref(String(v))}>
            <TabsList aria-labelledby="starter-lang">
              {STARTER_LANGS.map((l) => (
                <TabsTrigger key={l} value={l}>
                  {fmt.languageName(l)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {hydrated && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STARTER_PACKS.map((pack) => {
            const added = addedPacks.has(pack.id);
            const highlight = pack.id === firstNotAdded;
            return (
              <li
                key={pack.id}
                className={cn(
                  "grid content-start gap-3 rounded-2xl border bg-card p-5",
                  highlight && "border-primary/50 ring-3 ring-primary/15",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
                    <span className="text-2xl" aria-hidden>
                      {pack.emoji}
                    </span>
                    {pack.title[locale]}
                  </h2>
                  {highlight && (
                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {t("startHere")}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {/* The English list is its own left-to-right run inside the page's direction. */}
                  <bdi lang="en" dir="ltr">
                    {pack.words
                      .slice(0, PREVIEW)
                      .map(([en]) => en)
                      .join(", ")}
                  </bdi>{" "}
                  {t("andMore", { count: pack.words.length - PREVIEW })}
                </p>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">{t("wordCount", { count: pack.words.length })}</span>
                  {added ? (
                    <span className="flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      <Check className="size-4" aria-hidden /> {t("added")}
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant={highlight ? "default" : "outline"}
                      disabled={adding !== null}
                      onClick={() => addPack(pack)}
                    >
                      <Plus /> {t("addPack")}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <section className="grid max-w-2xl gap-2">
        <h2 className="font-display text-xl font-semibold">{t("why")}</h2>
        <p className="text-muted-foreground">{t("whyText")}</p>
        {deck && (
          <div>
            <Link href={`/study?deck=${deck.id}`} className={buttonVariants({ className: "mt-2" })}>
              {t("study")}
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
