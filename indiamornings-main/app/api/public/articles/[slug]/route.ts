import { db } from "@/src/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { jsonError, jsonOk } from "@/src/utils/http";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Decode the slug to handle non-English characters (e.g., Devanagari)
  const decodedSlug = decodeURIComponent(slug);

  // 1. Initial article fetch (needed to get category/author IDs)
  // Optimization: Added status: "PUBLISHED" to the query
  const snapshot = await db.collection("articles")
    .where("slug", "==", decodedSlug)
    .where("status", "==", "PUBLISHED")
    .limit(1)
    .get();

  if (snapshot.empty) return jsonError("Not found", 404);
  const doc = snapshot.docs[0];
  const d = doc.data();



  // 2. Fetch all related data in PARALLEL
  const categoryIds = d.categoryIds || (d.categoryId ? [d.categoryId] : []);
  const tagIds = (d.tagIds || (d.tagId ? [d.tagId] : [])).slice(0, 5); // Limit to 5 for speed

  const [relatedSnaps, recommendationsSnap] = await Promise.all([
    // Group all document lookups in a single getAll call
    db.getAll(
      ...(categoryIds.map((id: string) => db.collection("categories").doc(id))),
      ...(d.authorId ? [db.collection("users").doc(d.authorId)] : []),
      ...(tagIds.map((id: string) => db.collection("tags").doc(id)))
    ),
    // Fetch 4 articles from the same category for recommendations
    d.categoryId ? db.collection("articles")
      .where("status", "==", "PUBLISHED")
      .where("categoryIds", "array-contains", d.categoryId)
      .limit(4)
      .get() : Promise.resolve(null)
  ]);

  // 3. Process results
  const categories: any[] = [];
  let author: any = null;
  const tags: any[] = [];

  // Sort back the grouped results from getAll
  let offset = 0;
  categoryIds.forEach(() => {
    const s = relatedSnaps[offset++];
    if (s?.exists) categories.push({ id: s.id, ...s.data() });
  });
  if (d.authorId) {
    const s = relatedSnaps[offset++];
    if (s?.exists) author = { name: s.data()?.name };
  }
  tagIds.forEach(() => {
    const s = relatedSnaps[offset++];
    if (s?.exists) tags.push({ tag: { id: s.id, ...s.data() } });
  });

  const recommendations = recommendationsSnap?.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(a => a.id !== doc.id)
    .slice(0, 3) || [];

  const currentViewCount = d.viewCount || 0;

  const article = {
    id: doc.id,
    ...d,
    viewCount: currentViewCount,
    categories,
    category: categories[0] || null,
    author,
    tags,
    recommendations // Bundled!
  };

  return jsonOk({ article });
}
