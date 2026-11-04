"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getAbsoluteUrl, getImageUrl } from "@/src/utils/url";
import { getTranslation } from "@/src/utils/i18n";
import Image from "next/image";

export default function ArticleCard({ a }: { a: any }) {
  const sp = useSearchParams();
  const lang = sp.get("lang") || "ALL";
  const region = sp.get("region") || "ALL";

  const getUrl = (slug: string) => {
    const params = new URLSearchParams();
    if (lang !== "ALL") params.set("lang", lang);
    if (region !== "ALL") params.set("region", region);
    const qs = params.toString();
    const baseUrl = `/article/${slug}`;
    return qs ? `${baseUrl}?${qs}` : baseUrl;
  };

  // Helper to normalize spaces (replaces non-breaking spaces with regular ones)
  const normalizeSpaces = (text: string) => {
    if (!text) return "";
    return text.replace(/\u00A0/g, " ").replace(/&nbsp;/g, " ");
  };

  const title = normalizeSpaces(a.title);
  const excerpt = normalizeSpaces(a.excerpt || getTranslation("excerpt_fallback", lang));
  const imageUrl = getImageUrl(a.coverImageUrl || a.image);
  const articleUrl = getAbsoluteUrl(getUrl(a.slug));

  return (
    <Link href={getUrl(a.slug)} className="card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{
        width: "100%",
        aspectRatio: "16/9",
        position: "relative",
        background: "#F3F4F6"
      }}>
        <Image 
          src={imageUrl} 
          alt={title} 
          fill 
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          style={{ objectFit: "cover" }}
          loading="lazy"
        />
      </div>
      <div style={{ padding: 16, flex: 1, display: "flex", flexDirection: "column" }}>
        <h3 style={{ fontSize: 18, margin: "0 0 8px", lineHeight: 1.3, color: "var(--text)" }}>{title}</h3>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 12px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.5 }}>
          {excerpt}
        </p>
        <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, fontWeight: 500, color: "var(--text-muted)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span suppressHydrationWarning>{a.publishedAt ? new Date(a.publishedAt).toLocaleDateString(
              lang === "HI" ? "hi-IN" : 
              lang === "PA" ? "pa-IN" : 
              lang === "TA" ? "ta-IN" : "en-IN", 
              { month: 'short', day: 'numeric', year: 'numeric' }
            ) : getTranslation("recently", lang)}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              <span>{a.viewCount || 0}</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();

                if (navigator.share) {
                  navigator.share({
                    title: title,
                    text: excerpt,
                    url: articleUrl
                  }).catch(() => { });
                } else {
                  // Fallback: Copy to clipboard
                  navigator.clipboard.writeText(articleUrl);
                  alert(getTranslation("link_copied", lang));
                }
              }}
              style={{
                background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)",
                display: "flex", alignItems: "center", padding: 4, borderRadius: "50%",
                transition: "background 0.2s"
              }}
              onMouseOver={(e) => e.currentTarget.style.background = "#F3F4F6"}
              onMouseOut={(e) => e.currentTarget.style.background = "none"}
              title={getTranslation("share_article", lang)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                <polyline points="16 6 12 2 8 6"></polyline>
                <line x1="12" y1="2" x2="12" y2="15"></line>
              </svg>
            </button>
            <span style={{ color: "var(--accent)" }}>{getTranslation("read_more", lang)} →</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

