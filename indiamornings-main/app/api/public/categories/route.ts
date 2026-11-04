import { db } from "@/src/lib/firebase-admin";
import { jsonOk } from "@/src/utils/http";

export const runtime = "nodejs";

export async function GET() {
  const snapshot = await db.collection("categories").orderBy("name", "asc").get();
  const categories = snapshot.docs.map(c => ({ id: c.id, ...c.data() }));
  return jsonOk({ categories });
}
