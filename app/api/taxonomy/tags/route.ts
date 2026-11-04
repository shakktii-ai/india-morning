import { db } from "@/src/lib/firebase-admin";
import { jsonCreated, jsonError, jsonOk } from "@/src/utils/http";
import { requireUser, getRequestIp } from "@/src/auth/requireUser";
import { requireRole } from "@/src/auth/rbac";
import { z } from "zod";
import { slugify } from "@/src/utils/slug";
import { generateSearchKeywords } from "@/src/utils/taxonomy";

export const runtime = "nodejs";

const createSchema = z.object({ name: z.string().min(2) });
const updateSchema = z.object({ name: z.string().min(2) });

export async function GET(req: Request) {
  try {
    const actor = await requireUser();
    const url = new URL(req.url);
    const q = url.searchParams.get("q") || "";
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    let query = db.collection("tags").orderBy("name" as any, "asc" as any);
    let total = 0;

    if (q) {
      const lowQ = q.toLowerCase();
      // Search keywords array for any-word prefix match
      const searchSnapshot = await db.collection("tags")
        .where("searchKeywords", "array-contains", lowQ)
        .limit(limit)
        .offset(skip)
        .get();

      const tags = searchSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const countSnapshot = await db.collection("tags")
        .where("searchKeywords", "array-contains", lowQ)
        .count()
        .get();
      total = countSnapshot.data().count;

      return jsonOk({ tags, total, page, limit });
    } else {
      // No search, standard paginated list
      const snapshot = await db.collection("tags")
        .orderBy("name", "asc")
        .limit(limit)
        .offset(skip)
        .get();
      const tags = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const countSnapshot = await db.collection("tags").count().get();
      total = countSnapshot.data().count;

      return jsonOk({ tags, total, page, limit });
    }
  } catch (e: any) {
    return jsonError(e.message, e.status || 500);
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireUser();
    // requireRole(actor.role, ["SUPER_ADMIN", "ADMIN"]); // Relaxed
    const input = createSchema.parse(await req.json());
    const slug = slugify(input.name);
    const searchKeywords = generateSearchKeywords(input.name);

    // Check dupe
    const existing = await db.collection("tags").where("slug", "==", slug).get();
    if (!existing.empty) return jsonError("Tag exists", 409);

    const docRef = await db.collection("tags").add({
      name: input.name,
      slug,
      searchKeywords,
      createdAt: new Date().toISOString()
    });

    await db.collection("audit_logs").add({
      actorId: actor.id,
      actorRole: actor.role as any,
      action: "TAG_CREATE",
      entity: "Tag",
      entityId: docRef.id,
      ip: await getRequestIp(),
      createdAt: new Date().toISOString()
    });

    return jsonCreated({ tag: { id: docRef.id, name: input.name, slug } });
  } catch (e: any) {
    return jsonError(e?.message || "Error", e?.status || 400);
  }
}

export async function PATCH(req: Request) {
  try {
    const actor = await requireUser();
    const body = await req.json();
    const { id, ...data } = updateSchema.parse(body) as any;
    const tid = body.id;
    if (!tid) return jsonError("ID required", 400);

    const docRef = db.collection("tags").doc(tid);
    const doc = await docRef.get();
    if (!doc.exists) return jsonError("Not found", 404);

    const slug = slugify(data.name);
    const searchKeywords = generateSearchKeywords(data.name);

    const existing = await db.collection("tags").where("slug", "==", slug).get();
    if (!existing.empty && existing.docs[0].id !== tid) {
      return jsonError("Another tag with this name exists", 409);
    }

    await docRef.update({
      name: data.name,
      slug,
      searchKeywords,
      updatedAt: new Date().toISOString()
    });

    return jsonOk({ success: true });
  } catch (e: any) {
    return jsonError(e?.message || "Error", 400);
  }
}

export async function DELETE(req: Request) {
  try {
    const actor = await requireUser();
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return jsonError("ID required", 400);

    const docRef = db.collection("tags").doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return jsonError("Not found", 404);

    await docRef.delete();

    return jsonOk({ success: true });
  } catch (e: any) {
    return jsonError(e?.message || "Error", 500);
  }
}
