"use client";

import { useState, type FormEvent } from "react";
import { PairSelect } from "@/components/pair-select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n";
import { getPair } from "@/lib/languages";
import { createDeck, type Deck } from "@/lib/store";
import { decks } from "@/messages/decks";

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
  const t = useT(decks);
  const [name, setName] = useState("");
  const [pairId, setPairId] = useState(defaultPair);
  // Start from the caller's current pair each time the dialog opens. Opening is
  // controlled by the parent, so onOpenChange doesn't fire for it.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setPairId(defaultPair);
  }

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{t("dialogTitle")}</DialogTitle>
            <DialogDescription>{t("dialogDescription")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="deck-name">{t("name")}</Label>
            <Input id="deck-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
          </div>
          <div className="grid gap-2">
            <Label>{t("languagePair")}</Label>
            <PairSelect value={pairId} onChange={setPairId} className="w-full" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!name.trim()}>
              {t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
