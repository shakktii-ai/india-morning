import SiteHeader from "../../_components/SiteHeader";
import CategoryTabs from "../../_components/CategoryTabs";
import AdBanner from "../../_components/AdBanner";
import ArticleCard from "../../_components/ArticleCard";
import LoadMoreArticles from "../../_components/LoadMoreArticles";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const base = process.env.NEXT_PUBLIC_BASE_URL || "";
  
  // We'll reuse the home API but with a search query if we can, 
  // or create a new search endpoint.
  const res = await fetch(`${base}/api/public/search?q=${encodeURIComponent(q)}`, { cache: "no-store" });
  const data = await res.json().catch(() => ({ articles: [] }));

  return (
    <>
      <SiteHeader />
      <CategoryTabs active="" />
      
      <main className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>
        <div style={{ marginBottom: 40 }}>
           <h1 style={{ fontSize: 32, marginBottom: 8 }}>Search Results</h1>
           <p style={{ color: "var(--text-muted)" }}>
             {q ? `Showing results for "${q}"` : "Enter a search term to find articles."}
           </p>
        </div>

        <AdBanner format="horizontal" />

        <div style={{ marginTop: 40 }}>
          {data.articles?.length > 0 ? (
            <LoadMoreArticles 
              initialArticles={data.articles} 
              region="ALL" 
              lang="ALL" 
              searchQuery={q}
            />
          ) : (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
              <h3>No articles found</h3>
              <p>Try searching for something else.</p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
