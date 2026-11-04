"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface DiscoveredArticle {
  id: string;
  title: string;
  link: string;
  snippet?: string;
  thumbnailUrl?: string | null;
  publishedAt?: string;
  isoDate?: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  status: "DISCOVERED" | "DISMISSED" | "DRAFT_CREATED";
  discoveredAt: string;
  source: {
    name: string;
    icon?: string;
    authors?: string[];
  };
  draftArticleId?: string | null;
  publishedArticleId?: string | null;
  isLivePublished?: boolean;
  contentHtml?: string;
}

export default function NewsDiscoveryPage() {
  const [articles, setArticles] = useState<DiscoveredArticle[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [statusCounts, setStatusCounts] = useState({
    discovered: 0,
    dismissed: 0,
    converted: 0,
    total: 0,
  });

  // Filters & State
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("DISCOVERED");
  const [search, setSearch] = useState<string>("");
  const [searchInput, setSearchInput] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const limit = 12;

  // UI state
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchingNews, setFetchingNews] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewArticle, setPreviewArticle] = useState<DiscoveredArticle | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load articles
  async function loadData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== "ALL") params.append("categoryId", selectedCategory);
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (search) params.append("search", search);
      params.append("page", page.toString());
      params.append("limit", limit.toString());

      const res = await fetch(`/api/admin/discovery?${params.toString()}`);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMsg(data?.message || "Failed to load discovery leads");
        return;
      }

      setArticles(data.articles || []);
      setTotal(data.total || 0);
      if (data.categories) setCategories(data.categories);
      if (data.categoryCounts) setCategoryCounts(data.categoryCounts);
      if (data.statusCounts) setStatusCounts(data.statusCounts);
    } catch (err: any) {
      setErrorMsg(err?.message || "Error loading discovery data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [page, selectedCategory, statusFilter, search]);

  // Auto-hide messages
  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(null), 4000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);

  useEffect(() => {
    if (errorMsg) {
      const t = setTimeout(() => setErrorMsg(null), 6000);
      return () => clearTimeout(t);
    }
  }, [errorMsg]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  }

  function handleClearSearch() {
    setSearchInput("");
    setSearch("");
    setPage(1);
  }

  // Trigger automated news discovery
  async function triggerAutomatedFetch(catId?: string) {
    setFetchingNews(true);
    try {
      const res = await fetch("/api/admin/discovery/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: catId }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMsg(data?.message || "Failed to fetch new discovery leads");
        return;
      }

      setSuccessMsg(data.message || "News discovery cycle completed successfully!");
      setPage(1);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err?.message || "Error during discovery cycle");
    } finally {
      setFetchingNews(false);
    }
  }

  // Dismiss article
  async function handleDismiss(id: string) {
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch("/api/admin/discovery/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMsg(data?.message || "Failed to dismiss article");
        return;
      }

      setSuccessMsg("Article dismissed. It will not reappear in future automated fetches.");
      setSelectedIds((prev) => prev.filter((i) => i !== id));
      if (previewArticle?.id === id) setPreviewArticle(null);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err?.message || "Error dismissing article");
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  }

  // Bulk dismiss selected
  async function handleBulkDismiss() {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to dismiss ${selectedIds.length} article(s)?`)) return;

    setLoading(true);
    try {
      const res = await fetch("/api/admin/discovery/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMsg(data?.message || "Failed to bulk dismiss articles");
        return;
      }

      setSuccessMsg(`Successfully dismissed ${selectedIds.length} articles.`);
      setSelectedIds([]);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err?.message || "Error bulk dismissing articles");
    } finally {
      setLoading(false);
    }
  }

  // Restore dismissed article
  async function handleRestore(id: string) {
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch("/api/admin/discovery/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMsg(data?.message || "Failed to restore article");
        return;
      }

      setSuccessMsg("Article restored to active discovery leads.");
      await loadData();
    } catch (err: any) {
      setErrorMsg(err?.message || "Error restoring article");
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  }

  // Convert to CMS draft
  async function handleConvertToDraft(id: string) {
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch("/api/admin/discovery/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMsg(data?.message || "Failed to convert to draft");
        return;
      }

      setSuccessMsg("Successfully created Draft! Opening article in editor...");
      await loadData();
      if (data.articleId) {
        window.open(`/admin/articles/${data.articleId}`, "_blank");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Error converting article to draft");
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  }

  // Publish article directly to live site
  async function handlePublishToLive(id: string) {
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch("/api/admin/discovery/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMsg(data?.message || "Failed to publish article to live site");
        return;
      }

      setSuccessMsg("Article published to live site! Visible to all users.");
      await loadData();
    } catch (err: any) {
      setErrorMsg(err?.message || "Error publishing article");
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  }

  // Bulk publish selected articles
  async function handleBulkPublishToLive() {
    if (selectedIds.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/discovery/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMsg(data?.message || "Failed to publish articles");
        return;
      }

      setSuccessMsg(`Successfully published ${selectedIds.length} articles to the live site!`);
      setSelectedIds([]);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err?.message || "Error publishing articles");
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.ceil(total / limit) || 1;

  function toggleSelectAll() {
    if (selectedIds.length === articles.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(articles.map((a) => a.id));
    }
  }

  function toggleSelectId(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  const activeCategoryObj = categories.find((c) => c.id === selectedCategory);

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Toast Messages */}
      {successMsg && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: "#10b981",
            color: "white",
            padding: "14px 22px",
            borderRadius: 12,
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            zIndex: 1000,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span>✓</span>
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: "#ef4444",
            color: "white",
            padding: "14px 22px",
            borderRadius: 12,
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            zIndex: 1000,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span>⚠</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Header Section */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 20,
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, color: "var(--brand)" }}>
              News Discovery & Leads
            </h1>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                background: "#e0e7ff",
                color: "#4338ca",
                padding: "3px 10px",
                borderRadius: 20,
              }}
            >
              SerpAPI Live
            </span>
          </div>
          <p style={{ margin: "6px 0 0", color: "#6b7280", fontSize: 14 }}>
            Automated intelligence discovering top verified news stories across all India Mornings desks.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {selectedCategory !== "ALL" && (
            <button
              onClick={() => triggerAutomatedFetch(selectedCategory)}
              disabled={fetchingNews}
              className="btn"
              style={{
                background: "#f3f4f6",
                color: "#374151",
                border: "1px solid #d1d5db",
                fontSize: 13,
                padding: "10px 16px",
              }}
            >
              {fetchingNews ? "Fetching..." : `Fetch for ${activeCategoryObj?.name || "Category"}`}
            </button>
          )}

          <button
            onClick={() => triggerAutomatedFetch()}
            disabled={fetchingNews}
            className="btn btnPrimary"
            style={{
              fontSize: 14,
              padding: "10px 20px",
              gap: 8,
              boxShadow: "0 4px 12px rgba(26, 3, 90, 0.2)",
            }}
          >
            {fetchingNews ? (
              <>
                <span className="spinner" style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⏳</span>
                <span>Discovering Latest News...</span>
              </>
            ) : (
              <>
                <span>⚡</span>
                <span>Discover All Desks Now</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Overview Stats Badges */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
          marginBottom: 20,
        }}
      >
        <div
          onClick={() => { setStatusFilter("DISCOVERED"); setPage(1); }}
          style={{
            background: statusFilter === "DISCOVERED" ? "#eef2ff" : "white",
            border: `1.5px solid ${statusFilter === "DISCOVERED" ? "#6366f1" : "#e5e7eb"}`,
            borderRadius: 12,
            padding: "14px 18px",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: "#4f46e5", textTransform: "uppercase" }}>
            Active Discovery Leads
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#1e1b4b", marginTop: 4 }}>
            {statusCounts.discovered}
          </div>
        </div>

        <div
          onClick={() => { setStatusFilter("DISMISSED"); setPage(1); }}
          style={{
            background: statusFilter === "DISMISSED" ? "#fef2f2" : "white",
            border: `1.5px solid ${statusFilter === "DISMISSED" ? "#ef4444" : "#e5e7eb"}`,
            borderRadius: 12,
            padding: "14px 18px",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: "#dc2626", textTransform: "uppercase" }}>
            Dismissed / Excluded
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#991b1b", marginTop: 4 }}>
            {statusCounts.dismissed}
          </div>
        </div>

        <div
          onClick={() => { setStatusFilter("DRAFT_CREATED"); setPage(1); }}
          style={{
            background: statusFilter === "DRAFT_CREATED" ? "#ecfdf5" : "white",
            border: `1.5px solid ${statusFilter === "DRAFT_CREATED" ? "#10b981" : "#e5e7eb"}`,
            borderRadius: 12,
            padding: "14px 18px",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: "#059669", textTransform: "uppercase" }}>
            Converted to Drafts
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#065f46", marginTop: 4 }}>
            {statusCounts.converted}
          </div>
        </div>

        <div
          onClick={() => { setStatusFilter("ALL"); setPage(1); }}
          style={{
            background: statusFilter === "ALL" ? "#f3f4f6" : "white",
            border: `1.5px solid ${statusFilter === "ALL" ? "#9ca3af" : "#e5e7eb"}`,
            borderRadius: 12,
            padding: "14px 18px",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>
            Total Tracked
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#374151", marginTop: 4 }}>
            {statusCounts.total}
          </div>
        </div>
      </div>

      {/* Category Filter Horizontal Pill Bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 8, textTransform: "uppercase" }}>
          Filter by Desk / Category
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            paddingBottom: 8,
            scrollbarWidth: "thin",
          }}
        >
          <button
            onClick={() => { setSelectedCategory("ALL"); setPage(1); }}
            style={{
              padding: "7px 16px",
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 600,
              border: "1px solid",
              borderColor: selectedCategory === "ALL" ? "var(--brand)" : "#e5e7eb",
              background: selectedCategory === "ALL" ? "var(--brand)" : "white",
              color: selectedCategory === "ALL" ? "white" : "#4b5563",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.2s",
            }}
          >
            All Categories ({statusCounts.discovered})
          </button>

          {categories.map((cat) => {
            const count = categoryCounts[cat.id] || 0;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => { setSelectedCategory(cat.id); setPage(1); }}
                style={{
                  padding: "7px 14px",
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 600,
                  border: "1px solid",
                  borderColor: isSelected ? "var(--brand)" : "#e5e7eb",
                  background: isSelected ? "var(--brand)" : "white",
                  color: isSelected ? "white" : "#4b5563",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.2s",
                }}
              >
                <span>{cat.name}</span>
                {count > 0 && (
                  <span
                    style={{
                      background: isSelected ? "rgba(255,255,255,0.3)" : "#e0e7ff",
                      color: isSelected ? "white" : "#3730a3",
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 10,
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search and Selection Action Bar */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          padding: "14px 18px",
          border: "1px solid #e5e7eb",
          marginBottom: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: 8, flex: 1, maxWidth: 500 }}>
          <input
            className="input"
            type="text"
            placeholder="Search headlines, keywords, or sources..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{ flex: 1, borderRadius: 8, padding: "8px 14px", fontSize: 13 }}
          />
          <button type="submit" className="btn btnPrimary" style={{ padding: "8px 16px", fontSize: 13 }}>
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="btn"
              style={{ background: "#f3f4f6", color: "#4b5563", padding: "8px 12px", fontSize: 13 }}
            >
              Clear
            </button>
          )}
        </form>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {selectedIds.length > 0 && (
            <>
              <button
                onClick={handleBulkPublishToLive}
                className="btn"
                style={{
                  background: "#10b981",
                  color: "white",
                  fontSize: 13,
                  padding: "8px 14px",
                  fontWeight: 600,
                  boxShadow: "0 2px 8px rgba(16,185,129,0.25)",
                }}
              >
                🌐 Publish Selected ({selectedIds.length})
              </button>
              <button
                onClick={handleBulkDismiss}
                className="btn"
                style={{
                  background: "#fee2e2",
                  color: "#b91c1c",
                  fontSize: 13,
                  padding: "8px 14px",
                  fontWeight: 600,
                }}
              >
                Dismiss Selected ({selectedIds.length})
              </button>
            </>
          )}

          <div style={{ fontSize: 13, color: "#6b7280" }}>
            Showing <strong>{articles.length}</strong> of <strong>{total}</strong> articles
          </div>
        </div>
      </div>

      {/* Articles Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#4b5563" }}>Loading discovered articles...</div>
        </div>
      ) : articles.length === 0 ? (
        <div
          style={{
            background: "white",
            borderRadius: 16,
            padding: "50px 20px",
            textAlign: "center",
            border: "1px dashed #d1d5db",
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>📰</div>
          <h3 style={{ fontSize: 18, color: "var(--brand)", margin: "0 0 8px" }}>
            No Discovered Articles Found
          </h3>
          <p style={{ color: "#6b7280", maxWidth: 500, margin: "0 auto 20px", fontSize: 14 }}>
            {search
              ? `No articles matching "${search}". Try adjusting your search query.`
              : selectedCategory !== "ALL"
              ? `No active discovery leads for category "${activeCategoryObj?.name}". Click below to trigger automated discovery for this category!`
              : "No active discovery leads currently in the queue. Click below to fetch the latest stories from SerpAPI!"}
          </p>

          <button
            onClick={() => triggerAutomatedFetch(selectedCategory !== "ALL" ? selectedCategory : undefined)}
            disabled={fetchingNews}
            className="btn btnPrimary"
            style={{ padding: "10px 22px", fontSize: 14 }}
          >
            {fetchingNews ? "Discovering..." : "⚡ Fetch Latest News Now"}
          </button>
        </div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
              gap: 18,
            }}
          >
            {articles.map((art) => {
              const isSelected = selectedIds.includes(art.id);
              const isActionRunning = actionLoading[art.id] || false;

              return (
                <div
                  key={art.id}
                  style={{
                    background: "white",
                    borderRadius: 14,
                    border: `1.5px solid ${isSelected ? "#6366f1" : "#e5e7eb"}`,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                    transition: "all 0.2s",
                    position: "relative",
                  }}
                >
                  {/* Card Thumbnail / Header */}
                  <div
                    style={{
                      height: 180,
                      background: "#f1f5f9",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {art.thumbnailUrl ? (
                      <img
                        src={art.thumbnailUrl}
                        alt={art.title}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(e) => {
                          // Hide broken image
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "linear-gradient(135deg, #1A035A 0%, #3b0764 100%)",
                          color: "white",
                          fontSize: 24,
                          fontWeight: 700,
                          opacity: 0.9,
                        }}
                      >
                        India Mornings
                      </div>
                    )}

                    {/* Category Badge */}
                    <span
                      style={{
                        position: "absolute",
                        top: 10,
                        left: 10,
                        background: "rgba(26, 3, 90, 0.9)",
                        color: "white",
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "4px 10px",
                        borderRadius: 12,
                        backdropFilter: "blur(4px)",
                      }}
                    >
                      {art.categoryName || "News"}
                    </span>

                    {/* Selection Checkbox */}
                    <div
                      style={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        background: "white",
                        borderRadius: 6,
                        padding: "4px 8px",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectId(art.id)}
                        style={{ width: 16, height: 16, cursor: "pointer" }}
                      />
                    </div>

                    {/* Status Badge if Dismissed or Draft Created */}
                    {art.status === "DISMISSED" && (
                      <span
                        style={{
                          position: "absolute",
                          bottom: 10,
                          left: 10,
                          background: "#dc2626",
                          color: "white",
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 8,
                        }}
                      >
                        Dismissed
                      </span>
                    )}

                    {(art.isLivePublished || art.publishedArticleId) ? (
                      <span
                        style={{
                          position: "absolute",
                          bottom: 10,
                          left: 10,
                          background: "#059669",
                          color: "white",
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 8,
                        }}
                      >
                        🌐 Live on Site
                      </span>
                    ) : art.status === "DRAFT_CREATED" ? (
                      <span
                        style={{
                          position: "absolute",
                          bottom: 10,
                          left: 10,
                          background: "#2563eb",
                          color: "white",
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 8,
                        }}
                      >
                        Draft Created
                      </span>
                    ) : null}
                  </div>

                  {/* Body Content */}
                  <div style={{ padding: "16px 18px", flex: 1, display: "flex", flexDirection: "column" }}>
                    {/* Source and Time */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 12,
                        color: "#6b7280",
                        marginBottom: 8,
                      }}
                    >
                      {art.source?.icon && (
                        <img
                          src={art.source.icon}
                          alt={art.source.name}
                          style={{ width: 14, height: 14, borderRadius: 2 }}
                        />
                      )}
                      <span style={{ fontWeight: 600, color: "#374151" }}>{art.source?.name || "News Source"}</span>
                      <span>•</span>
                      <span>{art.publishedAt || "Recent"}</span>
                    </div>

                    {/* Headline */}
                    <h3
                      onClick={() => setPreviewArticle(art)}
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: "#111827",
                        margin: "0 0 10px",
                        lineHeight: 1.35,
                        cursor: "pointer",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                      title={art.title}
                    >
                      {art.title}
                    </h3>

                    {/* Snippet */}
                    <p
                      style={{
                        fontSize: 13,
                        color: "#4b5563",
                        margin: "0 0 16px",
                        lineHeight: 1.5,
                        flex: 1,
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {art.snippet || "Click details to read full story snippet."}
                    </p>

                    {/* Action Buttons */}
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        borderTop: "1px solid #f3f4f6",
                        paddingTop: 12,
                      }}
                    >
                      {art.status === "DISMISSED" ? (
                        <button
                          onClick={() => handleRestore(art.id)}
                          disabled={isActionRunning}
                          className="btn"
                          style={{
                            background: "#ecfdf5",
                            color: "#047857",
                            border: "1px solid #a7f3d0",
                            fontSize: 12,
                            padding: "6px 12px",
                            flex: 1,
                          }}
                        >
                          {isActionRunning ? "Restoring..." : "↺ Restore Lead"}
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handlePublishToLive(art.id)}
                            disabled={isActionRunning}
                            className="btn"
                            title="Publish immediately to user-facing live site"
                            style={{
                              background: "#10b981",
                              color: "white",
                              fontSize: 12,
                              padding: "7px 11px",
                              whiteSpace: "nowrap",
                              fontWeight: 600,
                              boxShadow: "0 2px 6px rgba(16,185,129,0.2)",
                            }}
                          >
                            {isActionRunning ? "Publishing..." : "🌐 Publish"}
                          </button>

                          <button
                            onClick={() => handleConvertToDraft(art.id)}
                            disabled={isActionRunning}
                            className="btn btnPrimary"
                            title="Convert into a CMS draft article"
                            style={{
                              fontSize: 12,
                              padding: "7px 11px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {isActionRunning ? "..." : "✏️ Draft"}
                          </button>

                          <button
                            onClick={() => handleDismiss(art.id)}
                            disabled={isActionRunning}
                            className="btn"
                            title="Dismiss lead (won't reappear)"
                            style={{
                              background: "#fee2e2",
                              color: "#b91c1c",
                              border: "1px solid #fecaca",
                              fontSize: 12,
                              padding: "7px 10px",
                            }}
                          >
                            ✕
                          </button>
                        </>
                      )}

                      <a
                        href={art.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn"
                        title="Open original article source"
                        style={{
                          background: "#f3f4f6",
                          color: "#4b5563",
                          border: "1px solid #e5e7eb",
                          fontSize: 12,
                          padding: "7px 10px",
                        }}
                      >
                        ↗
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 28,
              padding: "16px 20px",
              background: "white",
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 13, color: "#6b7280" }}>
              Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({total} total leads)
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn"
                style={{
                  background: page <= 1 ? "#f3f4f6" : "white",
                  color: page <= 1 ? "#9ca3af" : "#374151",
                  border: "1px solid #d1d5db",
                  padding: "6px 14px",
                  fontSize: 13,
                  cursor: page <= 1 ? "not-allowed" : "pointer",
                }}
              >
                ← Previous
              </button>

              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "0 12px",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--brand)",
                }}
              >
                {page} / {totalPages}
              </span>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="btn"
                style={{
                  background: page >= totalPages ? "#f3f4f6" : "white",
                  color: page >= totalPages ? "#9ca3af" : "#374151",
                  border: "1px solid #d1d5db",
                  padding: "6px 14px",
                  fontSize: 13,
                  cursor: page >= totalPages ? "not-allowed" : "pointer",
                }}
              >
                Next →
              </button>
            </div>
          </div>
        </>
      )}

      {/* Article Detail / Preview Modal */}
      {previewArticle && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(4px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setPreviewArticle(null)}
        >
          <div
            style={{
              background: "white",
              borderRadius: 16,
              maxWidth: 680,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: 24,
              boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 14 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span
                  style={{
                    background: "var(--brand)",
                    color: "white",
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "4px 10px",
                    borderRadius: 12,
                  }}
                >
                  {previewArticle.categoryName || "News"}
                </span>
                <span style={{ fontSize: 12, color: "#6b7280" }}>
                  Discovered {new Date(previewArticle.discoveredAt).toLocaleString()}
                </span>
              </div>
              <button
                onClick={() => setPreviewArticle(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 22,
                  color: "#6b7280",
                  cursor: "pointer",
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            {/* Thumbnail Preview */}
            {previewArticle.thumbnailUrl && (
              <div style={{ borderRadius: 12, overflow: "hidden", maxHeight: 260, marginBottom: 16 }}>
                <img
                  src={previewArticle.thumbnailUrl}
                  alt={previewArticle.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            )}

            {/* Title */}
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--brand)", margin: "0 0 10px", lineHeight: 1.35 }}>
              {previewArticle.title}
            </h2>

            {/* Source info */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#4b5563", marginBottom: 16 }}>
              {previewArticle.source?.icon && (
                <img src={previewArticle.source.icon} alt="" style={{ width: 16, height: 16 }} />
              )}
              <span style={{ fontWeight: 600 }}>{previewArticle.source?.name}</span>
              <span>•</span>
              <span>Published: {previewArticle.publishedAt || "Recently"}</span>
            </div>

            {/* Full Story Content / Snippet */}
            <div style={{ background: "#f9fafb", borderRadius: 10, padding: 18, marginBottom: 20, fontSize: 14, lineHeight: 1.7, color: "#374151", maxHeight: 350, overflowY: "auto" }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: "#4f46e5", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Full Article Content
              </div>
              {previewArticle.contentHtml ? (
                <div dangerouslySetInnerHTML={{ __html: previewArticle.contentHtml }} />
              ) : (
                <p>{previewArticle.snippet || "No additional excerpt available."}</p>
              )}
            </div>

            {/* Original Link */}
            <div style={{ marginBottom: 24, fontSize: 13, color: "#4b5563", wordBreak: "break-all" }}>
              <strong>Original URL:</strong>{" "}
              <a href={previewArticle.link} target="_blank" rel="noopener noreferrer" style={{ color: "#4f46e5", textDecoration: "underline" }}>
                {previewArticle.link}
              </a>
            </div>

            {/* Actions inside modal */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, borderTop: "1px solid #e5e7eb", paddingTop: 16 }}>
              <button
                onClick={() => setPreviewArticle(null)}
                className="btn"
                style={{ background: "#f3f4f6", color: "#4b5563", fontSize: 13, padding: "8px 16px" }}
              >
                Close
              </button>

              {previewArticle.status === "DISMISSED" ? (
                <button
                  onClick={() => handleRestore(previewArticle.id)}
                  className="btn"
                  style={{ background: "#ecfdf5", color: "#047857", fontSize: 13, padding: "8px 16px" }}
                >
                  Restore Lead
                </button>
              ) : (
                <>
                  <button
                    onClick={() => handleDismiss(previewArticle.id)}
                    className="btn"
                    style={{ background: "#fee2e2", color: "#b91c1c", fontSize: 13, padding: "8px 16px" }}
                  >
                    Dismiss Lead
                  </button>
                  <button
                    onClick={() => handleConvertToDraft(previewArticle.id)}
                    className="btn btnPrimary"
                    style={{ fontSize: 13, padding: "8px 16px" }}
                  >
                    Convert to CMS Draft
                  </button>
                  <button
                    onClick={() => handlePublishToLive(previewArticle.id)}
                    className="btn"
                    style={{ background: "#10b981", color: "white", fontSize: 13, padding: "8px 18px", fontWeight: 600 }}
                  >
                    🌐 Publish to Live Site
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

