import Link from "next/link";
import { getTranslation } from "@/src/utils/i18n";
import Image from "next/image";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface RecentPost {
  id: string;
  title: string;
  slug: string;
  coverImageUrl?: string;
  publishedAt?: any;
}

interface SiteFooterProps {
  categories: Category[];
  recentPosts: RecentPost[];
  lang?: string;
  region?: string;
}

export default function SiteFooter({ 
  categories, 
  recentPosts, 
  lang = "ALL", 
  region = "ALL" 
}: SiteFooterProps) {
  
  const formatDate = (date: any) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString(lang === 'HI' ? 'hi-IN' : lang === 'PA' ? 'pa-IN' : lang === 'TA' ? 'ta-IN' : 'en-US', {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const getLinkUrl = (path: string) => {
    const params = new URLSearchParams();
    if (lang !== "ALL") params.set("lang", lang);
    if (region !== "ALL") params.set("region", region);
    const qs = params.toString();
    return qs ? `${path}?${qs}` : path;
  };

  return (
    <footer style={{ backgroundColor: "#000", color: "#fff", paddingTop: 60 }}>
      <div className="container">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: 40,
            marginBottom: 60
          }}
        >
          {/* Brand Section */}
          <div>
            <div style={{ marginBottom: 24 }} className="notranslate">
              <Image
                src="/images/Indian-Morning-Logo.png"
                alt="India Mornings"
                width={120}
                height={80}
                className="notranslate"
                style={{ objectFit: "contain" }}
              />
            </div>
            <p style={{ fontSize: 16, lineHeight: 1.6, color: "#ccc", marginBottom: 12 }}>
              {getTranslation('footer_desc', lang)}
            </p>
            <div style={{ marginBottom: 24 }}>
              <a
                href="mailto:indiamorning01@gmail.com"
                style={{ fontSize: 14, color: "var(--accent)", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}
              >
                <span>✉</span> indiamorning01@gmail.com
              </a>
              <div style={{ display: "flex", gap: 12, marginTop: 15 }}>
                {[
                  { name: "WhatsApp", icon: <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />, url: "https://chat.whatsapp.com/IXWpP80Tooo6C9gU8wLY3j?mode=gi_t" },
                  { name: "Facebook", icon: <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />, url: "https://www.facebook.com/share/1BGaEgtQJM/" },
                  { name: "Instagram", icon: <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.668.014-4.948.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />, url: "https://www.instagram.com/_imorningnews?igsh=eTl5NDJhYW9ub2Jm" },
                  { name: "YouTube", icon: <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />, url: "https://youtube.com/@indiamoringnews?si=1UfyYnomS6gY4UpA" },
                  {
                    name: "Threads",
                    icon: "/images/threads-white-icon.svg",
                    isImg: true,
                    url: "https://www.threads.net/@_imorningnews"
                  }].map((social) => (
                    <a
                      key={social.name}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        width: 36, height: 36, borderRadius: "50%",
                        backgroundColor: "#333", display: "grid", placeItems: "center",
                        cursor: "pointer", transition: "0.2s", color: "white"
                      }}
                      className="footer-social-link"
                    >
                      {(social as any).isImg ? (
                        <img src={social.icon as string} alt={social.name} style={{ width: 18, height: 18, objectFit: "contain" }} />
                      ) : (
                        <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 18, height: 18 }}>
                          {social.icon}
                        </svg>
                      )}
                    </a>
                  ))}
              </div>
            </div>
          </div>

          {/* Categories Section */}
          <div>
            <h3 style={{ color: "#fff", borderBottom: "2px solid #555", paddingBottom: 10, marginBottom: 20, fontSize: 18, textTransform: "uppercase" }}>
              {getTranslation('footer_categories', lang)}
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 20px" }}>
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={getLinkUrl(`/category/${cat.slug}`)}
                  style={{
                    fontSize: 14, color: "#ccc", display: "flex", alignItems: "center", gap: 8,
                    transition: "0.2s"
                  }}
                  className="footer-link"
                >
                  <span style={{ color: "var(--accent)", fontSize: 10 }}>▶</span> {(() => {
                    const translated = getTranslation(`nav_${cat.slug}`, lang);
                    if (translated.startsWith("nav_")) {
                      return cat.name || translated.replace("nav_", "");
                    }
                    return translated;
                  })()}
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Posts Section */}
          <div>
            <h3 style={{ color: "#fff", borderBottom: "2px solid #555", paddingBottom: 10, marginBottom: 20, fontSize: 18, textTransform: "uppercase" }}>
              {getTranslation('footer_recent', lang)}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {recentPosts.map((post) => (
                <Link
                  key={post.id}
                  href={getLinkUrl(`/article/${post.slug}`)}
                  prefetch={false}
                  style={{ display: "flex", gap: 12, alignItems: "start" }}
                >
                  <div
                    style={{
                      width: 60, height: 60, borderRadius: 4, flexShrink: 0,
                      position: "relative", overflow: "hidden", background: "#333"
                    }}
                  >
                    <Image 
                      src={post.coverImageUrl || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&q=80&w=200'}
                      alt={post.title}
                      fill
                      sizes="60px"
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                  <div>
                    <h4 style={{
                      fontSize: 14, color: "#fff", margin: 0, lineHeight: 1.4,
                      display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden"
                    }}>
                      {post.title}
                    </h4>
                    <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
                      <span style={{ marginRight: 6 }}>📅</span> {formatDate(post.publishedAt)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Copyright Bar */}
      <div style={{ borderTop: "1px solid #333", padding: "24px 0", textAlign: "center", fontSize: 13, color: "#888" }}>
        <div className="container" style={{ fontWeight: 500 }}>
          {getTranslation('footer_copyright_prefix', lang)} © {new Date().getFullYear()} India Morning. {getTranslation('footer_copyright', lang)}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .footer-social-link:hover {
          background-color: var(--accent) !important;
        }
        .footer-link:hover {
          color: #fff !important;
        }
      `}} />
    </footer>
  );
}