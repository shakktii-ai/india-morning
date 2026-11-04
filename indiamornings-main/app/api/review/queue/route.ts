import { db } from "@/src/lib/firebase-admin";
import * as FirebaseFirestore from "firebase-admin/firestore";
import { jsonError, jsonOk } from "@/src/utils/http";
import { requireUser } from "@/src/auth/requireUser";
import { requireRole } from "@/src/auth/rbac";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const actor = await requireUser();
    requireRole(actor.role, ["SUPER_ADMIN", "ADMIN"]);

    const url = new URL(req.url);
    const search = url.searchParams.get("search") || undefined;
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Firestore Query
    let query: FirebaseFirestore.Query = db.collection("articles");

    // In Prisma we filtered by status IN [...]. Firestore "in" query works (up to 10).
    query = query.where("status", "in", ["IN_REVIEW", "APPROVED", "PUBLISHED", "REJECTED"]);

    // Search? (Ignored as usual for Firestore MVP)

    // Order By
    // Firestore requires index for "status" + "updatedAt".
    // We switch to "updatedAt" because it exists on all articles (even imported ones).
    query = query.orderBy("updatedAt", "desc");

    const snapshot = await query.limit(limit).offset(skip).get();

    // Total count (Approx or exact)
    const countSnapshot = await db.collection("articles").where("status", "in", ["IN_REVIEW", "APPROVED", "PUBLISHED", "REJECTED"]).count().get();
    const total = countSnapshot.data().count;

    const authorIdsSet = new Set<string>();
    const categoryIdsSet = new Set<string>();
    const tagIdsSet = new Set<string>();

    snapshot.docs.forEach(doc => {
      const d = doc.data();
      if (d.authorId) authorIdsSet.add(d.authorId);

      const cids = d.categoryIds || (d.categoryId ? [d.categoryId] : []);
      cids.forEach((id: string) => categoryIdsSet.add(id));

      const tids = d.tagIds || (d.tagId ? [d.tagId] : []);
      tids.forEach((id: string) => tagIdsSet.add(id));
    });

    const [authorDocs, categoryDocs, tagDocs] = await Promise.all([
      authorIdsSet.size > 0 ? db.getAll(...Array.from(authorIdsSet).map(id => db.collection("users").doc(id))) : Promise.resolve([]),
      categoryIdsSet.size > 0 ? db.getAll(...Array.from(categoryIdsSet).map(id => db.collection("categories").doc(id))) : Promise.resolve([]),
      tagIdsSet.size > 0 ? db.getAll(...Array.from(tagIdsSet).map(id => db.collection("tags").doc(id))) : Promise.resolve([]),
    ]);

    const authorMap: Record<string, any> = {};
    authorDocs.forEach(doc => {
      if (doc.exists) {
        authorMap[doc.id] = { id: doc.id, name: doc.data()?.name, email: doc.data()?.email };
      }
    });

    const categoryMap: Record<string, any> = {};
    categoryDocs.forEach(doc => {
      if (doc.exists) {
        categoryMap[doc.id] = { id: doc.id, name: doc.data()?.name };
      }
    });

    const tagMap: Record<string, any> = {};
    tagDocs.forEach(doc => {
      if (doc.exists) {
        tagMap[doc.id] = { id: doc.id, name: doc.data()?.name };
      }
    });

    const items = snapshot.docs.map(doc => {
      const d = doc.data();
      const articleCids = d.categoryIds || (d.categoryId ? [d.categoryId] : []);
      const cats = articleCids.map((id: string) => categoryMap[id]).filter(Boolean);

      const articleTids = d.tagIds || (d.tagId ? [d.tagId] : []);
      const tags = articleTids.map((id: string) => tagMap[id]).filter(Boolean);

      return {
        id: doc.id,
        ...d,
        author: d.authorId ? (authorMap[d.authorId] || null) : null,
        categories: cats,
        category: cats[0] || null,
        tags
      };
    });

    return jsonOk({ items, total, page, limit });
  } catch (e: any) {
    return jsonError(e?.message || "Error", e?.status || 500);
  }
}
