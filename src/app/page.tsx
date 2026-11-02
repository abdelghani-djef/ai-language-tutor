"use client";

import { ArrowLeftRight, Languages, Loader2, Plus, Save } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { NewDeckDialog } from "@/components/new-deck-dialog";
import { PairSelect } from "@/components/pair-select";
import { SpeakButton } from "@/components/speak-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useFormat } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { ENGINES, getPair, LANGUAGES, modelFor, pairId, type Engine } from "@/lib/languages";
import { addCard, usePref, useStore } from "@/lib/store";
import { useTranslator } from "@/lib/useTranslator";
import { translate as messages } from "@/messages/translate";

const ENGINE_DESCRIPTION = { opus: "opusDescription", nllb: "nllbDescription" } as const;

export default function TranslatePage() {
  const t = useT(messages);
  const fmt = useFormat();
  const { decks } = useStore();
  const { translate, status, progress, error } = useTranslator();
  const [currentPair, setPairPref] = usePref("linguacards:pair", "en-fr");
  const [enginePref, setEngine] = usePref("linguacards:engine", "opus");
  const engine: Engine = enginePref === "nllb" ? "nllb" : "opus";
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [deckId, setDeckId] = useState<string | null>(null);
  const [newDeckOpen, setNewDeckOpen] = useState(false);

  const pair = getPair(currentPair);
  const choice = modelFor(pair, engine);
  // Bumped whenever the input, pair or engine changes, so a translation that
  // finishes afterwards is dropped instead of landing next to the wrong text.
  const runToken = useRef(0);
  const src = LANGUAGES[pair.src];
  const tgt = LANGUAGES[pair.tgt];
  const pairDecks = useMemo(() => decks.filter((d) => d.src === pair.src && d.tgt === pair.tgt), [decks, pair]);
  const selectedDeck = pairDecks.find((d) => d.id === deckId) ?? pairDecks[0];
  const busy = status === "loading" || status === "translating";

  function changePair(id: string) {
    runToken.current++;
    setPairPref(id);
    setOutput("");
  }

  function swap() {
    changePair(pairId(pair.tgt, pair.src));
    if (output) {
      setInput(output);
      setOutput(input);
    }
  }

  async function run() {
    const text = input.trim();
    if (!text || busy || !choice) return;
    const token = ++runToken.current;
    const result = await translate(text, choice);
    if (result !== null && token === runToken.current) setOutput(result);
  }

  async function save() {
    const deck = selectedDeck;
    const front = input;
    const back = output;
    if (!deck || !front.trim() || !back.trim() || busy) return;
    // Clear first so anything typed while the card is being created isn't wiped.
    runToken.current++;
    setInput("");
    setOutput("");
    try {
      await addCard(deck.id, front, back, pair.src, pair.tgt);
      toast.success(t("savedTo", { deck: deck.name }));
    } catch {
      setInput((v) => v || front);
      setOutput((v) => v || back);
      toast.error(t("saveFailed"));
    }
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("intro")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex w-full items-center gap-2 sm:w-96">
          <PairSelect value={pair.id} onChange={changePair} disabled={busy} className="flex-1" />
          <Button
            variant="outline"
            size="icon"
            onClick={swap}
            disabled={busy}
            aria-label={t("swap")}
            title={t("swap")}
          >
            <ArrowLeftRight />
          </Button>
        </div>
        <Tabs
          value={engine}
          onValueChange={(v) => {
            runToken.current++;
            setEngine(v as Engine);
          }}
        >
          <TabsList aria-label={t("model")}>
            {(Object.keys(ENGINES) as Engine[]).map((e) => (
              <TabsTrigger key={e} value={e} disabled={busy}>
                {ENGINES[e].name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <p className="w-full text-xs text-muted-foreground">{t(ENGINE_DESCRIPTION[engine])}</p>
      </div>

      {!choice && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
          <p className="flex-1">
            {t("noOpusModel", { opus: ENGINES.opus.name, nllb: ENGINES.nllb.name, pair: fmt.pairLabel(pair) })}
          </p>
          <Button variant="outline" size="sm" onClick={() => setEngine("nllb")}>
            {t("useEngine", { engine: ENGINES.nllb.name })}
          </Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="gap-0 py-0">
          <div className="flex items-center justify-between border-b px-4 py-2 text-sm font-medium">
            {fmt.languageName(src.code)}
            <SpeakButton text={input} lang={src.code} />
          </div>
          <CardContent className="p-0">
            <Textarea
              value={input}
              // Empty, it follows the page so the translated placeholder reads right.
              dir={src.rtl ? "rtl" : input ? "auto" : undefined}
              lang={src.code}
              onChange={(e) => {
                runToken.current++;
                setInput(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) run();
              }}
              placeholder={t("inputPlaceholder")}
              className="min-h-40 resize-none rounded-none border-0 text-lg shadow-none focus-visible:ring-0"
            />
          </CardContent>
        </Card>

        <Card className="gap-0 bg-muted/40 py-0">
          <div className="flex items-center justify-between border-b px-4 py-2 text-sm font-medium">
            {fmt.languageName(tgt.code)}
            <SpeakButton text={output} lang={tgt.code} />
          </div>
          <CardContent className="p-0">
            <Textarea
              value={output}
              dir={tgt.rtl ? "rtl" : output ? "auto" : undefined}
              lang={tgt.code}
              onChange={(e) => setOutput(e.target.value)}
              placeholder={busy ? "" : t("outputPlaceholder")}
              className="min-h-40 resize-none rounded-none border-0 bg-transparent text-lg shadow-none focus-visible:ring-0 dark:bg-transparent"
            />
          </CardContent>
        </Card>
      </div>

      {status === "loading" && (
        <div className="grid gap-1.5">
          <p className="text-sm text-muted-foreground">
            {progress === null
              ? t("downloading", { model: choice?.model ?? "" })
              : t("downloadingPercent", { model: choice?.model ?? "", percent: fmt.percent(progress) })}
          </p>
          <Progress value={progress === null ? null : progress * 100} />
        </div>
      )}
      {error && (
        <p className="text-sm text-destructive">
          {error.code === "crashed" ? t("crashed") : t("failed", { error: error.message })}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button size="lg" onClick={run} disabled={!input.trim() || busy || !choice}>
          {busy ? <Loader2 className="animate-spin" /> : <Languages />}
          {status === "loading" ? t("loadingModel") : status === "translating" ? t("translating") : t("translate")}
        </Button>
        <span className="hidden text-xs text-muted-foreground sm:inline">{t("shortcut")}</span>

        <div className="ms-auto flex flex-wrap items-center gap-2">
          {pairDecks.length > 0 ? (
            <Select
              items={pairDecks.map((d) => ({ value: d.id, label: d.name }))}
              value={selectedDeck?.id ?? null}
              onValueChange={(v) => setDeckId(v)}
            >
              <SelectTrigger className="w-48" aria-label={t("deck")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pairDecks.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-sm text-muted-foreground">{t("noDeck", { pair: fmt.pairLabel(pair) })}</span>
          )}
          <Button variant="outline" size="lg" onClick={() => setNewDeckOpen(true)}>
            <Plus /> {t("newDeck")}
          </Button>
          <Button
            size="lg"
            variant="secondary"
            onClick={save}
            disabled={!selectedDeck || !input.trim() || !output.trim() || busy}
          >
            <Save /> {t("saveCard")}
          </Button>
        </div>
      </div>

      <NewDeckDialog
        open={newDeckOpen}
        onOpenChange={setNewDeckOpen}
        defaultPair={pair.id}
        onCreated={(d) => setDeckId(d.id)}
      />
    </div>
  );
}
