import { Metadata } from "next";
import ArticleClientPage from "./ArticleClientPage";
import { db } from "@/src/lib/firebase-admin";

import { unstable_cache } from "next/cache";

const getArticle = unstable_cache(
  async (slug: string) => {
    try {
      // Decode the slug to handle non-English characters (e.g., Devanagari)
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

      // 2. Fetch primary category, author, and tags
      let author = null;
      let categoryName = "News";
      const tags: any[] = [];
      
      const tagIds = (d.tagIds || (d.tagId ? [d.tagId] : [])).slice(0, 5);

      const tasks = [];
      if (d.authorId) tasks.push(db.collection("users").doc(d.authorId).get());
      if (d.categoryId) tasks.push(db.collection("categories").doc(d.categoryId).get());
      if (tagIds.length > 0) {
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
      // Process Tags
      tagIds.forEach(() => {
        const s = snaps[offset++];
        if (s.exists) {
            tags.push({ tag: { id: s.id, ...s.data() } });
        }
      });

      // 3. Simple recommendations for the client page
      const recommendationsSnap = d.categoryId ? await db.collection("articles")
        .where("status", "==", "PUBLISHED")
        .where("categoryIds", "array-contains", d.categoryId)
        .limit(4)
        .get() : null;

      const recommendations = recommendationsSnap?.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(a => a.id !== doc.id)
        .slice(0, 3) || [];

      return {
        id: doc.id,
        ...d,
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
  const article = await getArticle(slug);

  if (!article) {
    return {
      title: "Article Not Found | India Morning",
      description: "The story you are looking for might have been moved or deleted.",
    };
  }

  const title = `${article.title} - India Morning`;
  const description = article.excerpt || article.metaDescription || `Latest news about ${article.categoryName || 'India'} on India Morning.`;
  const base = (process.env.NEXT_PUBLIC_BASE_URL || "https://www.indiamorning.in").replace(/\/+$/, "");
  const url = `${base}/article/${slug}`;
  
  // Use custom canonical URL if provided, otherwise use the article URL
  const canonicalUrl = article.canonicalUrl || url;
  
  let image = article.coverImageUrl || `${base}/images/Indian-Morning-Logo.png`;
  if (image.startsWith("/")) image = `${base}${image}`;

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
          type: image.endsWith(".webp") ? "image/webp" : "image/jpeg",
          alt: article.title,
        },
      ],
      type: "article",
      publishedTime: article.publishedAt,
      authors: [article.author?.name || "India Morning Reporter"],
      section: article.categoryName || "News",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
      site: "@indiamorning", // Optional: replace with actual twitter handle if known
    },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticle(slug);

  return <ArticleClientPage initialArticle={article} />;
}
