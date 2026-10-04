import { absoluteUrl, SITE } from "@/lib/site";

/**
 * schema.org builders shared by the public pages. Entities reference each other by @id so the
 * organization, website and app are described once and linked from every page.
 */

export const ORGANIZATION_ID = absoluteUrl("/#organization");
export const WEBSITE_ID = absoluteUrl("/#website");
export const APP_ID = absoluteUrl("/#app");

export type Crumb = { name: string; path: string };

export function organizationSchema() {
  return {
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: SITE.name,
    url: absoluteUrl("/"),
    logo: { "@type": "ImageObject", url: absoluteUrl("/apple-icon.png"), width: 180, height: 180 },
    description: SITE.description,
  };
}

export function websiteSchema() {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE.name,
    alternateName: ["recode"],
    url: absoluteUrl("/"),
    description: SITE.description,
    inLanguage: "en",
    publisher: { "@id": ORGANIZATION_ID },
  };
}

export function webApplicationSchema(featureList: string[]) {
  return {
    "@type": "WebApplication",
    "@id": APP_ID,
    name: SITE.name,
    url: absoluteUrl("/"),
    description: SITE.description,
    applicationCategory: "EducationalApplication",
    applicationSubCategory: "Spaced repetition",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    featureList,
    publisher: { "@id": ORGANIZATION_ID },
  };
}

export function faqSchema(items: readonly (readonly [question: string, answer: string])[]) {
  return {
    "@type": "FAQPage",
    mainEntity: items.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };
}

export function breadcrumbSchema(crumbs: Crumb[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: absoluteUrl(c.path) })),
  };
}

export function itemListSchema(items: { name: string; path: string }[], order: "ascending" | "descending" | "unordered" = "ascending") {
  return {
    "@type": "ItemList",
    numberOfItems: items.length,
    itemListOrder: `https://schema.org/ItemList${order === "ascending" ? "OrderAscending" : order === "descending" ? "OrderDescending" : "Unordered"}`,
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, url: absoluteUrl(it.path) })),
  };
}

export function patternTerm(p: { slug: string; name: string; blurb: string }) {
  return {
    "@type": "DefinedTerm",
    "@id": absoluteUrl(`/learn/patterns/${p.slug}#pattern`),
    name: p.name,
    description: p.blurb,
    url: absoluteUrl(`/learn/patterns/${p.slug}`),
    inDefinedTermSet: absoluteUrl("/learn/patterns"),
  };
}
