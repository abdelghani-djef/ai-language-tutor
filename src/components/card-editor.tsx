"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import { useRef, useState, type ClipboardEvent, type FormEvent } from "react";
import { toast } from "sonner";
import { SpeakButton } from "@/components/speak-button";
import { TagInput } from "@/components/tag-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useFormat } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { ImageError, toThumbnail } from "@/lib/image";
import { LANGUAGES } from "@/lib/languages";
import { addCard, saveFailed, updateCard, type Deck, type Flashcard } from "@/lib/store";
import { cards } from "@/messages/cards";

interface Initial {
  front: string;
  back: string;
  tags?: string[];
}

interface Draft {
  front: string;
  back: string;
  example: string;
  notes: string;
  tags: string[];
  image?: string;
}

function draftOf(card?: Flashcard, initial?: Initial): Draft {
  return {
    front: card?.front ?? initial?.front ?? "",
    back: card?.back ?? initial?.back ?? "",
    example: card?.example ?? "",
    notes: card?.notes ?? "",
    tags: card?.tags ?? initial?.tags ?? [],
    image: card?.image,
  };
}

/**
 * Edits every part of a card, or creates a new one in `deck` when `card` is
 * left out (starting from `initial`, e.g. what was typed in the quick-add form).
 */
export function CardEditor({
  open,
  onOpenChange,
  deck,
  card,
  initial,
  suggestions,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deck: Deck;
  card?: Flashcard;
  initial?: Initial;
  suggestions?: string[];
  onSaved?: () => void;
}) {
  const t = useT(cards);
  const fmt = useFormat();
  const [draft, setDraft] = useState(() => draftOf(card, initial));
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // Start from the card's current values each time the dialog opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setDraft(draftOf(card, initial));
  }

  const src = card?.src ?? deck.src;
  const tgt = card?.tgt ?? deck.tgt;
  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

  async function takePicture(file: Blob) {
    try {
      patch({ image: await toThumbnail(file) });
    } catch (e) {
      const reason = e instanceof ImageError ? e.reason : "decode";
      toast.error(t(reason === "type" ? "pictureType" : reason === "size" ? "pictureSize" : "pictureDecode"));
    }
  }

  function onPaste(e: ClipboardEvent) {
    // Office apps put a picture of the copied text on the clipboard too; text
    // pasted into a text field stays text.
    const inField = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
    if (inField && e.clipboardData.getData("text/plain")) return;
    const file = [...e.clipboardData.files].find((f) => f.type.startsWith("image/"));
    if (file) {
      e.preventDefault();
      takePicture(file);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!draft.front.trim() || !draft.back.trim() || saving) return;
    const details = { example: draft.example, notes: draft.notes, tags: draft.tags, image: draft.image };
    setSaving(true);
    try {
      if (card) updateCard(card.id, draft.front, draft.back, details);
      else await addCard(deck.id, draft.front, draft.back, deck.src, deck.tgt, details);
      if (saveFailed()) toast.error(t("saveFailed"));
      else toast.success(t(card ? "saved" : "added"));
      onOpenChange(false);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <form onSubmit={submit} onPaste={onPaste} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{t(card ? "editTitle" : "newTitle")}</DialogTitle>
            <DialogDescription>{t("editDescription")}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="card-front">{t("front", { lang: fmt.languageName(src) })}</Label>
              <Input
                id="card-front"
                value={draft.front}
                dir={LANGUAGES[src].rtl ? "rtl" : "auto"}
                lang={src}
                onChange={(e) => patch({ front: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="card-back">{t("back", { lang: fmt.languageName(tgt) })}</Label>
              <Input
                id="card-back"
                value={draft.back}
                dir={LANGUAGES[tgt].rtl ? "rtl" : "auto"}
                lang={tgt}
                onChange={(e) => patch({ back: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="card-example">{t("example")}</Label>
              <SpeakButton text={draft.example} lang={tgt} />
            </div>
            <Textarea
              id="card-example"
              value={draft.example}
              dir={LANGUAGES[tgt].rtl ? "rtl" : "auto"}
              lang={tgt}
              onChange={(e) => patch({ example: e.target.value })}
              aria-describedby="card-example-hint"
              className="min-h-14"
            />
            <p id="card-example-hint" className="text-xs text-muted-foreground">
              {t("exampleHint", { lang: fmt.languageName(tgt) })}
            </p>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="card-notes">{t("notes")}</Label>
            <Textarea
              id="card-notes"
              value={draft.notes}
              dir={draft.notes ? "auto" : undefined}
              onChange={(e) => patch({ notes: e.target.value })}
              placeholder={t("notesHint")}
              className="min-h-14"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="card-tags">{t("tags")}</Label>
            <TagInput id="card-tags" value={draft.tags} onChange={(tags) => patch({ tags })} suggestions={suggestions} />
            <p className="text-xs text-muted-foreground">{t("tagsHint")}</p>
          </div>

          <div className="grid gap-1.5">
            <span className="text-sm font-medium">{t("picture")}</span>
            <div className="flex flex-wrap items-center gap-3">
              {draft.image && (
                // eslint-disable-next-line @next/next/no-img-element -- a local data: URL, nothing to optimize
                <img
                  src={draft.image}
                  alt={t("pictureAlt", { word: draft.back || draft.front })}
                  className="size-20 rounded-lg border object-cover"
                />
              )}
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <ImagePlus /> {t(draft.image ? "changePicture" : "addPicture")}
              </Button>
              {draft.image && (
                <Button type="button" variant="ghost" size="sm" onClick={() => patch({ image: undefined })}>
                  <Trash2 /> {t("removePicture")}
                </Button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) takePicture(f);
                  e.target.value = "";
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{t("pictureHint")}</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={!draft.front.trim() || !draft.back.trim() || saving}>
              {t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
