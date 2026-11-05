import { db } from "@/src/lib/firebase-admin";
import { requireUser } from "@/src/auth/requireUser";
import { requireRole } from "@/src/auth/rbac";
import {
  discoverNewsForCategory,
  executeFourBucketMorningNewsCron,
} from "@/src/lib/serpapi";
import { getDailySerpApiUsage, checkDailySerpApiQuota } from "@/src/lib/serpapi-tracker";
import { jsonError, jsonOk } from "@/src/utils/http";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const actor = await requireUser();
    requireRole(actor.role, ["SUPER_ADMIN", "ADMIN"]);

    const body = await req.json().catch(() => ({}));
    const { categoryId, limit } = body;

    // Check quota before triggering
    const quota = await checkDailySerpApiQuota();

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
      const usage = await getDailySerpApiUsage();

      return jsonOk({
        message: `Discovered ${res.added} new articles for category "${category.name}".`,
        added: res.added,
        totalFetched: res.totalFetched,
        callsToday: usage.callsCount,
        maxCalls: usage.maxLimit,
        remainingCalls: Math.max(0, usage.maxLimit - usage.callsCount),
      });
    }

    // Run the strict 4-bucket strategic discovery
    const res = await executeFourBucketMorningNewsCron({
      autoPublishToLive: false, // In manual admin fetch, leads are brought into Admin News Discovery for review
    });

    const usage = await getDailySerpApiUsage();

    return jsonOk({
      message: res.message,
      added: res.count,
      callsMade: res.callsMade,
      callsToday: usage.callsCount,
      maxCalls: usage.maxLimit,
      remainingCalls: Math.max(0, usage.maxLimit - usage.callsCount),
    });
  } catch (error: any) {
    console.error("Discovery Fetch Error:", error);
    return jsonError(error?.message || "Failed to fetch latest news leads", error?.status || 500);
  }
}
