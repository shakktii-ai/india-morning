import { getSearchData } from "@/src/lib/data-public";
import { jsonOk } from "@/src/utils/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
    const url = new URL(req.url);
    const q = url.searchParams.get("q") || "";
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "12");

    const data = await getSearchData({ q, page, limit });
    return jsonOk(data);
}

