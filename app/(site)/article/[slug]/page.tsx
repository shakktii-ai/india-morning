import { Metadata } from "next";
import ArticleClientPage from "./ArticleClientPage";
import { db } from "@/src/lib/firebase-admin";
import { cache, Suspense } from "react";
import { getAbsoluteUrl, getImageUrl } from "@/src/utils/url";
import { getAllCategories } from "@/src/lib/data-public";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Converts any Firestore Timestamp or Date object recursively into clean ISO strings
 */
function serializeValue(val: any): any {
  if (val === null || val === undefined) return val;
  if (typeof val.toDate === "function") {
    return val.toDate().toISOString();
  }
  if (val._seconds !== undefined && val._nanoseconds !== undefined) {
    return new Date(val._seconds * 1000).toISOString();
  }
  if (val instanceof Date) {
    return val.toISOString();
  }
  if (Array.isArray(val)) {
    return val.map(serializeValue);
  }
  if (typeof val === "object" && val.constructor === Object) {
    const res: Record<string, any> = {};
    for (const key of Object.keys(val)) {
      res[key] = serializeValue(val[key]);
    }
    return res;
  }
  return val;
}

/**
 * Request-memoized article loader using React cache().
 * Guarantees that generateMetadata and Page share the exact same single database call.
 */
const getArticle = cache(async (slug: string) => {
  try {
    const decodedSlug = decodeURIComponent(slug).trim();

    // 1. Fetch main article by slug
    let snapshot = await db
      .collection("articles")
      .where("slug", "==", decodedSlug)
      .limit(1)
      .get();

    if (snapshot.empty && decodedSlug !== slug) {
      snapshot = await db
        .collection("articles")
        .where("slug", "==", slug)
        .limit(1)
        .get();
    }

    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    const rawData = doc.data();

    // Must be published
    if (rawData.status !== "PUBLISHED") {
      return null;
    }

    // 2. Fetch categories & author in parallel
    const allCategoriesPromise = getAllCategories();
    const authorPromise = rawData.authorId
      ? db.collection("users").doc(rawData.authorId).get()
      : Promise.resolve(null);

    // 3. Fast recommendations using single index on status
    const recsPromise = db
      .collection("articles")
      .where("status", "==", "PUBLISHED")
      .limit(6)
      .get();

    const [allCats, authorSnap, recsSnap] = await Promise.all([
      allCategoriesPromise,
      authorPromise,
      recsPromise,
    ]);

    // Resolve category name from memory
    const catMap = new Map(allCats.map((c) => [c.id, c.name]));
    let categoryName = "News";
    if (rawData.categoryId && catMap.has(rawData.categoryId)) {
      categoryName = catMap.get(rawData.categoryId)!;
    } else if (Array.isArray(rawData.categoryIds) && rawData.categoryIds.length > 0) {
      for (const cid of rawData.categoryIds) {
        if (catMap.has(cid)) {
          categoryName = catMap.get(cid)!;
          break;
        }
      }
    }

    let author: { name: string } | null = null;
    if (authorSnap && authorSnap.exists) {
      author = { name: authorSnap.data()?.name || "India Morning Reporter" };
    } else {
      author = { name: "India Morning News Desk" };
    }

    // Process recommendations
    const recommendations = (recsSnap?.docs || [])
      .map((d) => ({ id: d.id, ...serializeValue(d.data()) }))
      .filter((a: any) => a.id !== doc.id && a.slug !== decodedSlug)
      .slice(0, 4);

    const publishedAt = serializeValue(rawData.publishedAt) || new Date().toISOString();
    const modifiedAt = serializeValue(rawData.updatedAt) || publishedAt;

    const articleData = {
      id: doc.id,
      ...serializeValue(rawData),
      publishedAt,
      modifiedAt,
      author,
      categoryName,
      recommendations,
      tags: [],
    };

    // Return pure plain JSON to guarantee Next.js RSC serialization never fails
    return JSON.parse(JSON.stringify(articleData));
  } catch (err) {
    console.error(`[Article Page] Error loading article "${slug}":`, err);
    return null;
  }
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) {
    return {
      title: "Article Not Found | India Morning",
      description: "The story you are looking for might have been moved or updated.",
    };
  }

  const title = `${article.title} - India Morning`;
  const description =
    article.excerpt ||
    article.metaDescription ||
    `Latest news report from India Morning News Desk.`;
  const url = getAbsoluteUrl(`/article/${slug}`);
  const canonicalUrl = article.canonicalUrl || url;
  const image = getImageUrl(article.coverImageUrl, true);

  const getMimeType = (imgUrl: string) => {
    const cleanUrl = imgUrl.split("?")[0].toLowerCase();
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
      locale: article.language === "MR" ? "mr_IN" : article.language === "HI" ? "hi_IN" : "en_US",
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
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string; region?: string }>;
}) {
  const { slug } = await params;
  const { lang = "ALL", region = "ALL" } = await searchParams;

  const [article, categories] = await Promise.all([
    getArticle(slug),
    getAllCategories(),
  ]);

  if (!article) {
    notFound();
  }

  const tickerItems =
    article.recommendations?.slice(0, 8).map((a: any) => a.title) || [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    image: [getImageUrl(article.coverImageUrl, true)],
    datePublished: article.publishedAt,
    dateModified: article.modifiedAt,
    author: [
      {
        "@type": "Person",
        name: article.author?.name || "India Morning Reporter",
        url: getAbsoluteUrl("/"),
      },
    ],
    publisher: {
      "@type": "Organization",
      name: "India Morning",
      logo: {
        "@type": "ImageObject",
        url: getAbsoluteUrl("/images/Indian-Morning-Logo.png"),
      },
    },
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
