import { Metadata } from "next";
import ArticleClientPage from "./ArticleClientPage";
import { db } from "@/src/lib/firebase-admin";
import { unstable_cache } from "next/cache";
import { getAbsoluteUrl, getImageUrl } from "@/src/utils/url";
import { Suspense } from "react";
import { getAllCategories } from "@/src/lib/data-public";

const getArticle = unstable_cache(
  async (slug: string, minimal: boolean = false) => {
    try {
      const decodedSlug = decodeURIComponent(slug);

      // 1. Fetch main article
      const snapshot = await db.collection("articles")
        .where("slug", "==", decodedSlug)
        .where("status", "==", "PUBLISHED")
        .limit(1)
        .get();

      if (snapshot.empty) return null;
      const doc = snapshot.docs[0];
      const d = doc.data();

      // 2. Fetch primary dependencies
      let author = null;
      let categoryName = "News";
      const tags: any[] = [];

      const tagIds = (d.tagIds || (d.tagId ? [d.tagId] : [])).slice(0, 5);

      const tasks = [];
      if (d.authorId) tasks.push(db.collection("users").doc(d.authorId).get());
      if (d.categoryId) tasks.push(db.collection("categories").doc(d.categoryId).get());
      if (!minimal && tagIds.length > 0) {
        tagIds.forEach((tid: string) => tasks.push(db.collection("tags").doc(tid).get()));
      }

      const snaps = await Promise.all(tasks);
      let offset = 0;

      if (d.authorId) {
        const s = snaps[offset++];
        if (s.exists) author = { name: s.data()?.name };
      }
      if (d.categoryId) {
        const s = snaps[offset++];
        if (s.exists) categoryName = s.data()?.name || "News";
      }

      if (!minimal) {
        tagIds.forEach(() => {
          const s = snaps[offset++];
          if (s.exists) {
            tags.push({ tag: { id: s.id, ...s.data() } });
          }
        });
      }

      // 3. Skip heavy recommendations for metadata
      let recommendations: any[] = [];
      if (!minimal && d.categoryId) {
        const recommendationsSnap = await db.collection("articles")
          .where("status", "==", "PUBLISHED")
          .where("categoryIds", "array-contains", d.categoryId)
          .limit(4)
          .get();

        recommendations = recommendationsSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(a => a.id !== doc.id)
          .slice(0, 3);
      }

      const data = d;
      const publishedAt = data.publishedAt?.toDate ? data.publishedAt.toDate().toISOString() : data.publishedAt;
      const modifiedAt = data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt || publishedAt;

      return {
        id: doc.id,
        ...data,
        publishedAt,
        modifiedAt,
        author,
        categoryName,
        tags,
        recommendations
      } as any;
    } catch (e) {
      console.error("Error fetching article in Page:", e);
      return null;
    }
  },
  ['article-data'],
  { revalidate: 60, tags: ['articles'] }
);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug, true); // <--- Minimal fetch for speed

  if (!article) {
    return {
      title: "Article Not Found | India Morning",
      description: "The story you are looking for might have been moved or deleted.",
    };
  }

  const title = `${article.title} - India Morning`;
  const description = article.excerpt || article.metaDescription || `Latest news about ${article.categoryName || 'India'} on India Morning.`;
  const url = getAbsoluteUrl(`/article/${slug}`);
  const canonicalUrl = article.canonicalUrl || url;
  const image = getImageUrl(article.coverImageUrl, true);

  // Helper to detect image type more robustly (handles Firebase query params)
  const getMimeType = (url: string) => {
    const cleanUrl = url.split("?")[0].toLowerCase();
    if (cleanUrl.endsWith(".webp")) return "image/webp";
    if (cleanUrl.endsWith(".png")) return "image/png";
    return "image/jpeg";
  };

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: "India Morning",
      images: [
        {
          url: image,
          secureUrl: image,
          width: 1200,
          height: 630,
          type: getMimeType(image),
          alt: article.title,
        },
      ],
      locale: article.language === "HI" ? "hi_IN" : article.language === "MR" ? "mr_IN" : "en_US",
      type: "article",
      publishedTime: article.publishedAt,
      modifiedTime: article.modifiedAt,
      authors: [article.author?.name || "India Morning Reporter"],
      section: article.categoryName || "News",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
      site: "@indiamorning",
    },
  };
}

export default async function Page({ 
  params,
  searchParams 
}: { 
  params: Promise<{ slug: string }>,
  searchParams: Promise<{ lang?: string; region?: string }>
}) {
  const { slug } = await params;
  const { lang = "ALL", region = "ALL" } = await searchParams;

  const [article, categories] = await Promise.all([
    getArticle(slug),
    getAllCategories()
  ]);

  if (!article) return <div>Article not found</div>;

  const tickerItems = article.recommendations?.slice(0, 8).map((a: any) => a.title) || [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": article.title,
    "image": [
      getImageUrl(article.coverImageUrl, true)
    ],
    "datePublished": article.publishedAt,
    "dateModified": article.modifiedAt,
    "author": [{
      "@type": "Person",
      "name": article.author?.name || "India Morning Reporter",
      "url": getAbsoluteUrl("/")
    }],
    "publisher": {
      "@type": "Organization",
      "name": "India Morning",
      "logo": {
        "@type": "ImageObject",
        "url": getAbsoluteUrl("/images/Indian-Morning-Logo.png")
      }
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Suspense fallback={null}>
        <ArticleClientPage 
          initialArticle={article} 
          categories={categories} 
          tickerItems={tickerItems}
          lang={lang}
          region={region}
        />
      </Suspense>
    </>
  );
}
