"use client";

import Link from "next/link";

const tabs = [
  { slug: "", label: "Top Stories" },
  { slug: "entertainment", label: "Entertainment" },
  { slug: "politics", label: "Politics" },
  { slug: "sports", label: "Sports" },
  { slug: "business", label: "Business" },
  { slug: "technology", label: "Technology" },
  { slug: "health", label: "Health" },
  { slug: "world", label: "World" },
  { slug: "lifestyle", label: "Lifestyle" },
  { slug: "education", label: "Education" }
];

export default function CategoryTabs({ active }: { active?: string }) {
  return (
    <div className="container" style={{ paddingTop: 14, paddingBottom: 14 }}>
      <div className="scroll-x" style={{ gap: 10 }}>
        {tabs.map(t => {
          const on = (active || "") === t.slug;
          return (
            <Link
              key={t.slug || "home"}
              href={t.slug ? `/category/${t.slug}` : "/"}
              className="btn"
              style={{
                background: on ? "var(--accent)" : "var(--muted)",
                color: on ? "white" : "black",
                fontWeight: 700,
                whiteSpace: "nowrap",
                padding: "8px 16px"
              }}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>

  );
}
