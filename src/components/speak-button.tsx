"use client";

import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { speak, speechSupported } from "@/lib/speech";
import { useHydrated } from "@/lib/store";
import { common } from "@/messages/common";

export function SpeakButton({ text, lang, className }: { text: string; lang: string; className?: string }) {
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
      aria-label={t("pronounce")}
      title={t("pronounce")}
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
