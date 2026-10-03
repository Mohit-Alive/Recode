"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Press S on the Today page to start reviews. Ignored while typing. */
export function StartReviewsShortcut() {
  const router = useRouter();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, [contenteditable=true], [role=dialog]")) return;
      if (e.key.toLowerCase() === "s" && !e.metaKey && !e.ctrlKey && !e.altKey) router.push("/review");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);
  return null;
}
