import { db } from "@/src/lib/firebase-admin";
import { jsonOk } from "@/src/utils/http";

export const runtime = "nodejs";

export async function GET() {
    // Fetch categories
    const categoriesSnap = await db.collection("categories").orderBy("name", "asc").get();
    const categories = categoriesSnap.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        slug: doc.data().slug
    }));

    // Fetch recent posts (last 2)
    const recentSnap = await db.collection("articles")
        .where("status", "==", "PUBLISHED")
        .orderBy("publishedAt", "desc")
        .limit(2)
        .get();

    const recentPosts = recentSnap.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            title: data.title,
            slug: data.slug,
            coverImageUrl: data.coverImageUrl,
            publishedAt: data.publishedAt
        };
    });

    return jsonOk({ categories, recentPosts });
}
