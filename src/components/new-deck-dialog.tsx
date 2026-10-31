"use client";

import { useState, type FormEvent } from "react";
import { PairSelect } from "@/components/pair-select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPair } from "@/lib/languages";
import { createDeck, type Deck } from "@/lib/store";

export function NewDeckDialog({
  open,
  onOpenChange,
  defaultPair = "en-fr",
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPair?: string;
  onCreated?: (deck: Deck) => void;
}) {
  const [name, setName] = useState("");
  const [pairId, setPairId] = useState(defaultPair);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const p = getPair(pairId);
    const deck = createDeck(name, p.src, p.tgt);
    setName("");
    onOpenChange(false);
    onCreated?.(deck);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) setPairId(defaultPair);
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>New deck</DialogTitle>
            <DialogDescription>Group cards by topic, e.g. “Travel phrases” or “Kitchen”.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="deck-name">Name</Label>
            <Input id="deck-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
          </div>
          <div className="grid gap-2">
            <Label>Language pair</Label>
            <PairSelect value={pairId} onChange={setPairId} className="w-full" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!name.trim()}>
              Create deck
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
