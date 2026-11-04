"use client";

import { useEffect, useState } from "react";

export default function ReviewPage() {
  const [items, setItems] = useState<any[]>([]);
  const [note, setNote] = useState<Record<string,string>>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters & Pagination (Queue)
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  async function load() {
    const params = new URLSearchParams();
    if(search) params.append("search", search);
    params.append("page", page.toString());
    params.append("limit", limit.toString());

    const r = await fetch(`/api/review/queue?${params.toString()}`);
    const d = await r.json().catch(()=>({}));
    if (!r.ok) { setErrorMsg(d?.message || "Forbidden"); return; }
    setItems(d.items || []);
    setTotal(d.total || 0);
  }

  useEffect(() => { load(); }, [page]);

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

  async function approve(id: string) {
    const r = await fetch(`/api/review/${id}/approve`, { method: "POST" });
    const d = await r.json().catch(()=>({}));
    if (!r.ok) { setErrorMsg(d?.message || "Failed"); return; }
    setSuccessMsg("Article approved successfully!");
    await load();
  }

  async function publish(id: string) {
    const r = await fetch(`/api/review/${id}/publish`, { method: "POST" });
    const d = await r.json().catch(()=>({}));
    if (!r.ok) { setErrorMsg(d?.message || "Failed"); return; }
    setSuccessMsg("Article published successfully!");
    await load();
  }

  async function archive(id: string) {
    if (!confirm("Are you sure you want to archive this article? It will no longer show on the live site.")) return;
    const r = await fetch(`/api/review/${id}/archive`, { method: "POST" });
    const d = await r.json().catch(()=>({}));
    if (!r.ok) { setErrorMsg(d?.message || "Failed"); return; }
    setSuccessMsg("Article archived.");
    await load(); // Just refresh the queue
  }

  async function reject(id: string) {
    const reviewNotes = note[id] || "Needs improvements.";
    const r = await fetch(`/api/review/${id}/reject`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reviewNotes })
    });
    const d = await r.json().catch(()=>({}));
    if (!r.ok) { setErrorMsg(d?.message || "Failed"); return; }
    setSuccessMsg("Article rejected.");
    await load();
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Review Queue Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: 24, gap: 16 }} className="mobile-stack">
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: "var(--brand)" }}>Review Queue</h1>
        <form onSubmit={handleSearch} style={{ display:"flex", gap: 12, width: "100%", maxWidth: 400 }} className="full-width-on-mobile">
             <input className="input" placeholder="Search by title..." value={search} onChange={e=>setSearch(e.target.value)} style={{ flex: 1 }} />
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

      <div style={{ display:"grid", gap: 24 }}>
        {items.map((a:any) => (
          <div key={a.id} className="card" style={{ padding: 24 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"start", marginBottom: 12 }}>
               <div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                      <span style={{ 
                        fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, 
                        background: a.status === "PUBLISHED" ? "#d1fae5" : 
                                    a.status === "REJECTED" ? "#fee2e2" : 
                                    a.status === "APPROVED" ? "#dbeafe" : 
                                    a.status === "ARCHIVED" ? "#e5e7eb" : "#fef3c7",
                        color: a.status === "PUBLISHED" ? "#065f46" : 
                               a.status === "REJECTED" ? "#b91c1c" : 
                               a.status === "APPROVED" ? "#1e40af" : 
                               a.status === "ARCHIVED" ? "#4b5563" : "#92400e",
                        textTransform: "uppercase"
                      }}>
                        {a.status}
                      </span>
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px 0" }}>{a.title}</h3>
                  <div style={{ fontSize: 13, color: "#6b7280" }}>
                    By <span style={{ fontWeight: 600, color: "#374151" }}>{a.author?.name}</span> • Submitted {a.submittedAt ? new Date(a.submittedAt).toLocaleString() : ""}
                  </div>
               </div>
               <a className="btn" href={`/article/${a.slug}`} target="_blank" style={{ fontSize: 13, padding: "6px 12px", background: "#f59e0b", color: "white" }}>Preview</a>
            </div>

            <div style={{ background: "#f9fafb", padding: 16, borderRadius: 8, marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#4b5563", marginBottom: 8 }}>Rejection Notes (if rejecting)</div>
              <textarea
                className="textarea"
                placeholder="Enter feedback for the author..."
                value={note[a.id] || ""}
                onChange={(e)=>setNote(prev=>({ ...prev, [a.id]: e.target.value }))}
                style={{ height: 80, fontSize: 14, resize: "vertical" }}
              />
              <div style={{ display:"flex", gap: 12, marginTop: 12, justifyContent: "flex-end" }}>
                <button className="btn" style={{ background: "#fee2e2", color: "#b91c1c" }} onClick={()=>reject(a.id)}>Reject</button>
                <div style={{ display:"flex", gap: 8 }}>
                   {a.status === "PUBLISHED" && (
                     <button className="btn" style={{ background: "#9ca3af", color: "white" }} onClick={()=>archive(a.id)}>Archive</button>
                   )}
                   <button className="btn" style={{ background: "#2563eb", color: "white" }} onClick={()=>approve(a.id)}>Approve</button>
                   <button className="btn" style={{ background: "#16a34a", color: "white" }} onClick={()=>publish(a.id)}>Publish</button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 ? (
          <div className="card" style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>All caught up!</div>
            <div>No articles pending review.</div>
          </div>
        ) : null}

        {/* Queue Pagination */ }
        {total > limit && (
           <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 12, marginBottom: 24, alignItems: "center" }}>
               <button className="btn" disabled={page <= 1} onClick={() => setPage(page - 1)} style={{ opacity: page <= 1 ? 0.5 : 1 }}>Previous</button>
               <span style={{ fontSize: 14, color: "#6b7280" }}>Page {page} of {totalPages}</span>
               <button className="btn" disabled={page >= totalPages} onClick={() => setPage(page + 1)} style={{ opacity: page >= totalPages ? 0.5 : 1 }}>Next</button>
           </div>
        )}
      </div>
    </div>
  );
}
