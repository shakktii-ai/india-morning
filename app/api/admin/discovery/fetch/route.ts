import { db } from "@/src/lib/firebase-admin";
import { requireUser } from "@/src/auth/requireUser";
import { requireRole } from "@/src/auth/rbac";
import { discoverNewsForCategory, discoverNewsForAllCategories } from "@/src/lib/serpapi";
import { jsonError, jsonOk } from "@/src/utils/http";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const actor = await requireUser();
    requireRole(actor.role, ["SUPER_ADMIN", "ADMIN"]);

    const body = await req.json().catch(() => ({}));
    const { categoryId, limit } = body;

    if (categoryId) {
      const catDoc = await db.collection("categories").doc(categoryId).get();
      if (!catDoc.exists) {
        return jsonError("Category not found", 404);
      }
      const catData = catDoc.data()!;
      const category = {
        id: catDoc.id,
        name: catData.name,
        slug: catData.slug,
      };

      const res = await discoverNewsForCategory(category, limit || 8);
      return jsonOk({
        message: `Discovered ${res.added} new articles for category "${category.name}".`,
        added: res.added,
        totalFetched: res.totalFetched,
      });
    }

    // Otherwise discover for all categories
    const res = await discoverNewsForAllCategories({
      limitPerCategory: limit || 5,
    });

    return jsonOk({
      message: `Discovered ${res.totalAdded} new articles across ${res.categoriesProcessed} categories.`,
      added: res.totalAdded,
      details: res.details,
    });
  } catch (error: any) {
    console.error("Discovery Fetch Error:", error);
    return jsonError(error?.message || "Failed to fetch latest news leads", error?.status || 500);
  }
}

