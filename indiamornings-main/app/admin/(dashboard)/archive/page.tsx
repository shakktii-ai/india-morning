"use client";

import { useEffect, useState } from "react";

export default function ArchivePage() {
  const [items, setItems] = useState<any[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  async function load() {
    const params = new URLSearchParams();
    params.append("status", "ARCHIVED");
    if (search) params.append("search", search);
    params.append("page", page.toString());
    params.append("limit", limit.toString());

    const r = await fetch(`/api/articles?${params.toString()}`);
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      setErrorMsg(d?.message || "Failed to load archived articles");
      return;
    }
    setItems(d.articles || []);
    setTotal(d.total || 0);
  }

  useEffect(() => {
    load();
  }, [page]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load();
  }

  // Auto-hide success message
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

  async function restore(id: string) {
    if (!confirm("Restore this article to drafts?")) return;
    const r = await fetch(`/api/review/${id}/restore`, { method: "POST" });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      setErrorMsg(d?.message || "Failed to restore");
      return;
    }
    setSuccessMsg("Article restored to drafts.");
    await load();
  }

  async function permanentlyDelete(id: string) {
    if (!confirm("Are you sure you want to PERMANENTLY delete this article? This cannot be undone.")) return;
    const r = await fetch(`/api/articles/${id}`, { method: "DELETE" });
    if (!r.ok) {
      setErrorMsg("Failed to delete");
      return;
    }
    setSuccessMsg("Article permanently deleted.");
    await load();
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div style={{ paddingBottom: 100 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, gap: 16 }} className="mobile-stack">
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: "var(--brand)" }}>Archived Articles</h1>
        <form onSubmit={handleSearch} style={{ display: "flex", gap: 12, width: "100%", maxWidth: 400 }} className="full-width-on-mobile">
          <input
            className="input"
            placeholder="Search by title..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn btnPrimary">Search</button>
        </form>
      </div>

      {successMsg && (
        <div style={{
          background: "#ecfdf5", color: "#065f46", padding: "12px 16px", borderRadius: 8,
          marginBottom: 24, border: "1px solid #a7f3d0", fontWeight: 500
        }}>
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{
          background: "#fef2f2", color: "#991b1b", padding: "12px 16px", borderRadius: 8,
          marginBottom: 24, border: "1px solid #fecaca", fontWeight: 500
        }}>
          {errorMsg}
        </div>
      )}

      <div style={{ display: "grid", gap: 16 }}>
        {items.map((a: any) => (
          <div key={a.id} className="card" style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h4 style={{ margin: 0, fontSize: 16 }}>{a.title}</h4>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                {a.language} • {a.region} • Archived {new Date(a.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button className="btn btnGhost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => restore(a.id)}>Restore to Draft</button>
              <button className="btn btnGhost" style={{ padding: "6px 12px", fontSize: 12, color: "#ef4444" }} onClick={() => permanentlyDelete(a.id)}>Permanent Delete</button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div style={{ padding: 60, textAlign: "center", color: "#9ca3af", border: "2px dashed #e5e7eb", borderRadius: 12 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📁</div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>No archived articles</div>
            <div>Your archive is currently empty.</div>
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
