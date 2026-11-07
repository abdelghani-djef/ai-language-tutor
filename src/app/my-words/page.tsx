"use client";

import { Check, GraduationCap, Library, PenLine, RotateCcw, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { BackupCard } from "@/components/backup-card";
import { CardEditor } from "@/components/card-editor";
import { SpeakButton } from "@/components/speak-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WordRow } from "@/components/word-row";
import { STARTER_PACKS } from "@/data/starter-packs";
import { useFormat } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n";
import {
  filterMyWords,
  knownWords,
  LEVELS,
  levelOf,
  myCards,
  OWN,
  tagsOf,
  type KnownEntry,
  type LevelId,
} from "@/lib/mywords";
import {
  dueCount,
  learnKnownWord,
  setStatus,
  sortWord,
  unsortWord,
  useHydrated,
  useStore,
  useToday,
  type Flashcard,
  type LearnerLang,
} from "@/lib/store";
import { useStarterWords } from "@/lib/starter-words";
import { cn } from "@/lib/utils";
import { wordHref } from "@/lib/word/target";
import { cards as cardMessages } from "@/messages/cards";
import { common } from "@/messages/common";
import { mywords as messages } from "@/messages/mywords";
import { levelName, sort as sortMessages } from "@/messages/sort";

type Tab = "learn" | "known";

/** The list filter's value for every list. */
const ALL = "all";

/** A row's key, also on its move button so focus can find the next row after a move. */
const cardKey = (c: Flashcard) => `c:${c.id}`;
const entryKey = (e: KnownEntry) => (e.card ? cardKey(e.card) : `k:${e.pack}:${e.word}`);

const actionSelector = (key: string) => `[data-row-action="${CSS.escape(key)}"]`;

export default function MyWordsPageWrapper() {
  return (
    <Suspense>
      <MyWordsPage />
    </Suspense>
  );
}

/** "/my-words/?tab=known&list=food": the learner's one list, in two parts, in their current language. */
function MyWordsPage() {
  const params = useSearchParams();
  const hydrated = useHydrated();
  const data = useStore();
  const today = useToday();
  const t = useT(messages);
  const tc = useT(cardMessages);
  const ts = useT(sortMessages);
  const fmt = useFormat();
  const [locale] = useLocale();
  const levelTitleId = useId();
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [editing, setEditing] = useState<Flashcard | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);
  // After a word moves to the other part its row goes away: focus goes to the next
  // row's move button (or the previous one, or the tab) instead of the page body.
  const focusAfter = useRef<{ moved: string; next: string | null } | null>(null);
  // The lists' words: the translations of words sorted as Already know, and the level.
  const words = useStarterWords();

  useEffect(() => {
    const f = focusAfter.current;
    if (!f) return;
    // Still there: the move is being saved.
    if (document.querySelector(actionSelector(f.moved))) return;
    focusAfter.current = null;
    const next = f.next ? document.querySelector<HTMLElement>(actionSelector(f.next)) : null;
    (next ?? tabsRef.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]'))?.focus();
  });

  // The setup gate makes sure there is a profile on this page.
  if (!hydrated || !data.profile || !words) return null;
  const lang: LearnerLang = data.profile.lang;
  const name = data.profile.name;

  const tab: Tab = params.get("tab") === "known" ? "known" : "learn";
  const mine = myCards(data);
  const learnCards = mine.filter((c) => c.status === "learn").sort((a, b) => b.createdAt - a.createdAt);
  const known = knownWords(data, words);
  const due = dueCount(data, today);
  const level = levelOf(data, words);

  // The list filter: every ready-made list the learner has words from, in the lists' order, then their own words.
  const packIds = new Set<string>();
  for (const c of mine) if (c.pack) packIds.add(c.pack);
  for (const e of known) if (e.pack) packIds.add(e.pack);
  const listOptions = [
    { value: ALL, label: t("allLists") },
    ...STARTER_PACKS.filter((p) => packIds.has(p.id)).map((p) => ({ value: p.id, label: `${p.emoji} ${p.title[locale]}` })),
    { value: OWN, label: t("ownWords") },
  ];
  const listParam = params.get("list");
  const activeList = listParam && listParam !== ALL && listOptions.some((o) => o.value === listParam) ? listParam : null;

  // Tags of the words in the chosen list, in both parts, so the chips stay put when switching tabs.
  const allTags = tagsOf(mine, activeList);
  // A filter tag that no word has any more (deleted, renamed or in another list) is dropped.
  const activeTag = tag && allTags.some((x) => x.tag.toLocaleLowerCase() === tag.toLocaleLowerCase()) ? tag : null;

  const { learn: learnShown, known: knownShown } = filterMyWords(learnCards, known, {
    list: activeList,
    tag: activeTag,
    query,
  });
  const filtering = !!(query.trim() || activeTag || activeList);

  const filterQuery = new URLSearchParams();
  if (activeList) filterQuery.set("list", activeList);
  if (activeTag) filterQuery.set("tag", activeTag);
  const fq = filterQuery.toString() ? `?${filterQuery}` : "";

  /** Keeps the tab and list in the address, so going back to this page finds them again. */
  function setParam(key: "tab" | "list", value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }

  /** Remembers where focus goes once the row with `key` has left the shown rows. */
  function focusNextAfter(key: string, keys: string[]) {
    const i = keys.indexOf(key);
    focusAfter.current = { moved: key, next: keys[i + 1] ?? keys[i - 1] ?? null };
  }

  const wordNode = (word: string) => (
    <bdi lang="en" dir="ltr">
      {word}
    </bdi>
  );

  function moveCard(c: Flashcard, to: Tab, keys: string[]) {
    focusNextAfter(cardKey(c), keys);
    setStatus(c.id, to);
    toast(t.rich(to === "known" ? "movedKnown" : "movedLearn", { word: wordNode(c.front) }));
  }

  function learnAgain(e: KnownEntry, keys: string[]) {
    if (!e.pack) return;
    focusNextAfter(entryKey(e), keys);
    learnKnownWord(e.pack, e.word)
      .then((moved) => {
        // Nothing moved (say, already moved in another tab): nothing to say, and no row to wait for.
        if (moved) toast(t.rich("movedLearn", { word: wordNode(e.word) }));
        else focusAfter.current = null;
      })
      .catch(() => {
        focusAfter.current = null;
        toast.error(t.rich("moveFailed", { word: wordNode(e.word) }));
      });
  }

  /** Takes a ready-made word out of Already know: it is left to sort again. Undo sorts it back. */
  function forgetKnown(e: KnownEntry, keys: string[]) {
    const pack = e.pack;
    if (!pack) return;
    focusNextAfter(entryKey(e), keys);
    unsortWord(pack, e.word)
      .then(() =>
        toast(t("cardDeleted"), { action: { label: t("undo"), onClick: () => void sortWord(pack, e.word, "known") } }),
      )
      .catch(() => {
        focusAfter.current = null;
      });
  }

  function openEditor(c: Flashcard) {
    setEditing(c);
    setEditorOpen(true);
  }

  const levelLabel = (id: LevelId): ReactNode =>
    // A1–B2 are Latin codes: their own left-to-right run inside Arabic text.
    id === "starter" ? ts(levelName[id]) : <bdi dir="ltr">{ts(levelName[id])}</bdi>;
  const levelFrom = LEVELS.find((l) => l.id === level.id)?.min ?? 0;
  const toNext = level.next ? level.next.min - level.points : 0;

  const learnKeys = learnShown.map(cardKey);
  const knownKeys = knownShown.map(entryKey);
  const isEmpty = mine.length === 0 && known.length === 0;

  return (
    <div className="grid gap-8">
      <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-start">
        <div className="grid gap-4">
          <div className="grid gap-1">
            <h1 className="font-display text-3xl font-semibold tracking-tight">{t("title")}</h1>
            <p className="text-lg">
              {name ? t.rich("hello", { name: <bdi>{name}</bdi> }) : t("helloNoName")}{" "}
              <span className="text-muted-foreground">{due > 0 ? t("dueToday", { count: due }) : t("nothingDue")}</span>
            </p>
          </div>
          {!isEmpty && (
            <div className="flex flex-wrap gap-2">
              <Link href={`/study/${fq}`} className={buttonVariants()}>
                <GraduationCap /> {t("study")}
              </Link>
              <Link href={`/quiz/${fq}`} className={buttonVariants({ variant: "outline" })}>
                {t("quiz")}
              </Link>
              <Link href="/words/" className={buttonVariants({ variant: "outline" })}>
                <Library /> {t("pickLists")}
              </Link>
              <Link href="/add/" className={buttonVariants({ variant: "outline" })}>
                <PenLine /> {t("addOwn")}
              </Link>
            </div>
          )}
        </div>

        <section aria-labelledby={levelTitleId} className="grid gap-2 rounded-2xl border bg-card p-4 md:w-72">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id={levelTitleId} className="text-sm text-muted-foreground">
              {t("levelTitle")}
            </h2>
            <span className="text-sm text-muted-foreground tabular-nums">{t("points", { count: level.points })}</span>
          </div>
          <p className="font-display text-3xl font-semibold">{levelLabel(level.id)}</p>
          {level.next ? (
            <>
              <Progress
                value={((level.points - levelFrom) / (level.next.min - levelFrom)) * 100}
                aria-label={t("levelProgress")}
              />
              <p className="text-sm">
                {t.rich("nextLevel", { count: toNext, points: fmt.number(toNext), level: levelLabel(level.next.id) })}
              </p>
            </>
          ) : (
            <p className="text-sm">{t("topLevel")}</p>
          )}
          <p className="text-xs text-muted-foreground">{t("levelHow")}</p>
        </section>
      </div>

      {isEmpty ? (
        <section className="grid justify-items-start gap-3 rounded-3xl border-2 border-primary/40 bg-primary/5 p-6">
          <h2 className="font-display text-2xl font-semibold">{t("emptyTitle")}</h2>
          <p className="max-w-[60ch] text-muted-foreground">{t("emptyText")}</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/words/" className={buttonVariants({ size: "lg" })}>
              <Library /> {t("emptyCta")}
            </Link>
            <Link href="/add/" className={buttonVariants({ size: "lg", variant: "outline" })}>
              <PenLine /> {t("addOwn")}
            </Link>
          </div>
        </section>
      ) : (
        <Tabs value={tab} onValueChange={(v) => setParam("tab", v === "known" ? "known" : null)} className="gap-4">
          <TabsList ref={tabsRef} aria-label={t("title")} className="w-full sm:w-fit">
            <TabsTrigger value="learn" className="px-3">
              {t("tabLearn", { count: learnCards.length })}
            </TabsTrigger>
            <TabsTrigger value="known" className="px-3">
              {t("tabKnown", { count: known.length })}
            </TabsTrigger>
          </TabsList>

          <div className="grid gap-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select
                items={listOptions}
                value={activeList ?? ALL}
                onValueChange={(v) => setParam("list", v && v !== ALL ? v : null)}
              >
                <SelectTrigger className="w-full sm:w-60" aria-label={t("listFilter")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {listOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute inset-s-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={tc("search")}
                  aria-label={tc("search")}
                  dir={query ? "auto" : undefined}
                  className="ps-8"
                />
              </div>
            </div>
            {allTags.length > 0 && (
              <div role="group" aria-label={tc("filterByTag")} className="flex flex-wrap gap-1.5">
                <TagChip active={!activeTag} onClick={() => setTag(null)}>
                  {tc("allTags")}
                </TagChip>
                {allTags.map(({ tag: tagName, n }) => (
                  <TagChip
                    key={tagName}
                    active={activeTag?.toLocaleLowerCase() === tagName.toLocaleLowerCase()}
                    onClick={() => setTag(tagName)}
                  >
                    #{tagName} <span className="opacity-60">{fmt.number(n)}</span>
                  </TagChip>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {filtering &&
                tc("shown", {
                  shown: tab === "learn" ? learnShown.length : knownShown.length,
                  count: tab === "learn" ? learnCards.length : known.length,
                })}
            </p>
          </div>

          <TabsContent value="learn" className="text-base">
            {learnShown.length === 0 ? (
              <p className="text-muted-foreground">{filtering ? tc("noMatches") : t("emptyLearn")}</p>
            ) : (
              <ul className="divide-y rounded-xl border">
                {learnShown.map((c) => (
                  <WordRow
                    key={c.id}
                    card={c}
                    onEdit={openEditor}
                    action={
                      <Button
                        variant="outline"
                        size="sm"
                        data-row-action={cardKey(c)}
                        aria-label={t("knowThisLabel", { word: c.front })}
                        onClick={() => moveCard(c, "known", learnKeys)}
                      >
                        <Check aria-hidden /> {t("knowThis")}
                      </Button>
                    }
                  />
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="known" className="text-base">
            {knownShown.length === 0 ? (
              <p className="text-muted-foreground">{filtering ? tc("noMatches") : t("emptyKnown")}</p>
            ) : (
              <ul className="divide-y rounded-xl border">
                {knownShown.map((e) => {
                  const key = entryKey(e);
                  const action = (
                    <Button
                      variant="outline"
                      size="sm"
                      data-row-action={key}
                      aria-label={t("learnAgainLabel", { word: e.word })}
                      onClick={() => (e.card ? moveCard(e.card, "learn", knownKeys) : learnAgain(e, knownKeys))}
                    >
                      <RotateCcw aria-hidden /> {t("learnAgain")}
                    </Button>
                  );
                  return e.card ? (
                    <WordRow key={key} card={e.card} onEdit={openEditor} action={action} />
                  ) : (
                    <KnownRow key={key} entry={e} lang={lang} action={action} onDelete={() => forgetKnown(e, knownKeys)} />
                  );
                })}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      )}

      <BackupCard />

      <CardEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        pair={{ src: "en", tgt: lang }}
        card={editing ?? undefined}
        suggestions={allTags.map((x) => x.tag)}
      />
    </div>
  );
}

/**
 * A ready-made word sorted as Already know and never studied: no card yet, so
 * nothing to edit. Deleting it leaves the word to sort again.
 */
function KnownRow({
  entry,
  lang,
  action,
  onDelete,
}: {
  entry: KnownEntry;
  lang: LearnerLang;
  action: ReactNode;
  onDelete: () => void;
}) {
  const tc = useT(common);
  const t = useT(messages);
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3">
      <div className="flex min-w-0 flex-1 basis-56 items-center gap-3">
        {entry.emoji && (
          <span className="w-10 shrink-0 text-center text-2xl leading-none" aria-hidden>
            {entry.emoji}
          </span>
        )}
        <div className="grid min-w-0 flex-1 gap-0.5 sm:grid-cols-2 sm:gap-4">
          <span className="flex min-w-0 items-center gap-1 font-medium" dir="auto" lang="en">
            <Link
              href={wordHref({ word: entry.word, lang: "en", to: lang, pack: entry.pack })}
              className="truncate underline-offset-2 hover:underline"
            >
              {entry.word}
            </Link>
            <SpeakButton text={entry.word} lang="en" label={tc("pronounceWord", { word: entry.word })} />
          </span>
          <span className="flex min-w-0 items-center gap-1 text-muted-foreground" dir="auto" lang={lang}>
            <span className="truncate">{entry.translation}</span>
            <SpeakButton text={entry.translation} lang={lang} label={tc("pronounceWord", { word: entry.translation })} />
          </span>
        </div>
      </div>
      <div className="ms-auto flex items-center gap-1">
        {action}
        <Button variant="ghost" size="icon-sm" aria-label={t("deleteCard", { word: entry.word })} onClick={onDelete}>
          <Trash2 />
        </Button>
      </div>
    </li>
  );
}

function TagChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      dir="auto"
      className={cn(
        "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}
