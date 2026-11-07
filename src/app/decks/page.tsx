"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useT } from "@/lib/i18n";
import { common } from "@/messages/common";

/** The old page of lists. Its words are all in My words now; old links and bookmarks go there. */
export default function DecksPage() {
  const router = useRouter();
  const t = useT(common);

  useEffect(() => {
    router.replace("/my-words/");
  }, [router]);

  return (
    <p>
      <Link href="/my-words/" className="underline underline-offset-2">
        {t("navDecks")}
      </Link>
    </p>
  );
}
