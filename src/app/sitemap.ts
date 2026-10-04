import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";
import { getSitemapSlugs } from "@/server/catalog";

// Rendered per request so builds never need the database.
export const dynamic = "force-dynamic";

/**
 * Every indexable public URL (the pattern guides and problem pages). No lastmod: the catalog has no
 * per-row timestamps and Google ignores lastmod that is not consistently accurate.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await getSitemapSlugs();
  const paths = [
    "/",
    "/learn/patterns",
    ...slugs.patterns.map((s) => `/learn/patterns/${s}`),
    ...slugs.problems.map((s) => `/learn/problems/${s}`),
  ];
  return paths.map((path) => ({ url: absoluteUrl(path) }));
}
