import Link from "next/link";
import ShareButton from "./ShareButton";

export default function FiltersBar({ lang = "ALL", region = "ALL" }: { lang?: string, region?: string }) {
  const getLangUrl = (newLang: string) => {
    const params = new URLSearchParams();
    if (newLang !== "ALL") params.set("lang", newLang);
    if (region !== "ALL") params.set("region", region);
    const qs = params.toString();
    return qs ? `?${qs}` : "?";
  };

  type SocialLink = {
    name: string;
    url: string;
    icon: string | React.ReactNode;
    isImg?: boolean;
  };

  const socialLinks: SocialLink[] = [
    { name: "WhatsApp", icon: <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>, url: "https://chat.whatsapp.com/IXWpP80Tooo6C9gU8wLY3j?mode=gi_t" },
    { name: "Facebook", icon: <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />, url: "https://www.facebook.com/share/1BGaEgtQJM/" },
    { name: "Instagram", icon: <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.668.014-4.948.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />, url: "https://www.instagram.com/_imorningnews?igsh=eTl5NDJhYW9ub2Jm" },
    { name: "YouTube", icon: <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>, url: "https://youtube.com/@indiamoringnews?si=1UfyYnomS6gY4UpA" },
    { name: "Threads", icon: "/images/threads-white-icon.svg", isImg: true, url: "https://www.threads.net/@_imorningnews" },
  ];

  return (
    <div style={{ background: "#610000", color: "white", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
      <div className="container" style={{ 
        display: "flex", 
        justifyContent: "space-between",
        alignItems: "center",
        gap: 20
      }}>
        <div style={{ 
          display: "flex", 
          gap: 15, 
          overflowX: "auto", 
          whiteSpace: "nowrap", 
          flexGrow: 1,
          paddingBottom: 4,
          msOverflowStyle: "none",
          scrollbarWidth: "none"
        }} className="no-scrollbar">
          {[
            { code: "ALL", label: "All" },
            { code: "EN", label: "English" },
            { code: "HI", label: "हिन्दी" },
            { code: "MR", label: "मराठी" },
            { code: "PA", label: "ਪੰਜਾਬੀ" },
            { code: "BN", label: "বাংলা" },
            { code: "GU", label: "ગુજરાતી" },
            { code: "TA", label: "தமிழ்" },
            { code: "TE", label: "తెలుగు" }
          ].map((l) => (
            <Link 
              key={l.code}
              href={getLangUrl(l.code)}
              style={{ 
                background: lang === l.code ? "#FF8C00" : "transparent",
                color: "white",
                border: "none",
                padding: "6px 14px",
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s",
                boxShadow: lang === l.code ? "0 2px 8px rgba(0,0,0,0.3)" : "none",
                textDecoration: "none"
              }}
              className="hover-scale"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }} className="hide-mobile notranslate">
          <div style={{ display: "flex", gap: 8 }}>
            {socialLinks.map((social) => (
              <a 
                key={social.name}
                href={social.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{ 
                  color: "white", 
                  width: 32, 
                  height: 32, 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.1)",
                  transition: "all 0.2s"
                }} 
                className="hover-scale"
                title={social.name}
              >
                {social.isImg ? (
                  <img src={social.icon as string} alt={social.name} style={{ width: 18, height: 18, objectFit: "contain" }} />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    {social.icon as React.ReactNode}
                  </svg>
                )}
              </a>
            ))}
            
            <ShareButton lang={lang} />
          </div>
        </div>
        
        <style dangerouslySetInnerHTML={{ __html: `
          .no-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .hover-scale:hover {
            transform: scale(1.1);
            opacity: 1 !important;
          }
          @media (max-width: 768px) {
            .hide-mobile {
              display: none !important;
            }
          }
        `}} />
      </div>
    </div>
  );
}



