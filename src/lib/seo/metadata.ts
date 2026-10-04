import type { Metadata } from "next";
import { SITE } from "@/lib/site";

/**
 * Per-page metadata. Next replaces (not merges) a child's `openGraph`, so the site-wide fields are
 * restated here. The default image is overridden by a route's own opengraph-image file.
 */
export function pageMetadata({
  title,
  description,
  path,
  type = "website",
  absoluteTitle = false,
}: {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
  absoluteTitle?: boolean;
}): Metadata {
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type,
      siteName: SITE.name,
      locale: "en_US",
      url: path,
      title,
      description,
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: `${SITE.name}: spaced repetition for coding interviews` }],
    },
  };
}

/** "a" or "an" for the word that follows. */
export function article(word: string) {
  return /^[aeiou]/i.test(word) ? "an" : "a";
}
