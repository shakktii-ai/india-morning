import "./globals.css";
import AdSenseScript from "./_components/AdSenseScript";
import AdBanner from "./_components/AdBanner";
import SiteFooter from "./_components/SiteFooter";

export const metadata = {
  metadataBase: new URL((process.env.NEXT_PUBLIC_BASE_URL || "https://www.indiamorning.in").replace(/\/+$/, "")),
  title: "India Morning",
  description: "News portal with CMS roles",
  openGraph: {
    title: "India Morning",
    description: "Global News Portal - India Morning",
    images: ["/images/Indian-Morning-Logo.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "India Morning",
    description: "Global News Portal - India Morning",
    images: ["/images/Indian-Morning-Logo.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/images/Indian-Morning-Logo.png" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
      </head>
      <body style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
        <AdSenseScript />
        {children}
        <AdBanner format="horizontal" />
        <SiteFooter />
      </body>
    </html>
  );
}

