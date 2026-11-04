"use client";

import { useEffect, useState } from "react";

export default function TaxonomyPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [catName, setCatName] = useState("");
  const [tagName, setTagName] = useState("");
  
  // Edit States
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState("");
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState("");

  // Search & Pagination States
  const [catSearch, setCatSearch] = useState("");
  const [tagSearch, setTagSearch] = useState("");
  const [catPage, setCatPage] = useState(1);
  const [tagPage, setTagPage] = useState(1);
  const [catTotal, setCatTotal] = useState(0);
  const [tagTotal, setTagTotal] = useState(0);
  const limit = 50;

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loadingCats, setLoadingCats] = useState(false);
  const [loadingTags, setLoadingTags] = useState(false);
  const [submittingCat, setSubmittingCat] = useState(false);
  const [submittingTag, setSubmittingTag] = useState(false);

  async function loadCategories() {
    setLoadingCats(true);
    try {
      const r = await fetch(`/api/taxonomy/categories?q=${catSearch}&page=${catPage}&limit=${limit}`);
      const d = await r.json();
      setCategories(d.categories || []);
      setCatTotal(d.total || 0);
    } finally {
      setLoadingCats(false);
    }
  }

  async function loadTags() {
    setLoadingTags(true);
    try {
      const r = await fetch(`/api/taxonomy/tags?q=${tagSearch}&page=${tagPage}&limit=${limit}`);
      const d = await r.json();
      setTags(d.tags || []);
      setTagTotal(d.total || 0);
    } finally {
      setLoadingTags(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCategories();
    }, 300);
    return () => clearTimeout(timer);
  }, [catSearch, catPage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadTags();
    }, 300);
    return () => clearTimeout(timer);
  }, [tagSearch, tagPage]);

  // Reset page on search
  useEffect(() => { setCatPage(1); }, [catSearch]);
  useEffect(() => { setTagPage(1); }, [tagSearch]);

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

  async function addCategory() {
    if (!catName.trim()) return;
    setSubmittingCat(true);
    try {
      const r = await fetch("/api/taxonomy/categories", { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify({ name: catName }) });
      const d = await r.json().catch(()=>({}));
      if (!r.ok) { setErrorMsg(d?.message || "Failed"); return; }
      setCatName(""); 
      setSuccessMsg("Category added!");
      loadCategories();
    } finally {
      setSubmittingCat(false);
    }
  }

  async function addTag() {
    if (!tagName.trim()) return;
    setSubmittingTag(true);
    try {
      const r = await fetch("/api/taxonomy/tags", { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify({ name: tagName }) });
      const d = await r.json().catch(()=>({}));
      if (!r.ok) { setErrorMsg(d?.message || "Failed"); return; }
      setTagName(""); 
      setSuccessMsg("Tag added!");
      loadTags();
    } finally {
      setSubmittingTag(false);
    }
  }

  async function updateCategory() {
    if (!editingCatId || !editingCatName.trim()) return;
    setSubmittingCat(true);
    try {
      const r = await fetch("/api/taxonomy/categories", { 
        method:"PATCH", 
        headers:{ "content-type":"application/json" }, 
        body: JSON.stringify({ id: editingCatId, name: editingCatName }) 
      });
      if (!r.ok) {
        const d = await r.json().catch(()=>({}));
        setErrorMsg(d?.message || "Update failed");
        return;
      }
      setEditingCatId(null);
      setSuccessMsg("Category updated!");
      loadCategories();
    } finally {
      setSubmittingCat(false);
    }
  }

  async function updateTag() {
    if (!editingTagId || !editingTagName.trim()) return;
    setSubmittingTag(true);
    try {
      const r = await fetch("/api/taxonomy/tags", { 
        method:"PATCH", 
        headers:{ "content-type":"application/json" }, 
        body: JSON.stringify({ id: editingTagId, name: editingTagName }) 
      });
      if (!r.ok) {
        const d = await r.json().catch(()=>({}));
        setErrorMsg(d?.message || "Update failed");
        return;
      }
      setEditingTagId(null);
      setSuccessMsg("Tag updated!");
      loadTags();
    } finally {
      setSubmittingTag(false);
    }
  }

  async function deleteCategory(id: string) {
    if (!confirm("Are you sure? Articles using this category will no longer show it.")) return;
    const r = await fetch(`/api/taxonomy/categories?id=${id}`, { method:"DELETE" });
    if (!r.ok) {
      const d = await r.json().catch(()=>({}));
      setErrorMsg(d?.message || "Delete failed");
      return;
    }
    setSuccessMsg("Category deleted.");
    loadCategories();
  }

  async function deleteTag(id: string) {
    if (!confirm("Are you sure?")) return;
    const r = await fetch(`/api/taxonomy/tags?id=${id}`, { method:"DELETE" });
    if (!r.ok) {
      const d = await r.json().catch(()=>({}));
      setErrorMsg(d?.message || "Delete failed");
      return;
    }
    setSuccessMsg("Tag deleted.");
    loadTags();
  }

  const catTotalPages = Math.ceil(catTotal / limit);
  const tagTotalPages = Math.ceil(tagTotal / limit);

  return (
    <div>
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

      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 24 }}>
        {/* Categories Section */}
        <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column" }}>
          <h2 style={{ marginTop: 0, fontSize: 20 }}>Categories ({catTotal})</h2>
          
          <div style={{ background: "#f9fafb", padding: 16, borderRadius: 12, marginBottom: 20, border: "1px solid #e5e7eb" }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#4b5563", display: "block", marginBottom: 8 }}>Search Categories</label>
            <input 
              className="input" 
              placeholder="Start typing to search..." 
              value={catSearch} 
              onChange={e => setCatSearch(e.target.value)} 
              style={{ width: "100%", marginBottom: 12 }}
            />
            <div style={{ display:"flex", gap: 10 }}>
              <input className="input" placeholder="New category name" value={catName} onChange={e=>setCatName(e.target.value)} style={{ flex: 1 }} disabled={submittingCat} />
              <button className="btn btnPrimary" onClick={addCategory} disabled={submittingCat}>{submittingCat ? "..." : "Add New"}</button>
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 200 }}>
            {loadingCats ? <div style={{ opacity: 0.6, padding: "20px 0" }}>Loading categories...</div> : (
              <div style={{ display:"flex", flexDirection: "column", gap: 8 }}>
                {categories.map((c:any)=>(
                <div key={c.id} style={{ 
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  background: "#f3f4f6", padding: "8px 16px", borderRadius: 12, 
                  border: "1px solid #e5e7eb" 
                }}>
                  {editingCatId === c.id ? (
                    <div style={{ display: "flex", gap: 8, flex: 1 }}>
                      <input 
                        className="input" 
                        value={editingCatName} 
                        onChange={e => setEditingCatName(e.target.value)} 
                        style={{ flex: 1, padding: "4px 8px" }} 
                        autoFocus
                        onKeyDown={e => e.key === "Enter" && updateCategory()}
                        disabled={submittingCat}
                      />
                      <button className="btn btnPrimary" style={{ padding: "4px 10px", fontSize: 12 }} onClick={updateCategory} disabled={submittingCat}>{submittingCat ? "..." : "Save"}</button>
                      <button className="btn btnGhost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => setEditingCatId(null)} disabled={submittingCat}>Cancel</button>
                    </div>
                  ) : (
                    <>
                      <span style={{ fontSize: 14, fontWeight: 500, color: "#374151" }}>{c.name}</span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button 
                          style={{ background: "none", border: "none", color: "#6366f1", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
                          onClick={() => { setEditingCatId(c.id); setEditingCatName(c.name); }}
                        >
                          Edit
                        </button>
                        <button 
                          style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
                          onClick={() => deleteCategory(c.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {categories.length === 0 && !loadingCats && <span style={{ opacity: 0.6 }}>No categories found matching "{catSearch}".</span>}
            </div>
            )}
          </div>

          {/* Pagination */}
          {catTotalPages > 1 && (
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "center", alignItems: "center", gap: 12 }}>
              <button className="btn btnGhost" disabled={catPage === 1} onClick={() => setCatPage(p => p - 1)}>Prev</button>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Page {catPage} of {catTotalPages}</span>
              <button className="btn btnGhost" disabled={catPage === catTotalPages} onClick={() => setCatPage(p => p + 1)}>Next</button>
            </div>
          )}
        </div>

        {/* Tags Section */}
        <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column" }}>
          <h2 style={{ marginTop: 0, fontSize: 20 }}>Tags ({tagTotal})</h2>
          
          <div style={{ 
            background: "#fffbeb", color: "#92400e", padding: "8px 12px", borderRadius: 6, 
            fontSize: 12, marginBottom: 16, border: "1px solid #fde68a", fontWeight: 500
          }}>
             Note: Loading tags may take a few moments if the collection is large. Please wait.
          </div>

          <div style={{ background: "#f9fafb", padding: 16, borderRadius: 12, marginBottom: 20, border: "1px solid #e5e7eb" }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#4b5563", display: "block", marginBottom: 8 }}>Search Tags</label>
            <input 
              className="input" 
              placeholder="Search tags..." 
              value={tagSearch} 
              onChange={e => setTagSearch(e.target.value)} 
              style={{ width: "100%", marginBottom: 12 }}
            />
            <div style={{ display:"flex", gap: 10 }}>
              <input className="input" placeholder="New tag name" value={tagName} onChange={e=>setTagName(e.target.value)} style={{ flex: 1 }} disabled={submittingTag} />
              <button className="btn btnPrimary" onClick={addTag} disabled={submittingTag}>{submittingTag ? "..." : "Add New"}</button>
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 200 }}>
            {loadingTags ? <div style={{ opacity: 0.6, padding: "20px 0" }}>Loading tags...</div> : (
              <div style={{ display:"flex", flexDirection: "column", gap: 8 }}>
                {tags.map((t:any)=>(
                <div key={t.id} style={{ 
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  background: "#eff6ff", padding: "8px 16px", borderRadius: 12, 
                  border: "1px solid #dbeafe" 
                }}>
                  {editingTagId === t.id ? (
                    <div style={{ display: "flex", gap: 8, flex: 1 }}>
                      <input 
                        className="input" 
                        value={editingTagName} 
                        onChange={e => setEditingTagName(e.target.value)} 
                        style={{ flex: 1, padding: "4px 8px" }} 
                        autoFocus
                        onKeyDown={e => e.key === "Enter" && updateTag()}
                        disabled={submittingTag}
                      />
                      <button className="btn btnPrimary" style={{ padding: "4px 10px", fontSize: 12 }} onClick={updateTag} disabled={submittingTag}>{submittingTag ? "..." : "Save"}</button>
                      <button className="btn btnGhost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => setEditingTagId(null)} disabled={submittingTag}>Cancel</button>
                    </div>
                  ) : (
                    <>
                      <span style={{ fontSize: 14, fontWeight: 500, color: "#1e40af" }}>#{t.name}</span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button 
                          style={{ background: "none", border: "none", color: "#6366f1", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
                          onClick={() => { setEditingTagId(t.id); setEditingTagName(t.name); }}
                        >
                          Edit
                        </button>
                        <button 
                          style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
                          onClick={() => deleteTag(t.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {tags.length === 0 && !loadingTags && <span style={{ opacity: 0.6 }}>No tags found matching "{tagSearch}".</span>}
            </div>
            )}
          </div>

          {/* Pagination */}
          {tagTotalPages > 1 && (
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "center", alignItems: "center", gap: 12 }}>
              <button className="btn btnGhost" disabled={tagPage === 1} onClick={() => setTagPage(p => p - 1)}>Prev</button>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Page {tagPage} of {tagTotalPages}</span>
              <button className="btn btnGhost" disabled={tagPage === tagTotalPages} onClick={() => setTagPage(p => p + 1)}>Next</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
