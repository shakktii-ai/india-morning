import { db } from "@/src/lib/firebase-admin";
import { jsonError, jsonOk } from "@/src/utils/http";
import { requireUser, getRequestIp } from "@/src/auth/requireUser";
import { requireRole } from "@/src/auth/rbac";

export const runtime = "nodejs";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireUser();
    requireRole(actor.role, ["SUPER_ADMIN", "ADMIN"]);
    const { id } = await params;

    const docRef = db.collection("articles").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) return jsonError("Not found", 404);
    const art = doc.data();

    if (art?.status !== "APPROVED") return jsonError("Only APPROVED can be published", 409);

    const updates = {
      status: "PUBLISHED",
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await docRef.update(updates);

    await db.collection("audit_logs").add({
      actorId: actor.id,
      actorRole: actor.role as any,
      action: "ARTICLE_PUBLISH",
      entity: "Article",
      entityId: id,
      ip: await getRequestIp(),
      createdAt: new Date().toISOString()
    });

    return jsonOk({ article: { id, ...art, ...updates } });
  } catch (e: any) {
    return jsonError(e?.message || "Error", e?.status || 500);
  }
}
