"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { RESOLVED_THEME_COOKIE, THEME_COOKIE, type Theme } from "./theme-cookie";

type Resolved = "dark" | "light";
type Ctx = { theme: Theme; resolvedTheme: Resolved; setTheme: (t: Theme) => void };

const ThemeContext = createContext<Ctx>({ theme: "dark", resolvedTheme: "dark", setTheme: () => {} });

const YEAR = 60 * 60 * 24 * 365;
const setCookie = (name: string, value: string) => {
  document.cookie = `${name}=${value}; path=/; max-age=${YEAR}; samesite=lax`;
};

function resolve(theme: Theme): Resolved {
  if (theme !== "system") return theme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function apply(resolved: Resolved) {
  const root = document.documentElement;
  if (root.classList.contains(resolved)) return;
  // Suppress transitions for the frame the palette flips, so nothing animates between themes.
  const style = document.createElement("style");
  style.textContent = "*,*::before,*::after{transition:none!important}";
  document.head.appendChild(style);
  root.classList.remove("dark", "light");
  root.classList.add(resolved);
  root.style.colorScheme = resolved;
  requestAnimationFrame(() => requestAnimationFrame(() => style.remove()));
}

/**
 * Cookie-backed theme: the server renders the right class on <html>, so there is no inline
 * script and no flash. "system" follows prefers-color-scheme live and remembers the resolved
 * value for the next server render.
 */
export function ThemeProvider({ initialTheme, initialResolved, children }: { initialTheme: Theme; initialResolved: Resolved; children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  const [resolvedTheme, setResolved] = useState<Resolved>(initialResolved);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      const r = resolve("system");
      apply(r);
      setResolved(r);
      setCookie(RESOLVED_THEME_COOKIE, r);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    const r = resolve(t);
    setCookie(THEME_COOKIE, t);
    setCookie(RESOLVED_THEME_COOKIE, r);
    apply(r);
    setThemeState(t);
    setResolved(r);
  }, []);

  return <ThemeContext value={{ theme, resolvedTheme, setTheme }}>{children}</ThemeContext>;
}

export const useTheme = () => useContext(ThemeContext);
