"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

export default function SiteFooter() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);

  useEffect(() => {
    fetch("/api/public/footer")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setCategories(d.categories || []);
          setRecentPosts(d.recentPosts || []);
        }
      })
      .catch(() => {});
  }, []);

  const formatDate = (date: any) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
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
            <div style={{ marginBottom: 24 }}>
              <img 
                src="/images/Indian-Morning-Logo.png" 
                alt="India Mornings" 
                style={{ height: 80, width: "auto", objectFit: "contain" }} 
              />
            </div>
            <p style={{ fontSize: 16, lineHeight: 1.6, color: "#ccc", marginBottom: 12 }}>
              India Morning News Let's begin the day, the informed way!
            </p>
            <div style={{ marginBottom: 24 }}>
              <a 
                href="mailto:indiamorning01@gmail.com" 
                style={{ fontSize: 14, color: "var(--accent)", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}
              >
                <span>✉</span> indiamorning01@gmail.com
              </a>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              {["facebook", "twitter", "instagram", "youtube"].map((social) => (
                <div 
                  key={social}
                  style={{ 
                    width: 36, height: 36, borderRadius: "50%", 
                    backgroundColor: "#333", display: "grid", placeItems: "center",
                    cursor: "pointer", transition: "0.2s"
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "var(--accent)")}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#333")}
                >
                  <i className={`fab fa-${social}`} style={{ fontSize: 14 }}></i>
                </div>
              ))}
            </div>
          </div>

          {/* Categories Section */}
          <div>
            <h3 style={{ color: "#fff", borderBottom: "2px solid #555", paddingBottom: 10, marginBottom: 20, fontSize: 18, textTransform: "uppercase" }}>Categories</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 20px" }}>
              {categories.map((cat) => (
                <Link 
                  key={cat.id} 
                  href={`/category/${cat.slug}`}
                  style={{ 
                    fontSize: 14, color: "#ccc", display: "flex", alignItems: "center", gap: 8,
                    transition: "0.2s"
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.color = "#fff")}
                  onMouseOut={(e) => (e.currentTarget.style.color = "#ccc")}
                >
                  <span style={{ color: "var(--accent)", fontSize: 10 }}>▶</span> {cat.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Posts Section */}
          <div>
            <h3 style={{ color: "#fff", borderBottom: "2px solid #555", paddingBottom: 10, marginBottom: 20, fontSize: 18, textTransform: "uppercase" }}>Recent Posts</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {recentPosts.map((post) => (
                <Link 
                  key={post.id} 
                  href={`/article/${post.slug}`}
                  style={{ display: "flex", gap: 12, alignItems: "start" }}
                >
                  <div 
                    style={{ 
                      width: 60, height: 60, borderRadius: 4, flexShrink: 0,
                      backgroundImage: `url(${post.coverImageUrl || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&q=80&w=200'})`,
                      backgroundSize: "cover", backgroundPosition: "center"
                    }}
                  />
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
        <div className="container">
          Copyright © {new Date().getFullYear()} India Morning News. All Rights Reserved.
        </div>
      </div>
    </footer>
  );
}
