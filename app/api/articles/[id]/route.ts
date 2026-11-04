import { db } from "@/src/lib/firebase-admin";
import * as FirebaseFirestore from "firebase-admin/firestore";
import { jsonError, jsonOk } from "@/src/utils/http";
import { requireUser, getRequestIp } from "@/src/auth/requireUser";
import { z } from "zod";
import { generateSearchKeywords, resolveTagIds } from "@/src/utils/taxonomy";
import { slugify } from "@/src/utils/slug";

export const runtime = "nodejs";

const patchSchema = z.object({
  title: z.string().min(5).optional(),
  slug: z.string().optional(),
  excerpt: z.string().optional(),
  contentHtml: z.string().min(20).optional(),
  coverImageUrl: z.string().url().optional().nullable(),
  language: z.string().optional(),
  region: z.string().optional(),
  categoryIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  tagNames: z.array(z.string()).optional(),
  seoTitle: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  focusKeyphrase: z.string().optional().nullable(),
  canonicalUrl: z.string().url().optional().nullable(),
  scheduledAt: z.string().datetime().optional().nullable(),
  publishedAt: z.string().datetime().optional().nullable()
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireUser();
  const { id } = await params;

  const doc = await db.collection("articles").doc(id).get();
  if (!doc.exists) return jsonError("Not found", 404);

  const data = doc.data() as any;
  if (actor.role === "JOURNALIST" && data.authorId !== actor.id) return jsonError("Forbidden", 403);

  let categories: any[] = [];
  let author = null;

  // Populate Categories
  const articleCids = data.categoryIds || (data.categoryId ? [data.categoryId] : []);
  if (articleCids.length > 0) {
    const cSnaps = await db.getAll(...articleCids.map((cid: string) => db.collection("categories").doc(cid)));
    categories = cSnaps.filter(s => s.exists).map(s => ({ id: s.id, ...s.data() }));
  }

  // Populate Author
  if (data.authorId) {
    const u = await db.collection("users").doc(data.authorId).get();
    if (u.exists) author = { id: u.id, name: u.data()?.name, role: u.data()?.role };
  }

  // Populate Tags
  let tags: any[] = [];
  if (data.tagIds && Array.isArray(data.tagIds) && data.tagIds.length > 0) {
    // Firestore limit for getAll is usually high enough for tags here
    const tSnaps = await db.getAll(...data.tagIds.map((tid: string) => db.collection("tags").doc(tid)));
    tags = tSnaps.filter(s => s.exists).map(s => ({ id: s.id, ...s.data() }));
  }

  return jsonOk({
    article: {
      id: doc.id,
      ...data,
      categories,
      category: categories[0] || null,
      author,
      tags
    }
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireUser();
    const input = patchSchema.parse(await req.json());
    const { id } = await params;

    const docRef = db.collection("articles").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) return jsonError("Not found", 404);
    const existing = doc.data() as any;

    if (actor.role === "JOURNALIST" && existing.authorId !== actor.id) return jsonError("Forbidden", 403);

    const updates: any = { ...input, updatedAt: new Date().toISOString() };

    if (input.title || input.region || input.excerpt) {
      const kwTitle = input.title || existing.title;
      const kwRegion = input.region || existing.region;
      const kwExcerpt = input.excerpt || existing.excerpt || "";
      updates.searchKeywords = generateSearchKeywords([kwTitle, kwRegion, kwExcerpt]);
    }

    if (input.tagNames && Array.isArray(input.tagNames)) {
      updates.tagIds = await resolveTagIds(input.tagNames);
      delete updates.tagNames;
    }

    if (input.slug && input.slug !== existing.slug) {
      const baseSlug = slugify(input.slug);
      let targetSlug = baseSlug;
      let i = 1;

      // Ensure the new slug is unique (excluding this document)
      while (true) {
        const snapshot = await db.collection("articles")
          .where("slug", "==", targetSlug)
          .limit(1)
          .get();

        if (snapshot.empty || snapshot.docs[0].id === id) break;
        targetSlug = `${baseSlug}-${i++}`;
      }
      updates.slug = targetSlug;
    }

    // Maintain single categoryId for legacy
    if (input.categoryIds && input.categoryIds.length > 0) {
      updates.categoryId = input.categoryIds[0];
    }

    // Status Logic
    if (input.scheduledAt) {
      // Check limit if changing to SCHEDULED or updating an existing SCHEDULED article
      if (existing.status !== "SCHEDULED" || input.scheduledAt !== existing.scheduledAt) {
        const scheduledCount = await db.collection("articles")
          .where("status", "==", "SCHEDULED")
          .count()
          .get();

        // If we are already at the limit and this article isn't already one of the scheduled ones being updated
        if (scheduledCount.data().count >= 10 && existing.status !== "SCHEDULED") {
          return jsonError("Scheduling limit reached (max 10 articles). Please publish current articles or wait for the next update cycle.", 400);
        }
      }

      updates.status = "SCHEDULED";
      updates.publishedAt = null;
      updates.approvedAt = null;
    } else if (existing.status === "SCHEDULED" && input.scheduledAt === null) {
      // If it was scheduled but we removed the time, send back to draft
      updates.status = "DRAFT";
    } else if (["APPROVED", "PUBLISHED"].includes(existing.status)) {
      // If editing something that was already live or approved, send back to review
      updates.status = "IN_REVIEW";
      updates.reviewerId = null;
      updates.approvedAt = null;
      updates.publishedAt = input.publishedAt !== undefined 
        ? input.publishedAt 
        : (existing.status === "PUBLISHED" ? null : existing.publishedAt);
    }

    await docRef.update(updates);

    await db.collection("audit_logs").add({
      actorId: actor.id,
      actorRole: actor.role as any,
      action: "ARTICLE_UPDATE",
      entity: "Article",
      entityId: id,
      ip: await getRequestIp(),
      createdAt: new Date().toISOString()
    });

    return jsonOk({ article: { id, ...existing, ...updates } });
  } catch (e: any) {
    return jsonError(e?.message || "Error", e?.status || 400);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireUser();
    const { id } = await params;

    const docRef = db.collection("articles").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) return jsonError("Not found", 404);
    const existing = doc.data() as any;

    if (actor.role === "JOURNALIST" && existing.authorId !== actor.id) return jsonError("Forbidden", 403);

    await docRef.delete();

    await db.collection("audit_logs").add({
      actorId: actor.id,
      actorRole: actor.role as any,
      action: "ARTICLE_DELETE",
      entity: "Article",
      entityId: id,
      ip: await getRequestIp(),
      createdAt: new Date().toISOString()
    });

    return jsonOk({ message: "Deleted" });
  } catch (e: any) {
    return jsonError(e?.message || "Error", e?.status || 400);
  }
}
