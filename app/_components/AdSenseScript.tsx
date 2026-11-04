"use client";
import { usePathname } from "next/navigation";
import Script from "next/script";

// Server Component
export default function AdSenseScript() {
  const pathname = usePathname();
  const rawId = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID || "";
  
  if (!rawId || (pathname && pathname.startsWith("/admin"))) return null;
  
  const pubId = rawId.startsWith("ca-") ? rawId : `ca-${rawId}`;

  return (
    <Script
      id="adsense-init"
      strategy="lazyOnload"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${pubId}`}
      crossOrigin="anonymous"
    />
  );
}
