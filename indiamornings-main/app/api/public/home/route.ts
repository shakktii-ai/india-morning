import { db } from "@/src/lib/firebase-admin";
import { jsonOk } from "@/src/utils/http";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const region = url.searchParams.get("region") || "ALL";
  const language = url.searchParams.get("lang") || "ALL";
  const categorySlug = url.searchParams.get("category") || null;
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "12");
  const skip = (page - 1) * limit;

  let category = null;
  if (categorySlug) {
    const cSnap = await db.collection("categories").where("slug", "==", categorySlug).limit(1).get();
    if (!cSnap.empty) {
      category = { id: cSnap.docs[0].id, ...cSnap.docs[0].data() };
    } else {
      // Category not found, perform fallback query for suggestions
      const fallbackSnapshot = await db.collection("articles")
        .where("status", "==", "PUBLISHED")
        .orderBy("publishedAt", "desc")
        .limit(8)
        .get();

      const suggestions = await populateArticles(fallbackSnapshot.docs);

      return jsonOk({ topStories: [], recent: [], category: null, suggestions });
    }
  }

  // Build query
  let query: any = db.collection("articles")
    .where("status", "==", "PUBLISHED");

  if (region !== "ALL") {
    query = query.where("region", "==", region);
  }
  if (language !== "ALL") {
    query = query.where("language", "==", language);
  }

  if (category) {
    query = query.where("categoryIds", "array-contains", category.id);
  }

  query = query.orderBy("publishedAt", "desc");

  const snapshot = await query.limit(limit).offset(skip).get();

  if (snapshot.empty) {
    const fallbackSnapshot = await db.collection("articles")
      .where("status", "==", "PUBLISHED")
      .orderBy("publishedAt", "desc")
      .limit(8)
      .get();

    const suggestions = await populateArticles(fallbackSnapshot.docs);
    const recent = suggestions.slice(0, 6).map((a: any) => ({ title: a.title, slug: a.slug, publishedAt: a.publishedAt }));

    return jsonOk({ topStories: [], recent, category, suggestions });
  }

  const topStories = await populateArticles(snapshot.docs);
  const recent = topStories.slice(0, 6).map((a: any) => ({ title: a.title, slug: a.slug, publishedAt: a.publishedAt }));
  return jsonOk({ topStories, recent, category });
}

async function populateArticles(docs: any[]) {
  if (docs.length === 0) return [];

  const authorIds = new Set<string>();
  const categoryIdsSet = new Set<string>();

  docs.forEach((doc: any) => {
    const d = doc.data();
    if (d.authorId) authorIds.add(d.authorId);

    // Handle both array and legacy scalar
    const cids = d.categoryIds || (d.categoryId ? [d.categoryId] : []);
    cids.forEach((id: string) => categoryIdsSet.add(id));
  });

  const authorsPromise = authorIds.size > 0
    ? db.getAll(...Array.from(authorIds).map(id => db.collection("users").doc(id)))
    : Promise.resolve([]);

  const categoriesPromise = categoryIdsSet.size > 0
    ? db.getAll(...Array.from(categoryIdsSet).map(id => db.collection("categories").doc(id)))
    : Promise.resolve([]);

  const [authorSnaps, categorySnaps] = await Promise.all([authorsPromise, categoriesPromise]);

  const authorMap = new Map();
  authorSnaps.forEach((s: any) => { if (s.exists) authorMap.set(s.id, { name: s.data().name }); });

  const categoryMap = new Map();
  categorySnaps.forEach((s: any) => { if (s.exists) categoryMap.set(s.id, { id: s.id, ...s.data() }); });

  return docs.map((doc: any) => {
    const d = doc.data();
    const articleCids = d.categoryIds || (d.categoryId ? [d.categoryId] : []);
    const cats = articleCids.map((cid: string) => categoryMap.get(cid)).filter(Boolean);

    return {
      id: doc.id,
      ...d,
      categories: cats,
      category: cats[0] || null, // Primary category for the card
      author: d.authorId ? authorMap.get(d.authorId) || null : null
    };
  });
}
