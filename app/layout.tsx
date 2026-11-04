import { getBaseUrl } from "@/src/utils/url";
import { Outfit, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import AdSenseScript from "./_components/AdSenseScript";
import AdBanner from "./_components/AdBanner";
import { Suspense } from "react";
import GoogleAnalytics from "./_components/GoogleAnalytics";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-outfit",
});

const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-noto-devanagari",
});

export const metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: "बातम्या | Maharashtra News | Breaking Marathi News | Hindi News | Breaking Hindi News | हिंदी समाचार | Latest News | Latest News India | India News | Latest Hindi News | Gujarati Samachar | Gujarati News - India Morning ",
  description: "Latest Marathi News: India Morning, Breaking Marathi News (मराठी बातम्या) , Maharashtra News (मराठीतील टॉप हेडलाईन्स), Latest News India , Marathi News Channel ,Hindi News, हिंदी समाचार ,Breaking Hindi News, Latest News, Latest Hindi News , Google News India ,India News, Gujarati Samachar, Gujarati News ,Latest News Gujarati - India Morning ",
  keywords: "India Morning , Maharashtra News , | Breaking Marathi News ,Latest Marathi News, Marathi News (मराठी बातम्या) ,Hindi News, हिंदी समाचार ,Breaking Hindi News, Latest News, Latest Hindi News ,News Today, India News, Latest News India, Google News India,Gujarati Samachar, Gujarati News ,Latest News Gujarati ",
  robots: "index, follow",
  authors: [{ name: "Marathi, Hindi, English" }],
  alternates: {
    canonical: "https://www.indiamorning.in",
  },
  openGraph: {
    type: "website",
    url: "https://www.indiamorning.in",
    title: "बातम्या | Maharashtra News | Breaking Marathi News | Hindi News | Breaking Hindi News | हिंदी समाचार | Latest News | Latest News India | India News | Latest Hindi News | Gujarati Samachar | Gujarati News - India Morning ",
    description: "Latest Marathi News: India Morning, Breaking Marathi News (मराठी बातम्या) , Maharashtra News (मराठीतील टॉप हेडलाईन्स), Latest News India , Marathi News Channel ,Hindi News, हिंदी समाचार ,Breaking Hindi News, Latest News, Latest Hindi News , Google news india ,India News, Gujarati Samachar, Gujarati News ,Latest News Gujarati - India Morning ",
    siteName: "India Morning",
    images: [
      {
        url: "https://www.indiamorning.in/images/Indian-Morning-Logo.png",
        width: 600,
        height: 315,
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "English,Marathi,Hindi",
    title: "बातम्या | Maharashtra News | Breaking Marathi News | Hindi News | Breaking Hindi News | हिंदी समाचार | Latest News | Latest News India | India News | Latest Hindi News | Gujarati Samachar | Gujarati News - India Morning ",
    description: "Latest Marathi News: India Morning, Breaking Marathi News (मराठी बातम्या) , Maharashtra News (मराठीतील टॉप हेडलाईन्स), Latest News India , Marathi News Channel ,Hindi News, हिंदी समाचार ,Breaking Hindi News, Latest News, Latest Hindi News , Google news india ,India News, Gujarati Samachar, Gujarati News ,Latest News Gujarati - India Morning ",
    images: ["https://www.indiamorning.in/images/Indian-Morning-Logo.png"],
  },
  other: {
    "rating": "General",
    "language": "English",
    "website": "https://www.indiamorning.in",
    "application-name": "India Morning",
  }
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {

  return (
    <html lang="en" suppressHydrationWarning className={`${outfit.variable} ${notoDevanagari.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://pagead2.googlesyndication.com" />
        <link rel="icon" href="/images/Indian-Morning-Logo.png" />
        <link rel="dns-prefetch" href="https://storage.googleapis.com" />
        <link rel="preconnect" href="https://storage.googleapis.com" crossOrigin="anonymous" />
        <link rel="alternate" type="application/rss+xml" title="India Morning RSS Feed" href="/rss.xml" />
        <meta name="google-site-verification" content="VGgUYrMp1PI4WOorW8z0xUpliHRlm6rLmI7pugW-OFw" />
        {/* Prevents Chrome's native translate bar */}
        <meta name="google" content="notranslate" />
      </head>
      <body style={{ fontFamily: "var(--font-outfit), var(--font-noto-devanagari), system-ui, sans-serif" }} suppressHydrationWarning>
        <GoogleAnalytics />
        <AdSenseScript />
        <Suspense fallback={null}>
          {children}
        </Suspense>
        <Suspense fallback={null}>
          <AdBanner format="horizontal" />
        </Suspense>
      </body>
    </html>
  );
}
