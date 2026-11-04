
"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getTranslation } from "@/src/utils/i18n";

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
  const [isVisible, setIsVisible] = useState(false);
  const sp = useSearchParams();
  const lang = (sp.get("lang") || "ALL") as any;

  useEffect(() => {
    if (!pubId || pushed) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" } // Load slightly before it enters the viewport
    );

    const el = document.getElementById(`ad-slot-${slot || 'auto'}`);
    if (el) observer.observe(el);

    return () => observer.disconnect();
  }, [pubId, pushed, slot]);

  useEffect(() => {
    if (isVisible && !pushed) {
      try {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        setPushed(true);
      } catch (err: any) {
        if (err.message && err.message.includes("already have ads")) {
          setPushed(true);
          return;
        }
        console.error("AdSense Push Error:", err);
      }
    }
  }, [isVisible, pushed]);

  const pathname = usePathname();

  if (!pubId || slot === "1234567890" || (pathname && pathname.startsWith("/admin"))) {
    return (
      <div style={{
        margin: "40px auto",
        maxWidth: 800,
        background: "linear-gradient(135deg, #1e1e1e 0%, #3a3a3a 100%)",
        borderRadius: 12,
        padding: "30px 20px",
        textAlign: "center",
        boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
        position: "relative",
        overflow: "hidden"
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "var(--brand)" }}></div>
        <h4 style={{ color: "#fff", margin: "0 0 8px", fontSize: 18, fontWeight: 700 }}>{getTranslation("ad_title", lang)}</h4>
        <p style={{ color: "#ccc", margin: "0 0 16px", fontSize: 14 }}>{getTranslation("ad_desc", lang)}</p>
        <a
          href="mailto:indiamorning01@gmail.com?subject=Advertisement%20Inquiry"
          style={{
            display: "inline-block",
            background: "var(--brand)",
            color: "#fff",
            padding: "8px 24px",
            borderRadius: 8,
            fontWeight: 700,
            textDecoration: "none",
            fontSize: 14,
            transition: "all 0.2s ease"
          }}
        >
          Contact us for Ads
        </a>
      </div>
    );
  }

  return (
    <div style={{ margin: "20px 0", textAlign: "center", minHeight: 90 }}>
      <ins 
        id={`ad-slot-${slot || 'auto'}`}
        className="adsbygoogle"
        style={style}
        data-ad-client={pubId}
        data-ad-slot={slot || "1234567890"} // Placeholder slot if not provided
        data-ad-format={format}
        data-full-width-responsive={responsive}></ins>
      <a
        href="mailto:indiamorning01@gmail.com?subject=Advertisement%20Inquiry"
        style={{
          fontSize: 11,
          color: "var(--brand)",
          marginTop: 12,
          display: "block",
          textDecoration: "none",
          fontWeight: 600,
          transition: "opacity 0.2s"
        }}
        onMouseOver={(e) => (e.currentTarget.style.opacity = "0.8")}
        onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
      >
        {getTranslation("ad_contact_text", lang)} indiamorning01@gmail.com
      </a>
    </div>
  );
}
