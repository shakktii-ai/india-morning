import { db } from "@/src/lib/firebase-admin";

export async function getHomeData({
  region = "ALL",
  lang = "ALL",
  categorySlug = null,
  page = 1,
  limit = 12
}: {
  region?: string;
  lang?: string;
  categorySlug?: string | null;
  page?: number;
  limit?: number;
}) {
  const skip = (page - 1) * limit;

  // Region Fallback Mapping
  const REGION_PARENTS: Record<string, string> = {
    "MUMBAI": "MAHARASHTRA",
    "PUNE": "MAHARASHTRA",
    "NAGPUR": "MAHARASHTRA",
    "NASHIK": "MAHARASHTRA",
    "AHMEDABAD": "GUJARAT",
  };

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

      return { topStories: [], recent: [], category: null, suggestions };
    }
  }

  // Build query
  const REQUIRED_FIELDS = ["title", "slug", "coverImageUrl", "excerpt", "publishedAt", "categoryIds", "authorId", "language", "region", "status"];
  
  let query: any = db.collection("articles")
    .where("status", "==", "PUBLISHED");

  if (region !== "ALL") {
    query = query.where("region", "==", region);
  }
  // If language is ALL or EN, we don't filter (EN uses Google Translate on all content)
  if (lang !== "ALL" && lang !== "EN") {
    query = query.where("language", "==", lang);
  }

  if (category) {
    query = query.where("categoryIds", "array-contains", category.id);
  }

  query = query.orderBy("publishedAt", "desc").select(...REQUIRED_FIELDS);
  const snapshot = await query.limit(limit).offset(skip).get();

  if (snapshot.empty) {
    // REGIONAL FALLBACK: If a city was selected and returned no results, try its parent state
    let fallbackQuery = db.collection("articles")
      .where("status", "==", "PUBLISHED")
      .select(...REQUIRED_FIELDS);

    // Try keyword match for the region name in searchKeywords
    let kwFbSnapshot = await fallbackQuery
      .where("searchKeywords", "array-contains", region.toLowerCase())
      .orderBy("publishedAt", "desc")
      .limit(limit).offset(skip)
      .get();

    if (kwFbSnapshot.empty) {
      // Parent state fallback
      const parentRegion = REGION_PARENTS[region];
      if (parentRegion) {
        let pQuery = db.collection("articles")
          .where("status", "==", "PUBLISHED")
          .where("region", "==", parentRegion)
          .select(...REQUIRED_FIELDS);

        if (lang !== "ALL" && lang !== "EN") {
          pQuery = pQuery.where("language", "==", lang);
        }

        kwFbSnapshot = await pQuery.orderBy("publishedAt", "desc").limit(limit).offset(skip).get();
      }
    }

    if (!kwFbSnapshot.empty) {
      const topStories = await populateArticles(kwFbSnapshot.docs);
      const recent = topStories.slice(0, 6).map((a: any) => ({ id: a.id, title: a.title, slug: a.slug, publishedAt: a.publishedAt, coverImageUrl: a.coverImageUrl }));
      return { topStories, recent, category };
    }

    // FINAL FALLBACK: Global recent news if still empty
    const globalFallbackSnapshot = await db.collection("articles")
      .where("status", "==", "PUBLISHED")
      .select(...REQUIRED_FIELDS)
      .orderBy("publishedAt", "desc")
      .limit(8)
      .get();

    const suggestions = await populateArticles(globalFallbackSnapshot.docs);
    const recent = suggestions.slice(0, 6).map((a: any) => ({ id: a.id, title: a.title, slug: a.slug, publishedAt: a.publishedAt, coverImageUrl: a.coverImageUrl }));

    return { topStories: [], recent, category, suggestions };
  }

  const topStories = await populateArticles(snapshot.docs);
  const recent = topStories.slice(0, 6).map((a: any) => ({ id: a.id, title: a.title, slug: a.slug, publishedAt: a.publishedAt, coverImageUrl: a.coverImageUrl }));
  return { topStories, recent, category };
}

export async function getSearchData({
  q = "",
  page = 1,
  limit = 12
}: {
  q?: string;
  page?: number;
  limit?: number;
}) {
  const skip = (page - 1) * limit;

  let query: any = db.collection("articles")
      .where("status", "==", "PUBLISHED");

  if (q) {
      query = query.where("searchKeywords", "array-contains", q.toLowerCase());
  }

  query = query.orderBy("publishedAt", "desc").select("title", "slug", "coverImageUrl", "excerpt", "publishedAt", "categoryId", "authorId", "status", "region", "language");
  const snapshot = await query.limit(limit).offset(skip).get();

  const articles = await populateArticles(snapshot.docs);

  return { articles };
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
      category: cats[0] || (d.categoryId ? categoryMap.get(d.categoryId) : null), // Fallback to d.categoryId if it exists
      author: d.authorId ? authorMap.get(d.authorId) || null : null
    };
  });
}
export async function getAllCategories() {
  const snapshot = await db.collection("categories").orderBy("name", "asc").get();
  return snapshot.docs.map(doc => ({
    id: doc.id,
    name: doc.data().name,
    slug: doc.data().slug
  }));
}
