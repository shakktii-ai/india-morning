import { db } from "@/src/lib/firebase-admin";
import * as FirebaseFirestore from "firebase-admin/firestore";
import { getErrorMessage, jsonCreated, jsonError, jsonOk } from "@/src/utils/http";

import { requireUser, getRequestIp } from "@/src/auth/requireUser";
import { requireRole } from "@/src/auth/rbac";
import { z } from "zod";
import { slugify } from "@/src/utils/slug";
import { generateSearchKeywords, resolveTagIds } from "@/src/utils/taxonomy";

export const runtime = "nodejs";

const createSchema = z.object({
  title: z.string().min(5),
  slug: z.string().optional(),
  excerpt: z.string().optional(),
  contentHtml: z.string().min(20),
  coverImageUrl: z.string().url().optional(),
  language: z.string().default("EN"),
  region: z.string().default("MAHARASHTRA"),
  categoryIds: z.array(z.string()).default([]), // For multi-select
  tagIds: z.array(z.string()).default([]),
  tagNames: z.array(z.string()).optional(),
  seoTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  focusKeyphrase: z.string().optional(),
  canonicalUrl: z.string().url().optional(),
  scheduledAt: z.string().datetime().optional(),
  publishedAt: z.string().datetime().optional()
});

export async function GET(req: Request) {
  try {
    const actor = await requireUser();
    const url = new URL(req.url);

    // Params
    const status = url.searchParams.get("status") || undefined;
    const categoryId = url.searchParams.get("categoryId") || undefined;
    const search = url.searchParams.get("search") || undefined;
    const dateFrom = url.searchParams.get("dateFrom"); // YYYY-MM-DD
    const dateTo = url.searchParams.get("dateTo");

    // Pagination
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    let query: FirebaseFirestore.Query = db.collection("articles");

    if (status) query = query.where("status", "==", status);

    // Filtering by categoryId: Handle both old (single) and new (array)
    // Note: Firestore 'array-contains' only works for one value. 
    // If filtering by one categoryId, we can check if it exists in categoryIds or equals categoryId.
    // However, usually we filter by one at a time in the admin overview.
    if (categoryId) {
      // Since we can't easily do OR in Firestore for (scalar == X OR array includes X) 
      // without complex queries, we'll try to use 'array-contains' for new data 
      // and keep 'categoryId' check for old data if possible.
      // Actually, if we migrated or handle it here:
      query = query.where("categoryIds", "array-contains", categoryId);
    }

    if (actor.role === "JOURNALIST") {
      query = query.where("authorId", "==", actor.id);
    }

    if (search) {
      query = query.where("searchKeywords", "array-contains", search.toLowerCase());
    }

    query = query.orderBy("updatedAt", "desc");

    const snapshot = await query.limit(limit).offset(skip).get();

    // Aggregation Count
    let filteredCountQuery: FirebaseFirestore.Query = db.collection("articles");
    if (status) filteredCountQuery = filteredCountQuery.where("status", "==", status);
    if (categoryId) filteredCountQuery = filteredCountQuery.where("categoryIds", "array-contains", categoryId);
    if (actor.role === "JOURNALIST") filteredCountQuery = filteredCountQuery.where("authorId", "==", actor.id);
    if (search) filteredCountQuery = filteredCountQuery.where("searchKeywords", "array-contains", search.toLowerCase());

    const countSnapshot = await filteredCountQuery.count().get();
    const total = countSnapshot.data().count;

    // Batched Data Fetching
    const authorIdsSet = new Set<string>();
    const categoryIdsSet = new Set<string>();
    const tagIdsSet = new Set<string>();

    snapshot.docs.forEach(doc => {
      const d = doc.data();
      if (d.authorId) authorIdsSet.add(d.authorId);

      // Categories: handle both array and legacy scalar
      if (d.categoryIds && Array.isArray(d.categoryIds)) {
        d.categoryIds.forEach((cid: string) => categoryIdsSet.add(cid));
      } else if (d.categoryId) {
        categoryIdsSet.add(d.categoryId);
      }

      // Tags: handle both array and legacy scalar
      if (d.tagIds && Array.isArray(d.tagIds)) {
        d.tagIds.forEach((tid: string) => tagIdsSet.add(tid));
      } else if (d.tagId) {
        tagIdsSet.add(d.tagId);
      }
    });

    const authorsPromise = authorIdsSet.size > 0
      ? db.getAll(...Array.from(authorIdsSet).map(id => db.collection("users").doc(id)))
      : Promise.resolve([]);

    const categoriesPromise = categoryIdsSet.size > 0
      ? db.getAll(...Array.from(categoryIdsSet).map(id => db.collection("categories").doc(id)))
      : Promise.resolve([]);

    const tagsPromise = tagIdsSet.size > 0
      ? db.getAll(...Array.from(tagIdsSet).map(id => db.collection("tags").doc(id)))
      : Promise.resolve([]);

    const [authorSnaps, categorySnaps, tagSnaps] = await Promise.all([
      authorsPromise,
      categoriesPromise,
      tagsPromise
    ]);

    const authorMap = new Map();
    authorSnaps.forEach((s: any) => { if (s.exists) authorMap.set(s.id, { name: s.data().name }); });

    const categoryMap = new Map();
    categorySnaps.forEach((s: any) => { if (s.exists) categoryMap.set(s.id, { id: s.id, name: s.data().name }); });

    const tagMap = new Map();
    tagSnaps.forEach((s: any) => { if (s.exists) tagMap.set(s.id, { id: s.id, name: s.data().name }); });

    const articles = snapshot.docs.map(doc => {
      const data = doc.data();
      const articleCids = data.categoryIds || (data.categoryId ? [data.categoryId] : []);
      const cats = articleCids.map((cid: string) => categoryMap.get(cid)).filter(Boolean);

      const articleTids = data.tagIds || (data.tagId ? [data.tagId] : []);
      const tags = articleTids.map((tid: string) => tagMap.get(tid)).filter(Boolean);

      return {
        id: doc.id,
        ...data,
        author: data.authorId ? authorMap.get(data.authorId) || null : null,
        categories: cats,
        category: cats[0] || null, // Keep for backward compatibility in UI
        tags
      };
    });

    return jsonOk({ articles, total, page, limit });
  } catch (e: any) {
    return jsonError(e?.message || "Error", e?.status || 500);
  }
}

export async function POST(req: Request) {
  try {
    const actor = requireUser();
    const user = await actor;
    requireRole(user.role, ["SUPER_ADMIN", "ADMIN", "JOURNALIST"]);
    const input = createSchema.parse(await req.json());

    // Resolve Tags if tagNames provided
    let finalTagIds = input.tagIds;
    if (input.tagNames && input.tagNames.length > 0) {
      finalTagIds = await resolveTagIds(input.tagNames);
    }

    const baseSlug = slugify(input.slug || input.title);
    const searchKeywords = generateSearchKeywords([input.title, input.region, input.excerpt || ""]);

    // Limit check for scheduled articles
    if (input.scheduledAt) {
      const scheduledCount = await db.collection("articles")
        .where("status", "==", "SCHEDULED")
        .count()
        .get();

      if (scheduledCount.data().count >= 10) {
        return jsonError("Scheduling limit reached (max 10 articles). Please publish current articles or wait for the next update cycle.", 400);
      }
    }

    let slug = baseSlug;
    let i = 1;

    // Ensure slug is unique
    while (!(await db.collection("articles").where("slug", "==", slug).get()).empty) {
      slug = `${baseSlug}-${i++}`;
    }

    const newArticle = {
      title: input.title,
      slug,
      searchKeywords,
      excerpt: input.excerpt || null,
      contentHtml: input.contentHtml,
      coverImageUrl: input.coverImageUrl || null,
      language: input.language,
      region: input.region,
      categoryIds: input.categoryIds, // Use array
      categoryId: input.categoryIds[0] || null, // Keep single for legacy
      authorId: user.id,
      seoTitle: input.seoTitle || null,
      metaDescription: input.metaDescription || null,
      focusKeyphrase: input.focusKeyphrase || null,
      canonicalUrl: input.canonicalUrl || null,
      tagIds: finalTagIds,
      status: input.scheduledAt ? "SCHEDULED" : "DRAFT",
      scheduledAt: input.scheduledAt || null,
      publishedAt: input.publishedAt || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await db.collection("articles").add(newArticle);

    await db.collection("audit_logs").add({
      actorId: user.id,
      actorRole: user.role,
      action: "ARTICLE_CREATE",
      entity: "Article",
      entityId: docRef.id,
      ip: await getRequestIp(),
      createdAt: new Date().toISOString()
    });

    return jsonCreated({ article: { id: docRef.id, ...newArticle } });
  } catch (e: any) {
    const msg = getErrorMessage(e);
    if (e instanceof z.ZodError) {
      console.error("Validation Error:", msg);
    } else {
      console.error("Article Create Error:", e);
    }
    return jsonError(msg, e?.status || 400);
  }
}

export async function DELETE(req: Request) {
  try {
    const actor = await requireUser();
    requireRole(actor.role, ["SUPER_ADMIN", "ADMIN"]);

    const body = await req.json().catch(() => ({}));
    // body: { ids: string[], deleteAllMatching: boolean, filters: any }

    // Logic for Single/Bulk delete (if ids provided and no deleteAllMatching)
    if (body.ids && Array.isArray(body.ids) && !body.deleteAllMatching) {
      if (body.ids.length === 0) return jsonOk({ count: 0 });

      const batch = db.batch();
      body.ids.forEach((id: string) => {
        batch.delete(db.collection("articles").doc(id));
      });
      await batch.commit();

      // Audit
      await db.collection("audit_logs").add({
        actorId: actor.id,
        actorRole: actor.role,
        action: "ARTICLE_DELETE",
        entity: "Article",
        entityId: "BULK",
        ip: await getRequestIp(),
        createdAt: new Date().toISOString()
      });

      return jsonOk({ count: body.ids.length });
    }

    // Logic for "Delete All Matching"
    if (body.deleteAllMatching && body.filters) {
      const filters = body.filters;
      let query: FirebaseFirestore.Query = db.collection("articles");

      // Reconstruct where clause from filters
      if (filters.status) query = query.where("status", "==", filters.status);
      if (filters.categoryId) query = query.where("categoryId", "==", filters.categoryId);
      // Search ignored in Firestore for bulk delete too

      const snapshot = await query.get();
      const batch = db.batch();
      let count = 0;

      // Batch supports max 500 ops. Need loop for large sets.
      // Simplify: Delete one by one or create chunks?
      // Since max limit is 500 in standard batch, let's loop logic just in case.
      // Actually standard recommended way for deleting whole collections is via Callable implementation.
      // Here we will do simple batching or Promise.all.

      const batches = [];
      let currentBatch = db.batch();
      let opCount = 0;

      snapshot.docs.forEach((doc) => {
        currentBatch.delete(doc.ref);
        opCount++;
        if (opCount >= 400) {
          batches.push(currentBatch.commit());
          currentBatch = db.batch();
          opCount = 0;
        }
      });
      if (opCount > 0) batches.push(currentBatch.commit());

      await Promise.all(batches);

      // Audit
      await db.collection("audit_logs").add({
        actorId: actor.id,
        actorRole: actor.role,
        action: "ARTICLE_DELETE",
        entity: "Article",
        entityId: "BULK_MATCHING",
        ip: await getRequestIp(),
        createdAt: new Date().toISOString()
      });

      return jsonOk({ count: snapshot.size });
    }

    return jsonError("Invalid request body for bulk delete", 400);

  } catch (e: any) {
    return jsonError(e?.message || "Error", e?.status || 500);
  }
}
