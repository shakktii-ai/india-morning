"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function SiteHeader() {
  const [tickerItems, setTickerItems] = useState<string[]>([]);

  useEffect(() => {
    // Fetch ticker items
    fetch("/api/public/home").then(r => r.ok ? r.json() : null).then(d => {
      if (d?.topStories) {
        setTickerItems(d.topStories.slice(0, 8).map((a: any) => a.title));
      }
    }).catch(()=>{});
  }, []);

  return (
    <header className="glass-header">
      <div className="container" style={{ minHeight: 70, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img 
            src="/images/Indian-Morning-Logo.png" 
            alt="India Mornings" 
            style={{ height: 45, width: "auto", objectFit: "contain" }} 
          />
          <div style={{ lineHeight: 1.1 }}>
            <div style={{ fontSize: "clamp(16px, 4vw, 20px)", fontWeight: 800, color: "white", letterSpacing: "-0.5px" }}>India Morning</div>
            <div style={{ fontSize: 11, opacity: 0.7, color: "white", fontWeight: 500, display: "block" }}>Global News Portal</div>
            <div style={{ fontSize: 9, opacity: 0.5, color: "white", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {new Date().toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </Link>
        
        <div className="header-search-container" style={{ flex: 1, display: "flex", justifyContent: "flex-end", maxWidth: 400, marginLeft: 20 }}>
          <form action="/search" method="GET" style={{ position: "relative", width: "100%" }}>
            <input 
              name="q"
              type="text"
              placeholder="Search news..."
              className="input"
              style={{
                background: "rgba(255, 255, 255, 0.1)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                color: "white",
                height: 40,
                padding: "0 40px 0 15px",
                fontSize: 14,
                borderRadius: 20,
              }}
            />
            <button type="submit" style={{
              position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              color: "white",
              opacity: 0.7,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </button>
          </form>
        </div>
        <style jsx>{`
          @media (max-width: 640px) {
            .header-search-container {
              display: none !important;
            }
          }
        `}</style>
      </div>


      <div className="ticker-wrap">
        <div className="ticker">
          {tickerItems.length > 0 ? (
            <>
              {tickerItems.map((item, i) => (
                <div key={i} className="ticker-item">
                  <span style={{ color: "rgba(0,0,0,0.5)", marginRight: 10, fontWeight: 800 }}>•</span> {item}
                </div>
              ))}
              {/* Duplicate for seamless loop */}
              {tickerItems.map((item, i) => (
                <div key={`dup-${i}`} className="ticker-item">
                  <span style={{ color: "rgba(0,0,0,0.5)", marginRight: 10, fontWeight: 800 }}>•</span> {item}
                </div>
              ))}
            </>
          ) : (
            <div className="ticker-item">Loading latest news...</div>
          )}
        </div>
      </div>
    </header>
  );
}

