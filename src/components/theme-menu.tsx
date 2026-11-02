"use client";

import { Palette } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { common } from "@/messages/common";

/** Theme names; each one is also the class next-themes puts on <html>. */
export const THEMES = ["light", "dark", "pink", "blue"] as const;

type ThemeLabel = "themeSystem" | "themeLight" | "themeDark" | "themePink" | "themeBlue";
type SwatchOption = { value: string; label: ThemeLabel; swatch: string; dot: string };

// Each swatch shows the theme's background with a dot of its primary color.
const OPTIONS: SwatchOption[] = [
  { value: "system", label: "themeSystem", swatch: "bg-linear-to-br from-white from-50% to-zinc-800 to-50%", dot: "bg-indigo-500" },
  { value: "light", label: "themeLight", swatch: "bg-white", dot: "bg-indigo-600" },
  { value: "dark", label: "themeDark", swatch: "bg-zinc-900", dot: "bg-indigo-300" },
];
const KIDS: SwatchOption[] = [
  { value: "pink", label: "themePink", swatch: "bg-pink-100", dot: "bg-pink-500" },
  { value: "blue", label: "themeBlue", swatch: "bg-sky-100", dot: "bg-blue-500" },
];

export function ThemeMenu() {
  const { theme, setTheme } = useTheme();
  const t = useT(common);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={t("changeTheme")} />}>
        <Palette />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuRadioGroup value={theme} onValueChange={(v: string) => setTheme(v)}>
          <DropdownMenuGroup>
            <DropdownMenuLabel>{t("theme")}</DropdownMenuLabel>
            {OPTIONS.map((o) => (
              <Option key={o.value} {...o} label={t(o.label)} />
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>{t("forKids")}</DropdownMenuLabel>
            {KIDS.map((o) => (
              <Option key={o.value} {...o} label={t(o.label)} />
            ))}
          </DropdownMenuGroup>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Option({ value, label, swatch, dot }: { value: string; label: string; swatch: string; dot: string }) {
  return (
    <DropdownMenuRadioItem value={value} closeOnClick>
      <span className={cn("grid size-4 place-items-center rounded-full ring-1 ring-foreground/15", swatch)} aria-hidden>
        <span className={cn("size-1.5 rounded-full", dot)} />
      </span>
      {label}
    </DropdownMenuRadioItem>
  );
}
