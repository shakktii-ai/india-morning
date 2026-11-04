"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function FiltersBar() {
  const router = useRouter();
  const sp = useSearchParams();

  const lang = sp.get("lang") || "ALL";
  const region = sp.get("region") || "ALL";

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(sp.toString());
    next.set(key, value);
    router.push(`?${next.toString()}`);
  }

  return (
    <div style={{ background: "white", borderBottom: "1px solid #E5E7EB", padding: "12px 0" }}>
      <div className="container" style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--brand)", textTransform: "uppercase", letterSpacing: "1px" }}>
          Customize Feed
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", width: "100%", maxWidth: "100%", justifyContent: "flex-end" }} className="mobile-stack">
          <div style={{ 
            display: "flex", alignItems: "center", gap: 8, background: "#F3F4F6", 
            padding: "4px 4px 4px 12px", borderRadius: 12, flex: "0 1 auto"
          }} className="full-width-on-mobile">
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--brand-light)" }}>Lang</span>
            <select 
              className="select" 
              value={lang} 
              onChange={(e) => setParam("lang", e.target.value)} 
              style={{ width: "auto", border: "none", background: "white", padding: "6px 12px", height: 32, borderRadius: 10, fontSize: 13, fontWeight: 600 }}
            >
              <option value="ALL">All</option>
              <option value="EN">English</option>
              <option value="MR">Marathi</option>
              <option value="HI">Hindi</option>
            </select>
          </div>

          <div style={{ 
            display: "flex", alignItems: "center", gap: 8, background: "#F3F4F6", 
            padding: "4px 4px 4px 12px", borderRadius: 12, flex: "0 1 auto"
          }} className="full-width-on-mobile">
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--brand-light)" }}>Region</span>
            <select 
              className="select" 
              value={region} 
              onChange={(e) => setParam("region", e.target.value)} 
              style={{ width: "auto", border: "none", background: "white", padding: "6px 12px", height: 32, borderRadius: 10, fontSize: 13, fontWeight: 600 }}
            >
              <option value="ALL">All</option>
              <option value="MAHARASHTRA">Maha</option>
              <option value="INDIA">India</option>
              <option value="GUJARAT">Guj</option>
              <option value="DELHI">Delhi</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}


