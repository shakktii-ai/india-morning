"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { getTranslation } from "@/src/utils/i18n";

interface JoinUsProps {
  buttonStyle?: React.CSSProperties;
  iconOnly?: boolean;
}

export default function JoinUs({ buttonStyle, iconOnly = false }: JoinUsProps) {
  const [showJoinPopup, setShowJoinPopup] = useState(false);
  const sp = useSearchParams();
  const lang = sp.get("lang") || "ALL";

  return (
    <>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowJoinPopup(true);
        }}
        className="join-us-btn"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "white",
          border: "1.5px solid #E5E7EB",
          borderRadius: iconOnly ? "50%" : 25,
          padding: iconOnly ? "8px" : "8px 20px",
          cursor: "pointer",
          boxShadow: "0 2px 5px rgba(0,0,0,0.08)",
          transition: "all 0.2s",
          flexShrink: 0,
          ...buttonStyle
        }}
      >
        <svg 
          viewBox="0 0 24 24" 
          width={iconOnly ? 20 : 22} 
          height={iconOnly ? 20 : 22} 
          fill="currentColor" 
          style={{ color: "#25D366" }}
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        {!iconOnly && <span style={{ color: "#A51D2D", fontWeight: 800, fontSize: 16 }}>{getTranslation("join_us", lang)}</span>}
      </button>

      {showJoinPopup && (
        <div 
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.85)", zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(8px)",
            padding: 20
          }} 
          onClick={() => setShowJoinPopup(false)}
        >
          <div 
            style={{
              background: "white", padding: "40px 30px", borderRadius: 28, maxWidth: 420, width: "100%",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
              position: "relative",
              textAlign: "center",
              animation: "modal-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)"
            }} 
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowJoinPopup(false)}
              style={{ position: "absolute", top: 20, right: 20, background: "#f3f4f6", border: "none", width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#666" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            
            <div style={{ marginBottom: 30 }}>
              <div style={{ width: 80, height: 80, background: "#E8F9EE", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", boxShadow: "0 10px 20px -5px rgba(37, 211, 102, 0.2)" }}>
                <svg viewBox="0 0 24 24" width="45" height="45" fill="currentColor" style={{ color: "#25D366" }}>
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </div>
              <h2 style={{ margin: "0 0 10px", color: "#1A035A", fontSize: 28, fontWeight: 800 }}>{getTranslation("join_whatsapp", lang)}</h2>
              <p style={{ color: "#6B7280", fontSize: 16, lineHeight: 1.6 }}>{getTranslation("whatsapp_desc", lang)}</p>
            </div>

            <div style={{ display: "grid", gap: 10, maxHeight: "400px", overflowY: "auto", paddingRight: 5 }}>
              {[
                { 
                  label: "english_channel", 
                  url: "https://whatsapp.com/channel/0029Vb6wpGP3WHTda8PZHJ1i", 
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="2" y1="12" x2="22" y2="12"></line>
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                    </svg>
                  ), 
                  color: "#1A035A" 
                },
                { 
                  label: "marathi_channel", 
                  url: "https://whatsapp.com/channel/0029VbBerE7J3jv6G89yr206", 
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 5h7M4 9h7M10 5l4 9M18 5l-4 9M11 19h10"></path>
                    </svg>
                  ), 
                  color: "#A51D2D" 
                },
                { 
                  label: "whatsapp_community", 
                  url: "https://chat.whatsapp.com/IXWpP80Tooo6C9gU8wLY3j?mode=gi_t", 
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                  ), 
                  color: "#075E54" 
                },
                { 
                  label: "whatsapp_news", 
                  url: "https://chat.whatsapp.com/KEqlt9OQLLw6n4y39dzZ0O?mode=gi_t", 
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path>
                      <path d="M18 14h-8M15 18h-5M10 6h8v4h-8V6z"></path>
                    </svg>
                  ), 
                  color: "#128C7E" 
                },
                { 
                  label: "whatsapp_alerts", 
                  url: "https://chat.whatsapp.com/J9zhId6gKnxB6wI4iJClUl?mode=gi_t", 
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                    </svg>
                  ), 
                  color: "#25D366" 
                }
              ].map((link, idx) => (
                <a 
                  key={idx}
                  href={link.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ 
                    background: idx === 0 ? link.color : "white", 
                    color: idx === 0 ? "white" : "#1A035A", 
                    padding: "14px 20px", borderRadius: 16, 
                    fontWeight: 700, textDecoration: "none", display: "flex", alignItems: "center", gap: 12,
                    border: idx === 0 ? "none" : "1.5px solid #E5E7EB", 
                    transition: "all 0.2s", fontSize: 16,
                    boxShadow: idx === 0 ? `0 4px 12px ${link.color}33` : "none"
                  }}
                  onMouseOver={(e) => { 
                    e.currentTarget.style.transform = "translateY(-2px)";
                    if (idx !== 0) e.currentTarget.style.borderColor = "#1A035A";
                  }}
                  onMouseOut={(e) => { 
                    e.currentTarget.style.transform = "translateY(0)";
                    if (idx !== 0) e.currentTarget.style.borderColor = "#E5E7EB";
                  }}
                >
                  <div style={{ width: 20, display: "flex", justifyContent: "center" }}>
                    {link.icon}
                  </div> 
                  <span style={{ textAlign: "left", flex: 1 }}>{getTranslation(link.label, lang)}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </a>
              ))}
            </div>
            <style jsx>{`
              @keyframes modal-pop {
                from { opacity: 0; transform: scale(0.9) translateY(20px); }
                to { opacity: 1; transform: scale(1) translateY(0); }
              }
            `}</style>
          </div>
        </div>
      )}
    </>
  );
}
