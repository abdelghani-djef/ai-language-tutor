"use client";

import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { speak, speechSupported } from "@/lib/speech";
import { useHydrated } from "@/lib/store";
import { common } from "@/messages/common";

export function SpeakButton({
  text,
  lang,
  label,
  className,
}: {
  text: string;
  lang: string;
  /** Accessible name; defaults to "Pronounce". Name the word when several buttons sit together. */
  label?: string;
  className?: string;
}) {
  // speechSynthesis only exists in the browser; render nothing until hydrated.
  const hydrated = useHydrated();
  const t = useT(common);
  if (!hydrated || !speechSupported) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={className}
      aria-label={label ?? t("pronounce")}
      title={label ?? t("pronounce")}
      disabled={!text}
      onClick={(e) => {
        e.stopPropagation();
        speak(text, lang);
      }}
    >
      <Volume2 />
    </Button>
  );
}
