"use client";

import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isLocale, LOCALE_CODES, LOCALES, useLocale, useT } from "@/lib/i18n";
import { common } from "@/messages/common";

export function LanguageMenu() {
  const [locale, setLocale] = useLocale();
  const t = useT(common);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={t("changeLanguage")} />}>
        <Languages />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuRadioGroup value={locale} onValueChange={(v: string) => isLocale(v) && setLocale(v)}>
          <DropdownMenuGroup>
            <DropdownMenuLabel>{t("language")}</DropdownMenuLabel>
            {LOCALE_CODES.map((code) => (
              // Each name is written in its own language, so it is readable whatever is selected.
              <DropdownMenuRadioItem key={code} value={code} closeOnClick lang={code} dir={LOCALES[code].dir}>
                {LOCALES[code].name}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
