"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { STARTER_LANGS } from "@/data/starter-packs";
import { LOCALES, useLocale, useT } from "@/lib/i18n";
import { myCards } from "@/lib/mywords";
import { afterSetup, guessLang, MAX_NAME } from "@/lib/profile";
import { setProfile, useHydrated, usePref, useStore, type LearnerLang } from "@/lib/store";
import { start as messages } from "@/messages/start";

/** The ready-made lists' translation language from version 1. Read once here, then dropped. */
const STARTER_LANG_KEY = "linguacards:starter-lang";

export default function StartPageWrapper() {
  return (
    <Suspense>
      <StartPage />
    </Suspense>
  );
}

/** "/start/?next=/study/": the learner's language and name, asked once before the pages that need them. */
function StartPage() {
  const next = useSearchParams().get("next");
  const router = useRouter();
  const t = useT(messages);
  const [locale] = useLocale();
  const hydrated = useHydrated();
  const { cards, profile } = useStore();
  const [starterPref] = usePref(STARTER_LANG_KEY, "");
  // Untouched, the choices show what is saved, or the best guess for a first visit.
  const [langChoice, setLangChoice] = useState<LearnerLang | null>(null);
  const [nameInput, setNameInput] = useState<string | null>(null);

  if (!hydrated) return null;

  // Once there is a profile (another tab finished setup, or a bookmark), the language is
  // changed only on Stats, which asks before deleting the other language's words.
  const lang = profile?.lang ?? langChoice ?? guessLang(cards, starterPref, locale);
  const name = nameInput ?? profile?.name ?? "";

  /** Saves the language, and the name unless skipped, then goes on (see afterSetup). */
  function finish(withName: boolean) {
    setProfile({ lang, name: withName ? name : undefined });
    try {
      localStorage.removeItem(STARTER_LANG_KEY);
    } catch {
      // Storage blocked: the old preference is harmless once the profile exists.
    }
    const mine = myCards({ cards, profile: { lang, setupAt: 0 } });
    router.replace(afterSetup(next, mine.length > 0));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    finish(true);
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto grid w-full max-w-lg gap-8">
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        {t.rich("title", {
          app: (
            <bdi lang="en" dir="ltr">
              LinguaCards
            </bdi>
          ),
        })}
      </h1>

      <fieldset className="grid gap-3" aria-describedby="learner-lang-hint">
        <legend className="mb-1 font-display text-xl font-semibold">
          <span className="text-muted-foreground">1.</span> {t("langQuestion")}
        </legend>
        <p id="learner-lang-hint" className="text-sm text-muted-foreground">
          {t("langHint")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {STARTER_LANGS.map((code) => (
            // Each name is written in its own language, so it is readable whatever the interface language.
            <label
              key={code}
              lang={code}
              dir={LOCALES[code].dir}
              className="flex min-h-24 cursor-pointer items-center justify-center rounded-2xl border-2 bg-card p-4 text-center font-display text-2xl font-semibold transition-colors hover:bg-muted has-checked:border-primary has-checked:bg-primary/10 has-focus-visible:ring-3 has-focus-visible:ring-ring/50 has-disabled:cursor-not-allowed has-disabled:opacity-50"
            >
              <input
                type="radio"
                name="lang"
                value={code}
                checked={lang === code}
                disabled={!!profile && code !== profile.lang}
                onChange={() => setLangChoice(code)}
                aria-label={LOCALES[code].name}
                className="sr-only"
              />
              {LOCALES[code].name}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-3">
        <label htmlFor="learner-name" className="mb-1 font-display text-xl font-semibold">
          <span className="text-muted-foreground">2.</span> {t("nameQuestion")}
        </label>
        <p id="learner-name-hint" className="text-sm text-muted-foreground">
          {t("nameHint")}
        </p>
        <Input
          id="learner-name"
          value={name}
          onChange={(e) => setNameInput(e.target.value)}
          maxLength={MAX_NAME}
          placeholder={t("namePlaceholder")}
          aria-describedby="learner-name-hint"
          autoComplete="given-name"
          dir="auto"
          className="h-10 text-base"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" className="px-5">
          {t("continue")}
        </Button>
        <Button type="button" variant="ghost" size="lg" onClick={() => finish(false)}>
          {t("skip")}
        </Button>
      </div>
    </form>
  );
}
