import type { MetadataRoute } from "next";
import { absoluteUrl, isIndexableDeployment } from "@/lib/site";

/** Private app routes: signed-in only, so crawling them only wastes budget on sign-in redirects. */
const PRIVATE = ["/api/", "/today", "/review", "/drills", "/stats", "/settings", "/sheets", "/companies", "/patterns", "/problems"];

export default function robots(): MetadataRoute.Robots {
  if (!isIndexableDeployment) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: PRIVATE },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
