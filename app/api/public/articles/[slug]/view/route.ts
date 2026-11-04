import { db } from "@/src/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { jsonError, jsonOk } from "@/src/utils/http";

export const runtime = "nodejs";

export async function POST(_: Request, { params }: { params: Promise<{ slug: string }> }) {
    try {
        const { slug } = await params;

        // Decode the slug to handle non-English characters (e.g., Devanagari)
        const decodedSlug = decodeURIComponent(slug);

        // Use a query to find the document by slug, since slug is not the doc ID
        const snapshot = await db.collection("articles")
            .where("slug", "==", decodedSlug)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return jsonError("Article not found", 404);
        }

        const doc = snapshot.docs[0];

        // Atomically increment the view count
        await doc.ref.update({
            viewCount: FieldValue.increment(1)
        });

        return jsonOk({ success: true });
    } catch (error) {
        console.error("Error incrementing view count:", error);
        return jsonError("Internal Server Error", 500);
    }
}
