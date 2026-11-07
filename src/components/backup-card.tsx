"use client";

import { Download, Upload } from "lucide-react";
import { useId, useRef, useState } from "react";
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
import { useT } from "@/lib/i18n";
import { exportData, importData, parseBackup, useStore, type Data } from "@/lib/store";
import { backup as messages } from "@/messages/backup";

/** Every saved word, in every language: cards plus ready-made words sorted as known without a card. */
const wordsIn = (d: Pick<Data, "cards" | "known">) => d.cards.length + Object.keys(d.known).length;

/** Download all data as a JSON file, or replace it with one (after a confirmation). */
export function BackupCard() {
  const data = useStore();
  const t = useT(messages);
  const titleId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  // A checked backup waiting for the user to confirm it should replace everything,
  // with the current count captured when the dialog opened. Kept while the dialog
  // animates closed so its text doesn't change.
  const [pending, setPending] = useState<{ backup: Data; words: number } | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  function download() {
    const url = URL.createObjectURL(new Blob([exportData()], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `linguacards-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function upload(file: File) {
    try {
      setPending({ backup: parseBackup(await file.text()), words: wordsIn(data) });
      setImportOpen(true);
    } catch {
      // parseBackup's errors are English; any failure means the file isn't usable.
      toast.error(t("invalidBackup"));
    }
  }

  function confirmImport() {
    if (!pending) return;
    setImportOpen(false);
    if (importData(pending.backup)) toast.success(t("restored"));
    else toast.error(t("saveRefused"));
  }

  return (
    <section aria-labelledby={titleId} className="grid gap-2 border-t pt-6">
      <h2 id={titleId} className="font-medium">
        {t("backupTitle")}
      </h2>
      <p className="max-w-[60ch] text-sm text-muted-foreground">{t("savedLocally")}</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={download} title={t("exportTitle")}>
          <Download /> {t("export")}
        </Button>
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} title={t("importTitle")}>
          <Upload /> {t("import")}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
            e.target.value = "";
          }}
        />
      </div>

      <AlertDialog open={importOpen} onOpenChange={setImportOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("replaceTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("backupHas", {
                words: t("wordCount", { count: pending ? wordsIn(pending.backup) : 0 }),
                reviews: t("reviewCount", { count: pending?.backup.reviews.length ?? 0 }),
              })}{" "}
              {t("replacesNow", { words: t("wordCount", { count: pending?.words ?? 0 }) })} {t("exportFirst")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <Button variant="outline" onClick={download}>
              <Download /> {t("exportCurrent")}
            </Button>
            <AlertDialogAction variant="destructive" onClick={confirmImport}>
              {t("replace")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
