import SiteHeader from "@/app/_components/SiteHeader";
import CategoryTabs from "@/app/_components/CategoryTabs";
import FiltersBar from "@/app/_components/FiltersBar";
import SiteFooter from "@/app/_components/SiteFooter";
import Link from "next/link";
import LoadMoreArticles from "@/app/_components/LoadMoreArticles";
import { Metadata } from "next";
import { getTranslation } from "@/src/utils/i18n";
import { Suspense } from "react";
import { getHomeData, getAllCategories } from "@/src/lib/data-public";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const categoryName = slug.charAt(0).toUpperCase() + slug.slice(1);
  return {
    title: `${categoryName} News - India Morning`,
    description: `Read the latest ${categoryName} news and updates on India Morning.`,
  };
}

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ slug: string }>, searchParams: Promise<{ region?: string; lang?: string }> }) {
  const { region = "ALL", lang = "ALL" } = await searchParams;
  const { slug } = await params;

  const [data, categories] = await Promise.all([
    getHomeData({ region, lang, categorySlug: slug }),
    getAllCategories()
  ]);
  const tickerItems = data.topStories?.slice(0, 8).map((a: any) => a.title);

  const getArticleUrl = (articleSlug: string) => {
    const params = new URLSearchParams();
    if (lang !== "ALL") params.set("lang", lang);
    if (region !== "ALL") params.set("region", region);
    const qs = params.toString();
    return qs ? `/article/${articleSlug}?${qs}` : `/article/${articleSlug}`;
  };

  const localizedTitle = getTranslation(`nav_${slug}`, lang);

  return (
    <>
      <Suspense fallback={null}>
        <SiteHeader tickerItems={tickerItems} lang={lang} region={region} />
      </Suspense>
      <FiltersBar lang={lang} region={region} />
      <Suspense fallback={null}>
        <CategoryTabs active={slug} categories={categories} lang={lang} region={region} />
      </Suspense>

      <main className="container" style={{ paddingTop: 30, paddingBottom: 60 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 30 }}>
          <h1 style={{ margin: 0, fontSize: 32 }}>{localizedTitle || slug}</h1>
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
                      <h3 style={{ margin: "0 0 10px", color: "var(--text)" }}>We couldn't find any stories for "{localizedTitle || slug}"</h3>
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
              <h3 style={{ marginBottom: 20 }}>{getTranslation("trending_in", lang)} {localizedTitle || slug}</h3>
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                {data.recent?.map((r: any, i: number) => (
                  <Link
                    key={r.slug}
                    href={getArticleUrl(r.slug)}
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
      <SiteFooter categories={categories} recentPosts={data.recent?.slice(0, 2) || []} lang={lang} region={region} />
    </>
  );
}
