import { requireUser } from "@/src/auth/requireUser";
import { requireRole } from "@/src/auth/rbac";
import { dismissDiscoveredArticle } from "@/src/lib/serpapi";
import { jsonError, jsonOk } from "@/src/utils/http";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const actor = await requireUser();
    requireRole(actor.role, ["SUPER_ADMIN", "ADMIN"]);

    const body = await req.json().catch(() => ({}));
    const { id, ids, reason } = body;

    if (!id && (!ids || !Array.isArray(ids) || ids.length === 0)) {
      return jsonError("Article id or ids array is required", 400);
    }

    const targetIds = ids && Array.isArray(ids) ? ids : [id];

    for (const artId of targetIds) {
      await dismissDiscoveredArticle(artId, actor.id, reason);
    }

    return jsonOk({
      message: `Successfully dismissed ${targetIds.length} article(s). They will not reappear in future discovery cycles.`,
      dismissedIds: targetIds,
    });
  } catch (error: any) {
    console.error("Dismiss Discovery Article Error:", error);
    return jsonError(error?.message || "Failed to dismiss article", error?.status || 500);
  }
}

