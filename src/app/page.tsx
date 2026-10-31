"use client";

import { ArrowLeftRight, Languages, Loader2, Plus, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { NewDeckDialog } from "@/components/new-deck-dialog";
import { PairSelect } from "@/components/pair-select";
import { SpeakButton } from "@/components/speak-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getPair, LANGUAGES, PAIRS } from "@/lib/languages";
import { addCard, usePref, useStore } from "@/lib/store";
import { useTranslator } from "@/lib/useTranslator";


export default function TranslatePage() {
  const { decks } = useStore();
  const { translate, status, progress, error } = useTranslator();
  const [pairId, setPairId] = usePref("linguacards:pair", "en-fr");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [deckId, setDeckId] = useState<string | null>(null);
  const [newDeckOpen, setNewDeckOpen] = useState(false);

  const pair = getPair(pairId);
  const src = LANGUAGES[pair.src];
  const tgt = LANGUAGES[pair.tgt];
  const pairDecks = useMemo(() => decks.filter((d) => d.src === pair.src && d.tgt === pair.tgt), [decks, pair]);
  const selectedDeck = pairDecks.find((d) => d.id === deckId) ?? pairDecks[0];
  const busy = status === "loading" || status === "translating";

  function changePair(id: string) {
    setPairId(id);
    setOutput("");
  }

  function swap() {
    const reverse = PAIRS.find((p) => p.src === pair.tgt && p.tgt === pair.src);
    if (!reverse) return;
    changePair(reverse.id);
    if (output) {
      setInput(output);
      setOutput(input);
    }
  }

  async function run() {
    const text = input.trim();
    if (!text || busy) return;
    const result = await translate(text, pair.model);
    if (result !== null) setOutput(result);
  }

  async function save() {
    if (!selectedDeck || !input.trim() || !output.trim()) return;
    setInput("");
    setOutput("");
    await addCard(selectedDeck.id, input, output, pair.src, pair.tgt);
    toast.success(`Saved to “${selectedDeck.name}”`);
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Translate &amp; collect</h1>
        <p className="text-muted-foreground">
          Translation runs entirely in your browser. The first time you use a language pair, its model (~75&nbsp;MB) is
          downloaded and cached.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <PairSelect value={pairId} onChange={changePair} className="w-56" />
        <Button variant="outline" size="icon" onClick={swap} aria-label="Swap languages" title="Swap languages">
          <ArrowLeftRight />
        </Button>
      </div>

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
              onChange={(e) => setInput(e.target.value)}
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
            Downloading {pair.model}… {progress !== null && `${Math.round(progress * 100)}%`}
          </p>
          <Progress value={progress === null ? null : progress * 100} />
        </div>
      )}
      {error && <p className="text-sm text-destructive">Translation failed: {error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <Button size="lg" onClick={run} disabled={!input.trim() || busy}>
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
          <Button size="lg" variant="secondary" onClick={save} disabled={!selectedDeck || !input.trim() || !output.trim()}>
            <Save /> Save card
          </Button>
        </div>
      </div>

      <NewDeckDialog
        open={newDeckOpen}
        onOpenChange={setNewDeckOpen}
        defaultPair={pairId}
        onCreated={(d) => setDeckId(d.id)}
      />
    </div>
  );
}
