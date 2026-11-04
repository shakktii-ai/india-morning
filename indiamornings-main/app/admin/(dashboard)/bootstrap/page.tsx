"use client";
import { useState, useEffect } from "react";

export default function BootstrapPage() {
  const [bootstrapKey, setKey] = useState("");
  const [email, setEmail] = useState("superadmin@indiamornings.com");
  const [password, setPassword] = useState("ChangeMeNow@123");
  const [name, setName] = useState("Super Admin");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<"checking"|"connected"|"error">("checking");
  const [dbError, setDbError] = useState("");

  useEffect(() => {
    fetch("/api/admin/verify-db")
      .then(async (r) => {
        if (r.ok) {
            setDbStatus("connected");
        } else {
            const t = await r.json().catch(()=>({}));
            setDbStatus("error");
            setDbError(t.message || r.statusText);
        }
      })
      .catch((e) => {
         setDbStatus("error");
         setDbError(e.message);
      });
  }, []);


  async function run() {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const r = await fetch("/api/admin/bootstrap", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bootstrapKey, email, password, name })
      });
      
      const text = await r.text();
      let d;
      try {
        d = JSON.parse(text);
      } catch {
        // If not JSON, it might be an HTML error page (500)
        setErrorMsg(`Error (${r.status}): ${text.slice(0, 100)}...`);
        return;
      }

      if (!r.ok) {
        setErrorMsg(`${d.message || "Failed"} (${r.status})`);
      } else {
        setSuccessMsg(`${d.message} (${d.email})`);
      }
    } catch (e: any) {
      setErrorMsg(`Network/Client Error: ${e.message}`);
    }
  }

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ marginTop: 0 }}>One-time Bootstrap</h2>
          <div style={{ fontSize: 12 }}>
            DB Status: {dbStatus === "checking" && "Checking..."}
            {dbStatus === "connected" && <span style={{ color: "green", fontWeight: "bold" }}>Connected ✅</span>}
            {dbStatus === "error" && <span style={{ color: "red", fontWeight: "bold" }}>Error ❌ {dbError}</span>}
          </div>
      </div>
      <p style={{ opacity: 0.8 }}>Creates the first SUPER_ADMIN (only if it doesn't exist).</p>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <input className="input" placeholder="BOOTSTRAP_KEY" value={bootstrapKey} onChange={e=>setKey(e.target.value)} />
        <input className="input" placeholder="Name" value={name} onChange={e=>setName(e.target.value)} />
        <input className="input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="input" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
      </div>
      <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
        <button className="btn btnPrimary" onClick={run}>Run Bootstrap</button>
      </div>
      {successMsg && (
        <div style={{ 
          marginTop: 16, background: "#ecfdf5", color: "#065f46", padding: "12px 16px", borderRadius: 8, 
          border: "1px solid #a7f3d0", fontWeight: 500 
        }}>
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{ 
          marginTop: 16, background: "#fef2f2", color: "#991b1b", padding: "12px 16px", borderRadius: 8, 
          border: "1px solid #fecaca", fontWeight: 500 
        }}>
          {errorMsg}
        </div>
      )}
    </div>
  );
}
