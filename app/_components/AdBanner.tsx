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
  slot?: string;
  format?: string;
  responsive?: string;
  style?: React.CSSProperties
}) {
  const rawId = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID || "";
  const pubId = rawId ? (rawId.startsWith("ca-") ? rawId : `ca-${rawId}`) : "";

  // A slot is only valid if it is a real numeric string (not the dummy '1234567890' or placeholder)
  const hasValidSlot = Boolean(
    slot &&
    slot !== "1234567890" &&
    slot !== "auto" &&
    /^\d{6,}$/.test(slot.trim())
  );

  const [pushed, setPushed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const sp = useSearchParams();
  const lang = (sp.get("lang") || "ALL") as any;
  const pathname = usePathname();

  useEffect(() => {
    if (!pubId || !hasValidSlot || pushed) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );

    const el = document.getElementById(`ad-slot-${slot}`);
    if (el) observer.observe(el);

    return () => observer.disconnect();
  }, [pubId, hasValidSlot, pushed, slot]);

  useEffect(() => {
    if (isVisible && !pushed && hasValidSlot) {
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
  }, [isVisible, pushed, hasValidSlot]);

  // If no publisher ID, or no valid ad unit slot ID, or in admin, render internal sponsored banner
  if (!pubId || !hasValidSlot || (pathname && pathname.startsWith("/admin"))) {
    return (
      <div style={{
        margin: "30px auto",
        maxWidth: 860,
        background: "linear-gradient(135deg, #1e1e1e 0%, #2e2e2e 100%)",
        borderRadius: 12,
        padding: "24px 20px",
        textAlign: "center",
        boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
        position: "relative",
        overflow: "hidden"
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "var(--brand)" }}></div>
        <h4 style={{ color: "#fff", margin: "0 0 6px", fontSize: 17, fontWeight: 700 }}>
          {getTranslation("ad_title", lang) || "Advertise with India Morning"}
        </h4>
        <p style={{ color: "#ccc", margin: "0 0 14px", fontSize: 13, lineHeight: 1.5 }}>
          {getTranslation("ad_desc", lang) || "Reach thousands of daily readers across Maharashtra and India."}
        </p>
        <a
          href="mailto:indiamorning01@gmail.com?subject=Advertisement%20Inquiry%20-%20India%20Morning"
          style={{
            display: "inline-block",
            background: "var(--brand)",
            color: "#fff",
            padding: "8px 22px",
            borderRadius: 8,
            fontWeight: 700,
            textDecoration: "none",
            fontSize: 13,
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
        id={`ad-slot-${slot}`}
        className="adsbygoogle"
        style={style}
        data-ad-client={pubId}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive}
      />
      <a
        href="mailto:indiamorning01@gmail.com?subject=Advertisement%20Inquiry"
        style={{
          fontSize: 11,
          color: "var(--brand)",
          marginTop: 8,
          display: "block",
          textDecoration: "none",
          fontWeight: 600,
          transition: "opacity 0.2s"
        }}
        onMouseOver={(e) => (e.currentTarget.style.opacity = "0.8")}
        onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
      >
        {getTranslation("ad_contact_text", lang) || "Advertise with us:"} indiamorning01@gmail.com
      </a>
    </div>
  );
}
