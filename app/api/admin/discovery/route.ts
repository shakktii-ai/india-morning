import { db } from "@/src/lib/firebase-admin";
import { requireUser } from "@/src/auth/requireUser";
import { requireRole } from "@/src/auth/rbac";
import { jsonError, jsonOk } from "@/src/utils/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const actor = await requireUser();
    requireRole(actor.role, ["SUPER_ADMIN", "ADMIN"]);

    const url = new URL(req.url);
    const categoryId = url.searchParams.get("categoryId") || undefined;
    const categorySlug = url.searchParams.get("categorySlug") || undefined;
    const search = url.searchParams.get("search")?.toLowerCase().trim() || "";
    const status = url.searchParams.get("status") || "DISCOVERED"; // "DISCOVERED", "DISMISSED", "DRAFT_CREATED", or "ALL"
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "12");

    // 1. Fetch all categories for filter tabs
    const catSnapshot = await db.collection("categories").orderBy("name", "asc").get();
    const categories = catSnapshot.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name,
      slug: doc.data().slug,
    }));

    // 2. Query discovered_articles
    let query: any = db.collection("discovered_articles");
    if (status !== "ALL") {
      query = query.where("status", "==", status);
    }
    if (categoryId) {
      query = query.where("categoryId", "==", categoryId);
    } else if (categorySlug) {
      query = query.where("categorySlug", "==", categorySlug);
    }

    // Retrieve articles
    const snapshot = await query.get();
    let allArticles = snapshot.docs.map((d: any) => ({
      id: d.id,
      ...d.data(),
    }));

    // Search filter in-memory (title, snippet, source)
    if (search) {
      allArticles = allArticles.filter((art: any) => {
        const titleMatch = art.title?.toLowerCase().includes(search);
        const snippetMatch = art.snippet?.toLowerCase().includes(search);
        const sourceMatch = art.source?.name?.toLowerCase().includes(search);
        const catMatch = art.categoryName?.toLowerCase().includes(search);
        return titleMatch || snippetMatch || sourceMatch || catMatch;
      });
    }

    // Sort in-memory by publishedAt or discoveredAt descending
    allArticles.sort((a: any, b: any) => {
      const timeA = new Date(a.isoDate || a.publishedAt || a.discoveredAt || 0).getTime();
      const timeB = new Date(b.isoDate || b.publishedAt || b.discoveredAt || 0).getTime();
      return timeB - timeA;
    });

    const total = allArticles.length;
    const skip = (page - 1) * limit;
    const paginatedArticles = allArticles.slice(skip, skip + limit);

    // Compute category counts for active discovered leads
    const categoryCounts: Record<string, number> = {};
    const statusCounts = { discovered: 0, dismissed: 0, converted: 0, total: 0 };

    // Fetch all for counts
    const fullSnap = await db.collection("discovered_articles").select("status", "categoryId").get();
    fullSnap.docs.forEach((doc) => {
      const data = doc.data();
      statusCounts.total++;
      if (data.status === "DISCOVERED") {
        statusCounts.discovered++;
        if (data.categoryId) {
          categoryCounts[data.categoryId] = (categoryCounts[data.categoryId] || 0) + 1;
        }
      } else if (data.status === "DISMISSED") {
        statusCounts.dismissed++;
      } else if (data.status === "DRAFT_CREATED") {
        statusCounts.converted++;
      }
    });

    return jsonOk({
      articles: paginatedArticles,
      total,
      page,
      limit,
      categories,
      categoryCounts,
      statusCounts,
    });
  } catch (error: any) {
    console.error("Discovery API Error:", error);
    return jsonError(error?.message || "Failed to load discovery leads", error?.status || 500);
  }
}

