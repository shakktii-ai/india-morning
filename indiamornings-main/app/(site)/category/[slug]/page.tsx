import SiteHeader from "@/app/_components/SiteHeader";
import CategoryTabs from "@/app/_components/CategoryTabs";
import FiltersBar from "@/app/_components/FiltersBar";
import ArticleCard from "@/app/_components/ArticleCard";
import Link from "next/link";
import LoadMoreArticles from "@/app/_components/LoadMoreArticles";

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ slug: string }>, searchParams: Promise<{ region?: string; lang?: string }> }) {
  const { region = "ALL", lang = "ALL" } = await searchParams;
  const { slug } = await params;

  const base = process.env.NEXT_PUBLIC_BASE_URL || "";
  const res = await fetch(`${base}/api/public/home?region=${encodeURIComponent(region)}&lang=${encodeURIComponent(lang)}&category=${encodeURIComponent(slug)}`, { next: { revalidate: 60 } });
  const data = await res.json();

  return (
    <>
      <SiteHeader />
      <FiltersBar />
      <CategoryTabs active={slug} />

      <main className="container" style={{ paddingTop: 30, paddingBottom: 60 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 30 }}>
          <h1 style={{ margin: 0, fontSize: 32 }}>{data.category?.name || slug}</h1>
          <div style={{ height: 2, flex: 1, background: "linear-gradient(90deg, #E5E7EB, transparent)" }} />
        </div>

        <div className="responsive-grid-2-1">
          <section>
            {data.topStories?.length > 0 ? (
              <LoadMoreArticles 
                initialArticles={data.topStories} 
                region={region} 
                lang={lang} 
                category={slug}
              />
            ) : (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: 40 }}>
                {data.suggestions && data.suggestions.length > 0 ? (
                  <>
                     <div style={{ marginBottom: 40 }}>
                        <h3 style={{ margin: "0 0 10px", color: "var(--text)" }}>We couldn't find any stories for "{data.category?.name || slug}"</h3>
                        <p style={{ color: "var(--text-muted)" }}>But here are some other stories you might like:</p>
                     </div>
                     <div style={{ textAlign: "left" }}>
                        <LoadMoreArticles 
                          initialArticles={data.suggestions} 
                          region={region} 
                          lang={lang} 
                          category=""
                        />
                     </div>
                  </>
                ) : (
                  <h3>No articles found in this category.</h3>
                )}
              </div>
            )}
          </section>

          <aside>
            <div style={{ position: "sticky", top: 100 }}>
              <h3 style={{ marginBottom: 20 }}>Trending in {data.category?.name || slug}</h3>
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                {data.recent?.map((r: any, i: number) => (
                  <Link 
                    key={r.slug} 
                    href={`/article/${r.slug}`} 
                    style={{ 
                      display: "block", padding: "16px 20px", 
                      borderBottom: i === data.recent.length - 1 ? "none" : "1px solid #F3F4F6"
                    }}
                    className="admin-nav-link"
                  >
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{r.title}</div>
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

