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
  language?: "MR" | "EN";
  wordCount?: number;
  isMultiSourceVerified?: boolean;
  sourceUrls?: { name: string; url: string }[];
  keyFacts?: string[];
}

export default function NewsDiscoveryPage() {
  const [articles, setArticles] = useState<DiscoveredArticle[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [publisherCounts, setPublisherCounts] = useState<Record<string, number>>({});
  const [statusCounts, setStatusCounts] = useState({
    discovered: 0,
    dismissed: 0,
    converted: 0,
    total: 0,
  });
  const [usageInfo, setUsageInfo] = useState<{
    callsToday: number;
    maxDailyLimit: number;
    remainingCalls: number;
  } | null>(null);

  // Filters & State
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedPublisher, setSelectedPublisher] = useState<string>("ALL");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("ALL");
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
  const [isEditingInModal, setIsEditingInModal] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>("");
  const [editContentHtml, setEditContentHtml] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load articles
  async function loadData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== "ALL") params.append("categoryId", selectedCategory);
      if (selectedPublisher !== "ALL") params.append("publisher", selectedPublisher);
      if (selectedLanguage !== "ALL") params.append("language", selectedLanguage);
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
      if (data.publisherCounts) setPublisherCounts(data.publisherCounts);
      if (data.statusCounts) setStatusCounts(data.statusCounts);
      if (data.usage) setUsageInfo(data.usage);
    } catch (err: any) {
      setErrorMsg(err?.message || "Error loading discovery data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [page, selectedCategory, selectedPublisher, selectedLanguage, statusFilter, search]);

  // Auto-hide messages
  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(null), 4500);
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
      if (data.callsToday !== undefined) {
        setUsageInfo({
          callsToday: data.callsToday,
          maxDailyLimit: data.maxCalls || 4,
          remainingCalls: data.remainingCalls || 0,
        });
      }
      setPage(1);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err?.message || "Error during discovery cycle");
    } finally {
      setFetchingNews(false);
    }
  }

  // Dismiss article permanently
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
    if (!confirm(`Are you sure you want to dismiss ${selectedIds.length} article(s)? They will never reappear.`)) return;

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

      setSuccessMsg("Article published to live website with full newspaper formatting!");
      if (previewArticle?.id === id) setPreviewArticle(null);
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

  function toggleSelectId(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  function openPreviewModal(art: DiscoveredArticle) {
    setPreviewArticle(art);
    setEditTitle(art.title);
    setEditContentHtml(art.contentHtml || "");
    setIsEditingInModal(false);
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
              News Discovery & Management
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
              Newspaper Extraction Engine
            </span>
          </div>
          <p style={{ margin: "6px 0 0", color: "#6b7280", fontSize: 14 }}>
            Discovers real newspaper reporting from trusted publishers (Loksatta, Sakal, Lokmat, The Hindu, Indian Express, NDTV, Livemint), formats into 8-section newspaper articles, and publishes live.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {/* Daily SerpAPI Usage Tracker */}
          {usageInfo && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: usageInfo.callsToday >= 4 ? "#fef2f2" : "#f0fdf4",
                border: `1px solid ${usageInfo.callsToday >= 4 ? "#fca5a5" : "#86efac"}`,
                borderRadius: 10,
                padding: "8px 14px",
                fontSize: 13,
                fontWeight: 600,
                color: usageInfo.callsToday >= 4 ? "#b91c1c" : "#15803d",
              }}
            >
              <span>📊 SerpAPI Today:</span>
              <span style={{ fontWeight: 800 }}>{usageInfo.callsToday} / {usageInfo.maxDailyLimit} calls</span>
              <span style={{ fontSize: 11, opacity: 0.85 }}>({usageInfo.remainingCalls} remaining)</span>
            </div>
          )}

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
                padding: "9px 15px",
              }}
            >
              {fetchingNews ? "Fetching..." : `Fetch ${activeCategoryObj?.name || "Category"}`}
            </button>
          )}

          <button
            onClick={() => triggerAutomatedFetch()}
            disabled={fetchingNews}
            className="btn btnPrimary"
            style={{
              fontSize: 14,
              padding: "9px 18px",
              gap: 8,
              boxShadow: "0 4px 12px rgba(26, 3, 90, 0.2)",
            }}
          >
            {fetchingNews ? (
              <>
                <span className="spinner" style={{ display: "inline-block" }}>⏳</span>
                <span>Discovering Trusted News...</span>
              </>
            ) : (
              <>
                <span>⚡</span>
                <span>Run 4-Bucket Discovery</span>
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
            Published / Converted
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
            Total Monitored
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

      {/* Advanced Filters: Publisher, Language, Search */}
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
        <div style={{ display: "flex", gap: 10, alignItems: "center", flex: 1, minWidth: 320, flexWrap: "wrap" }}>
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: 8, flex: 1, minWidth: 240 }}>
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

          {/* Publisher Dropdown Filter */}
          <select
            value={selectedPublisher}
            onChange={(e) => { setSelectedPublisher(e.target.value); setPage(1); }}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              fontSize: 13,
              background: "white",
              color: "#374151",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <option value="ALL">All Trusted Publishers</option>
            <optgroup label="Marathi Publishers">
              <option value="loksatta">Loksatta (लोकसत्ता)</option>
              <option value="sakal">Sakal (सकाळ)</option>
              <option value="lokmat">Lokmat (लोकमत)</option>
              <option value="maharashtra times">Maharashtra Times (मटा)</option>
              <option value="abp majha">ABP Majha (एबीपी माझा)</option>
              <option value="tv9 marathi">TV9 Marathi</option>
              <option value="news18 marathi">News18 Marathi</option>
              <option value="pudhari">Pudhari (पुढारी)</option>
              <option value="bbc marathi">BBC News Marathi</option>
            </optgroup>
            <optgroup label="National & Business">
              <option value="the hindu">The Hindu</option>
              <option value="indian express">The Indian Express</option>
              <option value="ndtv">NDTV</option>
              <option value="hindustan times">Hindustan Times</option>
              <option value="economic times">The Economic Times</option>
              <option value="livemint">Mint</option>
              <option value="business-standard">Business Standard</option>
              <option value="bbc news">BBC News</option>
            </optgroup>
          </select>

          {/* Language Filter */}
          <select
            value={selectedLanguage}
            onChange={(e) => { setSelectedLanguage(e.target.value); setPage(1); }}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              fontSize: 13,
              background: "white",
              color: "#374151",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <option value="ALL">All Languages</option>
            <option value="MR">Marathi (मराठी)</option>
            <option value="EN">English</option>
          </select>
        </div>

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
            Showing <strong>{articles.length}</strong> of <strong>{total}</strong> leads
          </div>
        </div>
      </div>

      {/* Articles Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#4b5563" }}>Extracting news and leads...</div>
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
              ? `No active discovery leads for category "${activeCategoryObj?.name}". Click below to discover latest stories!`
              : "No active discovery leads in the queue. Click below to run the 4-bucket discovery across trusted publishers!"}
          </p>

          <button
            onClick={() => triggerAutomatedFetch(selectedCategory !== "ALL" ? selectedCategory : undefined)}
            disabled={fetchingNews}
            className="btn btnPrimary"
            style={{ padding: "10px 22px", fontSize: 14 }}
          >
            {fetchingNews ? "Discovering..." : "⚡ Run 4-Bucket Discovery"}
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
                          fontSize: 22,
                          fontWeight: 700,
                          opacity: 0.9,
                        }}
                      >
                        India Morning
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

                    {/* Language Badge */}
                    <span
                      style={{
                        position: "absolute",
                        top: 10,
                        left: 95,
                        background: art.language === "MR" ? "#b45309" : "#1e40af",
                        color: "white",
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "4px 8px",
                        borderRadius: 12,
                      }}
                    >
                      {art.language === "MR" ? "मराठी" : "EN"}
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

                    {/* Status Badge */}
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

                    {/* Multi-Source Verified Badge */}
                    {art.isMultiSourceVerified && (
                      <span
                        style={{
                          position: "absolute",
                          bottom: 10,
                          right: 10,
                          background: "rgba(22, 101, 52, 0.95)",
                          color: "white",
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 8,
                        }}
                      >
                        ✓ Multi-Source Verified
                      </span>
                    )}
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
                      <span style={{ fontWeight: 700, color: "#1e3a8a" }}>{art.source?.name || "Trusted Publisher"}</span>
                      <span>•</span>
                      <span>{art.publishedAt || "Recent"}</span>
                      {art.wordCount && (
                        <>
                          <span>•</span>
                          <span style={{ color: "#059669", fontWeight: 600 }}>{art.wordCount} words</span>
                        </>
                      )}
                    </div>

                    {/* Headline */}
                    <h3
                      onClick={() => openPreviewModal(art)}
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
                      {art.snippet || "Click details to review complete newspaper article."}
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
                      <button
                        onClick={() => openPreviewModal(art)}
                        className="btn"
                        style={{
                          background: "#f0fdf4",
                          color: "#15803d",
                          border: "1px solid #bbf7d0",
                          fontSize: 12,
                          padding: "7px 11px",
                          fontWeight: 600,
                        }}
                      >
                        📖 Review Full Story
                      </button>

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
                          {isActionRunning ? "Restoring..." : "↺ Restore"}
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
                            title="Dismiss lead (will never reappear)"
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

      {/* Comprehensive Newspaper Article Review & Edit Modal */}
      {previewArticle && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.6)",
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
              maxWidth: 780,
              width: "100%",
              maxHeight: "92vh",
              overflowY: "auto",
              padding: 26,
              boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Badges */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 14 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
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

                <span
                  style={{
                    background: previewArticle.language === "MR" ? "#b45309" : "#1e40af",
                    color: "white",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: 10,
                  }}
                >
                  {previewArticle.language === "MR" ? "मराठी वृत्त" : "English News"}
                </span>

                {previewArticle.wordCount && (
                  <span style={{ fontSize: 12, color: "#059669", fontWeight: 600 }}>
                    {previewArticle.wordCount} words
                  </span>
                )}

                {previewArticle.isMultiSourceVerified && (
                  <span
                    style={{
                      background: "#dcfce7",
                      color: "#166534",
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "3px 8px",
                      borderRadius: 10,
                    }}
                  >
                    ✓ Multi-Source Verified
                  </span>
                )}
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  onClick={() => setIsEditingInModal(!isEditingInModal)}
                  className="btn"
                  style={{
                    background: isEditingInModal ? "#e0e7ff" : "#f3f4f6",
                    color: isEditingInModal ? "#3730a3" : "#374151",
                    fontSize: 12,
                    padding: "6px 12px",
                    fontWeight: 600,
                  }}
                >
                  {isEditingInModal ? "👁 Preview" : "✏️ Edit Content"}
                </button>

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
            </div>

            {/* Thumbnail Preview */}
            {previewArticle.thumbnailUrl && (
              <div style={{ borderRadius: 12, overflow: "hidden", maxHeight: 280, marginBottom: 16 }}>
                <img
                  src={previewArticle.thumbnailUrl}
                  alt={previewArticle.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            )}

            {/* Title / Headline */}
            {isEditingInModal ? (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>
                  Headline:
                </label>
                <input
                  type="text"
                  className="input"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  style={{ width: "100%", fontSize: 16, fontWeight: 700, padding: "10px 14px", borderRadius: 8 }}
                />
              </div>
            ) : (
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--brand)", margin: "0 0 10px", lineHeight: 1.35 }}>
                {previewArticle.title}
              </h2>
            )}

            {/* Source Info */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#4b5563", marginBottom: 16 }}>
              {previewArticle.source?.icon && (
                <img src={previewArticle.source.icon} alt="" style={{ width: 16, height: 16 }} />
              )}
              <span style={{ fontWeight: 700, color: "#1e3a8a" }}>{previewArticle.source?.name}</span>
              <span>•</span>
              <span>Published: {previewArticle.publishedAt || "Recently"}</span>
            </div>

            {/* Key Facts Box if present */}
            {previewArticle.keyFacts && previewArticle.keyFacts.length > 0 && (
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 14, marginBottom: 18 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: "#b91c1c", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                  <span>📌</span>
                  <span>{previewArticle.language === "MR" ? "महत्त्वाचे मुद्दे व आकडेवारी" : "Key Facts & Data Points"}</span>
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, color: "#334155", fontSize: 13, lineHeight: 1.6 }}>
                  {previewArticle.keyFacts.map((fact, idx) => (
                    <li key={idx} style={{ marginBottom: 4 }}>{fact}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Article Content / Editor */}
            <div style={{ background: "#f9fafb", borderRadius: 10, padding: 20, marginBottom: 20, fontSize: 14, lineHeight: 1.8, color: "#374151" }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: "#4f46e5", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {previewArticle.language === "MR" ? "वृत्तपत्रीय बातमी (सविस्तर मजकूर)" : "Newspaper-Quality Article Report"}
              </div>

              {isEditingInModal ? (
                <textarea
                  className="input"
                  rows={14}
                  value={editContentHtml}
                  onChange={(e) => setEditContentHtml(e.target.value)}
                  style={{ width: "100%", fontFamily: "monospace", fontSize: 13, lineHeight: 1.6, padding: 12, borderRadius: 8 }}
                />
              ) : previewArticle.contentHtml ? (
                <div dangerouslySetInnerHTML={{ __html: previewArticle.contentHtml }} />
              ) : (
                <p>{previewArticle.snippet || "No detailed content extracted yet."}</p>
              )}
            </div>

            {/* Original Source URLs */}
            <div style={{ marginBottom: 24, fontSize: 13, color: "#4b5563" }}>
              <strong>Original Verified Source:</strong>{" "}
              <a href={previewArticle.link} target="_blank" rel="noopener noreferrer" style={{ color: "#4f46e5", textDecoration: "underline" }}>
                {previewArticle.link}
              </a>
              {previewArticle.sourceUrls && previewArticle.sourceUrls.length > 1 && (
                <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
                  <strong>Also reported by:</strong>{" "}
                  {previewArticle.sourceUrls.slice(1).map((s, idx) => (
                    <span key={idx} style={{ marginRight: 8 }}>
                      <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb", textDecoration: "underline" }}>
                        {s.name}
                      </a>
                    </span>
                  ))}
                </div>
              )}
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
