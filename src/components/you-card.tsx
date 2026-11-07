"use client";

import { useId, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { STARTER_LANGS } from "@/data/starter-packs";
import { LOCALES, useT } from "@/lib/i18n";
import { MAX_NAME } from "@/lib/profile";
import { setProfile, useStore, type LearnerLang } from "@/lib/store";
import { stats } from "@/messages/stats";

/**
 * The learner's name and the language they learn English in. Saving only
 * rewrites the profile: switching language shows that language's words and
 * leaves the other language's words, known words and reviews as they are.
 */
export function YouCard() {
  const { profile } = useStore();
  const t = useT(stats);
  const id = useId();
  // Untouched (null), the fields show what is saved.
  const [langChoice, setLangChoice] = useState<LearnerLang | null>(null);
  const [nameInput, setNameInput] = useState<string | null>(null);

  // The setup gate makes sure there is a profile on the page this card is on.
  if (!profile) return null;
  const lang = langChoice ?? profile.lang;
  const name = nameInput ?? profile.name ?? "";

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    // setProfile cleans the name (30 characters at most); an empty one clears it.
    setProfile({ lang, name });
    setLangChoice(null);
    setNameInput(null);
    toast.success(t("saved"));
  }

  const nameId = `${id}-name`;
  const langHintId = `${id}-lang-hint`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("youTitle")}</CardTitle>
        <CardDescription>
          {profile.name ? t.rich("youName", { name: <bdi>{profile.name}</bdi> }) : t("youNoName")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-5">
          <div className="grid max-w-sm gap-2">
            <label htmlFor={nameId} className="text-sm font-medium">
              {t("nameLabel")}
            </label>
            <Input
              id={nameId}
              value={name}
              onChange={(e) => setNameInput(e.target.value)}
              maxLength={MAX_NAME}
              autoComplete="given-name"
              dir="auto"
            />
          </div>

          <fieldset className="grid max-w-sm gap-2" aria-describedby={langHintId}>
            <legend className="mb-2 text-sm font-medium">{t("langLabel")}</legend>
            <div className="grid grid-cols-2 gap-2">
              {STARTER_LANGS.map((code) => (
                // Each name is written in its own language, so it reads the same whatever the interface language.
                <label
                  key={code}
                  lang={code}
                  dir={LOCALES[code].dir}
                  className="flex min-h-12 cursor-pointer items-center justify-center rounded-xl border-2 bg-card px-3 py-2 text-center font-medium transition-colors hover:bg-muted has-checked:border-primary has-checked:bg-primary/10 has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
                >
                  <input
                    type="radio"
                    name={`${id}-lang`}
                    value={code}
                    checked={lang === code}
                    onChange={() => setLangChoice(code)}
                    aria-label={LOCALES[code].name}
                    className="sr-only"
                  />
                  {LOCALES[code].name}
                </label>
              ))}
            </div>
            <p id={langHintId} className="text-xs text-muted-foreground">
              {t("langHint")}
            </p>
          </fieldset>

          <div>
            <Button type="submit">
              {t("save")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
