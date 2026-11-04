"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import RichEditor from "@/app/_components/RichEditor";
import { slugify } from "@/src/utils/slug";
import { applyWatermark } from "@/src/utils/watermark";

type Article = any;

function InfoIcon({ text }: { text: string }) {
  return (
    <span
      title={text}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 14, height: 14, borderRadius: "50%", background: "#9ca3af",
        color: "white", fontSize: 10, cursor: "help", marginLeft: 6, verticalAlign: "middle"
      }}
    >
      i
    </span>
  );
}

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filters
  const [status, setStatus] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [excerpt, setExcerpt] = useState("");
  const [contentHtml, setContent] = useState("<p>Hello India Mornings.</p>");
  const [coverImageUrl, setCover] = useState("");
  const [language, setLanguage] = useState("EN");
  const [region, setRegion] = useState("MAHARASHTRA");
  const [newCategoryIds, setNewCategoryIds] = useState<string[]>([]);
  const [tagNamesString, setTagNamesString] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [focusKeyphrase, setFocusKeyphrase] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [publishedAt, setPublishedAt] = useState<string>(new Date().toISOString());
  const contentRef = useRef<HTMLTextAreaElement>(null);

  // Multi-select state for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAllMatching, setSelectAllMatching] = useState(false);

  // Load Categories on mount
  useEffect(() => {
    fetch("/api/taxonomy/categories").then(r => r.json()).then(d => {
      if (d?.categories) setCategories(d.categories);
    }).catch(() => { });
  }, []);

  // Auto-generate slug from title
  useEffect(() => {
    if (!isSlugManuallyEdited) {
      setSlug(slugify(title));
    }
  }, [title, isSlugManuallyEdited]);


  async function load() {
    setLoading(true);
    // Clear selection on reload/page change?
    // If selectAllMatching is true, we should probably keep it true unless filters changed.
    // simpler to reset:
    if (!selectAllMatching) setSelectedIds(new Set());

    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (categoryId) params.append("categoryId", categoryId);
    if (search) params.append("search", search);
    params.append("page", page.toString());
    params.append("limit", limit.toString());

    const r = await fetch(`/api/articles?${params.toString()}`);
    const d = await r.json();
    setLoading(false);

    if (!r.ok) { setErrorMsg(d?.message || "Failed to load"); return; }
    setArticles(d.articles || []);
    setTotal(d.total || 0);
  }

  // Reload when filters change (reset page to 1) or page changes
  useEffect(() => { load(); }, [page]);

  // When filters change, reset page to 1 and reload. Reset selection.
  useEffect(() => {
    setPage(1);
    setSelectAllMatching(false);
    setSelectedIds(new Set());
    load();
  }, [status, categoryId]);

  // Handle Search on Enter or button
  function handleSearchSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setPage(1);
    setSelectAllMatching(false);
    setSelectedIds(new Set());
    load();
  }

  // Auto-hide messages
  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(null), 3000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);

  useEffect(() => {
    if (errorMsg) {
      const t = setTimeout(() => setErrorMsg(null), 5000);
      return () => clearTimeout(t);
    }
  }, [errorMsg]);


  async function create() {
    if (newCategoryIds.length === 0) {
      setErrorMsg("At least one category is required");
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    try {
      const r = await fetch("/api/articles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title, slug, excerpt, contentHtml,
          coverImageUrl: coverImageUrl || undefined,
          language, region,
          categoryIds: newCategoryIds,
          tagNames: tagNamesString.split(",").map(s => s.trim()).filter(Boolean),
          seoTitle: seoTitle || undefined,
          metaDescription: metaDescription || undefined,
          focusKeyphrase: focusKeyphrase || undefined,
          canonicalUrl: canonicalUrl || undefined,
          scheduledAt: scheduledAt || undefined,
          publishedAt: publishedAt || undefined
        })
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setErrorMsg(d?.message || "Failed");
        return;
      }
      // Success - Clear Form
      setTitle("");
      setSlug("");
      setIsSlugManuallyEdited(false);
      setExcerpt("");
      setCover("");
      setContent("<p>Hello India Mornings.</p>");
      setLanguage("EN");
      setRegion("MAHARASHTRA");
      setSeoTitle("");
      setMetaDescription("");
      setFocusKeyphrase("");
      setCanonicalUrl("");
      setTagNamesString("");
      setScheduledAt(null);
      setPublishedAt(new Date().toISOString());

      setSuccessMsg(scheduledAt ? "Article scheduled successfully!" : "Draft created successfully!");
      await load();
    } catch (e) {
      setErrorMsg("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  }

  async function submit(id: string) {
    const r = await fetch(`/api/articles/${id}/submit`, { method: "POST" });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setErrorMsg(d?.message || "Failed"); return; }
    setSuccessMsg("Article submitted for review!");
    await load();
  }

  async function uploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    // Apply watermark before upload
    const watermarkedFile = await applyWatermark(file);

    const formData = new FormData();
    formData.append("file", watermarkedFile);

    const r = await fetch("/api/upload", { method: "POST", body: formData });
    const d = await r.json().catch(() => ({}));
    setUploading(false);

    if (!r.ok) {
      setErrorMsg(d?.message || "Upload failed");
      return;
    }
    setCover(d.url);
    setSuccessMsg("Image uploaded!");
  }

  async function removeImage() {
    if (!coverImageUrl) return;
    if (!confirm("Are you sure you want to delete this image from storage?")) return;

    setUploading(true);
    const r = await fetch(`/api/upload?url=${encodeURIComponent(coverImageUrl)}`, { method: "DELETE" });
    const d = await r.json().catch(() => ({}));
    setUploading(false);

    if (!r.ok) {
      setErrorMsg(d?.message || "Delete failed");
      return;
    }

    setCover("");
    setSuccessMsg("Image removed!");
  }


  async function del(id: string) {
    if (!confirm("Are you sure you want to delete this article?")) return;
    const r = await fetch(`/api/articles/${id}`, { method: "DELETE" });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setErrorMsg(d?.message || "Failed"); return; }
    setSuccessMsg("Article deleted.");
    await load();
  }

  // Bulk Selection Logic
  function toggleSelect(id: string) {
    if (selectAllMatching) setSelectAllMatching(false); // If they uncheck one, we are no longer selecting all across pages

    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  function toggleSelectAll() {
    if (selectedIds.size === articles.length && articles.length > 0) {
      // Unselect all
      setSelectedIds(new Set());
      setSelectAllMatching(false);
    } else {
      // Select all ON THIS PAGE
      setSelectedIds(new Set(articles.map(a => a.id)));
      setSelectAllMatching(false); // Default to page only first
    }
  }

  function handleSelectAllMatching() {
    setSelectAllMatching(true);
    setSelectedIds(new Set(articles.map(a => a.id)));
  }

  async function bulkDelete() {
    const count = selectAllMatching ? total : selectedIds.size;
    if (count === 0) return;

    if (!confirm(`Are you sure you want to delete ${count} articles? This cannot be undone.`)) return;

    setLoading(true);

    let res;
    if (selectAllMatching) {
      // Bulk delete matching filters
      res = await fetch("/api/articles", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          deleteAllMatching: true,
          filters: { status, categoryId, search }
        })
      });
    } else {
      // Bulk delete by IDs
      res = await fetch("/api/articles", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selectedIds)
        })
      });
    }

    setLoading(false);

    if (res.ok) {
      const d = await res.json();
      setSuccessMsg(`${d.count} articles deleted successfully.`);
      setSelectAllMatching(false);
      setSelectedIds(new Set());
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      setErrorMsg(d?.message || "Failed to delete selected articles.");
    }
  }

  const grouped = useMemo(() => articles, [articles]);
  const totalPages = Math.ceil(total / limit);

  return (
    <div style={{ display: "grid", gap: 32 }}>
      {successMsg && (
        <div style={{
          background: "#ecfdf5", color: "#065f46", padding: "12px 16px", borderRadius: 8,
          border: "1px solid #a7f3d0", fontWeight: 500
        }}>
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{
          background: "#fef2f2", color: "#991b1b", padding: "12px 16px", borderRadius: 8,
          border: "1px solid #fecaca", fontWeight: 500
        }}>
          {errorMsg}
        </div>
      )}

      {/* Create Draft Section */}
      <div className="card" style={{ padding: 24, borderLeft: "4px solid var(--accent)" }}>
        <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 20 }}>Create New Article</h2>

        {/* Scheduling System Notice */}
        <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", color: "#0369a1", padding: "12px 16px", borderRadius: 8, fontSize: 13, marginBottom: 20 }}>
          <strong>ℹ️ System Note:</strong> Scheduled articles are processed in a daily cycle. Your content will be published during the next scheduled system update after your chosen time.
        </div>

        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#4b5563" }}>Title</label>
            <input className="input" placeholder="Enter title" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#4b5563" }}>Slug / Custom URL (Click to edit)</label>
            <input
              className="input"
              placeholder="url-slug"
              value={slug}
              onChange={e => {
                setSlug(slugify(e.target.value));
                setIsSlugManuallyEdited(true);
              }}
            />
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#4b5563" }}>Cover Image (Optional)</label>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: -4 }}>Max size: 5MB. Recommended: 1200x675 (16:9).</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="input" placeholder="https://..." value={coverImageUrl} onChange={e => setCover(e.target.value)} style={{ flex: 1 }} />
              <label className="btn" style={{ background: "#e5e7eb", color: "#374151", cursor: "pointer", display: "flex", alignItems: "center" }}>
                {uploading ? "..." : "Upload"}
                <input type="file" accept="image/*" onChange={uploadImage} style={{ display: "none" }} disabled={uploading} />
              </label>
            </div>
            {coverImageUrl && (
              <div style={{ position: "relative", width: "fit-content", marginTop: 8 }}>
                <img src={coverImageUrl} alt="Preview" style={{ height: 80, width: "auto", borderRadius: 8, objectFit: "cover", border: "1px solid #e5e7eb" }} />
                <button
                  onClick={removeImage}
                  style={{
                    position: "absolute", top: -8, right: -8, background: "#ef4444", color: "white",
                    border: "none", borderRadius: "50%", width: 24, height: 24, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: "bold",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                  }}
                  title="Remove image"
                >
                  &times;
                </button>
              </div>
            )}
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#4b5563" }}>Language</label>
            <select className="select" value={language} onChange={e => setLanguage(e.target.value)}>
              <option value="EN">English</option>
              <option value="MR">Marathi</option>
              <option value="HI">Hindi</option>
            </select>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#4b5563" }}>Region</label>
            <select className="select" value={region} onChange={e => setRegion(e.target.value)}>
              <option value="MAHARASHTRA">MAHARASHTRA</option>
              <option value="INDIA">INDIA</option>
            </select>
          </div>
          <div style={{ display: "grid", gap: 8, gridColumn: "span 2" }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#4b5563" }}>Categories</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, padding: 12, background: "#f9fafb", borderRadius: 8, border: "1px solid #e5e7eb" }}>
              {categories.map(c => (
                <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={newCategoryIds.includes(c.id)}
                    onChange={e => {
                      if (e.target.checked) setNewCategoryIds([...newCategoryIds, c.id]);
                      else setNewCategoryIds(newCategoryIds.filter(id => id !== c.id));
                    }}
                  />
                  {c.name}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, padding: 16, background: "#f9fafb", borderRadius: 8 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#4b5563" }}>
              SEO Title (Optional) <InfoIcon text="The title shown in search engine results and browser tabs." />
            </label>
            <input className="input" placeholder="SEO Title" value={seoTitle} onChange={e => setSeoTitle(e.target.value)} />
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#4b5563" }}>
              Focus Keyphrase (Optional) <InfoIcon text="The main search term you want this article to rank for." />
            </label>
            <input className="input" placeholder="Focus Keyphrase" value={focusKeyphrase} onChange={e => setFocusKeyphrase(e.target.value)} />
          </div>
          <div style={{ display: "grid", gap: 8, gridColumn: "span 2" }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#4b5563" }}>
              Tags (Comma separated) <InfoIcon text="Keywords related to the article. Separate with commas." />
            </label>
            <textarea
              className="textarea"
              placeholder="News, Politics, Maharashtra..."
              value={tagNamesString}
              onChange={e => setTagNamesString(e.target.value)}
              style={{ minHeight: 60 }}
            />
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: -4 }}>Separate multiple tags with commas. New tags will be created automatically.</div>
          </div>
          <div style={{ display: "grid", gap: 8, gridColumn: "span 2" }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#4b5563" }}>
              Meta Description (Optional) <InfoIcon text="A short summary shown below the title in search results." />
            </label>
            <textarea className="textarea" placeholder="Meta description..." value={metaDescription} onChange={e => setMetaDescription(e.target.value)} />
          </div>
          <div style={{ display: "grid", gap: 8, gridColumn: "span 2" }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#4b5563" }}>
              Canonical URL (Optional) <InfoIcon text="The original source URL (leave empty if this article is the original)." />
            </label>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: -4 }}>Original source URL [e.g. from Twitter, Facebook, etc.]</div>
            <input className="input" placeholder="https://..." value={canonicalUrl} onChange={e => setCanonicalUrl(e.target.value)} />
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#4b5563" }}>Excerpt (Optional)</label>
          <textarea className="textarea" placeholder="Short description..." value={excerpt} onChange={e => setExcerpt(e.target.value)} />
        </div>
        <div style={{ marginTop: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#4b5563" }}>Content</label>
          <RichEditor
            value={contentHtml}
            onChange={setContent}
            placeholder="Write your article here..."
            style={{ marginTop: 4 }}
          />
        </div>
        <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            Tip: Use the toolbar to format your article beautifully.
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#4b5563" }}>Display Date (Public):</label>
              <input
                type="datetime-local"
                className="input"
                style={{ width: "auto", padding: "6px 10px", fontSize: 13 }}
                value={publishedAt ? new Date(new Date(publishedAt).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : ""}
                onChange={e => {
                  const val = e.target.value;
                  if (!val) setPublishedAt(new Date().toISOString());
                  else setPublishedAt(new Date(val).toISOString());
                }}
              />
              <InfoIcon text="This date will be shown on the website as the publication date. Use this to publish for a past date." />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#4b5563" }}>Schedule Post:</label>
              <input
                type="datetime-local"
                className="input"
                style={{ width: "auto", padding: "6px 10px", fontSize: 13 }}
                value={scheduledAt ? new Date(new Date(scheduledAt).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : ""}
                onChange={e => {
                  const val = e.target.value;
                  if (!val) setScheduledAt(null);
                  else setScheduledAt(new Date(val).toISOString());
                }}
              />
            </div>
            {scheduledAt && (
              <div style={{ fontSize: 11, color: "#92400e", background: "#fffbeb", padding: "4px 8px", borderRadius: 4, marginTop: 4 }}>
                Daily scheduling limit applies. Max 10 articles can be scheduled at once.
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <button
              className="btn btnPrimary"
              onClick={create}
              disabled={saving}
              style={{
                padding: "10px 24px", minWidth: 140,
                background: scheduledAt ? "#6366f1" : undefined,
                borderColor: scheduledAt ? "#4f46e5" : undefined
              }}
            >
              {saving ? "Saving..." : (scheduledAt ? "Schedule Post" : "Create Draft")}
            </button>
          </div>
        </div>
      </div>

      {/* Articles List Section */}
      <div>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ margin: "0 0 16px 0", fontSize: 24 }}>Your Articles</h2>

          {/* Filters Bar */}
          <form onSubmit={handleSearchSubmit} style={{ display: "flex", flexWrap: "wrap", gap: 12, background: "#fff", padding: 16, borderRadius: 8, border: "1px solid #e5e7eb", alignItems: "center" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <input
                className="input"
                placeholder="Search by title..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>
            <select className="select" value={status} onChange={e => setStatus(e.target.value)} style={{ width: 140 }}>
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="APPROVED">Approved</option>
              <option value="PUBLISHED">Published</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <select className="select" value={categoryId} onChange={e => setCategoryId(e.target.value)} style={{ width: 160 }}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button type="submit" className="btn btnPrimary">Search</button>
            <button type="button" className="btn btnGhost" onClick={() => { setSearch(""); setStatus(""); setCategoryId(""); }}>Reset</button>
          </form>

          {/* Bulk Actions Bar */}
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12, padding: "8px 16px", background: "#f3f4f6", borderRadius: 8 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, cursor: "pointer", fontWeight: 500 }}>
              <input
                type="checkbox"
                checked={articles.length > 0 && selectedIds.size === articles.length}
                onChange={toggleSelectAll}
                style={{ width: 16, height: 16 }}
              />
              Select All ({articles.length})
            </label>

            {(selectedIds.size > 0 || selectAllMatching) && (
              <button
                onClick={bulkDelete}
                style={{
                  marginLeft: "auto",
                  background: "#fee2e2", color: "#b91c1c", border: "1px solid #f87171",
                  padding: "6px 12px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer"
                }}
              >
                Delete {selectAllMatching ? `All ${total}` : `Selected (${selectedIds.size})`} Articles
              </button>
            )}
          </div>

          {/* Select All Matching Banner */}
          {selectedIds.size === articles.length && total > articles.length && !selectAllMatching && (
            <div style={{ background: "#e0f2fe", color: "#0369a1", padding: "8px 16px", fontSize: 13, textAlign: "center", borderTop: "1px solid #bae6fd" }}>
              All <strong>{articles.length}</strong> articles on this page are selected.
              <button
                onClick={handleSelectAllMatching}
                style={{ background: "none", border: "none", color: "#0284c7", fontWeight: 700, cursor: "pointer", textDecoration: "underline", marginLeft: 4 }}
              >
                Select all {total} articles matching current request
              </button>
            </div>
          )}
          {selectAllMatching && (
            <div style={{ background: "#e0f2fe", color: "#0369a1", padding: "8px 16px", fontSize: 13, textAlign: "center", borderTop: "1px solid #bae6fd" }}>
              All <strong>{total}</strong> articles are selected.
              <button
                onClick={() => setSelectAllMatching(false)}
                style={{ background: "none", border: "none", color: "#0284c7", fontWeight: 700, cursor: "pointer", textDecoration: "underline", marginLeft: 4 }}
              >
                Clear selection
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>Loading...</div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {grouped.map((a: any) => (
              <div key={a.id} className="card" style={{ padding: 20, display: "flex", flexDirection: "row", gap: 16, alignItems: "flex-start" }}>
                {/* Row Checkbox */}
                <div style={{ paddingTop: 4 }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(a.id)}
                    onChange={() => toggleSelect(a.id)}
                    style={{ width: 18, height: 18, cursor: "pointer" }}
                  />
                </div>

                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                    <div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                          background: a.status === "PUBLISHED" ? "#d1fae5" :
                            a.status === "REJECTED" ? "#fee2e2" :
                              a.status === "APPROVED" ? "#dbeafe" :
                                a.status === "SCHEDULED" ? "#ede9fe" :
                                  a.status === "ARCHIVED" ? "#e5e7eb" : "#fef3c7",
                          color: a.status === "PUBLISHED" ? "#065f46" :
                            a.status === "REJECTED" ? "#b91c1c" :
                              a.status === "APPROVED" ? "#1e40af" :
                                a.status === "SCHEDULED" ? "#7c3aed" :
                                  a.status === "ARCHIVED" ? "#4b5563" : "#92400e",
                          textTransform: "uppercase"
                        }}>
                          {a.status}
                        </span>
                        <span style={{ fontSize: 12, color: "#6b7280" }}>
                          {a.status === "SCHEDULED" && a.scheduledAt && (
                            <span style={{ fontWeight: 600, color: "#7c3aed", marginRight: 6 }}>
                              🚀 Scheduled: {new Date(a.scheduledAt).toLocaleString()} •
                            </span>
                          )}
                          {a.language} • {a.region} • {a.categories?.length > 0 ? a.categories.map((c: any) => c.name).join(", ") : (a.category?.name || "Uncategorized")} • {new Date(a.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 18, color: "var(--text)" }}>{a.title}</div>
                      <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>/{a.slug}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      {(a.status === "DRAFT" || a.status === "REJECTED") && (
                        <button className="btn btnPrimary" style={{ fontSize: 13, padding: "6px 14px" }} onClick={() => submit(a.id)}>Submit</button>
                      )}
                      <a className="btn" style={{ fontSize: 13, padding: "6px 12px", background: "#f59e0b", color: "white" }} href={`/article/${a.slug}`} target="_blank">Preview</a>
                      <a className="btn btnGhost" style={{ fontSize: 13, padding: "6px 12px", border: "1px solid #e5e7eb" }} href={`/admin/articles/${a.id}`}>Edit</a>
                      <button className="btn btnGhost" style={{ fontSize: 13, padding: "6px 12px", color: "#ef4444" }} onClick={() => del(a.id)}>Delete</button>
                    </div>
                  </div>
                  {a.reviewNotes && (
                    <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "10px 14px", borderRadius: 6, fontSize: 13, marginTop: 4 }}>
                      <strong>Reviewer Feedback:</strong> {a.reviewNotes}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {grouped.length === 0 && (
              <div style={{ textAlign: "center", padding: 40, color: "#9ca3af", background: "#f9fafb", borderRadius: 12, border: "1px dashed #e5e7eb" }}>
                No articles found matching criteria.
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {total > limit && (
          <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 24, alignItems: "center" }}>
            <button className="btn" disabled={page <= 1} onClick={() => setPage(page - 1)} style={{ opacity: page <= 1 ? 0.5 : 1 }}>Previous</button>
            <span style={{ fontSize: 14, color: "#6b7280" }}>Page {page} of {totalPages} (Total {total})</span>
            <button className="btn" disabled={page >= totalPages} onClick={() => setPage(page + 1)} style={{ opacity: page >= totalPages ? 0.5 : 1 }}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
