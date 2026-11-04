"use client";

import SiteHeader from "@/app/_components/SiteHeader";
import AdBanner from "@/app/_components/AdBanner";
import Link from "next/link";
import { useEffect, useState } from "react";
import ArticleCard from "@/app/_components/ArticleCard";
import { useRouter } from "next/navigation";
export default function ArticleClientPage({ initialArticle }: { initialArticle: any }) {
  const router = useRouter();
  const base = (process.env.NEXT_PUBLIC_BASE_URL || "https://www.indiamorning.in").replace(/\/+$/, "");

  // Helper to normalize spaces (replaces non-breaking spaces with regular ones)
  const normalizeSpaces = (text: string) => {
    if (!text) return "";
    return text.replace(/\u00A0/g, " ").replace(/&nbsp;/g, " ");
  };
  const [article, setArticle] = useState<any>(initialArticle);
  const [recommendations, setRecommendations] = useState<any[]>(initialArticle?.recommendations || []);
  const [loading, setLoading] = useState(!initialArticle);

  const currentUrl = article ? `${base}/article/${article.slug}` : base;

  // In case we don't have the article yet (though server should provide it)
  useEffect(() => {
    // Fire and forget view increment
    if (initialArticle?.slug) {
      fetch(`${base}/api/public/articles/${encodeURIComponent(initialArticle.slug)}/view`, { method: "POST" }).catch(e => console.error("Failed to increment view", e));
    }

    if (article) return;

    async function fetchData() {
      try {
        // Check if initialArticle exists before trying to fetch
        if (!initialArticle?.slug) {
          setLoading(false);
          return;
        }

        const res = await fetch(`${base}/api/public/articles/${encodeURIComponent(initialArticle.slug)}`);
        if (res.ok) {
          const { article: data } = await res.json();
          setArticle(data);
          if (data.recommendations) {
            setRecommendations(data.recommendations);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [article, base, initialArticle?.slug]);

  if (loading) return (
    <>
      <SiteHeader />
      <div className="container" style={{ padding: 100, textAlign: "center", color: "var(--text-muted)" }}>
        Loading story...
      </div>
    </>
  );

  if (!article) return (
    <>
      <SiteHeader />
      <main className="container" style={{ padding: 60, textAlign: "center" }}>
        <h1>Article Not Found</h1>
        <p>The story you are looking for might have been moved or deleted.</p>
        <Link href="/" className="btn btn-primary" style={{ marginTop: 20, display: "inline-block" }}>Back to Home</Link>
      </main>
    </>
  );

  return (
    <>
      <SiteHeader />

      {/* Unified container for Back button and Article Content */}
      <div
        className="container"
        style={{
          maxWidth: 1100,
          width: "100%",
          margin: "0 auto",
          padding: "20px 16px",
          overflowX: "hidden",
          boxSizing: "border-box"
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <button
            onClick={() => router.push("/")}
            style={{
              background: "white", border: "1px solid #E5E7EB", padding: "8px 16px", borderRadius: 10,
              fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
              boxShadow: "0 2px 4px rgba(0,0,0,0.05)", transition: "all 0.2s"
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = "translateX(-4px)"; e.currentTarget.style.borderColor = "var(--brand)"; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = "translateX(0)"; e.currentTarget.style.borderColor = "#E5E7EB"; }}
          >
            &larr; Back
          </button>
        </div>

        <main className="article-main" style={{ paddingBottom: 80 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 20 }}>
            {article.categories && article.categories.length > 0 ? (
              article.categories.map((cat: any) => (
                <span key={cat.id} style={{ background: "var(--brand)", color: "white", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                  {cat.name}
                </span>
              ))
            ) : (
              <span style={{ background: "var(--brand)", color: "white", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                {article.category?.name || "News"}
              </span>
            )}
            <span style={{ color: "var(--text-muted)", fontSize: 14 }}>
              • {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString('en-IN', { dateStyle: 'long' }) : ""}
            </span>
            <span style={{ color: "var(--text-muted)", fontSize: 14, display: "flex", alignItems: "center", gap: 4 }}>
              •
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              {article.viewCount || 0} views
            </span>
          </div>

          <h1 style={{
            fontSize: "clamp(24px, 5vw, 48px)",
            margin: "0 0 24px",
            lineHeight: 1.3,
            fontWeight: 800,
            overflowWrap: "break-word",
            wordBreak: "normal",
            hyphens: "none",
            WebkitHyphens: "none",
            maxWidth: "100%"
          }}>
            {normalizeSpaces(article.title)}
          </h1>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 40, borderBottom: "1px solid #E5E7EB", paddingBottom: 24 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--brand)", color: "white", display: "grid", placeItems: "center", fontWeight: 700 }}>
              {article.author?.name?.[0] || "A"}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{article.author?.name || "India Mornings Reporter"}</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Published in {article.category?.name || "General"}</div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
              {/* Share Buttons */}
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ width: 36, height: 36, borderRadius: "50%", background: "#1877F2", color: "white", display: "grid", placeItems: "center", textDecoration: "none" }}
                title="Share on Facebook"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
              </a>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(article.title + " - " + currentUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ width: 36, height: 36, borderRadius: "50%", background: "#25D366", color: "white", display: "grid", placeItems: "center", textDecoration: "none" }}
                title="Share on WhatsApp"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
              </a>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(currentUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ width: 36, height: 36, borderRadius: "50%", background: "#000", color: "white", display: "grid", placeItems: "center", textDecoration: "none" }}
                title="Share on Twitter"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
              </a>
              <button
                onClick={() => {
                  const finalUrl = typeof window !== 'undefined' ? window.location.href : currentUrl;
                  if (navigator.share) {
                    navigator.share({
                      title: article.title,
                      text: article.excerpt || "Check out this story on India Mornings",
                      url: finalUrl
                    }).catch(() => { });
                  } else {
                    navigator.clipboard.writeText(finalUrl);
                    alert("Link copied to clipboard!");
                  }
                }}
                style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--brand)", color: "white", display: "grid", placeItems: "center", border: "none", cursor: "pointer" }}
                title="More options"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3"></circle>
                  <circle cx="6" cy="12" r="3"></circle>
                  <circle cx="18" cy="19" r="3"></circle>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                </svg>
              </button>
            </div>
          </div>

          <div style={{ position: "relative", marginBottom: 32, borderRadius: 20, overflow: "hidden", boxShadow: "var(--shadow)" }}>
            <img
              src={article.coverImageUrl}
              alt={article.title}
              style={{ width: "100%", height: "auto", maxHeight: 500, objectFit: "cover" }}
            />
            <div style={{
              position: "absolute", bottom: 16, right: 16, zIndex: 5,
              pointerEvents: "none", opacity: 0.8
            }}>
              <img src="/images/Indian-Morning-Logo.png" alt="Watermark" style={{ width: 80, height: "auto" }} />
            </div>
          </div>
          {article.excerpt && (
            <p style={{
              marginTop: 24,
              fontSize: "clamp(16px, 3vw, 20px)",
              color: "var(--text)",
              fontWeight: 500,
              lineHeight: 1.5,
              borderLeft: "4px solid var(--accent)",
              paddingLeft: 20,
              overflowWrap: "break-word",
              wordBreak: "normal",
              hyphens: "none",
              WebkitHyphens: "none",
              maxWidth: "100%"
            }}>
              {normalizeSpaces(article.excerpt)}
            </p>
          )}

          <article
            className="article-content"
            lang={article.language === 'MR' ? 'mr' : article.language === 'HI' ? 'hi' : 'en'}
            dangerouslySetInnerHTML={{ __html: normalizeSpaces(article.contentHtml) }}
          />

          {article.tags && article.tags.length > 0 && (
            <div style={{ marginTop: 40, display: "flex", flexWrap: "wrap", gap: 10 }}>
              <span style={{ fontWeight: 600, color: "var(--text-muted)", marginRight: 4 }}>Tags:</span>
              {article.tags.map((t: any) => (
                <span key={t.tag.id} style={{ fontSize: 13, background: "#F3F4F6", padding: "4px 10px", borderRadius: 6, color: "var(--accent)" }}>
                  #{t.tag.name}
                </span>
              ))}
            </div>
          )}

          <div style={{ marginTop: 60, paddingTop: 40, borderTop: "1px solid #E5E7EB" }}>
            <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 14, marginBottom: 20 }}>ADVERTISEMENT</div>
            <AdBanner slot="1234567890" />
          </div>

          {recommendations.length > 0 && (
            <div style={{ marginTop: 80 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 30 }}>
                <h2 style={{ margin: 0, fontSize: 24 }}>Recommended Stories</h2>
                <div style={{ height: 2, flex: 1, background: "#E5E7EB" }} />
              </div>
              <div className="grid article-recommendations" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
                {recommendations.map(a => <ArticleCard key={a.id} a={a} />)}
              </div>
            </div>
          )}
        </main >
      </div >
    </>
  );
}
