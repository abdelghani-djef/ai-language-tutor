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
import { ENGINES, getPair, LANGUAGES, modelFor, pairId, pairLabel, type Engine } from "@/lib/languages";
import { addCard, usePref, useStore } from "@/lib/store";
import { useTranslator } from "@/lib/useTranslator";

export default function TranslatePage() {
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
      toast.success(`Saved to “${deck.name}”`);
    } catch {
      setInput((v) => v || front);
      setOutput((v) => v || back);
      toast.error("Could not save the card");
    }
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Translate &amp; collect</h1>
        <p className="text-muted-foreground">
          Translation runs entirely in your browser. The first time you use a model it is downloaded and cached.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex w-full items-center gap-2 sm:w-96">
          <PairSelect value={pair.id} onChange={changePair} disabled={busy} className="flex-1" />
          <Button
            variant="outline"
            size="icon"
            onClick={swap}
            disabled={busy}
            aria-label="Swap languages"
            title="Swap languages"
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
          <TabsList aria-label="Translation model">
            {(Object.keys(ENGINES) as Engine[]).map((e) => (
              <TabsTrigger key={e} value={e} disabled={busy}>
                {ENGINES[e].name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <p className="w-full text-xs text-muted-foreground">{ENGINES[engine].description}</p>
      </div>

      {!choice && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
          <p className="flex-1">
            {ENGINES.opus.name} has no model for {pairLabel(pair)}. {ENGINES.nllb.name} can translate it, but it is a
            ~900&nbsp;MB download.
          </p>
          <Button variant="outline" size="sm" onClick={() => setEngine("nllb")}>
            Use {ENGINES.nllb.name}
          </Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="gap-0 py-0">
          <div className="flex items-center justify-between border-b px-4 py-2 text-sm font-medium">
            {src.name}
            <SpeakButton text={input} lang={src.code} />
          </div>
          <CardContent className="p-0">
            <Textarea
              value={input}
              dir={src.rtl ? "rtl" : "auto"}
              onChange={(e) => {
                runToken.current++;
                setInput(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) run();
              }}
              placeholder="Type a word or sentence…"
              className="min-h-40 resize-none rounded-none border-0 text-lg shadow-none focus-visible:ring-0"
            />
          </CardContent>
        </Card>

        <Card className="gap-0 bg-muted/40 py-0">
          <div className="flex items-center justify-between border-b px-4 py-2 text-sm font-medium">
            {tgt.name}
            <SpeakButton text={output} lang={tgt.code} />
          </div>
          <CardContent className="p-0">
            <Textarea
              value={output}
              dir={tgt.rtl ? "rtl" : "auto"}
              onChange={(e) => setOutput(e.target.value)}
              placeholder={busy ? "" : "Translation appears here. You can edit it before saving."}
              className="min-h-40 resize-none rounded-none border-0 bg-transparent text-lg shadow-none focus-visible:ring-0 dark:bg-transparent"
            />
          </CardContent>
        </Card>
      </div>

      {status === "loading" && (
        <div className="grid gap-1.5">
          <p className="text-sm text-muted-foreground">
            Downloading {choice?.model}… {progress !== null && `${Math.round(progress * 100)}%`}
          </p>
          <Progress value={progress === null ? null : progress * 100} />
        </div>
      )}
      {error && <p className="text-sm text-destructive">Translation failed: {error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <Button size="lg" onClick={run} disabled={!input.trim() || busy || !choice}>
          {busy ? <Loader2 className="animate-spin" /> : <Languages />}
          {status === "loading" ? "Loading model…" : status === "translating" ? "Translating…" : "Translate"}
        </Button>
        <span className="hidden text-xs text-muted-foreground sm:inline">Ctrl + Enter</span>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {pairDecks.length > 0 ? (
            <Select
              items={pairDecks.map((d) => ({ value: d.id, label: d.name }))}
              value={selectedDeck?.id ?? null}
              onValueChange={(v) => setDeckId(v)}
            >
              <SelectTrigger className="w-48" aria-label="Deck">
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
            <span className="text-sm text-muted-foreground">No {src.name} → {tgt.name} deck yet</span>
          )}
          <Button variant="outline" size="lg" onClick={() => setNewDeckOpen(true)}>
            <Plus /> New deck
          </Button>
          <Button
            size="lg"
            variant="secondary"
            onClick={save}
            disabled={!selectedDeck || !input.trim() || !output.trim() || busy}
          >
            <Save /> Save card
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
