import { Suspense } from "react";
import SiteHeader from "../../_components/SiteHeader";
import CategoryTabs from "../../_components/CategoryTabs";
import AdBanner from "../../_components/AdBanner";
import LoadMoreArticles from "../../_components/LoadMoreArticles";
import { getSearchData } from "@/src/lib/data-public";

import { Metadata } from "next";
import { getTranslation } from "@/src/utils/i18n";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ q?: string; lang?: string }> }): Promise<Metadata> {
  const { q = "", lang = "ALL" } = await searchParams;
  return {
    title: q ? `${q} - Search Results | India Morning` : "Search | India Morning",
    description: q ? `Search results for ${q} on India Morning.` : "Search for latest news and updates on India Morning.",
  };
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; lang?: string; region?: string }> }) {
  const { q = "", lang = "ALL", region = "ALL" } = await searchParams;
  
  const data = await getSearchData({ q });

  return (
    <>
      <Suspense fallback={null}>
        <SiteHeader lang={lang} region={region} />
      </Suspense>
      <Suspense fallback={null}>
        <CategoryTabs active="" lang={lang} region={region} />
      </Suspense>
      
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
