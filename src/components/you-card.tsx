"use client";

import { useId, useState, type FormEvent } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { STARTER_LANGS } from "@/data/starter-packs";
import { downloadBackup } from "@/lib/backup-file";
import { useFormat } from "@/lib/format";
import { LOCALES, useT } from "@/lib/i18n";
import { MAX_NAME } from "@/lib/profile";
import { otherLanguageData, setProfile, useStore, type LearnerLang } from "@/lib/store";
import { stats } from "@/messages/stats";

/**
 * The learner's name and the language they learn English in. Switching language
 * starts the new one afresh: setProfile deletes the words of every other
 * language, so a switch that deletes any asks first and offers a backup.
 */
export function YouCard() {
  const data = useStore();
  const { profile } = data;
  const t = useT(stats);
  const fmt = useFormat();
  const id = useId();
  // Untouched (null), the fields show what is saved.
  const [langChoice, setLangChoice] = useState<LearnerLang | null>(null);
  const [nameInput, setNameInput] = useState<string | null>(null);
  // A switch waiting to be confirmed: the language, and how many words it deletes as
  // last shown, kept so the text doesn't change while the dialog animates closed.
  const [pendingSwitch, setPendingSwitch] = useState<{ lang: LearnerLang; words: number } | null>(null);
  const [switchOpen, setSwitchOpen] = useState(false);

  // The setup gate makes sure there is a profile on the page this card is on.
  if (!profile) return null;
  const lang = langChoice ?? profile.lang;
  const name = nameInput ?? profile.name ?? "";

  /** How many words switching to `newLang` deletes now (see otherLanguageData). */
  function goneCount(newLang: LearnerLang) {
    const gone = otherLanguageData(data, newLang);
    return gone.words + gone.known;
  }

  function save(newLang: LearnerLang) {
    // setProfile cleans the name (30 characters at most); an empty one clears it.
    setProfile({ lang: newLang, name });
    setLangChoice(null);
    setNameInput(null);
    toast.success(t("saved"));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (lang !== profile?.lang) {
      const words = goneCount(lang);
      if (words > 0) {
        setPendingSwitch({ lang, words });
        setSwitchOpen(true);
        return;
      }
    }
    save(lang);
  }

  // While open, the count follows the store, so words added in another tab are counted too.
  const shownWords = pendingSwitch && switchOpen ? goneCount(pendingSwitch.lang) : (pendingSwitch?.words ?? 0);

  function confirmSwitch() {
    if (!pendingSwitch) return;
    setPendingSwitch({ lang: pendingSwitch.lang, words: shownWords });
    setSwitchOpen(false);
    save(pendingSwitch.lang);
  }

  const nameId = `${id}-name`;
  const langHintId = `${id}-lang-hint`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("youTitle")}</CardTitle>
        <CardDescription>
          {profile.name ? t.rich("youName", { name: <bdi>{profile.name}</bdi> }) : t("youNoName")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-5">
          <div className="grid max-w-sm gap-2">
            <label htmlFor={nameId} className="text-sm font-medium">
              {t("nameLabel")}
            </label>
            <Input
              id={nameId}
              value={name}
              onChange={(e) => setNameInput(e.target.value)}
              maxLength={MAX_NAME}
              autoComplete="given-name"
              dir="auto"
            />
          </div>

          <fieldset className="grid max-w-sm gap-2" aria-describedby={langHintId}>
            <legend className="mb-2 text-sm font-medium">{t("langLabel")}</legend>
            <div className="grid grid-cols-2 gap-2">
              {STARTER_LANGS.map((code) => (
                // Each name is written in its own language, so it reads the same whatever the interface language.
                <label
                  key={code}
                  lang={code}
                  dir={LOCALES[code].dir}
                  className="flex min-h-12 cursor-pointer items-center justify-center rounded-xl border-2 bg-card px-3 py-2 text-center font-medium transition-colors hover:bg-muted has-checked:border-primary has-checked:bg-primary/10 has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
                >
                  <input
                    type="radio"
                    name={`${id}-lang`}
                    value={code}
                    checked={lang === code}
                    onChange={() => setLangChoice(code)}
                    aria-label={LOCALES[code].name}
                    className="sr-only"
                  />
                  {LOCALES[code].name}
                </label>
              ))}
            </div>
            <p id={langHintId} className="text-xs text-muted-foreground">
              {t("langHint")}
            </p>
          </fieldset>

          <div>
            <Button type="submit">
              {t("save")}
            </Button>
          </div>
        </form>
      </CardContent>

      <AlertDialog open={switchOpen} onOpenChange={setSwitchOpen}>
        {/* Wider than the default so its three buttons fit on one row. */}
        <AlertDialogContent className="data-[size=default]:sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("switchTitle", { language: fmt.languageNameInline(pendingSwitch?.lang ?? lang) })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("switchDeletes", { count: shownWords })} {t("switchKeeps")} {t("switchBackup")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("switchCancel")}</AlertDialogCancel>
            <Button variant="outline" onClick={downloadBackup}>
              <Download /> {t("switchExport")}
            </Button>
            <AlertDialogAction variant="destructive" onClick={confirmSwitch}>
              {t("switchConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
