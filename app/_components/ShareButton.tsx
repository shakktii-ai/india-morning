"use client";

import { getTranslation } from "@/src/utils/i18n";

export default function ShareButton({ lang }: { lang: string }) {
  const handleShareSite = async () => {
    const shareData = {
      title: "India Morning - Global News Portal",
      text: "Check out the latest news on India Morning!",
      url: typeof window !== "undefined" ? window.location.origin : ""
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.origin);
        alert(getTranslation("link_copied", lang) || "Link copied to clipboard!");
      }
    } catch (err) {
      console.log("Share cancelled or failed");
    }
  };

  return (
    <button 
      onClick={handleShareSite}
      style={{ 
        background: "rgba(255,255,255,0.1)", 
        border: "none", 
        color: "white", 
        width: 32, 
        height: 32, 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        borderRadius: "50%",
        cursor: "pointer",
        transition: "all 0.2s"
      }}
      className="hover-scale"
      title="Share Site"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
        <polyline points="16 6 12 2 8 6" />
        <line x1="12" y1="2" x2="12" y2="15" />
      </svg>
    </button>
  );
}
