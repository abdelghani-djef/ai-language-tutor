"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { WordView } from "@/components/word/word-view";
import { Button, buttonVariants } from "@/components/ui/button";
import { STARTER_LANGS, type StarterLang } from "@/data/starter-packs";
import { useLocale, useT } from "@/lib/i18n";
import { useStarterWords } from "@/lib/starter-words";
import { useHydrated, useStore } from "@/lib/store";
import { targetFromCard, targetFromParams } from "@/lib/word/target";
import { common } from "@/messages/common";
import { word as messages } from "@/messages/word";

const isStarterLang = (v: string): v is StarterLang => (STARTER_LANGS as readonly string[]).includes(v);

export default function WordPageWrapper() {
  return (
    <Suspense>
      <WordPage />
    </Suspense>
  );
}

/** "/word/?w=bread&lang=en&to=fr[&card=…]": the word page for links from lists, Add words and other word pages. */
function WordPage() {
  const params = useSearchParams();
  const router = useRouter();
  const t = useT(messages);
  const tc = useT(common);
  const [locale] = useLocale();
  const hydrated = useHydrated();
  const { cards, profile } = useStore();
  // The lists' words: which list the word is in, and its row there.
  const words = useStarterWords();

  if (!hydrated || !words) return null;

  // A word that isn't saved is translated into the learner's language.
  const starterLang = profile?.lang ?? (isStarterLang(locale) ? locale : "fr");
  const card = cards.find((c) => c.id === params.get("card"));
  const target = card ? targetFromCard(card, words) : targetFromParams(params, starterLang, words);

  if (!target) {
    return (
      <div className="grid justify-items-start gap-3">
        <p>{t("notFound")}</p>
        <Link href="/my-words/" className={buttonVariants({ variant: "outline" })}>
          {tc("navDecks")}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <Button
        variant="ghost"
        size="sm"
        className="-ms-2.5 w-fit"
        // Opened from another site or a fresh tab, there is nothing to go back to.
        onClick={() => (window.history.length > 1 ? router.back() : router.push("/my-words/"))}
      >
        <ArrowLeft className="rtl:rotate-180" /> {t("back")}
      </Button>
      <WordView target={target} />
    </div>
  );
}
