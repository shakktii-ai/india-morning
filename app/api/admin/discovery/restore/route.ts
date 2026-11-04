import { requireUser } from "@/src/auth/requireUser";
import { requireRole } from "@/src/auth/rbac";
import { restoreDiscoveredArticle } from "@/src/lib/serpapi";
import { jsonError, jsonOk } from "@/src/utils/http";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const actor = await requireUser();
    requireRole(actor.role, ["SUPER_ADMIN", "ADMIN"]);

    const body = await req.json().catch(() => ({}));
    const { id } = body;

    if (!id) {
      return jsonError("Article id is required", 400);
    }

    const res = await restoreDiscoveredArticle(id, actor.id);
    return jsonOk(res);
  } catch (error: any) {
    console.error("Restore Discovery Article Error:", error);
    return jsonError(error?.message || "Failed to restore article", error?.status || 500);
  }
}

