/** Theme preference ("dark" | "light" | "system") and the last resolved value ("dark" | "light"). */
export const THEME_COOKIE = "recode-theme";
export const RESOLVED_THEME_COOKIE = "recode-theme-resolved";

export type Theme = "dark" | "light" | "system";

export function parseTheme(v: string | undefined): Theme {
  return v === "light" || v === "system" ? v : "dark";
}
