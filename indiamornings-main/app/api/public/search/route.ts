import { db } from "@/src/lib/firebase-admin";
import { jsonOk } from "@/src/utils/http";

export const runtime = "nodejs";

export async function GET(req: Request) {
    const url = new URL(req.url);
    const q = url.searchParams.get("q") || "";
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "12");
    const skip = (page - 1) * limit;

    let query: any = db.collection("articles")
        .where("status", "==", "PUBLISHED");

    if (q) {
        query = query.where("searchKeywords", "array-contains", q.toLowerCase());
    }

    query = query.orderBy("publishedAt", "desc");

    const snapshot = await query.limit(limit).offset(skip).get();

    // Populate Categories/Authors
    const authorIds = new Set<string>();
    const categoryIds = new Set<string>();
    snapshot.docs.forEach((doc: any) => {
        const d = doc.data();
        if (d.authorId) authorIds.add(d.authorId);
        if (d.categoryId) categoryIds.add(d.categoryId);
    });

    const authorsPromise = authorIds.size > 0
        ? db.getAll(...Array.from(authorIds).map(id => db.collection("users").doc(id)))
        : Promise.resolve([]);
    const categoriesPromise = categoryIds.size > 0
        ? db.getAll(...Array.from(categoryIds).map(id => db.collection("categories").doc(id)))
        : Promise.resolve([]);

    const [authorSnaps, categorySnaps] = await Promise.all([authorsPromise, categoriesPromise]);

    const authorMap = new Map();
    authorSnaps.forEach((s: any) => { if (s.exists) authorMap.set(s.id, { name: s.data().name }); });
    const categoryMap = new Map();
    categorySnaps.forEach((s: any) => { if (s.exists) categoryMap.set(s.id, { id: s.id, ...s.data() }); });

    const articles = snapshot.docs.map((doc: any) => {
        const d = doc.data();
        return {
            id: doc.id,
            ...d,
            category: d.categoryId ? categoryMap.get(d.categoryId) || null : null,
            author: d.authorId ? authorMap.get(d.authorId) || null : null
        };
    });

    return jsonOk({ articles });
}
