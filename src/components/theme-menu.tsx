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
import { cn } from "@/lib/utils";

/** Theme names; each one is also the class next-themes puts on <html>. */
export const THEMES = ["light", "dark", "pink", "blue"] as const;

// Each swatch shows the theme's background with a dot of its primary color.
const OPTIONS = [
  { value: "system", label: "System", swatch: "bg-linear-to-br from-white from-50% to-zinc-800 to-50%", dot: "bg-indigo-500" },
  { value: "light", label: "Light", swatch: "bg-white", dot: "bg-indigo-600" },
  { value: "dark", label: "Dark", swatch: "bg-zinc-900", dot: "bg-indigo-300" },
];
const KIDS = [
  { value: "pink", label: "Pink", swatch: "bg-pink-100", dot: "bg-pink-500" },
  { value: "blue", label: "Blue", swatch: "bg-sky-100", dot: "bg-blue-500" },
];

export function ThemeMenu() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Change theme" />}>
        <Palette />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuRadioGroup value={theme} onValueChange={(v: string) => setTheme(v)}>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Theme</DropdownMenuLabel>
            {OPTIONS.map((o) => (
              <Option key={o.value} {...o} />
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>For kids</DropdownMenuLabel>
            {KIDS.map((o) => (
              <Option key={o.value} {...o} />
            ))}
          </DropdownMenuGroup>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Option({ value, label, swatch, dot }: { value: string; label: string; swatch: string; dot: string }) {
  return (
    <DropdownMenuRadioItem value={value}>
      <span className={cn("grid size-4 place-items-center rounded-full ring-1 ring-foreground/15", swatch)} aria-hidden>
        <span className={cn("size-1.5 rounded-full", dot)} />
      </span>
      {label}
    </DropdownMenuRadioItem>
  );
}
