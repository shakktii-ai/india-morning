
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function AdBanner({ 
  slot, 
  format = "auto", 
  responsive = "true", 
  style = { display: "block" } 
}: { 
  slot?: string; // We might need slot IDs later, currently using auto ads mostly 
  format?: string;
  responsive?: string;
  style?: React.CSSProperties
}) {
  const rawId = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID || "";
  const pubId = rawId ? (rawId.startsWith("ca-") ? rawId : `ca-${rawId}`) : "";

  const [pushed, setPushed] = useState(false);

  useEffect(() => {
    if (!pubId || pushed) return;
    
    // We use a small timeout to allow multiple banners mounting at once 
    // to potentially be picked up by a single push (if AdSense behaves that way)
    // or to let the DOM settle.
    const timer = setTimeout(() => {
      try {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        setPushed(true);
      } catch (err: any) {
        // Silence the "all elements already have ads" error as it's often a false positive 
        // in React/Next.js environments where scripts might have already picked up the tags.
        if (err.message && err.message.includes("already have ads")) {
          setPushed(true);
          return;
        }
        console.error("AdSense Push Error:", err);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [pubId, pushed]);

  const pathname = usePathname();

  if (!pubId || slot === "1234567890" || (pathname && pathname.startsWith("/admin"))) return <div style={{ minHeight: 90 }} />;

  return (
    <div style={{ margin: "20px 0", textAlign: "center", minHeight: 90 }}>
       <ins className="adsbygoogle"
         style={style}
         data-ad-client={pubId}
         data-ad-slot={slot || "1234567890"} // Placeholder slot if not provided
         data-ad-format={format}
         data-full-width-responsive={responsive}></ins>
       <div style={{ fontSize: 10, color: "#ccc", marginTop: 4 }}>
         ADVERTISEMENT {process.env.NODE_ENV === "development" && `(Slot: ${slot || "AUTO"})`}
       </div>
    </div>
  );
}
