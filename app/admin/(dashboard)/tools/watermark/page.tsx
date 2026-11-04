"use client";

import { useState, useEffect } from "react";
import { applyWatermark } from "@/src/utils/watermark";

export default function BulkWatermarkPage() {
    const [articles, setArticles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [status, setStatus] = useState("");
    const [progress, setProgress] = useState({ current: 0, total: 0 });

    useEffect(() => {
        fetchArticles();
    }, []);

    async function fetchArticles() {
        setLoading(true);
        try {
            const res = await fetch("/api/articles?limit=1000");
            if (res.ok) {
                const data = await res.json();
                const toProcess = data.articles.filter((a: any) => {
                    const url = a.coverImageUrl || a.image || "";
                    if (!url) return false;
                    
                    // Process if:
                    // 1. It has no watermark at all
                    // 2. OR it has an old .png watermark (which is too heavy for social media)
                    const hasNoWatermark = !url.includes("-watermarked");
                    const hasOldPngWatermark = url.includes("-watermarked") && url.toLowerCase().endsWith(".png");
                    
                    return hasNoWatermark || hasOldPngWatermark;
                });
                setArticles(toProcess);
            }
        } catch (e) {
            console.error("Failed to fetch articles", e);
        } finally {
            setLoading(false);
        }
    }

    async function processWatermarking() {
        if (!confirm(`Are you sure you want to process ${articles.length} articles? This will re-upload images and update the database.`)) {
            return;
        }

        setProcessing(true);
        setProgress({ current: 0, total: articles.length });

        for (let i = 0; i < articles.length; i++) {
            const article = articles[i];
            setStatus(`Processing: ${article.title}`);

            try {
                const sourceUrl = article.coverImageUrl || article.image;
                const imgRes = await fetch(sourceUrl);
                const blob = await imgRes.blob();
                const file = new File([blob], "image.png", { type: blob.type });

                const watermarkedFile = await applyWatermark(file);

                const formData = new FormData();
                formData.append("file", watermarkedFile);

                const uploadRes = await fetch("/api/upload", {
                    method: "POST",
                    body: formData
                });

                if (!uploadRes.ok) throw new Error("Upload failed");
                const { url } = await uploadRes.json();

                const updateRes = await fetch(`/api/articles/${article.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        coverImageUrl: url,
                        image: url,
                        originalImage: sourceUrl
                    })
                });

                if (!updateRes.ok) throw new Error("Database update failed");

                setProgress(prev => ({ ...prev, current: i + 1 }));
            } catch (e) {
                console.error(`Error processing ${article.title}:`, e);
                setStatus(`Error on: ${article.title}`);
            }
        }

        setProcessing(false);
        setStatus("Bulk watermarking complete!");
        fetchArticles();
    }

    if (loading) return <div className="container" style={{ padding: 40 }}>Loading articles...</div>;

    return (
        <div className="container" style={{ padding: "20px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
                <div>
                    <h1 style={{ margin: 0 }}>Bulk Watermarking Tool</h1>
                    <p style={{ color: "var(--text-muted)", margin: "8px 0 0" }}>
                        Found <b>{articles.length}</b> articles that need watermarking.
                    </p>
                </div>
                {articles.length > 0 && (
                    <button
                        className="btn btn-primary"
                        onClick={processWatermarking}
                        disabled={processing}
                    >
                        {processing ? "Processing..." : `Process ${articles.length} Articles`}
                    </button>
                )}
            </div>

            {processing && (
                <div className="card" style={{ marginBottom: 30, padding: 24, border: "2px solid var(--brand)" }}>
                    <div style={{ fontWeight: 700, marginBottom: 12 }}>Overall Progress: {progress.current} / {progress.total}</div>
                    <div style={{ width: "100%", height: 12, background: "#E5E7EB", borderRadius: 6, overflow: "hidden", marginBottom: 12 }}>
                        <div style={{ width: `${(progress.current / progress.total) * 100}%`, height: "100%", background: "var(--brand)", transition: "width 0.3s" }} />
                    </div>
                    <div style={{ fontSize: 14, color: "var(--text-muted)" }}>{status}</div>
                </div>
            )}

            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                    <thead style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                        <tr>
                            <th style={{ textAlign: "left", padding: "12px 16px" }}>Article Title</th>
                            <th style={{ textAlign: "left", padding: "12px 16px" }}>Current Image</th>
                            <th style={{ textAlign: "left", padding: "12px 16px" }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {articles.length === 0 ? (
                            <tr>
                                <td colSpan={3} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
                                    All articles are already watermarked! 🎉
                                </td>
                            </tr>
                        ) : (
                            articles.map(a => (
                                <tr key={a.id} style={{ borderBottom: "1px solid #F3F4F6" }}>
                                    <td style={{ padding: "12px 16px", fontWeight: 600 }}>{a.title}</td>
                                    <td style={{ padding: "12px 16px" }}>
                                        <a href={a.coverImageUrl || a.image} target="_blank" rel="noreferrer" style={{ color: "var(--brand)", textDecoration: "none" }}>
                                            View Image ↗
                                        </a>
                                    </td>
                                    <td style={{ padding: "12px 16px" }}>
                                        <span style={{ padding: "2px 8px", background: "#FEF3C7", color: "#92400E", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                                            NEEDS WATERMARK
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
