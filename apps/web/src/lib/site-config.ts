const siteUrl =
  (import.meta.env.VITE_WEB_URL as string | undefined) ??
  "https://web.folionote.xyz"
const isDev = import.meta.env.DEV

export const siteConfig = {
  name: isDev ? "FolioNote Dev" : "FolioNote",
  description:
    "Your personal learning system for capturing, organizing, and revisiting what you learn.",
  url: siteUrl.replace(/\/$/, ""),
  ogImage: `${siteUrl.replace(/\/$/, "")}/og-image.png`,
  locale: "en_US",
  twitter: "@folionote"
} as const
