import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from "@/lib/seo/og";
import { getCatalogPattern } from "@/server/catalog";

export const alt = "Coding interview pattern guide on Recode";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const data = await getCatalogPattern((await params).slug);
  if (!data) return ogImage({ eyebrow: "Coding interview patterns", title: "Patterns" });
  return ogImage({
    eyebrow: "Coding interview pattern",
    title: data.pattern.name,
    subtitle: `Reach for it when: ${data.pattern.cue}`,
    stats: [
      { value: String(data.pattern.total), label: "problems" },
      { value: String(data.difficulty.EASY), label: "Easy" },
      { value: String(data.difficulty.MEDIUM), label: "Medium" },
      { value: String(data.difficulty.HARD), label: "Hard" },
    ],
  });
}
