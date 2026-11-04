"use client";

import Link from "next/link";

export default function ArticleCard({ a }: { a: any }) {
  // Helper to normalize spaces (replaces non-breaking spaces with regular ones)
  const normalizeSpaces = (text: string) => {
    if (!text) return "";
    return text.replace(/\u00A0/g, " ").replace(/&nbsp;/g, " ");
  };
  return (
    <Link href={`/article/${a.slug}`} className="card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{
        width: "100%",
        aspectRatio: "16/9",
        backgroundImage: `url(${a.coverImageUrl || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=1000&auto=format&fit=crop'})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        position: "relative"
      }}>
        {/* <div style={{
          position: "absolute", top: 12, left: 12, maxWidth: "calc(100% - 24px)",
          display: "flex", flexWrap: "wrap", gap: 4
        }}>
          {a.categories && a.categories.length > 0 ? (
            a.categories.map((cat: any) => (
              <div key={cat.id || cat.name} style={{
                background: "var(--brand)", color: "white", padding: "4px 10px",
                borderRadius: 8, fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.5px", boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
              }}>
                {cat.name}
              </div>
            ))
          ) : a.category ? (
            <div style={{
              background: "var(--brand)", color: "white", padding: "4px 10px",
              borderRadius: 8, fontSize: 11, fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.5px", boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
            }}>
              {a.category.name}
            </div>
          ) : null}
        </div> */}
        <div style={{
          position: "absolute", bottom: 8, right: 8, zIndex: 5,
          pointerEvents: "none", opacity: 0.8
        }}>
          <img src="/images/Indian-Morning-Logo.png" alt="Watermark" style={{ width: 40, height: "auto" }} />
        </div>
      </div>
      <div style={{ padding: 16, flex: 1, display: "flex", flexDirection: "column" }}>
        <h3 style={{ fontSize: 18, margin: "0 0 8px", lineHeight: 1.3, color: "var(--text)" }}>{normalizeSpaces(a.title)}</h3>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 12px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.5 }}>
          {normalizeSpaces(a.excerpt || "Read the latest updates on this story from India Mornings...")}
        </p>
        <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, fontWeight: 500, color: "var(--text-muted)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span>{a.publishedAt ? new Date(a.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently'}</span>
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
                const baseUrl = (typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_BASE_URL || "https://www.indiamorning.in")).replace(/\/+$/, "");
                const finalUrl = `${baseUrl}/article/${a.slug}`;

                if (navigator.share) {
                  navigator.share({
                    title: a.title,
                    text: a.excerpt || "Check out this story on India Mornings",
                    url: finalUrl
                  }).catch(() => { });
                } else {
                  // Fallback: Copy to clipboard
                  navigator.clipboard.writeText(finalUrl);
                  alert("Link copied to clipboard!");
                }
              }}
              style={{
                background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)",
                display: "flex", alignItems: "center", padding: 4, borderRadius: "50%",
                transition: "background 0.2s"
              }}
              onMouseOver={(e) => e.currentTarget.style.background = "#F3F4F6"}
              onMouseOut={(e) => e.currentTarget.style.background = "none"}
              title="Share article"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                <polyline points="16 6 12 2 8 6"></polyline>
                <line x1="12" y1="2" x2="12" y2="15"></line>
              </svg>
            </button>
            <span style={{ color: "var(--accent)" }}>Read More →</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
