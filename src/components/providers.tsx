"use client";

import { DirectionProvider } from "@base-ui/react/direction-provider";
import { ThemeProvider } from "next-themes";
import { useEffect, type ReactNode } from "react";
import { Celebrations } from "@/components/celebrations";
import { THEMES } from "@/components/theme-menu";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { detectLocale, LOCALE_KEY, LOCALES, useLocale } from "@/lib/i18n";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      themes={[...THEMES]}
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <LocaleProvider>
        <TooltipProvider>
          {children}
          <Toaster position="bottom-center" />
          <Celebrations />
        </TooltipProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}

/** Keeps <html lang dir> in step with the interface language and tells Base UI the direction. */
function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useLocale();
  const { dir } = LOCALES[locale];

  // First visit: start in the browser's language if we have it.
  useEffect(() => {
    try {
      if (localStorage.getItem(LOCALE_KEY) === null) {
        const detected = detectLocale();
        if (detected !== "en") setLocale(detected);
      }
    } catch {
      // Storage blocked: stay in English.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);

  return <DirectionProvider direction={dir}>{children}</DirectionProvider>;
}
