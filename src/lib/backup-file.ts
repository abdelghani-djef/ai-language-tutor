"use client";

import { exportData } from "./store";

/** Downloads everything as "linguacards-backup-<date>.json". */
export function downloadBackup() {
  const url = URL.createObjectURL(new Blob([exportData()], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `linguacards-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
