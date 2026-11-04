import { db } from "@/src/lib/firebase-admin";
import { jsonOk } from "@/src/utils/http";

export const runtime = "nodejs";

export async function GET() {
    try {
        const snapshot = await db.collection("articles")
            .where("status", "==", "PUBLISHED")
            .orderBy("publishedAt", "desc")
            .limit(8)
            .select("title")
            .get();

        const titles = snapshot.docs.map(doc => doc.data().title);
        return jsonOk({ titles });
    } catch (error) {
        return jsonOk({ titles: [] });
    }
}
