import { db } from "@/src/lib/firebase-admin";
import { jsonCreated, jsonError, jsonOk } from "@/src/utils/http";
import { requireUser, getRequestIp } from "@/src/auth/requireUser";
import { requireRole } from "@/src/auth/rbac";
import { z } from "zod";
import { slugify } from "@/src/utils/slug";

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

    let total = 0;

    if (q) {
      const endQ = q.replace(/.$/, (c) => String.fromCharCode(c.charCodeAt(0) + 1));
      const searchSnapshot = await db.collection("categories")
        .where("name", ">=", q)
        .where("name", "<", endQ)
        .limit(limit)
        .offset(skip)
        .get();

      const categories = searchSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const countSnapshot = await db.collection("categories")
        .where("name", ">=", q)
        .where("name", "<", endQ)
        .count()
        .get();
      total = countSnapshot.data().count;

      return jsonOk({ categories, total, page, limit });
    } else {
      const snapshot = await db.collection("categories")
        .orderBy("name", "asc")
        .limit(limit)
        .offset(skip)
        .get();

      const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const countSnapshot = await db.collection("categories").count().get();
      total = countSnapshot.data().count;

      return jsonOk({ categories, total, page, limit });
    }
  } catch (e: any) {
    return jsonError(e.message, e.status || 500);
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireUser();
    // requireRole(actor.role, ["SUPER_ADMIN", "ADMIN"]); // Relaxed to any user
    const input = createSchema.parse(await req.json());
    const slug = slugify(input.name);

    // Check slug uniqueness
    const existing = await db.collection("categories").where("slug", "==", slug).get();
    if (!existing.empty) return jsonError("Category already exists", 409);

    const docRef = await db.collection("categories").add({
      name: input.name,
      slug,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    await db.collection("audit_logs").add({
      actorId: actor.id,
      actorRole: actor.role,
      action: "CATEGORY_CREATE",
      entity: "Category",
      entityId: docRef.id,
      ip: await getRequestIp(),
      createdAt: new Date().toISOString()
    });

    return jsonCreated({ category: { id: docRef.id, name: input.name, slug } });
  } catch (e: any) {
    return jsonError(e?.message || "Error", e?.status || 400);
  }
}

export async function PATCH(req: Request) {
  try {
    const actor = await requireUser();
    const body = await req.json();
    const { id, ...data } = updateSchema.parse(body) as any;
    const cid = body.id;
    if (!cid) return jsonError("ID required", 400);

    const docRef = db.collection("categories").doc(cid);
    const doc = await docRef.get();
    if (!doc.exists) return jsonError("Not found", 404);

    const slug = slugify(data.name);

    // Check if slug taken by another
    const existing = await db.collection("categories").where("slug", "==", slug).get();
    if (!existing.empty && existing.docs[0].id !== cid) {
      return jsonError("Another category with this name exists", 409);
    }

    await docRef.update({
      name: data.name,
      slug,
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

    const docRef = db.collection("categories").doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return jsonError("Not found", 404);

    await docRef.delete();

    return jsonOk({ success: true });
  } catch (e: any) {
    return jsonError(e?.message || "Error", 500);
  }
}
