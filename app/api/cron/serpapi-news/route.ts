import {
  executeDailyMorningNewsCron,
  fetchDailyMorningNews,
  saveMorningNewsToFirestore,
  publishNewsToLiveArticles,
} from "@/src/lib/serpapi";
import { jsonError, jsonOk } from "@/src/utils/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // Allow full 5-minute execution window for live article publishing

/**
 * Handler for the SerpAPI Daily Morning News Cron Job
 * Scheduled to run every morning at 8:00 AM (8:00 AM IST = 02:30 UTC).
 */
async function handleCronRequest(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const authHeader = req.headers.get("authorization") || "";
    const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const secret = req.headers.get("x-cron-secret") || bearerToken || searchParams.get("secret");
    const userAgent = req.headers.get("user-agent") || "";
    const isVercelCron = req.headers.get("x-vercel-cron") === "1" || userAgent.includes("vercel-cron");

    // Security check matching the project's cron convention
    if (process.env.CRON_SECRET) {
      if (secret !== process.env.CRON_SECRET && !isVercelCron) {
        console.warn("[SerpAPI Cron] Unauthorized attempt. Invalid secret or not a verified cron trigger.");
        return jsonError("Unauthorized: Incorrect secret or not a valid cron trigger", 401);
      }
    } else if (!isVercelCron) {
      console.log("[SerpAPI Cron] CRON_SECRET not configured. Proceeding with request...");
    }

    const customQuery = searchParams.get("q") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;

    let result;
    if (customQuery || limit) {
      const fetchRes = await fetchDailyMorningNews({ query: customQuery, limit });
      if (!fetchRes.success) {
        return jsonError(fetchRes.error || "Failed to fetch news from SerpAPI", 500);
      }
      const saveRes = await saveMorningNewsToFirestore(fetchRes);
      // Auto-publish to live articles collection
      const pubRes = await publishNewsToLiveArticles(fetchRes.articles);
      result = {
        success: true,
        count: saveRes.savedCount + pubRes.publishedCount,
        message: `${saveRes.message}. Published ${pubRes.publishedCount} stories to live site.`,
        timestamp: new Date().toISOString(),
        articles: fetchRes.articles,
      };
    } else {
      // Complete automated morning cron workflow: fetches morning digest + discovers all categories + auto-publishes to live site
      result = await executeDailyMorningNewsCron();
    }

    if (!result.success) {
      return jsonError(result.message || "Cron execution failed", 500);
    }

    return jsonOk({
      message: result.message,
      count: result.count,
      timestamp: result.timestamp,
      articles: result.articles,
    });
  } catch (error: any) {
    console.error("[SerpAPI Cron] Unexpected error:", error);
    return jsonError(error?.message || "Internal Server Error", 500);
  }
}

export async function GET(req: Request) {
  return handleCronRequest(req);
}

export async function POST(req: Request) {
  return handleCronRequest(req);
}

