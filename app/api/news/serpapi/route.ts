import { db } from "@/src/lib/firebase-admin";
import { fetchDailyMorningNews, searchGoogleNews } from "@/src/lib/serpapi";
import { jsonError, jsonOk } from "@/src/utils/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public/Internal endpoint to access SerpAPI news
 * - GET: returns latest synchronized morning news snapshot, or performs a live query if requested
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");
    const live = searchParams.get("live") === "true";
    const limit = parseInt(searchParams.get("limit") || "20");

    // Live search if requested
    if (live && query) {
      const results = await searchGoogleNews(query, { limit });
      return jsonOk(results);
    }

    if (live && !query) {
      const results = await fetchDailyMorningNews({ limit });
      return jsonOk(results);
    }

    // Default: Return the latest stored morning news from Firestore
    const latestDoc = await db.collection("serpapi_news").doc("latest").get();
    if (latestDoc.exists) {
      const data = latestDoc.data();
      return jsonOk({
        source: "cache",
        ...data,
      });
    }

    // Fallback if no cache exists yet: perform live fetch
    const fallback = await fetchDailyMorningNews({ limit });
    return jsonOk({
      source: "live_fallback",
      ...fallback,
    });
  } catch (error: any) {
    console.error("Error retrieving SerpAPI news:", error);
    return jsonError(error?.message || "Internal Server Error", 500);
  }
}

