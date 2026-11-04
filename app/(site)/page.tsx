import { getHomeData, getAllCategories } from "@/src/lib/data-public";
import SiteHeader from "../_components/SiteHeader";
import CategoryTabs from "../_components/CategoryTabs";
import FiltersBar from "../_components/FiltersBar";
import AdBanner from "../_components/AdBanner";
import Link from "next/link";
import LoadMoreArticles from "../_components/LoadMoreArticles";
import { getTranslation } from "@/src/utils/i18n";
import { Suspense } from "react";
import Image from "next/image";
import SiteFooter from "../_components/SiteFooter";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home({ searchParams }: { searchParams: Promise<{ region?: string; lang?: string }> }) {
  const { region = "ALL", lang = "ALL" } = await searchParams;

  const [data, categories] = await Promise.all([
    getHomeData({ region, lang }),
    getAllCategories()
  ]);
  const tickerItems = data.topStories?.slice(0, 8).map((a: any) => a.title);

  const getArticleUrl = (slug: string) => {
    const params = new URLSearchParams();
    if (lang !== "ALL") params.set("lang", lang);
    if (region !== "ALL") params.set("region", region);
    const qs = params.toString();
    return qs ? `/article/${slug}?${qs}` : `/article/${slug}`;
  };

  const featured = data.topStories?.[0];
  const otherStories = data.topStories?.slice(1, 7);

  return (
    <>
      <div style={{ position: 'absolute', width: '1px', height: '1px', padding: '0', margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: '0' }}>
        <h1>मराठी बातम्या । Hindi News । Latest News । News Today</h1>
        <h2>Breaking News</h2>
        <h2>Entertainment</h2>
        <h2>Politics</h2>
        <h2>Sports</h2>
        <h2>Business</h2>
        <h2>Technology</h2>
        <h2>Health</h2>
        <h2>World</h2>
        <h2>Lifestyle</h2>
        <h2>Education</h2>
        <h2>All news heading</h2>
      </div>
      <div className="notranslate">
        <Suspense fallback={null}>
          <SiteHeader tickerItems={tickerItems} lang={lang} region={region} />
        </Suspense>
        <FiltersBar lang={lang} region={region} />
        <Suspense fallback={null}>
          <CategoryTabs active="" categories={categories} lang={lang} region={region} />
        </Suspense>
        <div className="container" style={{ marginTop: 20 }}>
          <Suspense fallback={null}>
            <AdBanner format="horizontal" />
          </Suspense>
        </div>
      </div>

      <main className="container" style={{ paddingTop: 24, paddingBottom: 60 }}>
        {featured ? (
          <section style={{ marginBottom: 40 }}>
            <Link href={getArticleUrl(featured.slug)} className="card responsive-featured-grid" style={{ padding: 0, overflow: "hidden", minHeight: 400 }}>
              <div style={{
                position: "relative",
                minHeight: 300,
                background: "#F3F4F6",
                flex: 1
              }}>
                <Image 
                  src={featured.coverImageUrl || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&q=80&w=1200'}
                  alt={featured.title}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  style={{ objectFit: "cover" }}
                />
              </div>
              <div style={{ padding: "clamp(24px, 5vw, 40px)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ color: "var(--accent)", fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12 }}>{getTranslation("featured_story", lang)}</div>
                <h1 style={{ fontSize: "clamp(24px, 5vw, 36px)", marginBottom: 16, lineHeight: 1.2 }}>{featured.title}</h1>
                <p style={{ fontSize: "clamp(14px, 2vw, 18px)", color: "var(--text-muted)", marginBottom: 24, lineHeight: 1.6 }}>{featured.excerpt || getTranslation("excerpt_featured_fallback", lang)}</p>
                <div style={{ marginTop: "auto", fontWeight: 600, color: "var(--brand)" }}>
                  {getTranslation("read_full_story", lang)} <span style={{ marginLeft: 8 }}>→</span>
                </div>
              </div>
            </Link>
          </section>

        ) : (
          <div className="card" style={{ textAlign: "center", padding: 60, margin: "40px 0" }}>
            <h2>{getTranslation("no_articles", lang)}</h2>
          </div>
        )}

        <div className="responsive-grid-2-1">
          <section>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0 }}>{getTranslation("top_stories", lang)}</h2>
              <div style={{ height: 2, flex: 1, background: "#E5E7EB", margin: "0 20px" }} />
            </div>
            <LoadMoreArticles
              initialArticles={otherStories}
              region={region}
              lang={lang}
            />
          </section>

          <aside>
            <div style={{ position: "sticky", top: 100 }}>
              <h2 style={{ marginBottom: 20 }}>{getTranslation("latest_updates", lang)}</h2>
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                {data.recent?.map((r: any, i: number) => (
                  <Link
                    key={r.slug}
                    href={getArticleUrl(r.slug)}
                    style={{
                      display: "block", padding: "16px 20px",
                      borderBottom: i === data.recent.length - 1 ? "none" : "1px solid #F3F4F6",
                      transition: "background 0.2s"
                    }}
                    className="admin-nav-link"
                  >
                    <div suppressHydrationWarning style={{ fontSize: 13, color: "var(--accent)", fontWeight: 700, marginBottom: 4 }}>
                      {r.publishedAt ? new Date(r.publishedAt).toLocaleDateString(
                        lang === "HI" ? "hi-IN" : 
                        lang === "PA" ? "pa-IN" : 
                        lang === "TA" ? "ta-IN" : "en-IN", 
                        { month: 'short', day: 'numeric', year: 'numeric' }
                      ) : ""}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.4 }}>{r.title}</div>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter categories={categories} recentPosts={data.recent?.slice(0, 2) || []} lang={lang} region={region} />
    </>
  );
}
