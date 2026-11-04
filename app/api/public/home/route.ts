import { getHomeData } from "@/src/lib/data-public";
import { jsonOk } from "@/src/utils/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const region = url.searchParams.get("region") || "ALL";
  const lang = url.searchParams.get("lang") || "ALL";
  const categorySlug = url.searchParams.get("category") || null;
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "12");

  const data = await getHomeData({ region, lang, categorySlug, page, limit });
  return jsonOk(data);
}

