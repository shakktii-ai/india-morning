"use client";

import SiteHeader from "@/app/_components/SiteHeader";
import AdBanner from "@/app/_components/AdBanner";
import Link from "next/link";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
const JoinUs = dynamic(() => import("@/app/_components/JoinUs"), { ssr: false });
import ArticleCard from "@/app/_components/ArticleCard";
import { useRouter, useSearchParams } from "next/navigation";
import { getTranslation } from "@/src/utils/i18n";
import Image from "next/image";
import CategoryTabs from "@/app/_components/CategoryTabs";
import FiltersBar from "@/app/_components/FiltersBar";

export default function ArticleClientPage({ 
  initialArticle, 
  categories, 
  tickerItems,
  lang = "ALL",
  region = "ALL"
}: { 
  initialArticle: any, 
  categories?: any[], 
  tickerItems?: string[],
  lang?: string,
  region?: string
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Use server-provided lang/region, fall back to URL params if needed
  const effectiveLang = lang !== "ALL" ? lang : (searchParams.get("lang") || "ALL");
  const effectiveRegion = region !== "ALL" ? region : (searchParams.get("region") || "ALL");

  const getLinkUrl = (path: string) => {
    const params = new URLSearchParams();
    if (effectiveLang !== "ALL") params.set("lang", effectiveLang);
    if (effectiveRegion !== "ALL") params.set("region", effectiveRegion);
    const qs = params.toString();
    return qs ? `${path}?${qs}` : path;
  };
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
      fetch(`/api/public/articles/${encodeURIComponent(initialArticle.slug)}/view`, { method: "POST" }).catch(e => console.error("Failed to increment view", e));
    }

    // Load Social Media Scripts
    const loadSocialScripts = () => {
      // Twitter
      if (!document.getElementById('twitter-wjs')) {
        const s = document.createElement('script');
        s.id = 'twitter-wjs';
        s.src = 'https://platform.twitter.com/widgets.js';
        s.async = true;
        document.body.appendChild(s);
      } else if ((window as any).twttr?.widgets) {
        (window as any).twttr.widgets.load();
      }

      // Instagram
      if (!document.getElementById('instagram-wjs')) {
        const s = document.createElement('script');
        s.id = 'instagram-wjs';
        s.src = 'https://www.instagram.com/embed.js';
        s.async = true;
        document.body.appendChild(s);
      } else if ((window as any).instgrm?.Embeds) {
        (window as any).instgrm.Embeds.process();
      }

      // Facebook
      if (!document.getElementById('facebook-jssdk')) {
        const s = document.createElement('script');
        s.id = 'facebook-jssdk';
        s.src = 'https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v19.0';
        s.async = true;
        document.body.appendChild(s);
      } else if ((window as any).FB) {
        (window as any).FB.XFBML.parse();
      }
    };

    // Only load heavy social scripts if the article actually contains embeds
    const hasSocialEmbeds = initialArticle?.contentHtml && (
      initialArticle.contentHtml.includes('twitter.com') ||
      initialArticle.contentHtml.includes('x.com') ||
      initialArticle.contentHtml.includes('instagram.com') ||
      initialArticle.contentHtml.includes('facebook.com')
    );

    if (hasSocialEmbeds) {
      loadSocialScripts();
    }

    if (article) return;

    async function fetchData() {
      try {
        // Check if initialArticle exists before trying to fetch
        if (!initialArticle?.slug) {
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/public/articles/${encodeURIComponent(initialArticle.slug)}`);
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
  }, [article?.slug, base, initialArticle?.slug]);

  // Re-process social embeds only if content contains social embeds
  useEffect(() => {
    if (!article?.contentHtml) return;

    const hasEmbeds = (
      article.contentHtml.includes('twitter.com') ||
      article.contentHtml.includes('x.com') ||
      article.contentHtml.includes('instagram.com') ||
      article.contentHtml.includes('facebook.com')
    );
    if (!hasEmbeds) return;

    let attempts = 0;
    let isCancelled = false;
    const maxAttempts = 15;

    const processWidgets = () => {
      if (isCancelled) return;
      let allFound = true;

      // Auto-prep links
      const blockquotes = document.querySelectorAll('blockquote:not([data-processed])');
      blockquotes.forEach(bq => {
        const link = bq.querySelector('a')?.href || "";
        if (link.includes('twitter.com') || link.includes('x.com')) {
          bq.classList.add('twitter-tweet');
          bq.setAttribute('data-processed', 'true');
        } else if (link.includes('instagram.com')) {
          bq.classList.add('instagram-media');
          bq.setAttribute('data-processed', 'true');
        }
      });

      const divs = document.querySelectorAll('div:not([data-processed])');
      divs.forEach(div => {
        const link = div.querySelector('a')?.href || "";
        if (link.includes('facebook.com')) {
          div.classList.add('fb-post');
          div.setAttribute('data-href', link);
          div.setAttribute('data-show-text', 'true');
          div.setAttribute('data-processed', 'true');
        }
      });

      // Twitter
      const twitterToProcess = document.querySelectorAll('.twitter-tweet:not([data-twitter-rendered="true"])');
      if (twitterToProcess.length > 0) {
        if ((window as any).twttr?.widgets) {
          (window as any).twttr.widgets.load();
        } else {
          allFound = false;
        }
      }

      // Instagram
      const instaToProcess = document.querySelectorAll('.instagram-media:not([data-instgrm-rendered])');
      if (instaToProcess.length > 0) {
        if ((window as any).instgrm?.Embeds) {
          (window as any).instgrm.Embeds.process();
        } else {
          allFound = false;
        }
      }

      // Facebook
      const fbToProcess = document.querySelectorAll('.fb-post:not([data-rendered="true"])');
      if (fbToProcess.length > 0) {
        if ((window as any).FB) {
          (window as any).FB.XFBML.parse();
        } else {
          allFound = false;
        }
      }

      attempts++;
      if (!allFound && attempts < maxAttempts) {
        setTimeout(processWidgets, 1000);
      }
    };

    const timer = setTimeout(processWidgets, 1000);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [article?.contentHtml]);

  if (loading) return (
    <>
      <SiteHeader />
      <div className="container" style={{ padding: 100, textAlign: "center", color: "var(--text-muted)" }}>
        {getTranslation('loading', effectiveLang)}
      </div>
    </>
  );

  if (!article) return (
    <>
      <SiteHeader />
      <main className="container" style={{ padding: 60, textAlign: "center" }}>
        <h1>Article Not Found</h1>
        <p>The story you are looking for might have been moved or deleted.</p>
        <Link href={getLinkUrl("/")} className="btn btn-primary" style={{ marginTop: 20, display: "inline-block" }}>{getTranslation('back', effectiveLang)} to Home</Link>
      </main>
    </>
  );

  return (
    <>
      <SiteHeader tickerItems={tickerItems} lang={effectiveLang} region={effectiveRegion} />
      <FiltersBar lang={effectiveLang} region={effectiveRegion} />
      <style dangerouslySetInnerHTML={{
        __html: `
        .article-content {
          padding-bottom: 40px !important;
        }
        .article-content .twitter-tweet, 
        .article-content .instagram-media,
        .article-content .fb-post,
        .article-content .fb-video {
          margin: 32px auto !important;
          padding: 0 !important;
          background: transparent !important;
          border: none !important;
          font-style: normal !important;
          display: block !important;
          clear: both !important;
          max-width: 550px !important;
          width: 100% !important;
          min-height: 200px;
          position: relative !important;
          z-index: 1 !important;
        }
        /* Allow SDKs to manage iframe heights naturally */
        .article-content .twitter-tweet iframe,
        .article-content .instagram-media iframe,
        .article-content .fb-post iframe,
        .article-content .fb-video iframe {
          display: block !important;
          width: 100% !important;
        }
        .article-content iframe {
          max-width: 100% !important;
        }
      `}} />

      {/* Unified container for Back button and Article Content */}
      <div
        className="container"
        style={{
          maxWidth: 1100,
          width: "100%",
          margin: "0 auto",
          padding: "40px 16px 20px",
          overflowX: "hidden",
          boxSizing: "border-box"
        }}
      >
        <CategoryTabs categories={categories} />
        <div style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button
            onClick={() => router.push(getLinkUrl("/"))}
            style={{
              background: "white", border: "1px solid #E5E7EB", padding: "8px 16px", borderRadius: 10,
              fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
              boxShadow: "0 2px 4px rgba(0,0,0,0.05)", transition: "all 0.2s"
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = "translateX(-4px)"; e.currentTarget.style.borderColor = "var(--brand)"; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = "translateX(0)"; e.currentTarget.style.borderColor = "#E5E7EB"; }}
          >
            &larr; {getTranslation('back', effectiveLang)}
          </button>

          <JoinUs />
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
            <span suppressHydrationWarning style={{ color: "var(--text-muted)", fontSize: 14 }}>
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
            <div style={{ marginLeft: "auto", display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {/* WhatsApp */}
              <a
                href={`https://wa.me/?text=${encodeURIComponent(article.title + " - " + currentUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ width: 36, height: 36, borderRadius: "50%", background: "#25D366", color: "white", display: "grid", placeItems: "center", textDecoration: "none", transition: "transform 0.2s" }}
                onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.1)"}
                onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
                title="Share on WhatsApp"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
              </a>
              {/* Facebook */}
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ width: 36, height: 36, borderRadius: "50%", background: "#1877F2", color: "white", display: "grid", placeItems: "center", textDecoration: "none", transition: "transform 0.2s" }}
                onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.1)"}
                onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
                title="Share on Facebook"
              >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
              </a>
              {/* Instagram */}
              <a
                href="https://www.instagram.com/_imorningnews/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ width: 36, height: 36, borderRadius: "50%", background: "#E4405F", color: "white", display: "grid", placeItems: "center", textDecoration: "none", transition: "transform 0.2s" }}
                onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.1)"}
                onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
                title="Follow on Instagram"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.668.014-4.948.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" /></svg>
              </a>
              {/* YouTube */}
              <a
                href="https://youtube.com/@indiamoringnews?si=1UfyYnomS6gY4UpA"
                target="_blank"
                rel="noopener noreferrer"
                style={{ width: 36, height: 36, borderRadius: "50%", background: "#FF0000", color: "white", display: "grid", placeItems: "center", textDecoration: "none", transition: "transform 0.2s" }}
                onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.1)"}
                onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
                title="Watch on YouTube"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
              </a>
              {/* X (Twitter) */}
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(currentUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ width: 36, height: 36, borderRadius: "50%", background: "#000000", color: "white", display: "grid", placeItems: "center", textDecoration: "none", transition: "transform 0.2s" }}
                onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.1)"}
                onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
                title="Share on X"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.261 5.635 5.902-5.635zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              {/* Threads */}
              <a
                href="https://www.threads.net/@_imorningnews"
                target="_blank"
                rel="noopener noreferrer"
                style={{ width: 36, height: 36, borderRadius: "50%", background: "#000000", color: "white", display: "grid", placeItems: "center", textDecoration: "none", transition: "transform 0.2s", border: "1px solid #333" }}
                onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.1)"}
                onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
                title="Follow on Threads"
              >
                <img src="/images/threads-white-icon.svg" alt="Threads" style={{ width: 22, height: 22, objectFit: "contain" }} />
              </a>
              {/* More options */}
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
                style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--brand)", color: "white", display: "grid", placeItems: "center", border: "none", cursor: "pointer", transition: "transform 0.2s" }}
                onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.1)"}
                onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
                title="More options"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
              </button>
            </div>
          </div>

          {article.coverImageUrl && (
            <div style={{ position: "relative", marginBottom: 32, borderRadius: 20, overflow: "hidden", boxShadow: "var(--shadow)", width: "100%", height: "auto", background: "#F3F4F6" }}>
              <Image
                src={article.coverImageUrl}
                alt={article.title}
                width={1200}
                height={675}
                priority
                style={{ width: "100%", height: "auto", maxHeight: 600, objectFit: "cover" }}
              />
            </div>
          )}
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
            <div style={{
              background: "linear-gradient(135deg, #1e1e1e 0%, #3a3a3a 100%)",
              borderRadius: 16,
              padding: "40px 20px",
              textAlign: "center",
              boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
              position: "relative",
              overflow: "hidden"
            }}>
              {/* Subtle accent line */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: "var(--brand)" }}></div>

              <h3 style={{ color: "#fff", margin: "0 0 12px", fontSize: 24, fontWeight: 700 }}>{getTranslation('ui_want_grow', effectiveLang)}</h3>
              <p style={{ color: "#ccc", margin: "0 0 24px", fontSize: 16 }}>{getTranslation('ui_partner_desc', effectiveLang)}</p>

              <a
                href="mailto:indiamorning01@gmail.com?subject=Advertisement%20Inquiry"
                style={{
                  display: "inline-block",
                  background: "var(--brand)",
                  color: "#fff",
                  padding: "12px 32px",
                  borderRadius: 12,
                  fontWeight: 700,
                  textDecoration: "none",
                  transition: "all 0.3s ease",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.2)"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.3)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 15px rgba(0,0,0,0.2)";
                }}
              >
                {getTranslation('ui_contact_ads', effectiveLang)}
              </a>

              <div style={{ marginTop: 16, fontSize: 13, color: "#888" }}>
                Email: indiamorning01@gmail.com
              </div>
            </div>
          </div>

          {recommendations.length > 0 && (
            <div style={{ marginTop: 80 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 30 }}>
                <h2 style={{ margin: 0, fontSize: 24 }}>{getTranslation('recommended', effectiveLang)}</h2>
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
