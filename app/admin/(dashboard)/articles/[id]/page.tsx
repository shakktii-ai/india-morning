"use client";

import { useEffect, useState, useRef } from "react";
import RichEditor from "@/app/_components/RichEditor";
import { slugify } from "@/src/utils/slug";
import { applyWatermark } from "@/src/utils/watermark";
import { useParams, useRouter } from "next/navigation";

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

export default function EditArticlePage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [contentHtml, setContent] = useState("");
  const [coverImageUrl, setCover] = useState("");
  const [language, setLanguage] = useState("EN");
  const [region, setRegion] = useState("MAHARASHTRA");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [tagNamesString, setTagNamesString] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [focusKeyphrase, setFocusKeyphrase] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

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
    setErrorMsg(null);
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
    setErrorMsg(null);
  }

  // Load article and categories
  useEffect(() => {
    Promise.all([
      fetch(`/api/articles/${id}`).then(r => r.json()),
      fetch("/api/taxonomy/categories").then(r => r.json())
    ]).then(([articleData, catData]) => {
      if (articleData.article) {
        const a = articleData.article;
        setTitle(a.title || "");
        setExcerpt(a.excerpt || "");
        setContent(a.contentHtml || "");
        setCover(a.coverImageUrl || "");
        setLanguage(a.language || "EN");
        setRegion(a.region || "MAHARASHTRA");
        // Handle both new array and legacy single ID
        const cids = a.categoryIds || (a.categoryId ? [a.categoryId] : []);
        setCategoryIds(cids);
        // Populate tags as a comma-separated string
        if (a.tags) {
          setTagNamesString(a.tags.map((t: any) => t.name).join(", "));
        }

        setSeoTitle(a.seoTitle || "");
        setSlug(a.slug || "");
        setMetaDescription(a.metaDescription || "");
        setFocusKeyphrase(a.focusKeyphrase || "");
        setCanonicalUrl(a.canonicalUrl || "");
        setScheduledAt(a.scheduledAt || null);
        setPublishedAt(a.publishedAt || null);
      }
      if (catData.categories) setCategories(catData.categories);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
      alert("Failed to load article data");
    });
  }, [id]);


  async function update() {
    if (categoryIds.length === 0) {
      setErrorMsg("At least one category is required");
      return;
    }
    setSaving(true);
    const r = await fetch(`/api/articles/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title, slug, excerpt, contentHtml,
        coverImageUrl: coverImageUrl || undefined,
        language, region,
        categoryIds,
        tagNames: tagNamesString.split(",").map(s => s.trim()).filter(Boolean),
        seoTitle: seoTitle || undefined,
        metaDescription: metaDescription || undefined,
        focusKeyphrase: focusKeyphrase || undefined,
        canonicalUrl: canonicalUrl || undefined,
        scheduledAt: scheduledAt || null,
        publishedAt: publishedAt || null
      })
    });
    setSaving(false);

    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      alert(d?.message || "Failed to update");
      return;
    }

    setSuccessMsg("Article updated successfully!");
  }

  if (loading) return <div style={{ padding: 40 }}>Loading article...</div>;

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ marginBottom: 20 }}>
        <button onClick={() => router.push("/admin/articles")} className="btn btnGhost" style={{ paddingLeft: 0 }}>&larr; Back to Articles</button>
      </div>

      {successMsg && (
        <div style={{
          background: "#ecfdf5", color: "#065f46", padding: "12px 16px", borderRadius: 8,
          border: "1px solid #a7f3d0", fontWeight: 500, marginBottom: 20
        }}>
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{
          background: "#fef2f2", color: "#991b1b", padding: "12px 16px", borderRadius: 8,
          border: "1px solid #fecaca", fontWeight: 500, marginBottom: 20
        }}>
          {errorMsg}
        </div>
      )}

      <div className="card" style={{ padding: 24, borderTop: "4px solid var(--primary)" }}>
        <h2 style={{ marginTop: 0, marginBottom: 20, fontSize: 24 }}>Edit Article</h2>

        {/* Scheduling System Notice */}
        <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", color: "#0369a1", padding: "12px 16px", borderRadius: 8, fontSize: 13, marginBottom: 24 }}>
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
              onChange={e => setSlug(slugify(e.target.value))}
            />
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#4b5563" }}>Cover Image (Optional)</label>
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
                    checked={categoryIds.includes(c.id)}
                    onChange={e => {
                      if (e.target.checked) setCategoryIds([...categoryIds, c.id]);
                      else setCategoryIds(categoryIds.filter(id => id !== c.id));
                    }}
                  />
                  {c.name}
                </label>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gap: 8, gridColumn: "span 2" }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#4b5563" }}>Tags (Comma separated)</label>
            <textarea
              className="textarea"
              placeholder="News, Politics, Maharashtra..."
              value={tagNamesString}
              onChange={e => setTagNamesString(e.target.value)}
              style={{ minHeight: 60 }}
            />
            <div style={{ fontSize: 11, color: "#6b7280" }}>Separate multiple tags with commas. New tags will be created automatically.</div>
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
              Meta Description (Optional) <InfoIcon text="A short summary shown below the title in search results." />
            </label>
            <textarea className="textarea" placeholder="Meta description..." value={metaDescription} onChange={e => setMetaDescription(e.target.value)} />
          </div>
          <div style={{ display: "grid", gap: 8, gridColumn: "span 2" }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#4b5563" }}>
              Canonical URL (Optional) <InfoIcon text="The original source URL (leave empty if this article is the original)." />
            </label>
            <input className="input" placeholder="https://..." value={canonicalUrl} onChange={e => setCanonicalUrl(e.target.value)} />
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#4b5563" }}>Excerpt (Optional)</label>
          <textarea className="textarea" placeholder="Short description..." value={excerpt} onChange={e => setExcerpt(e.target.value)} style={{ marginTop: 4 }} />
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#4b5563" }}>Content</label>
          <RichEditor
            value={contentHtml}
            onChange={setContent}
            placeholder="Update article content..."
            style={{ marginTop: 4 }}
          />
        </div>

        <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#4b5563" }}>Display Date (Public):</label>
            <input
              type="datetime-local"
              className="input"
              style={{ width: "auto", padding: "6px 10px", fontSize: 13 }}
              value={publishedAt ? new Date(new Date(publishedAt).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : ""}
              onChange={e => {
                const val = e.target.value;
                if (!val) setPublishedAt(null);
                else setPublishedAt(new Date(val).toISOString());
              }}
            />
            <InfoIcon text="This date will be shown on the website as the publication date. Use this to publish for a past date." />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#4b5563" }}>Reschedule Post:</label>
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
            {scheduledAt && (
              <div style={{ fontSize: 11, color: "#92400e", background: "#fffbeb", padding: "4px 8px", borderRadius: 4, marginTop: 4 }}>
                Daily scheduling limit applies. Max 10 articles can be scheduled at once.
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn btnGhost" onClick={() => router.push("/admin/articles")}>Cancel</button>
            <button
              className="btn btnPrimary"
              onClick={update}
              disabled={saving}
              style={{
                minWidth: 120,
                background: scheduledAt ? "#6366f1" : undefined,
                borderColor: scheduledAt ? "#4f46e5" : undefined
              }}
            >
              {saving ? "Saving..." : (scheduledAt ? "Update Schedule" : "Update Article")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
