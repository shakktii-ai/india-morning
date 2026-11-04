import { db } from "@/src/lib/firebase-admin";
import { requireUser } from "@/src/auth/requireUser";
import { requireRole } from "@/src/auth/rbac";
import { publishArticleToLive, publishNewsToLiveArticles } from "@/src/lib/serpapi";
import { jsonError, jsonOk } from "@/src/utils/http";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const actor = await requireUser();
    requireRole(actor.role, ["SUPER_ADMIN", "ADMIN"]);

    const body = await req.json().catch(() => ({}));
    const { id, ids } = body;

    if (!id && (!ids || !Array.isArray(ids) || ids.length === 0)) {
      return jsonError("Article ID or array of IDs is required", 400);
    }

    const targetIds = ids && Array.isArray(ids) ? ids : [id];
    const publishedIds: string[] = [];

    for (const artId of targetIds) {
      const doc = await db.collection("discovered_articles").doc(artId).get();
      if (!doc.exists) continue;
      const art = { id: doc.id, ...doc.data() } as any;
      const res = await publishArticleToLive(art, { actorId: actor.id });
      if (res.success) {
        publishedIds.push(res.articleId);
      }
    }

    return jsonOk({
      success: true,
      publishedCount: publishedIds.length,
      message: `Successfully published ${publishedIds.length} article(s) to the live website!`,
    });
  } catch (error: any) {
    console.error("Publish to Live Site Error:", error);
    return jsonError(error?.message || "Failed to publish article", error?.status || 500);
  }
}

