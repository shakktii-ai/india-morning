"use client";

import { useEffect, useState } from "react";

export default function HeaderDate({ lang }: { lang: string }) {
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    const d = new Date().toLocaleDateString(
      lang === "HI" ? "hi-IN" : 
      lang === "PA" ? "pa-IN" : 
      lang === "TA" ? "ta-IN" : "en-IN", 
      { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
    );
    setDateStr(d);
  }, [lang]);

  if (!dateStr) return <div style={{ height: 11 }}></div>;

  return (
    <div style={{ fontSize: 9, opacity: 0.5, color: "white", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>
      {dateStr}
    </div>
  );
}
