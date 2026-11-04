"use client";

import { Volume2 } from "lucide-react";
import type { ReactNode } from "react";
import { SpeakButton } from "@/components/speak-button";
import { Button } from "@/components/ui/button";
import { useLocale, useT, type Translate } from "@/lib/i18n";
import { LANGUAGES } from "@/lib/languages";
import { cn } from "@/lib/utils";
import type { Picture, Recording } from "@/lib/word/sources";
import { headlineSize, partOfSpeech, type PartOfSpeech } from "@/lib/word/stage";
import type { WordTarget } from "@/lib/word/target";
import { word as messages } from "@/messages/word";

type T = Translate<keyof (typeof messages)["en"]>;

export const dirOf = (lang: string) => (LANGUAGES[lang]?.rtl ? "rtl" : "ltr");

export type HeaderPicture = { kind: "remote"; picture: Picture } | { kind: "local"; src: string } | { kind: "emoji"; emoji: string };
type Text = { text: string; lang: string };

const POS_KEYS = {
  noun: "posNoun",
  verb: "posVerb",
  adjective: "posAdjective",
  adverb: "posAdverb",
  pronoun: "posPronoun",
  preposition: "posPreposition",
  conjunction: "posConjunction",
  interjection: "posInterjection",
  determiner: "posDeterminer",
  numeral: "posNumeral",
} as const satisfies Record<PartOfSpeech, keyof (typeof messages)["en"]>;

/**
 * The word, with its picture on the start side on a computer: its translation (or `translate`, the
 * control that gets one on the device), word type, pronunciation and the learner's own example.
 * English text sits in an isolate, so in right to left it starts on the right like the rest.
 */
export function WordHeader({
  target,
  picture,
  translation,
  translate,
  loading,
  pos,
  phonetic,
  uk,
  us,
  example,
}: {
  target: WordTarget;
  picture: HeaderPicture | null;
  translation: Text | null;
  translate?: ReactNode;
  /** The dictionary is still loading: placeholders for the word type and pronunciation. */
  loading: boolean;
  pos?: string;
  phonetic?: string;
  uk?: Recording;
  us?: Recording;
  /** The learner's own example, when it isn't among the example sentences. */
  example: Text | null;
}) {
  const t = useT(messages);
  const [locale] = useLocale();
  const known = pos ? partOfSpeech(pos) : null;
  // The dictionary's English name in English; elsewhere only the types the interface can name.
  const posText = locale === "en" ? pos : known ? t(POS_KEYS[known]) : undefined;

  return (
    <header className={cn("grid min-w-0 items-end gap-6 md:gap-8", picture && "md:grid-cols-[300px_1fr]")}>
      {picture && <HeaderPictureView picture={picture} word={target.word} lang={target.lang} />}
      {/* A size container: the word shrinks to fit its column, down to 2.25rem, and only then breaks. */}
      <div className="@container grid min-w-0 gap-3">
        <h1
          className="min-w-0 font-display leading-[0.95] font-semibold tracking-tight wrap-anywhere [--word-max:3.75rem] md:[--word-max:6rem]"
          style={{ fontSize: `clamp(2.25rem, ${headlineSize(target.word).toFixed(2)}cqi, var(--word-max))` }}
        >
          <bdi lang={target.lang} dir={dirOf(target.lang)}>
            {target.word}
          </bdi>
        </h1>
        {translation ? (
          <p className="flex items-center gap-2 font-display text-2xl text-primary md:text-3xl">
            <span lang={translation.lang} dir={dirOf(translation.lang)}>
              {translation.text}
            </span>
            <SpeakButton
              text={translation.text}
              lang={translation.lang}
              label={`${t("listen")}: ${translation.text}`}
              className="text-muted-foreground"
            />
          </p>
        ) : (
          translate && <div className="flex">{translate}</div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {loading ? (
            <>
              <span aria-hidden className="h-7 w-16 animate-pulse rounded-full bg-muted" />
              <span aria-hidden className="h-7 w-20 animate-pulse rounded-full bg-muted" />
            </>
          ) : (
            <>
              {posText && <Pill lang={locale}>{posText}</Pill>}
              {phonetic && (
                <Pill lang="en" dir="ltr">
                  {phonetic}
                </Pill>
              )}
              {uk && <RecordingButton label={t("listenUk")} url={uk.url} />}
              {us && <RecordingButton label={t("listenUs")} url={us.url} />}
              {!uk && !us && <SpeakButton text={target.word} lang={target.lang} label={`${t("listen")}: ${target.word}`} />}
            </>
          )}
        </div>
        {example && <YourExample example={example} t={t} />}
      </div>
    </header>
  );
}

function YourExample({ example, t }: { example: Text; t: T }) {
  return (
    <div className="grid gap-0.5">
      <p className="text-xs font-medium text-muted-foreground">{t("yourExample")}</p>
      <p className="flex items-start gap-1">
        <span className="min-w-0 font-display text-lg leading-snug">
          <bdi lang={example.lang} dir={dirOf(example.lang)}>
            {example.text}
          </bdi>
        </span>
        <SpeakButton
          text={example.text}
          lang={example.lang}
          label={`${t("listen")}: ${example.text}`}
          className="text-muted-foreground"
        />
      </p>
    </div>
  );
}

function HeaderPictureView({ picture, word, lang }: { picture: HeaderPicture; word: string; lang: string }) {
  const box = "h-48 w-full overflow-hidden rounded-2xl border bg-muted md:h-56";
  if (picture.kind === "emoji") {
    return (
      <div aria-hidden className={cn(box, "grid place-items-center text-8xl")}>
        {picture.emoji}
      </div>
    );
  }
  if (picture.kind === "local") {
    // eslint-disable-next-line @next/next/no-img-element -- a local data: URL, nothing to optimize
    return <img src={picture.src} alt="" className={cn(box, "object-cover")} />;
  }
  const p = picture.picture;
  return (
    <a href={p.page} target="_blank" rel="noreferrer" className={cn(box, "block outline-none focus-visible:ring-3 focus-visible:ring-ring/50")}>
      {/* The caption comes from the word's Wikipedia (or the list's English file), so it is in the word's language. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- static export, remote Commons thumbnails */}
      <img src={p.thumb} alt={p.caption ?? word} lang={lang} className="size-full object-cover" />
    </a>
  );
}

function Pill({ lang, dir, children }: { lang: string; dir?: "ltr" | "rtl"; children: ReactNode }) {
  return (
    <span lang={lang} dir={dir} className="rounded-full border px-3 py-1 text-sm text-muted-foreground">
      {children}
    </span>
  );
}

/** A recorded pronunciation from the dictionary. */
function RecordingButton({ label, url }: { label: string; url: string }) {
  return (
    <Button
      variant="secondary"
      size="sm"
      className="rounded-full"
      onClick={() => {
        new Audio(url).play().catch(() => {});
      }}
    >
      <Volume2 /> {label}
    </Button>
  );
}
