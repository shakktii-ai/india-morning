import Link from "next/link";
import { getTranslation } from "@/src/utils/i18n";
import Image from "next/image";
import Ticker from "./Ticker";
import HeaderDate from "./HeaderDate";

export default function SiteHeader({ 
  tickerItems = [], 
  lang = "ALL", 
  region = "ALL" 
}: { 
  tickerItems?: string[], 
  lang?: string, 
  region?: string 
}) {
  const homeUrl = (() => {
    const params = new URLSearchParams();
    if (lang !== "ALL") params.set("lang", lang);
    if (region !== "ALL") params.set("region", region);
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  })();

  return (
    <header className="glass-header">
      <div className="container" style={{ minHeight: 70, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px" }}>
        <Link href={homeUrl} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Image 
            src="/images/Indian-Morning-Logo.png" 
            alt="India Mornings" 
            width={45}
            height={45}
            className="notranslate"
            style={{ objectFit: "contain" }}
            priority
          />
          <div style={{ lineHeight: 1.1 }} className="notranslate">
            <div style={{ fontSize: "clamp(16px, 4vw, 20px)", fontWeight: 800, color: "white", letterSpacing: "-0.5px" }}>India Morning</div>
            <div style={{ fontSize: 11, opacity: 0.7, color: "white", fontWeight: 500, display: "block" }}>
              {getTranslation("global_news_portal", lang)}
            </div>
            <HeaderDate lang={lang} />
          </div>
        </Link>
        
        <div className="header-search-container" style={{ flex: 1, display: "flex", justifyContent: "flex-end", maxWidth: 400, marginLeft: 20 }}>
          <form action="/search" method="GET" style={{ position: "relative", width: "100%" }}>
            <input type="hidden" name="lang" value={lang} />
            <input type="hidden" name="region" value={region} />
            <input 
              name="q"
              type="text"
              placeholder={getTranslation("search_placeholder", lang)}
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
      </div>

      <Ticker initialItems={tickerItems} />

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 640px) {
          .header-search-container {
            display: none !important;
          }
        }
      `}} />
    </header>
  );
}
