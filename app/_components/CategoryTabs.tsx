"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getTranslation } from "@/src/utils/i18n";

const tabs = [
  { slug: "", i18nKey: "nav_top_stories" },
  { slug: "breaking-news", i18nKey: "nav_breaking" },
  { slug: "entertainment", i18nKey: "nav_entertainment" },
  { slug: "politics", i18nKey: "nav_politics" },
  { slug: "sports", i18nKey: "nav_sports" },
  { slug: "business", i18nKey: "nav_business" },
  { slug: "technology", i18nKey: "nav_technology" },
  { slug: "health", i18nKey: "nav_health" },
  { slug: "world", i18nKey: "nav_world" },
  { slug: "lifestyle", i18nKey: "nav_lifestyle" },
  { slug: "education", i18nKey: "nav_education" }
];

export default function CategoryTabs({ active, categories: initialCategories, lang: propLang = "ALL", region: propRegion = "ALL" }: { active?: string, categories?: any[], lang?: string, region?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRegionOpen, setIsRegionOpen] = useState(false);
  const [categories, setCategories] = useState<any[]>(initialCategories || []);
  const menuRef = useRef<HTMLDivElement>(null);
  const regionRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const sp = useSearchParams();
  const lang = sp.get("lang") || propLang;
  const region = sp.get("region") || propRegion;

  useEffect(() => {
    if (!initialCategories) {
      fetch("/api/public/footer")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d && d.categories) setCategories(d.categories);
        })
        .catch(() => {});
    }
  }, [initialCategories]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
      if (regionRef.current && !regionRef.current.contains(event.target as Node)) {
        setIsRegionOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const setRegionParam = (val: string) => {
    const params = new URLSearchParams(sp.toString());
    params.set("region", val);
    router.push(`?${params.toString()}`, { scroll: false });
    setIsRegionOpen(false);
  };

  const getUrl = (slug: string) => {
    const params = new URLSearchParams();
    if (lang !== "ALL") params.set("lang", lang);
    if (region !== "ALL") params.set("region", region);
    
    const baseUrl = slug ? `/category/${slug}` : "/";
    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  };

  const cities = [
    { id: "ALL", name: "All India" },
    { id: "INDIA", name: "India" },
    { id: "MAHARASHTRA", name: "Maharashtra" },
    { id: "MUMBAI", name: "Mumbai" },
    { id: "PUNE", name: "Pune" },
    { id: "NAGPUR", name: "Nagpur" },
    { id: "NASHIK", name: "Nashik" },
    { id: "GUJARAT", name: "Gujarat" },
    { id: "AHMEDABAD", name: "Ahmedabad" },
    { id: "DELHI", name: "Delhi" },
    { id: "BANGALORE", name: "Bangalore" },
    { id: "HYDERABAD", name: "Hyderabad" },
    { id: "CHENNAI", name: "Chennai" },
    { id: "KOLKATA", name: "Kolkata" },
    { id: "JAIPUR", name: "Jaipur" },
    { id: "LUCKNOW", name: "Lucknow" },
    { id: "CHANDIGARH", name: "Chandigarh" }
  ];

  return (
    <div className="container" style={{ paddingTop: 14, paddingBottom: 14 }}>
      <style jsx>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dropdown-animate {
          animation: slideUp 0.2s ease-out;
        }
        .city-btn:hover {
          background-color: #F9FAFB !important;
          color: var(--accent) !important;
        }
        .nav-link:hover {
          color: var(--accent) !important;
        }
        .dropdown-container {
          position: absolute;
          top: 100%;
          left: 0;
          padding-top: 12px;
          z-index: 1000;
        }
        .dropdown-content {
          background: white;
          box-shadow: 0 15px 40px rgba(0,0,0,0.15);
          border-radius: 16px;
          padding: 24px;
          border: 1px solid #F3F4F6;
          min-width: 700px;
          max-width: 90vw;
        }
        .grid-3-col {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px 20px;
        }
        .mobile-close {
          display: none;
        }
        @media (max-width: 768px) {
          .dropdown-container {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            padding: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(4px);
          }
          .dropdown-content {
            width: 95vw;
            min-width: unset;
            max-height: 85vh;
            overflow-y: auto;
            position: relative;
          }
          .grid-3-col {
            grid-template-columns: repeat(2, 1fr);
          }
          .mobile-close {
            display: flex;
            position: absolute;
            top: 16px;
            right: 16px;
            background: #F3F4F6;
            border: none;
            padding: 8px;
            border-radius: 50%;
            cursor: pointer;
            z-index: 10;
          }
        }
      `}</style>

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        {/* Menu Dropdown */}
        <div 
          ref={menuRef} 
          style={{ position: "relative", flexShrink: 0 }}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="btn"
            style={{
              background: isOpen ? "var(--accent)" : "white",
              color: isOpen ? "white" : "black",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              gap: 8,
              border: "1.5px solid #E5E7EB",
              padding: "8px 16px",
              borderRadius: 20,
              transition: "all 0.2s",
              cursor: "pointer"
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
            {getTranslation("menu", lang)}
          </button>

          {isOpen && (
            <div className="dropdown-animate dropdown-container" onClick={(e) => {
              if (e.target === e.currentTarget) setIsOpen(false);
            }}>
              <div className="dropdown-content">
                <button className="mobile-close" onClick={() => setIsOpen(false)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
                <h4 style={{ margin: "0 0 16px", color: "var(--brand)", fontSize: 13, textTransform: "uppercase", letterSpacing: "1px" }}>
                  {getTranslation("categories", lang)}
                </h4>
                <div className="grid-3-col">
                  {categories.length > 0 ? categories.map(cat => (
                    <Link 
                      key={cat.id}
                      href={getUrl(cat.slug)}
                      onClick={() => setIsOpen(false)}
                      className="nav-link"
                      style={{ 
                        fontSize: 14, fontWeight: 600, color: (active === cat.slug) ? "var(--accent)" : "#4B5563",
                        textDecoration: "none",
                        padding: "4px 0",
                        transition: "color 0.2s",
                        display: "block"
                      }}
                    >
                      {(() => {
                        const translated = getTranslation(`nav_${cat.slug}`, lang);
                        if (translated.startsWith("nav_")) {
                          return cat.name || translated.replace("nav_", "");
                        }
                        return translated;
                      })()}
                    </Link>
                  )) : tabs.map(t => (
                    <Link 
                      key={t.slug}
                      href={getUrl(t.slug)}
                      onClick={() => setIsOpen(false)}
                      className="nav-link"
                      style={{ 
                        fontSize: 14, fontWeight: 600, color: (active === t.slug) ? "var(--accent)" : "#4B5563",
                        textDecoration: "none",
                        padding: "4px 0",
                        transition: "color 0.2s",
                        display: "block"
                      }}
                    >
                      {getTranslation(t.i18nKey, lang)}
                    </Link>
                  ))}
                </div>
                </div>
              </div>
            )}
          </div>

        {/* Region Dropdown */}
        <div 
          ref={regionRef} 
          style={{ position: "relative", flexShrink: 0 }}
          onMouseEnter={() => setIsRegionOpen(true)}
          onMouseLeave={() => setIsRegionOpen(false)}
        >
          <button 
            onClick={() => setIsRegionOpen(!isRegionOpen)}
            className="btn"
            style={{
              background: isRegionOpen ? "var(--accent)" : "white",
              color: isRegionOpen ? "white" : "black",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              gap: 8,
              border: "1.5px solid #E5E7EB",
              padding: "8px 16px",
              borderRadius: 20,
              transition: "all 0.2s",
              cursor: "pointer"
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {region === "ALL" ? getTranslation("region", lang) : getTranslation(`region_${region}`, lang)}
            </span>
          </button>

          {isRegionOpen && (
            <div className="dropdown-animate dropdown-container" onClick={(e) => {
              if (e.target === e.currentTarget) setIsRegionOpen(false);
            }}>
              <div className="dropdown-content" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
                <button className="mobile-close" onClick={() => setIsRegionOpen(false)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
                <h4 style={{ margin: "0 0 16px", color: "var(--brand)", fontSize: 13, textTransform: "uppercase", letterSpacing: "1px" }}>
                  {getTranslation("cities", lang)}
                </h4>
                <div className="grid-3-col">
                  {cities.map(r => (
                    <button 
                      key={r.id}
                      onClick={() => { setRegionParam(r.id); setIsRegionOpen(false); }}
                      className="city-btn"
                      style={{ 
                        background: region === r.id ? "#F3F4F6" : "none", 
                        border: "none", textAlign: "left", 
                        fontSize: 14, fontWeight: 600, color: region === r.id ? "var(--accent)" : "#4B5563",
                        cursor: "pointer", padding: "8px 12px", borderRadius: 8,
                        width: "100%",
                        transition: "all 0.2s"
                      }}
                    >
                      {(() => {
                        const translated = getTranslation(`region_${r.id}`, lang);
                        if (translated.startsWith("region_")) {
                          // Fallback: strip prefix and capitalize if translation is missing
                          return r.name || translated.replace("region_", "").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
                        }
                        return translated;
                      })()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Scrollable Tabs */}
        <div className="scroll-x" style={{ flex: 1, display: "flex", gap: 10, alignItems: "center" }}>
          {tabs.map(t => {
            const on = (active || "") === t.slug;
            return (
              <Link
                key={t.slug || "home"}
                href={getUrl(t.slug)}
                className="btn"
                style={{
                  background: on ? "var(--accent)" : "var(--muted)",
                  color: on ? "white" : "black",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  padding: "8px 16px",
                  borderRadius: 20,
                  fontSize: 14,
                  textDecoration: "none",
                  border: on ? "1.5px solid var(--accent)" : "1.5px solid transparent",
                  transition: "all 0.2s"
                }}
              >
                {getTranslation(t.i18nKey, lang)}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
