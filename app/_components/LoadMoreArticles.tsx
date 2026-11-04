"use client";

import { useState } from "react";
import ArticleCard from "./ArticleCard";
import { getTranslation } from "@/src/utils/i18n";

interface LoadMoreArticlesProps {
  initialArticles: any[];
  region: string;
  lang: string;
  category?: string;
  searchQuery?: string;
}

export default function LoadMoreArticles({ 
  initialArticles, 
  region, 
  lang, 
  category,
  searchQuery 
}: LoadMoreArticlesProps) {
  const [articles, setArticles] = useState(initialArticles);
  const [page, setPage] = useState(2);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialArticles.length >= 12);

  const loadMore = async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    try {
      const baseUrl = searchQuery ? "/api/public/search" : "/api/public/home";
      const params = new URLSearchParams({
          page: page.toString(),
          limit: "12"
      });
      
          if (searchQuery) {
              params.append("q", searchQuery);
          } else {
              params.append("region", region);
              params.append("lang", lang);
              if (category) params.append("category", category);
          }

      const res = await fetch(`${baseUrl}?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      
      const data = await res.json();
      const newArticles = searchQuery ? data.articles : data.topStories;
      
      if (newArticles && newArticles.length > 0) {
        setArticles([...articles, ...newArticles]);
        setPage(page + 1);
        if (newArticles.length < 12) {
          setHasMore(false);
        }
      } else {
        setHasMore(false);
      }
    } catch (e) {
      console.error("Load more error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", alignItems: "start" }}>
        {articles.map((a) => (
          <ArticleCard key={a.id} a={a} />
        ))}
      </div>

      {hasMore && (
        <div style={{ textAlign: "center", marginTop: 40 }}>
          <button 
            onClick={loadMore} 
            className="btn btnSecondary"
            disabled={loading}
            style={{ minWidth: 160 }}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                {getTranslation('loading', lang) || "Loading..."}
              </>
            ) : (getTranslation('load_more', lang) || "Load More Articles")}
          </button>
        </div>
      )}
      
      <style jsx>{`
        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(0,0,0,0.1);
          border-left-color: var(--brand);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-right: 8px;
          display: inline-block;
          vertical-align: middle;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
