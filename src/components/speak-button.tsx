"use client";

import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { speak, speechSupported } from "@/lib/speech";
import { useHydrated } from "@/lib/store";

export function SpeakButton({ text, lang, className }: { text: string; lang: string; className?: string }) {
  // speechSynthesis only exists in the browser; render nothing until hydrated.
  const hydrated = useHydrated();
  if (!hydrated || !speechSupported) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={className}
      aria-label="Pronounce"
      title="Pronounce"
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
