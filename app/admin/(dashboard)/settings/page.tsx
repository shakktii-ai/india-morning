"use client";

import { useState, useEffect } from "react";

export default function SettingsPage() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [adsenseId, setAdsenseId] = useState("");
  const [adsTxt, setAdsTxt] = useState("");

  useEffect(() => {
    fetchConfigs();
  }, []);

  async function fetchConfigs() {
    try {
      const res = await fetch("/api/admin/config");
      const data = await res.json();
      if (data.ok) {
        setConfigs(data.configs);
        const aid = data.configs.find((c: any) => c.key === "adsense_publisher_id")?.value || "";
        const atxt = data.configs.find((c: any) => c.key === "ads_txt_content")?.value || "";
        setAdsenseId(aid);
        setAdsTxt(atxt);
      } else {
        setError(data.error);
      }
    } catch (e) {
      setError("Failed to fetch settings");
    } finally {
      setLoading(false);
    }
  }

  async function saveSetting(key: string, value: string) {
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      const data = await res.json();
      if (data.ok) {
        setSuccess(`Saved ${key} successfully`);
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(data.error);
      }
    } catch (e) {
      setError("Failed to save setting");
    }
  }

  if (loading) return <div style={{ padding: 40 }}>Loading settings...</div>;

  return (
    <div style={{ maxWidth: 800 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, color: "var(--brand)" }}>System Settings</h1>
      <p style={{ color: "#6b7280", marginBottom: 32 }}>Manage global site configurations and integrations.</p>

      {error && (
        <div style={{ background: "#fee2e2", color: "#b91c1c", padding: 12, borderRadius: 8, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ background: "#ecfdf5", color: "#065f46", padding: 12, borderRadius: 8, marginBottom: 20 }}>
          {success}
        </div>
      )}

      <div className="grid" style={{ gap: 24 }}>
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ marginTop: 0, marginBottom: 16 }}>Google AdSense</h3>
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Publisher ID</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input 
                  className="input" 
                  value={process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID || adsenseId} 
                  disabled={!!process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID}
                  onChange={e => setAdsenseId(e.target.value)} 
                  placeholder="ca-pub-xxxxxxxxxxxxxxxx"
                />
                {!process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID && (
                  <button 
                    className="btn btnPrimary" 
                    onClick={() => saveSetting("adsense_publisher_id", adsenseId)}
                    style={{ whiteSpace: "nowrap" }}
                  >
                    Save
                  </button>
                )}
              </div>
              <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                {process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID 
                  ? "✓ Configured via environment variable (NEXT_PUBLIC_ADSENSE_PUBLISHER_ID)" 
                  : "This ID will be used for both the global script and individual ad units."}
              </p>
            </div>

            <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 16 }}>
              <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Ads.txt Content</label>
              <textarea 
                className="input" 
                style={{ minHeight: 120, fontFamily: "monospace", fontSize: 13 }}
                value={adsTxt} 
                onChange={e => setAdsTxt(e.target.value)} 
                placeholder="google.com, pub-xxxxxxxxxxxxxxxx, DIRECT, f08c47fec0942fa0"
              />
              <button 
                className="btn btnPrimary" 
                style={{ marginTop: 8 }}
                onClick={() => saveSetting("ads_txt_content", adsTxt)}
              >
                Save Ads.txt
              </button>
            </div>
          </div>
        </div>
        
        <div className="card" style={{ padding: 24, opacity: 0.6 }}>
          <h3 style={{ marginTop: 0, marginBottom: 16 }}>Other Configurations</h3>
          <p style={{ fontSize: 14 }}>More settings coming soon (SEO, Social, Analytics, etc.)</p>
        </div>
      </div>
    </div>
  );
}
