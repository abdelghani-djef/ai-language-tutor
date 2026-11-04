"use client";

import { ArrowLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useT } from "@/lib/i18n";
import {
  openTrail,
  overlayDepth,
  overlayState,
  pushTrail,
  trailAt,
  trailWord,
  withoutOverlay,
  type Trail,
} from "@/lib/word/stage";
import type { WordTarget } from "@/lib/word/target";
import { word as messages } from "@/messages/word";
import { WordView } from "./word-view";

/**
 * The word page as a full-screen layer over study and stories, so their state is never torn down.
 * Open while `target` is set. Each word on it has its own history entry (the page's URL and
 * Next.js's state kept, so the page underneath is not navigated): the phone's Back and the Back
 * button go to the previous word, then close it; Escape closes it at once. A word partner tapped
 * inside opens on top. Focus goes back to what opened it.
 */
export function WordOverlay({ target, onClose }: { target: WordTarget | null; onClose: () => void }) {
  const t = useT(messages);
  const [opened, setOpened] = useState(target);
  // The words opened, kept while the layer closes so it doesn't empty as it fades out.
  const [trail, setTrail] = useState<Trail<WordTarget>>(() => (target ? openTrail(target) : { words: [], depth: 0 }));
  if (target !== opened) {
    setOpened(target);
    if (target) setTrail(openTrail(target));
  }
  const open = target !== null;
  const depth = trail.depth;
  const shown = trailWord(trail);
  const popup = useRef<HTMLDivElement>(null);
  // Set from asking the browser to go back until it has: a second press then would leave the page.
  const leaving = useRef(false);
  // The latest onClose, so the history listener below isn't re-attached on every render.
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  // A new word starts at the top.
  useEffect(() => {
    popup.current?.scrollTo({ top: 0 });
  }, [shown]);

  // One history entry per open word. Idempotent (it checks the entry it is on), so React's
  // double effects in development don't push twice.
  useEffect(() => {
    if (!open) return;
    const at = overlayDepth(history.state);
    // Already there, or Forward went past the words still known (nothing to add then).
    if (at === depth || (depth > 1 && at > depth)) return;
    // Opened on an entry that Forward left marked: unmark it, so stepping back from here closes.
    if (depth === 1 && at > 0) history.replaceState(withoutOverlay(history.state), "");
    history.pushState(overlayState(history.state, depth), "");
  }, [open, depth]);

  // Back and Forward, from the browser, the phone or the buttons below.
  useEffect(() => {
    if (!open) return;
    leaving.current = false;
    const onPop = (e: PopStateEvent) => {
      leaving.current = false;
      const at = overlayDepth(e.state);
      if (at === 0) close.current();
      else setTrail((tr) => trailAt(tr, at));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [open]);

  /** Back one word, or `all` the way out (closed); on an entry that isn't its own, it just closes. */
  const goBack = (all: boolean) => {
    if (leaving.current) return;
    const at = overlayDepth(history.state);
    if (at === 0) return onClose();
    leaving.current = true;
    history.go(all ? -at : -1);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && goBack(true)}>
      <DialogContent
        ref={popup}
        showCloseButton={false}
        aria-label={shown?.word}
        className="inset-0 block max-w-none translate-x-0 translate-y-0 overflow-y-auto overscroll-contain rounded-none bg-background p-0 text-base text-foreground ring-0 sm:max-w-none"
      >
        <div className="mx-auto grid w-full min-w-0 max-w-5xl gap-6 px-4 py-6 sm:px-6 sm:py-8">
          <Button variant="ghost" size="sm" className="-ms-2.5 w-fit" onClick={() => goBack(false)}>
            <ArrowLeft className="rtl:rotate-180" /> {t("back")}
          </Button>
          {shown && <WordView target={shown} onOpenWord={(w) => setTrail((tr) => pushTrail(tr, w))} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
