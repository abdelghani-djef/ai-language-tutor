"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { isGated } from "@/lib/profile";
import { useHydrated, useStore } from "@/lib/store";

/**
 * Sends a learner without a profile from a page that needs their language to
 * setup first, which brings them back afterwards. The query string is read from
 * the window inside the effect, so the whole app needs no Suspense boundary.
 */
export function SetupGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useHydrated();
  const { profile } = useStore();
  const gated = isGated(pathname);
  const blocked = hydrated && !profile && gated;

  useEffect(() => {
    if (blocked) {
      const { search, hash } = window.location;
      router.replace("/start/?next=" + encodeURIComponent(pathname + search + hash));
    }
  }, [blocked, pathname, router]);

  // A gated page shows nothing until the saved data is read: then it either
  // appears or is on its way to setup. The header around it stays.
  return gated && (!hydrated || !profile) ? null : children;
}
