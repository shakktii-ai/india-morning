import { db } from "@/src/lib/firebase-admin";
import { getBaseUrl } from "@/src/utils/url";

export async function GET() {
  const baseUrl = getBaseUrl();

  try {
    // 1. Fetch Categories
    const categoriesSnap = await db.collection("categories").get();
    const categoryUrls = categoriesSnap.docs.map((doc) => {
      const data = doc.data();
      return `
  <url>
    <loc>${baseUrl}/category/${data.slug}</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;
    }).join("");

    // 2. Fetch Latest Articles (up to 2000)
    const articlesSnap = await db.collection("articles")
      .where("status", "==", "PUBLISHED")
      .orderBy("publishedAt", "desc")
      .limit(2000)
      .get();

    const articleUrls = articlesSnap.docs.map((doc) => {
      const data = doc.data();
      const lastMod = data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : 
                     data.publishedAt?.toDate ? data.publishedAt.toDate().toISOString() : 
                     new Date().toISOString();
      
      return `
  <url>
    <loc>${baseUrl}/article/${data.slug}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
    }).join("");

    // 3. Static Pages
    const staticUrls = `
  <url>
    <loc>${baseUrl}</loc>
    <changefreq>always</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/search</loc>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>`;

    const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls}
${categoryUrls}
${articleUrls}
</urlset>`.trim();

    return new Response(sitemapXml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "s-maxage=3600, stale-while-revalidate",
      },
    });
  } catch (error) {
    console.error("Sitemap Error:", error);
    return new Response("Failed to generate sitemap", { status: 500 });
  }
}
