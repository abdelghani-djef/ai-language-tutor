"use client";

import { Languages } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { SpeakButton } from "@/components/speak-button";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { packWords, type StarterRow, type StarterWords } from "@/data/starter-packs";
import { useFormat } from "@/lib/format";
import { LOCALES, useLocale, useT, type Translate } from "@/lib/i18n";
import { useStore, type Flashcard } from "@/lib/store";
import { useTranslator } from "@/lib/useTranslator";
import { useStarterWords } from "@/lib/starter-words";
import { cn } from "@/lib/utils";
import type { Picture, Recording, Sentence } from "@/lib/word/sources";
import { cleanWord, packOf, wordHref, type WordTarget } from "@/lib/word/target";
import { isModelCached, translatorFor } from "@/lib/word/translate";
import { useWordData, type Section } from "@/lib/word/useWordData";
import { word as messages } from "@/messages/word";
import { SceneStage } from "./scene-stage";
import { WordHeader, dirOf, type HeaderPicture } from "./word-header";

type T = Translate<keyof (typeof messages)["en"]>;

const MAX_SENSES = 3;
/** Dictionary examples shown before Tatoeba's sentences. */
const MAX_DICTIONARY_EXAMPLES = 3;
const MAX_PICTURES = 4;
const MAX_EXTRACT = 300;
/** Credit for a Commons picture whose source names no author or licence (its page has them). */
const COMMONS = "Wikimedia Commons";
const DICTIONARY_NAME = { "free-dictionary": "Free Dictionary API", wiktionary: "Wiktionary" } as const;

const keyOf = (t: WordTarget) => `${t.word}|${t.lang}|${t.to}`;

/**
 * Everything about one word, top to bottom: the word with its picture, translation and
 * pronunciation; its scenes (ready-made words) or example sentences (own words); pictures; then
 * meaning, word partners and "Did you know?" (three columns on a computer); and the credits.
 * Online sections fill in as they arrive, each with its own loading and "couldn't load" state.
 * `onOpenWord`: open a word partner in place (the overlay); without it, partners are links.
 */
export function WordView(props: { target: WordTarget; onOpenWord?: (t: WordTarget) => void }) {
  // "Try again" starts over: every section is fetched again (answers already cached come back at once).
  const [attempt, setAttempt] = useState(0);
  // The lists' words, for the word's own row and its partners. The pages that make a target have
  // loaded them already, so this is only a safeguard.
  const words = useStarterWords();
  if (!words) return null;
  return <View key={`${keyOf(props.target)}|${attempt}`} {...props} words={words} retry={() => setAttempt((n) => n + 1)} />;
}

type Example = { text: string; translation?: string; sentence?: Sentence };
type Shown = "loading" | "failed" | "ready" | "hidden";

/** How a section shows: as its loading or failed state, with its content, or not at all when empty. */
function shownOf<D>(section: Section<D>, empty: (data: D) => boolean): Shown {
  if (section.status !== "ready") return section.status;
  return empty(section.data) ? "hidden" : "ready";
}

/** The row for the word in its ready-made list (`target.pack`, the card's own): [English, French, Arabic, emoji, example]. */
function packRow(target: WordTarget, words: StarterWords): StarterRow | undefined {
  if (!target.pack) return undefined;
  const w = target.word.toLowerCase();
  return packWords(words, target.pack)?.find((row) => cleanWord(row[0]).toLowerCase() === w);
}

/** The saved word's other side: the page's word in the learner's language. */
function cardTranslation(card: Flashcard, target: WordTarget): { text: string; lang: string } {
  return card.src === target.lang ? { text: card.back, lang: card.tgt } : { text: card.front, lang: card.src };
}

/** The first ~300 characters, cut at a word. */
function shorten(text: string, max = MAX_EXTRACT): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max / 2 ? cut.slice(0, space) : cut).replace(/[\s,;:.]+$/, "")}…`;
}

function pictureCredit(p: Picture, t: T): string {
  return p.author && p.licence ? t("creditPicture", { author: p.author, licence: p.licence }) : (p.author ?? p.licence ?? COMMONS);
}

type Job = { from: string; text: string };
const jobKey = (j: Job) => `${j.from}|${j.text}`;

/**
 * Translations into `to` with the on-device translator, one text at a time (one queue for the
 * whole page). They start on their own only when the model is already in the browser's cache;
 * otherwise `offer` is true and nothing is downloaded until `start()` (the "Translate" button).
 */
function useTranslations(jobs: Job[], to: string) {
  const { translate, status, progress } = useTranslator();
  /** Models already in the browser's cache. */
  const [cached, setCached] = useState<ReadonlySet<string>>(new Set());
  const [wanted, setWanted] = useState(false);
  /** Job key → its translation, or null when translating it failed. */
  const [done, setDone] = useState<ReadonlyMap<string, string | null>>(new Map());
  const running = useRef(false);
  const choiceOf = (from: string) => (from === to ? null : translatorFor(from, to));

  const models = [...new Set(jobs.map((j) => choiceOf(j.from)?.model).filter((m) => m !== undefined))].sort().join(" ");
  useEffect(() => {
    if (!models) return;
    let live = true;
    Promise.all(models.split(" ").map(async (m) => ((await isModelCached(m)) ? [m] : []))).then(
      (found) => live && setCached(new Set(found.flat())),
    );
    return () => {
      live = false;
    };
  }, [models]);

  const next = jobs.find((j) => {
    const choice = choiceOf(j.from);
    return choice && !done.has(jobKey(j)) && (wanted || cached.has(choice.model));
  });
  const nextFrom = next?.from;
  const nextText = next?.text;

  useEffect(() => {
    const choice = nextFrom !== undefined && nextFrom !== to ? translatorFor(nextFrom, to) : null;
    if (!choice || nextText === undefined || running.current) return;
    running.current = true;
    translate(nextText, choice).then((result) => {
      running.current = false;
      setDone((d) => new Map(d).set(jobKey({ from: nextFrom!, text: nextText }), result?.trim() || null));
    });
    // `done` is a dependency so the queue moves on once a result is in, even when the next job is unchanged.
  }, [nextFrom, nextText, to, translate, done]);

  const busy = status === "loading" || status === "translating";
  const waiting = (from: string, texts: string[]) => texts.filter((text) => !done.has(jobKey({ from, text })));
  return {
    get: (from: string, text: string) => done.get(jobKey({ from, text })) ?? undefined,
    /** Show "Translate" for these texts: their model isn't downloaded yet, or translating failed. */
    offer: (from: string, texts: string[]) => {
      const choice = choiceOf(from);
      if (!choice) return false;
      const failed = texts.some((text) => done.get(jobKey({ from, text })) === null);
      return (!cached.has(choice.model) && !wanted && waiting(from, texts).length > 0) || (status === "error" && failed);
    },
    /** Show "Translating…" for these texts. */
    working: (from: string, texts: string[]) => busy && !!choiceOf(from) && waiting(from, texts).length > 0,
    /** Download progress (0–1) while the model loads, else null. */
    progress: status === "loading" ? progress : null,
    start: () => {
      setWanted(true);
      setDone((d) => new Map([...d].filter(([, v]) => v !== null)));
    },
  };
}

function View({
  target,
  onOpenWord,
  words,
  retry,
}: {
  target: WordTarget;
  onOpenWord?: (t: WordTarget) => void;
  words: StarterWords;
  retry: () => void;
}) {
  const t = useT(messages);
  const [locale] = useLocale();
  const { cards } = useStore();
  const data = useWordData(target, words);
  const card = target.cardId ? cards.find((c) => c.id === target.cardId) : undefined;
  const row = packRow(target, words);
  const rtl = LOCALES[locale].dir === "rtl";
  const wordAttrs = { lang: target.lang, dir: dirOf(target.lang) } as const;

  const scenes = data.scenes.status === "ready" ? data.scenes.data : null;
  const readyMade = !!scenes?.scenes.length;
  const entry = data.dictionary.status === "ready" ? data.dictionary.data : null;
  const article = data.article.status === "ready" ? data.article.data : null;
  const senses = entry?.senses.slice(0, MAX_SENSES) ?? [];

  // ---- header: the saved card's translation, its list's, or else one from the on-device translator
  const fixedTranslation = card
    ? cardTranslation(card, target)
    : row && (target.to === "fr" || target.to === "ar")
      ? { text: target.to === "fr" ? row[1] : row[2], lang: target.to }
      : null;
  const wordJobs = fixedTranslation ? [] : [target.word];
  const packPicture = readyMade && data.pictures.status === "ready" ? data.pictures.data[0] : undefined;
  const emoji = card?.emoji || row?.[3];
  const header: HeaderPicture | null = packPicture
    ? { kind: "remote", picture: packPicture }
    : card?.image
      ? { kind: "local", src: card.image }
      : emoji
        ? { kind: "emoji", emoji }
        : article?.image
          ? { kind: "remote", picture: article.image }
          : null;
  const headerRemote = header?.kind === "remote" ? header.picture : undefined;
  const uk = entry?.recordings.find((r) => r.accent === "uk");
  const us = entry?.recordings.find((r) => r.accent === "us");

  // ---- example sentences (own words): the saved example, the dictionary's, then Tatoeba's
  const showExamples = data.scenes.status !== "loading" && !readyMade;
  const ownExample = card?.example && card.example.trim() !== row?.[4]?.trim() ? card.example : undefined;
  const ownExampleLang = card?.exampleLang ?? card?.tgt ?? target.lang;
  // With scenes (or when it isn't in the word's language), the learner's own example, not the
  // list's, is shown under the word instead.
  const yourExample =
    ownExample && (readyMade || ownExampleLang !== target.lang) ? { text: ownExample, lang: ownExampleLang } : null;
  const examples: Example[] = [];
  if (showExamples) {
    const seen = new Set<string>();
    const add = (text: string, sentence?: Sentence) => {
      const key = text.trim().toLowerCase();
      if (!key || seen.has(key)) return;
      seen.add(key);
      examples.push(sentence ? { text, translation: sentence.translation, sentence } : { text });
    };
    if (card?.example && ownExampleLang === target.lang) add(card.example);
    for (const s of (entry?.senses ?? []).filter((s) => s.example).slice(0, MAX_DICTIONARY_EXAMPLES)) add(s.example!);
    if (data.sentences.status === "ready") for (const s of data.sentences.data) add(s.text, s);
  }
  const untranslated = examples.filter((e) => !e.translation).map((e) => e.text);
  const definitions = senses.map((s) => s.definition);
  // Definitions are English in both dictionaries (en.wiktionary.org explains every language in English).
  const tr = useTranslations(
    [
      ...wordJobs.map((text) => ({ from: target.lang, text })),
      ...untranslated.map((text) => ({ from: target.lang, text })),
      ...definitions.map((text) => ({ from: "en", text })),
    ],
    target.to,
  );
  const translatedWord = fixedTranslation ? undefined : tr.get(target.lang, target.word);
  const translation = fixedTranslation ?? (translatedWord ? { text: translatedWord, lang: target.to } : null);
  const wordWorking = tr.working(target.lang, wordJobs);
  const wordOffer = tr.offer(target.lang, wordJobs);

  const examplesShown: Shown = !showExamples
    ? "hidden"
    : examples.length
      ? "ready"
      : data.sentences.status === "loading" || data.dictionary.status === "loading"
        ? "loading"
        : data.sentences.status === "failed"
          ? "failed"
          : "hidden";

  // ---- pictures, beyond the one in the header
  const gallery =
    data.pictures.status === "ready"
      ? data.pictures.data.filter((p) => p.page !== headerRemote?.page).slice(0, MAX_PICTURES)
      : [];
  const picturesShown = data.pictures.status === "ready" ? (gallery.length ? "ready" : "hidden") : data.pictures.status;

  // ---- the three columns
  const meaningShown = shownOf(data.dictionary, (d) => !d?.senses.length);
  const partnersShown = shownOf(data.partners, (d) => !d.length);
  const articleShown = shownOf(data.article, (d) => !d);
  const columns = [meaningShown, partnersShown, articleShown].filter((s) => s !== "hidden").length;

  // ---- credits
  const credited = [headerRemote, ...gallery].filter((p): p is Picture => !!p);
  const sentenceCredits = [
    ...new Set(
      examples.flatMap((e) =>
        e.sentence?.source === "tatoeba" && e.sentence.author
          ? [t("creditSentence", { author: e.sentence.author, licence: e.sentence.licence })]
          : [],
      ),
    ),
  ];
  const recordings = [
    uk && { label: t("listenUk"), recording: uk },
    us && { label: t("listenUs"), recording: us },
  ].filter((r): r is { label: string; recording: Recording } => !!r && !!(r.recording.licence || r.recording.source));
  // Names the dictionary, so it is shown with a meaning; the article itself links back to Wikipedia.
  const sourcesLine = entry ? t("sources", { dict: DICTIONARY_NAME[entry.source] }) : null;
  const hasCredits = credited.length > 0 || sentenceCredits.length > 0 || recordings.length > 0 || !!sourcesLine;

  return (
    <div className="grid min-w-0 gap-10">
      <WordHeader
        target={target}
        picture={header}
        translation={translation}
        translate={
          (wordWorking || wordOffer) && (
            <TranslateControl working={wordWorking} offer={wordOffer} progress={tr.progress} onStart={tr.start} t={t} />
          )
        }
        loading={data.dictionary.status === "loading"}
        pos={senses[0]?.partOfSpeech}
        phonetic={entry?.phonetic}
        uk={uk}
        us={us}
        example={yourExample}
      />

      {/* In real life (ready-made words) or example sentences (own words). */}
      {data.scenes.status === "loading" ? (
        <Block title={t("inRealLife")} shown="loading" skeleton={<LinesSkeleton lines={4} />} retry={retry} t={t} />
      ) : readyMade && scenes ? (
        <SceneStage word={target.word} scenes={scenes.scenes} places={scenes.places} to={target.to} rtl={rtl} />
      ) : (
        examplesShown !== "hidden" && (
          <Block
            title={t("examples")}
            shown={examplesShown}
            skeleton={<LinesSkeleton lines={3} />}
            retry={retry}
            t={t}
            action={
              <TranslateControl
                working={tr.working(target.lang, untranslated)}
                offer={tr.offer(target.lang, untranslated)}
                progress={tr.progress}
                onStart={tr.start}
                t={t}
              />
            }
          >
            <ul className="grid gap-4">
              {examples.map((e) => {
                const translated = e.translation ?? tr.get(target.lang, e.text);
                return (
                  <li key={e.text} className="grid gap-0.5">
                    <p className="flex items-start gap-1">
                      <span className="min-w-0 font-display text-lg leading-snug md:text-xl">
                        <bdi {...wordAttrs}>{e.text}</bdi>
                      </span>
                      <SpeakButton
                        text={e.text}
                        lang={target.lang}
                        label={`${t("listen")}: ${e.text}`}
                        className="text-muted-foreground"
                      />
                    </p>
                    {translated && (
                      <p className="text-sm text-muted-foreground">
                        <bdi lang={target.to} dir={dirOf(target.to)}>
                          {translated}
                        </bdi>
                      </p>
                    )}
                  </li>
                );
              })}
              {data.sentences.status === "loading" && (
                <li aria-hidden>
                  <LinesSkeleton lines={1} />
                </li>
              )}
            </ul>
          </Block>
        )
      )}

      {picturesShown !== "hidden" && (
        <Block title={t("pictures")} shown={picturesShown} skeleton={<TilesSkeleton />} retry={retry} t={t}>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {gallery.map((p) => (
              <li key={p.page}>
                <a
                  href={p.page}
                  target="_blank"
                  rel="noreferrer"
                  title={pictureCredit(p, t)}
                  className="block overflow-hidden rounded-xl border bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {/* The caption comes from the word's Wikipedia (or the list's English file), in the word's language. */}
                  {/* eslint-disable-next-line @next/next/no-img-element -- static export, remote Commons thumbnails */}
                  <img src={p.thumb} alt={p.caption ?? target.word} lang={target.lang} loading="lazy" className="h-32 w-full object-cover" />
                </a>
              </li>
            ))}
          </ul>
        </Block>
      )}

      {columns > 0 && (
        <div
          className={cn(
            "grid min-w-0 gap-8 border-t pt-6",
            columns === 3 ? "md:grid-cols-[1.2fr_1fr_1fr]" : columns === 2 && "md:grid-cols-2",
          )}
        >
          {meaningShown !== "hidden" && (
            <Block
              small
              title={t("meaning")}
              shown={meaningShown}
              skeleton={<LinesSkeleton lines={3} />}
              retry={retry}
              t={t}
              action={
                <TranslateControl
                  working={tr.working("en", definitions)}
                  offer={tr.offer("en", definitions)}
                  progress={tr.progress}
                  onStart={tr.start}
                  t={t}
                />
              }
            >
              <ul className="grid gap-3">
                {senses.map((s) => {
                  const translated = tr.get("en", s.definition);
                  return (
                    <li key={`${s.partOfSpeech}|${s.definition}`} className="leading-normal">
                      <p>
                        <bdi lang="en" dir="ltr">
                          {s.definition}
                        </bdi>
                      </p>
                      {translated && (
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          <bdi lang={target.to} dir={dirOf(target.to)}>
                            {translated}
                          </bdi>
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Block>
          )}

          {partnersShown !== "hidden" && (
            <Block small title={t("partners")} shown={partnersShown} skeleton={<ChipsSkeleton />} retry={retry} t={t}>
              <ul className="flex flex-wrap gap-2">
                {(data.partners.status === "ready" ? data.partners.data : []).map((p) => {
                  const chip =
                    "block rounded-full border px-3 py-1 text-sm outline-none transition-colors hover:border-primary hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50";
                  const partner: WordTarget = { word: cleanWord(p), lang: target.lang, to: target.to };
                  return (
                    <li key={p} lang={target.lang} dir={dirOf(target.lang)}>
                      {onOpenWord ? (
                        <button
                          type="button"
                          className={chip}
                          onClick={() => {
                            const pack = target.lang === "en" ? packOf(partner.word, words) : undefined;
                            onOpenWord(pack ? { ...partner, pack } : partner);
                          }}
                        >
                          {p}
                        </button>
                      ) : (
                        <Link href={wordHref(partner)} className={chip}>
                          {p}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Block>
          )}

          {articleShown !== "hidden" && (
            <Block small title={t("didYouKnow")} shown={articleShown} skeleton={<LinesSkeleton lines={4} />} retry={retry} t={t}>
              {article && (
                <p className="leading-relaxed text-muted-foreground">
                  <bdi lang={article.lang || undefined} dir={dirOf(article.lang)}>
                    {shorten(article.extract)}
                  </bdi>{" "}
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noreferrer"
                    className="whitespace-nowrap text-primary underline-offset-2 hover:underline"
                  >
                    <bdi>{t("readMore")}</bdi>
                  </a>
                </p>
              )}
            </Block>
          )}
        </div>
      )}

      {hasCredits && (
        <section aria-labelledby="word-credits" className="grid gap-1.5 text-xs text-muted-foreground">
          <h2 id="word-credits" className="font-medium text-foreground">
            {t("credits")}
          </h2>
          <ul className="grid gap-1">
            {credited.map((p) => (
              <li key={p.page}>
                <a href={p.page} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
                  {pictureCredit(p, t)}
                </a>
              </li>
            ))}
            {sentenceCredits.map((c) => (
              <li key={c}>{c}</li>
            ))}
            {recordings.map(({ label, recording: r }) => {
              const text = `${label}: ${r.licence ?? r.source}`;
              return (
                <li key={r.url}>
                  {r.source ? (
                    <a href={r.source} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
                      {text}
                    </a>
                  ) : (
                    text
                  )}
                </li>
              );
            })}
            {sourcesLine && <li>{sourcesLine}</li>}
          </ul>
        </section>
      )}
    </div>
  );
}

/** A section with its title: a skeleton while loading, "couldn't load" with a retry, or its content. */
function Block({
  title,
  shown,
  skeleton,
  retry,
  t,
  action,
  small,
  children,
}: {
  title: string;
  shown: Exclude<Shown, "hidden">;
  skeleton: ReactNode;
  retry: () => void;
  t: T;
  action?: ReactNode;
  small?: boolean;
  children?: ReactNode;
}) {
  return (
    <section aria-busy={shown === "loading" || undefined} className="grid min-w-0 content-start gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={cn("font-display font-semibold", small ? "text-lg md:text-xl" : "text-xl md:text-2xl")}>{title}</h2>
        {shown === "ready" && action}
      </div>
      {shown === "loading" ? (
        skeleton
      ) : shown === "failed" ? (
        <div className="grid justify-items-start gap-2">
          <p className="text-sm text-muted-foreground">{t("couldntLoad")}</p>
          <Button variant="outline" size="sm" onClick={retry}>
            {t("retry")}
          </Button>
        </div>
      ) : (
        children
      )}
    </section>
  );
}

/** "Translate" when the model isn't downloaded yet; "Translating…" (with the download's progress) while it works. */
function TranslateControl({
  working,
  offer,
  progress,
  onStart,
  t,
}: {
  working: boolean;
  offer: boolean;
  progress: number | null;
  onStart: () => void;
  t: T;
}) {
  const fmt = useFormat();
  if (working) {
    return (
      <span className="grid min-w-32 gap-1 text-xs text-muted-foreground" role="status">
        <span className="flex justify-between gap-2">
          {t("translating")}
          {progress !== null && <span className="tabular-nums">{fmt.percent(progress)}</span>}
        </span>
        {progress !== null && <Progress value={progress * 100} aria-label={t("translating")} />}
      </span>
    );
  }
  if (!offer) return null;
  return (
    <Button variant="outline" size="sm" onClick={onStart}>
      <Languages /> {t("translate")}
    </Button>
  );
}

function LinesSkeleton({ lines }: { lines: number }) {
  return (
    <div aria-hidden className="grid gap-2.5">
      {Array.from({ length: lines }, (_, i) => (
        <span key={i} className={cn("h-4 animate-pulse rounded bg-muted", i % 2 ? "w-3/5" : "w-11/12")} />
      ))}
    </div>
  );
}

function TilesSkeleton() {
  return (
    <div aria-hidden className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <span key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}

function ChipsSkeleton() {
  return (
    <div aria-hidden className="flex flex-wrap gap-2">
      {["w-16", "w-20", "w-14", "w-24"].map((w) => (
        <span key={w} className={cn("h-7 animate-pulse rounded-full bg-muted", w)} />
      ))}
    </div>
  );
}
