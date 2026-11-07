"use client";

import { Download, Languages, Loader2, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { CardEditor } from "@/components/card-editor";
import { SpeakButton } from "@/components/speak-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useFormat } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { LANGUAGES, modelFor, pairId, type ModelChoice } from "@/lib/languages";
import { myCards, OWN, sameWordIn, toStored } from "@/lib/mywords";
import { addCard, saveFailed, useHydrated, usePref, useStore, type Flashcard, type LearnerLang } from "@/lib/store";
import { useTranslator } from "@/lib/useTranslator";
import { cn } from "@/lib/utils";
import { cardHref } from "@/lib/word/target";
import { cards as cardMessages } from "@/messages/cards";
import { common } from "@/messages/common";
import { translate as messages } from "@/messages/translate";

// "nllb" once the user agreed to the large translator, which is only needed for
// pairs the small per-direction models don't cover. (Kept under the old key.)
const BIG_MODEL_KEY = "linguacards:engine";
/** JSON list of models that have loaded at least once, so "downloads about N MB" isn't repeated. */
const LOADED_KEY = "linguacards:loaded-models";
const RECENT = 5;

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** "/add/": English words with the learner's language, added to My words. */
export default function AddWordsPage() {
  const hydrated = useHydrated();
  const { profile } = useStore();
  // The setup gate makes sure there is a profile on this page.
  if (!hydrated || !profile) return null;
  // A new language starts a fresh form: nothing typed in one language carries over to the other.
  return <AddWordsForm key={profile.lang} lang={profile.lang} />;
}

function AddWordsForm({ lang }: { lang: LearnerLang }) {
  const t = useT(messages);
  const tc = useT(cardMessages);
  const tcommon = useT(common);
  const fmt = useFormat();
  const data = useStore();
  const { translate, status, progress, error, clearError } = useTranslator();
  const [bigModelPref, setBigModelPref] = usePref(BIG_MODEL_KEY, "opus");
  const [loadedPref, setLoadedPref] = usePref(LOADED_KEY, "[]");
  // The language of the word field; the translation is in the other one. Not saved: each visit starts on English.
  const [typingIn, setTypingIn] = useState<string>("en");
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  // A translation from the model is replaced when the word changes; one the user typed is kept.
  const [backFromModel, setBackFromModel] = useState(false);
  const [live, setLive] = useState("");
  const [adding, setAdding] = useState(false);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Flashcard | null>(null);
  // Bumped whenever the word, the direction or a typed translation changes, so a
  // translation that finishes afterwards is dropped instead of overwriting it.
  const runToken = useRef(0);
  const frontRef = useRef<HTMLInputElement>(null);
  const downloadRef = useRef<HTMLButtonElement>(null);

  // Words are always stored English first; only the direction of typing changes.
  const pair = { src: "en", tgt: lang };
  const from = typingIn === lang ? lang : "en";
  const to = from === "en" ? lang : "en";
  const direction = { id: pairId(from, to), src: from, tgt: to };
  const src = LANGUAGES[from];
  const tgt = LANGUAGES[to];
  const smallModel = modelFor(direction, "opus");
  const bigModel = modelFor(direction, "nllb");
  const choice = smallModel ?? (bigModelPref === "nllb" ? bigModel : null);
  const needsConsent = !choice;
  const busy = status === "loading" || status === "translating";
  const loadedModels = parseJson<string[]>(loadedPref, []);

  const recent = myCards(data)
    .filter((c) => !c.pack)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, RECENT);

  function clearModelBack() {
    if (backFromModel) setBack("");
    setBackFromModel(false);
  }

  function chooseTypingIn(code: string) {
    if (code === typingIn) return;
    runToken.current++;
    setTypingIn(code);
    clearModelBack();
    clearError();
    setLive("");
    // With only a word typed, keep it as the word: the learner is switching which language they type in.
    // With both sides filled, they swap, so the word and its translation stay together.
    if (back.trim()) {
      setFront(back);
      setBack(front);
      setBackFromModel(false);
    }
  }

  async function run(model: ModelChoice | null = choice) {
    const text = front.trim();
    if (!text || busy || !model) return;
    const token = ++runToken.current;
    setLive(t("translating"));
    const result = await translate(text, model);
    if (token !== runToken.current) return;
    if (result === null) {
      setLive("");
      // If the large translator failed, ask again next time instead of retrying silently.
      if (model === bigModel) setBigModelPref("opus");
      return;
    }
    // The models end single words with a full stop ("bonjour" → "Bonjour."); a card shouldn't.
    const translation = /[.!?。！？]$/.test(text) ? result : result.replace(/[.。]$/, "");
    setBack(translation);
    setBackFromModel(true);
    setLive(t("translatedLive", { text: translation }));
    if (!loadedModels.includes(model.model)) setLoadedPref(JSON.stringify([...loadedModels, model.model]));
  }

  async function add() {
    const f = front.trim();
    const b = back.trim();
    if (!f || !b || adding) return;
    const { front: english, back: other } = toStored(from, f, b);
    // The same word twice would be studied twice: say so, and keep what was typed.
    if (sameWordIn(data, english, other)) {
      toast.info(
        t.rich("alreadyAdded", {
          word: (
            <bdi lang="en" dir="ltr">
              {english}
            </bdi>
          ),
        }),
      );
      return;
    }
    setAdding(true);
    // Clear first so the next word can be typed while the word is saved.
    runToken.current++;
    setFront("");
    setBack("");
    setBackFromModel(false);
    setLive("");
    clearError();
    try {
      const card = await addCard(english, other, "en", lang, {});
      setLastAddedId(card.id);
      if (saveFailed()) toast.error(tc("saveFailed"));
      else toast.success(t("added"));
    } catch {
      setFront((v) => v || f);
      setBack((v) => v || b);
      toast.error(t("addFailed"));
    } finally {
      setAdding(false);
      frontRef.current?.focus();
    }
  }

  // Enter translates; once there is a translation, Enter adds the word.
  function next() {
    if (back.trim()) add();
    // A 900 MB download needs a deliberate click, so Enter only points at the button.
    else if (needsConsent) downloadRef.current?.focus();
    else run();
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    next();
  }

  // Handled here rather than by the browser: with two fields and no submit
  // button (the download case), Enter would otherwise do nothing.
  function onFieldKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter" || e.nativeEvent.isComposing || e.keyCode === 229) return;
    e.preventDefault();
    next();
  }

  const primary = back.trim() ? (
    // Adding doesn't need the translator, so it works even while a model is still loading.
    <Button type="submit" size="lg" disabled={!front.trim() || adding}>
      <Plus /> {t("addCard")}
    </Button>
  ) : needsConsent ? (
    <Button
      ref={downloadRef}
      type="button"
      size="lg"
      disabled={!front.trim() || busy}
      aria-describedby="big-download"
      onClick={() => {
        setBigModelPref("nllb");
        run(bigModel);
      }}
    >
      <Download /> {t("downloadAndTranslate")}
    </Button>
  ) : (
    <Button type="submit" size="lg" disabled={!front.trim() || busy}>
      {busy ? <Loader2 className="animate-spin" /> : <Languages />}
      {busy ? t("translating") : t("translate")}
    </Button>
  );

  const loadingModel = busy ? (choice ?? bigModel) : null;
  const firstLoad = loadingModel ? !loadedModels.includes(loadingModel.model) : false;

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("intro", { lang: fmt.languageNameInline(from) })}</p>
          <Link href="/words" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            {t("starterLink")}
          </Link>
        </div>
        <div role="group" aria-labelledby="typing-in" className="flex flex-wrap items-center gap-2">
          <span id="typing-in" className="text-sm text-muted-foreground">
            {t("typingIn")}
          </span>
          <div className="inline-flex rounded-lg bg-muted p-[3px]">
            {(["en", lang] as const).map((code) => (
              <Button
                key={code}
                type="button"
                variant="ghost"
                size="sm"
                aria-pressed={typingIn === code}
                onClick={() => chooseTypingIn(code)}
                // Styled like a tab: the chosen language stands out, the other is muted.
                className="text-foreground/60 hover:text-foreground aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-sm dark:text-muted-foreground dark:aria-pressed:border-input dark:aria-pressed:bg-input/30 dark:aria-pressed:text-foreground"
              >
                {fmt.languageName(code)}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="grid gap-3">
        {/* The input is laid out as the flashcard it becomes: the word on the front, the answer on the back. */}
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm focus-within:ring-3 focus-within:ring-ring/40">
          <Side label={fmt.languageName(src.code)} htmlFor="word-front" speak={front} lang={src.code}>
            <input
              ref={frontRef}
              id="word-front"
              onKeyDown={onFieldKeyDown}
              value={front}
              // Empty, the field follows the page, so the placeholder in the interface language reads right.
              dir={front ? (src.rtl ? "rtl" : "auto") : undefined}
              lang={front ? src.code : undefined}
              autoComplete="off"
              autoFocus
              onChange={(e) => {
                runToken.current++;
                setFront(e.target.value);
                clearModelBack();
                clearError();
              }}
              placeholder={t("frontPlaceholder")}
              className="w-full bg-transparent font-display text-2xl font-medium outline-none placeholder:text-muted-foreground sm:text-3xl"
            />
          </Side>
          <div className="mx-5 border-t border-dashed" aria-hidden />
          <Side
            label={fmt.languageName(tgt.code)}
            htmlFor="word-back"
            speak={back}
            lang={tgt.code}
            className="bg-primary/5"
          >
            <input
              id="word-back"
              onKeyDown={onFieldKeyDown}
              value={back}
              dir={back ? (tgt.rtl ? "rtl" : "auto") : undefined}
              lang={back ? tgt.code : undefined}
              autoComplete="off"
              onChange={(e) => {
                // A translation the user types wins over one the model is still working on.
                runToken.current++;
                setBack(e.target.value);
                setBackFromModel(false);
              }}
              placeholder={busy ? t("translating") : t("backPlaceholder")}
              className="w-full bg-transparent font-display text-xl outline-none placeholder:text-muted-foreground sm:text-2xl"
            />
            {status === "loading" && loadingModel && (
              <div className="mt-3 grid gap-1.5 text-sm text-muted-foreground">
                <p>
                  {firstLoad ? t("preparing", { size: smallModel ? 75 : 900 }) : t("loadingTranslator")}{" "}
                  {progress !== null && <span className="tabular-nums">{fmt.percent(progress)}</span>}
                </p>
                <Progress value={progress === null ? null : progress * 100} aria-label={t("progressLabel")} />
              </div>
            )}
            {needsConsent && !back && (
              <p id="big-download" className="mt-3 text-sm text-muted-foreground">
                {t("bigDownload", { src: fmt.languageNameInline(from), tgt: fmt.languageNameInline(to) })}
              </p>
            )}
            {error && (
              <p
                role="alert"
                className="mt-3 text-sm text-destructive"
                title={error.code === "failed" ? error.message : undefined}
              >
                {t("failed")}
              </p>
            )}
          </Side>
        </div>
        {/* Always in the page, so screen readers hear the translation they are about to save. */}
        <p className="sr-only" role="status" aria-live="polite">
          {live}
        </p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">{primary}</div>
        {!(needsConsent && !back) && (
          <p className="text-xs text-muted-foreground">
            {t.rich("hint", {
              enter: (
                <bdi lang="en" dir="ltr">
                  Enter
                </bdi>
              ),
            })}
          </p>
        )}
      </form>

      {recent.length > 0 && (
        <section aria-labelledby="recent-title" className="grid gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="recent-title" className="font-display text-xl font-semibold">
              {t("recentTitle")}
            </h2>
            <Link href={`/study/?list=${OWN}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
              {t("studyMine")}
            </Link>
          </div>
          <ul className="divide-y rounded-xl border bg-card">
            {recent.map((c) => (
              <li
                key={c.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5",
                  // The one motion on the page: the word you just added lands in the list.
                  c.id === lastAddedId && "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2",
                )}
              >
                {c.image && (
                  // eslint-disable-next-line @next/next/no-img-element -- a local data: URL, nothing to optimize
                  <img src={c.image} alt="" className="size-9 shrink-0 rounded-md border object-cover" />
                )}
                <Link
                  href={cardHref(c)}
                  className="min-w-0 flex-1 truncate font-medium underline-offset-2 hover:underline"
                  dir="auto"
                  lang={c.src}
                >
                  {c.front}
                </Link>
                <span className="flex min-w-0 flex-1 items-center gap-1 text-muted-foreground" dir="auto" lang={c.tgt}>
                  <span className="truncate">{c.back}</span>
                  <SpeakButton text={c.back} lang={c.tgt} label={tcommon("pronounceWord", { word: c.back })} />
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("editCard", { word: c.front })}
                  title={t("editCard", { word: c.front })}
                  onClick={() => setEditing(c)}
                >
                  <Pencil />
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {editing && (
        <CardEditor
          open
          onOpenChange={(open) => !open && setEditing(null)}
          pair={pair}
          card={data.cards.find((c) => c.id === editing.id) ?? editing}
        />
      )}
    </div>
  );
}

/** One side of the word being written: its language, a pronounce button and the field. */
function Side({
  label,
  htmlFor,
  speak,
  lang,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  speak: string;
  lang: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("grid gap-2 px-5 pt-4 pb-5", className)}>
      <div className="flex items-center justify-between">
        <label htmlFor={htmlFor} className="text-sm text-muted-foreground">
          {label}
        </label>
        <SpeakButton text={speak} lang={lang} />
      </div>
      {children}
    </div>
  );
}
