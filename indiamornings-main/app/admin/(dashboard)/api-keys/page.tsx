"use client";

import { useState, useEffect } from "react";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  role: string;
  createdAt: string;
  lastUsedAt?: string;
  isActive: boolean;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("API_SERVICE");

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/api-keys");
      const data = await res.json();
      if (data.ok) {
        setKeys(data.keys);
      } else {
        setError(data.error);
      }
    } catch (e) {
      setError("Failed to fetch keys");
    } finally {
      setLoading(false);
    }
  };

  const createKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("/api/admin/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, role: newRole }),
      });
      const data = await res.json();
      if (data.ok) {
        setKeys([data, ...keys]);
        setNewName("");
        setIsCreating(false);
      } else {
        setError(data.error);
      }
    } catch (e) {
      setError("Failed to create key");
    }
  };

  const deleteKey = async (id: string) => {
    if (!confirm("Are you sure you want to delete this API key?")) return;
    try {
      const res = await fetch("/api/admin/api-keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.ok) {
        setKeys(keys.filter(k => k.id !== id));
      } else {
        setError(data.error);
      }
    } catch (e) {
      setError("Failed to delete key");
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
        <div>
          <h1 style={{ fontSize: 28, margin: 0 }}>API Access Keys</h1>
          <p style={{ color: "#6b7280", marginTop: 5 }}>Manage keys for external integrations and automated services.</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="btn"
          style={{ background: "var(--brand)", color: "white" }}
        >
          Generate New Key
        </button>
      </div>

      {error && (
        <div style={{ background: "#fee2e2", color: "#b91c1c", padding: 12, borderRadius: 8, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {isCreating && (
        <div style={{ background: "white", padding: 24, borderRadius: 12, border: "1px solid #e5e7eb", marginBottom: 30 }}>
          <h3 style={{ marginTop: 0 }}>Generate New API Key</h3>
          <form onSubmit={createKey} style={{ display: "grid", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Key Name (e.g., Development, Mobile App, Partner Integration)</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter a descriptive name"
                style={{ width: "100%", padding: "10px", borderRadius: 6, border: "1px solid #d1d5db" }}
                required
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Role / Permissions</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                style={{ width: "100%", padding: "10px", borderRadius: 6, border: "1px solid #d1d5db" }}
              >
                <option value="API_SERVICE">API Service (Read-Only Public Content)</option>
                <option value="JOURNALIST">Journalist (Submit Articles)</option>
                <option value="ADMIN">Admin (Full Control)</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button type="submit" className="btn" style={{ background: "#059669", color: "white" }}>Create Key</button>
              <button type="button" onClick={() => setIsCreating(false)} className="btn" style={{ background: "#f3f4f6", color: "#374151" }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ background: "white", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb", textAlign: "left" }}>
              <th style={{ padding: "12px 20px", fontSize: 13, fontWeight: 600 }}>Name</th>
              <th style={{ padding: "12px 20px", fontSize: 13, fontWeight: 600 }}>API Key</th>
              <th style={{ padding: "12px 20px", fontSize: 13, fontWeight: 600 }}>Role</th>
              <th style={{ padding: "12px 20px", fontSize: 13, fontWeight: 600 }}>Created</th>
              <th style={{ padding: "12px 20px", fontSize: 13, fontWeight: 600 }}>Last Used</th>
              <th style={{ padding: "12px 20px", textAlign: "right" }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>Loading keys...</td></tr>
            ) : keys.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>No API keys found. Generate one to get started.</td></tr>
            ) : (
              keys.map((k) => (
                <tr key={k.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "16px 20px", fontSize: 14 }}><b>{k.name}</b></td>
                  <td style={{ padding: "16px 20px" }}>
                    <code style={{ background: "#f3f4f6", padding: "4px 8px", borderRadius: 4, fontSize: 13 }}>{k.key}</code>
                  </td>
                  <td style={{ padding: "16px 20px", fontSize: 13 }}>{k.role}</td>
                  <td style={{ padding: "16px 20px", fontSize: 13, color: "#6b7280" }}>{new Date(k.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                  <td style={{ padding: "16px 20px", fontSize: 13, color: "#6b7280" }}>
                    {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : "Never"}
                  </td>
                  <td style={{ padding: "16px 20px", textAlign: "right" }}>
                    <button
                      onClick={() => deleteKey(k.id)}
                      style={{ color: "#ef4444", border: "none", background: "none", cursor: "pointer", fontSize: 13 }}
                    >
                      Revoke
                    </button>
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
