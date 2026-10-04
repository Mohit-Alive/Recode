import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import { cookies } from "next/headers";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { parseTheme, RESOLVED_THEME_COOKIE, THEME_COOKIE } from "@/components/theme/theme-cookie";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { isIndexableDeployment, SITE } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: SITE.title, template: "%s · Recode" },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [...SITE.keywords],
  category: "education",
  creator: SITE.name,
  publisher: SITE.name,
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    locale: "en_US",
    title: SITE.title,
    description: SITE.description,
    url: "/",
  },
  // Title, description and image fall back to the Open Graph tags, which every page sets.
  twitter: { card: "summary_large_image" },
  robots: isIndexableDeployment
    ? { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } }
    : { index: false, follow: false },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION } : undefined,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#08090a" },
    { media: "(prefers-color-scheme: light)", color: "#fbfbfc" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const jar = await cookies();
  const theme = parseTheme(jar.get(THEME_COOKIE)?.value);
  const stored = jar.get(RESOLVED_THEME_COOKIE)?.value;
  const resolved = stored === "light" || stored === "dark" ? stored : theme === "light" ? "light" : "dark";

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${resolved} antialiased`} style={{ colorScheme: resolved }}>
      <body className="min-h-dvh">
        <ClerkProvider
          appearance={{ theme: shadcn, variables: { borderRadius: "8px" } }}
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          signInFallbackRedirectUrl="/today"
          signUpFallbackRedirectUrl="/today"
        >
          <ThemeProvider initialTheme={theme} initialResolved={resolved}>
            <TooltipProvider delayDuration={300}>
              {children}
              <Toaster
                position="bottom-center"
                toastOptions={{
                  classNames: {
                    toast: "!rounded-lg !border !border-line !bg-surface-2 !text-ink !text-[13px] !shadow-none",
                    description: "!text-ink-subtle",
                  },
                }}
              />
            </TooltipProvider>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
