import { executeDailyMorningNewsCron, fetchDailyMorningNews, saveMorningNewsToFirestore } from "@/src/lib/serpapi";
import { jsonError, jsonOk } from "@/src/utils/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Handler for the SerpAPI Daily Morning News Cron Job
 * Scheduled to run every morning at 8:00 AM.
 */
async function handleCronRequest(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = req.headers.get("x-cron-secret") || searchParams.get("secret");
    const isVercelCron = req.headers.get("x-vercel-cron") === "1";

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
      result = {
        success: true,
        count: saveRes.savedCount,
        message: saveRes.message,
        timestamp: new Date().toISOString(),
        articles: fetchRes.articles,
      };
    } else {
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

