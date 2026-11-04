import SiteHeader from "../_components/SiteHeader";
import CategoryTabs from "../_components/CategoryTabs";
import FiltersBar from "../_components/FiltersBar";
import AdBanner from "../_components/AdBanner";
import ArticleCard from "../_components/ArticleCard";
import Link from "next/link";
import LoadMoreArticles from "../_components/LoadMoreArticles";

export default async function Home({ searchParams }: { searchParams: Promise<{ region?: string; lang?: string }> }) {
  const { region = "ALL", lang = "ALL" } = await searchParams;

  // Construct absolute URL for server-side fetch
  const base = process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

  const res = await fetch(`${base}/api/public/home?region=${encodeURIComponent(region)}&lang=${encodeURIComponent(lang)}`, {
    next: { revalidate: 60 } // Cache for 60 seconds, then revalidate in background
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch home data: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  const featured = data.topStories?.[0];
  const otherStories = data.topStories?.slice(1, 7);

  return (
    <>
      <SiteHeader />
      <FiltersBar />
      <CategoryTabs active="" />
      <div className="container" style={{ marginTop: 20 }}>
        <AdBanner format="horizontal" />
      </div>

      <main className="container" style={{ paddingTop: 24, paddingBottom: 60 }}>
        {featured ? (
          <section style={{ marginBottom: 40 }}>
            <Link href={`/article/${featured.slug}`} className="card responsive-featured-grid" style={{ padding: 0, overflow: "hidden", minHeight: 400 }}>
              <div style={{
                backgroundImage: `url(${featured.coverImageUrl || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&q=80&w=1200'})`,
                backgroundSize: "cover", backgroundPosition: "center", minHeight: 300,
                position: "relative"
              }}>
                <div style={{
                  position: "absolute", bottom: 20, right: 20, zIndex: 5,
                  pointerEvents: "none", opacity: 0.8
                }}>
                  <img src="/images/Indian-Morning-Logo.png" alt="Watermark" style={{ width: 80, height: "auto" }} />
                </div>
              </div>
              <div style={{ padding: "clamp(24px, 5vw, 40px)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ color: "var(--accent)", fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12 }}>Featured Story</div>
                <h1 style={{ fontSize: "clamp(24px, 5vw, 36px)", marginBottom: 16, lineHeight: 1.2 }}>{featured.title}</h1>
                <p style={{ fontSize: "clamp(14px, 2vw, 18px)", color: "var(--text-muted)", marginBottom: 24, lineHeight: 1.6 }}>{featured.excerpt || "Major developments are unfolding. Read the full story for in-depth coverage and expert analysis from our team."}</p>
                <div style={{ marginTop: "auto", fontWeight: 600, color: "var(--brand)" }}>
                  Read Full Story <span style={{ marginLeft: 8 }}>→</span>
                </div>
              </div>
            </Link>
          </section>

        ) : (
          <div className="card" style={{ textAlign: "center", padding: 60, margin: "40px 0" }}>
            <h2>No articles found for this region/language.</h2>
            <p>Try switching the region or language in the toolbar above.</p>
          </div>
        )}

        <div className="responsive-grid-2-1">
          <section>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0 }}>Top Stories</h2>
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
              <h2 style={{ marginBottom: 20 }}>Latest Updates</h2>
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                {data.recent?.map((r: any, i: number) => (
                  <Link
                    key={r.slug}
                    href={`/article/${r.slug}`}
                    style={{
                      display: "block", padding: "16px 20px",
                      borderBottom: i === data.recent.length - 1 ? "none" : "1px solid #F3F4F6",
                      transition: "background 0.2s"
                    }}
                    className="admin-nav-link"
                  >
                    <div style={{ fontSize: 13, color: "var(--accent)", fontWeight: 700, marginBottom: 4 }}>
                      {r.publishedAt ? new Date(r.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ""}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.4 }}>{r.title}</div>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}

