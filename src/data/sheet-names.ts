/**
 * Curated sheet identities, kept apart from the slug lists in sheets.ts so client components can
 * import them cheaply. Names are Recode's own; third-party list names are not used in the product.
 */
export const ROADMAP_SHEET = { slug: "roadmap-150", name: "Roadmap 150" } as const;
export const ESSENTIALS_SHEET = { slug: "essentials-75", name: "Essentials 75" } as const;

export const CURATED_SHEET_NAMES = [ROADMAP_SHEET, ESSENTIALS_SHEET];

export function sheetName(slug: string) {
  return CURATED_SHEET_NAMES.find((s) => s.slug === slug)?.name ?? "Sheet";
}
