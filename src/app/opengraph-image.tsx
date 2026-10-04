import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from "@/lib/seo/og";

export const alt = "Recode: spaced repetition for coding interviews. Remember every problem you solve.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogImage({
    eyebrow: "Spaced repetition for coding interviews",
    title: "You solved it. Recode makes sure you keep it.",
    subtitle: "Every problem comes back right before you would forget it, scheduled by the FSRS memory model.",
    stats: [
      { value: "1,868", label: "problems" },
      { value: "464", label: "company lists" },
      { value: "18", label: "patterns" },
      { value: "Free", label: "to use" },
    ],
  });
}
