import { db } from "@/src/lib/firebase-admin";
import { getBaseUrl } from "@/src/utils/url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function escapeXml(unsafe: string) {
  return (unsafe || '').replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function formatDate(date: any) {
  try {
    if (!date) return new Date().toUTCString();

    // Handle Firestore Timestamp (instance)
    if (typeof date.toDate === 'function') {
      return date.toDate().toUTCString();
    }

    // Handle serialized Firestore Timestamp object {seconds, nanoseconds}
    if (date && typeof date === 'object' && 'seconds' in date) {
      return new Date(date.seconds * 1000).toUTCString();
    }

    const d = new Date(date);
    if (isNaN(d.getTime())) {
      return new Date().toUTCString();
    }
    return d.toUTCString();
  } catch (e) {
    return new Date().toUTCString();
  }
}

export async function GET() {
  const baseUrl = getBaseUrl();
  
  try {
    // Fetch latest 20 published articles
    // Note: status is strictly used if you have internal draft/publish logic. 
    // Based on app/api/articles/route.ts, articles have a 'status' field.
    // We assume 'PUBLISHED' is the active status. If not, we'll fetch all and filter or just take latest.
    const snapshot = await db.collection("articles")
      .where("status", "==", "PUBLISHED")
      .orderBy("publishedAt", "desc")
      .limit(20)
      .get();

    // Fallback: Use createdAt if publishedAt query fails or yields no results
    let docs = snapshot.docs;
    if (docs.length === 0) {
      const fallbackSnapshot = await db.collection("articles")
        .where("status", "==", "PUBLISHED")
        .orderBy("createdAt", "desc")
        .limit(20)
        .get();
      docs = fallbackSnapshot.docs;
    }

    // Secondary Fallback: If still no published articles, fetch latest regardless of status
    if (docs.length === 0) {
      const globalSnapshot = await db.collection("articles")
        .orderBy("createdAt", "desc")
        .limit(20)
        .get();
      docs = globalSnapshot.docs;
    }

    // Pre-fetch related data (authors and categories) to avoid N+1 issues
    const authorIds = new Set<string>();
    const categoryIds = new Set<string>();
    
    docs.forEach(doc => {
      const d = doc.data();
      if (d.authorId) authorIds.add(d.authorId);
      
      // Handle both new array format and legacy scalar format
      if (Array.isArray(d.categoryIds) && d.categoryIds[0]) {
        categoryIds.add(d.categoryIds[0]);
      } else if (d.categoryId) {
        categoryIds.add(d.categoryId);
      }
    });

    const authorsPromise = authorIds.size > 0
      ? db.getAll(...Array.from(authorIds).map(id => db.collection("users").doc(id)))
      : Promise.resolve([]);

    const categoriesPromise = categoryIds.size > 0
      ? db.getAll(...Array.from(categoryIds).map(id => db.collection("categories").doc(id)))
      : Promise.resolve([]);

    const [authorSnaps, categorySnaps] = await Promise.all([authorsPromise, categoriesPromise]);

    const authorMap = new Map();
    authorSnaps.forEach((s: any) => { if (s.exists) authorMap.set(s.id, s.data().name); });

    const categoryMap = new Map();
    categorySnaps.forEach((s: any) => { if (s.exists) categoryMap.set(s.id, s.data().name); });

    const xmlItems = docs.map(doc => {
      const data = doc.data();
      const articleUrl = `${baseUrl}/article/${data.slug}`;
      const author = data.authorId ? authorMap.get(data.authorId) || "India Morning" : "India Morning";
      
      const catId = Array.isArray(data.categoryIds) ? data.categoryIds[0] : (data.categoryId || null);
      const category = catId ? categoryMap.get(catId) || "" : "";
      
      const imageTag = data.coverImageUrl 
        ? `<enclosure url="${escapeXml(data.coverImageUrl)}" length="0" type="image/jpeg" />`
        : "";

      return `
    <item>
      <title>${escapeXml(data.title)}</title>
      <link>${escapeXml(articleUrl)}</link>
      <guid isPermaLink="false">${escapeXml(doc.id)}</guid>
      <pubDate>${formatDate(data.publishedAt || data.createdAt)}</pubDate>
      <author>${escapeXml(author)}</author>
      <category>${escapeXml(category)}</category>
      <description><![CDATA[${data.excerpt || data.title}]]></description>
      ${imageTag}
    </item>`;
    }).join("");

    const rssXml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">
<channel>
  <title>India Morning</title>
  <link>${escapeXml(baseUrl)}</link>
  <description>Your Trusted Source for Global and National news</description>
  <language>en</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  ${xmlItems}
</channel>
</rss>`.trim();

    return new Response(rssXml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "s-maxage=3600, stale-while-revalidate",
      },
    });
  } catch (error) {
    console.error("Site RSS Feed Error:", error);
    return new Response("Failed to generate RSS feed", { status: 500 });
  }
}
