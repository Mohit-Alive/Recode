import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from "@/lib/seo/og";
import { DIFFICULTY_LABEL } from "@/lib/format";
import { getCatalogProblem } from "@/server/catalog";

export const alt = "Coding interview problem on Recode";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const data = await getCatalogProblem((await params).slug);
  if (!data) return ogImage({ eyebrow: "Coding interview patterns", title: "Problems" });
  const { problem, pattern } = data;
  return ogImage({
    eyebrow: `${DIFFICULTY_LABEL[problem.difficulty]}${pattern ? ` · ${pattern.name}` : ""}`,
    title: problem.title,
    subtitle: pattern ? `Recognise it when: ${pattern.cue}` : undefined,
  });
}
