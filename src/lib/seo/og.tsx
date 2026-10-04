import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

// Images cannot read CSS variables; these mirror the dark tokens in globals.css.
const C = {
  canvas: "#08090a",
  surface: "#0f1011",
  line: "#222428",
  ink: "#f7f8f8",
  subtle: "#8a8f98",
  faint: "#62666d",
  accent: "#5e6ad2",
  accentText: "#8b95ec",
};

/** Shared 1200x630 social card: eyebrow, headline, supporting line and up to four stats. */
export function ogImage({ eyebrow, title, subtitle, stats = [] }: { eyebrow: string; title: string; subtitle?: string; stats?: { label: string; value: string }[] }) {
  const titleSize = title.length > 48 ? 56 : title.length > 28 ? 66 : 76;
  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: C.canvas, padding: 72, color: C.ink }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <svg width="44" height="44" viewBox="0 0 24 24">
            <rect x="0.5" y="0.5" width="23" height="23" rx="6" fill={C.accent} />
            <path
              transform="translate(1.5 1.25)"
              d="M5 7.5c1.6 0 2.2 6.5 4 6.5V7.8c1.4 0 2 4.2 3.6 4.2V8.2c1.3 0 1.9 2.4 3.4 2.4V8.6"
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.02em" }}>recode</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: "auto" }}>
          <span style={{ fontSize: 26, color: C.accentText }}>{eyebrow}</span>
          <span style={{ marginTop: 14, fontSize: titleSize, fontWeight: 600, lineHeight: 1.05, letterSpacing: "-0.035em", maxWidth: 1000 }}>{title}</span>
          {subtitle ? <span style={{ marginTop: 22, fontSize: 28, color: C.subtle, lineHeight: 1.35, maxWidth: 980 }}>{subtitle}</span> : null}
        </div>
        {stats.length ? (
          <div style={{ display: "flex", gap: 56, marginTop: 44, paddingTop: 28, borderTop: `1px solid ${C.line}` }}>
            {stats.map((s) => (
              <div key={s.label} style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 40, fontWeight: 600, letterSpacing: "-0.02em" }}>{s.value}</span>
                <span style={{ fontSize: 20, color: C.faint, marginTop: 4 }}>{s.label}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    ),
    OG_SIZE,
  );
}
