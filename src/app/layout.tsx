import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { getSiteContent } from "@/lib/queries";
import { SITE_NAME, SITE_URL } from "@/lib/env";

function safeMetadataBase(): URL | undefined {
  try {
    return new URL(SITE_URL);
  } catch {
    return undefined;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getSiteContent();
  return {
    metadataBase: safeMetadataBase(),
    title: {
      default: seo.title,
      template: `%s · ${SITE_NAME}`,
    },
    description: seo.description,
    keywords: seo.keywords,
    applicationName: SITE_NAME,
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: seo.title,
      description: seo.description,
      locale: "fr_FR",
      images: [{ url: "/icon-512.png", width: 512, height: 512, alt: SITE_NAME }],
    },
    twitter: { card: "summary_large_image", images: ["/icon-512.png"] },
    icons: {
      icon: [
        { url: "/favicon-64.png", sizes: "64x64", type: "image/png" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: "/apple-touch-icon.png",
      shortcut: "/favicon-64.png",
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* Enhances the system-font fallback; the app renders fine without it. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
