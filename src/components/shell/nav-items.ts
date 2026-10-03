import {
  Buildings,
  CalendarCheck,
  ChartLineUp,
  GearSix,
  Lightning,
  ListChecks,
  TreeStructure,
} from "@phosphor-icons/react/ssr";

export const NAV = [
  { href: "/today", label: "Today", icon: CalendarCheck, mobile: true },
  { href: "/drills", label: "Drills", icon: Lightning, mobile: true },
  { href: "/sheets", label: "Sheets", icon: ListChecks, mobile: true },
  { href: "/companies", label: "Companies", icon: Buildings, mobile: false },
  { href: "/patterns", label: "Patterns", icon: TreeStructure, mobile: true },
  { href: "/stats", label: "Stats", icon: ChartLineUp, mobile: true },
] as const;

export const SETTINGS_NAV = { href: "/settings", label: "Settings", icon: GearSix } as const;
