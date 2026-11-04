"use client";

import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
   const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      if (!r.ok) {
        const d = await r.json().catch(()=>({}));
        setErr(d?.message || "Login failed");
        setLoading(false);
        return;
      }
      window.location.href = "/admin";
    } catch (error) {
      setErr("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16, background: "#F6F7FB" }}>
      <div className="card" style={{ width: "100%", maxWidth: 420, textAlign: "center", padding: 32 }}>
        <img 
          src="/images/Indian-Morning-Logo.png" 
          alt="India Mornings" 
          style={{ height: 60, width: "auto", marginBottom: 20, display: "block", margin: "0 auto 24px" }} 
        />
        <h2 style={{ marginTop: 0, fontSize: 24, fontWeight: 800, color: "#1f2937" }}>Admin Login</h2>
        <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 32 }}>Welcome back! Please enter your details.</p>
        <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
          <input className="input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} disabled={loading} />
          <input className="input" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} disabled={loading} />
          {err && (
            <div style={{ 
              background: "#fef2f2", color: "#991b1b", padding: "12px 16px", borderRadius: 8, 
              border: "1px solid #fecaca", fontWeight: 500 
            }}>
              {err}
            </div>
          )}
          <button 
            className="btn btnPrimary" 
            type="submit" 
            disabled={loading}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ 
                  width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", 
                  borderTopColor: "white", borderRadius: "50%", 
                  animation: "spin 0.8s linear infinite" 
                }} />
                Logging in...
              </>
            ) : "Login"}
          </button>
        </form>
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 10 }}>
          <Link href="/">← Back to site</Link>
        </div>
      </div>
    </div>
  );
}
