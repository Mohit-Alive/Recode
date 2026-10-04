import { permanentRedirect } from "next/navigation";

/** /learn has no page of its own; the pattern roadmap is the entry point. */
export default function LearnIndex() {
  permanentRedirect("/learn/patterns");
}
