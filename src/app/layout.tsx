import type { Metadata } from "next";
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
    },
    twitter: { card: "summary_large_image" },
    icons: { icon: "/favicon.svg" },
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
      <body>{children}</body>
    </html>
  );
}
