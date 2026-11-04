import { requireUser } from "@/src/auth/requireUser";
import { requireRole } from "@/src/auth/rbac";
import { convertDiscoveredToDraft } from "@/src/lib/serpapi";
import { jsonError, jsonOk } from "@/src/utils/http";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const actor = await requireUser();
    requireRole(actor.role, ["SUPER_ADMIN", "ADMIN"]);

    const body = await req.json().catch(() => ({}));
    const { id } = body;

    if (!id) {
      return jsonError("Discovered article ID is required", 400);
    }

    const res = await convertDiscoveredToDraft(id, actor);
    return jsonOk(res);
  } catch (error: any) {
    console.error("Convert Discovered Article Error:", error);
    return jsonError(error?.message || "Failed to convert article to draft", error?.status || 500);
  }
}

