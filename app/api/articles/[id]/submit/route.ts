import { db } from "@/src/lib/firebase-admin";
import { jsonError, jsonOk } from "@/src/utils/http";
import { requireUser, getRequestIp } from "@/src/auth/requireUser";

export const runtime = "nodejs";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireUser();
    const { id } = await params;

    const docRef = db.collection("articles").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) return jsonError("Not found", 404);
    const article = doc.data();

    if (actor.role === "JOURNALIST" && article?.authorId !== actor.id) return jsonError("Forbidden", 403);
    if (!["DRAFT", "REJECTED"].includes(article?.status)) return jsonError("Only draft/rejected can be submitted", 409);

    const updates = {
      status: "IN_REVIEW",
      submittedAt: new Date().toISOString(),
      reviewNotes: null,
      reviewerId: null,
      updatedAt: new Date().toISOString()
    };

    await docRef.update(updates);

    await db.collection("audit_logs").add({
      actorId: actor.id,
      actorRole: actor.role as any,
      action: "ARTICLE_SUBMIT",
      entity: "Article",
      entityId: id,
      ip: await getRequestIp(),
      createdAt: new Date().toISOString()
    });

    return jsonOk({ article: { id, ...article, ...updates } });
  } catch (e: any) {
    return jsonError(e?.message || "Error", e?.status || 500);
  }
}
