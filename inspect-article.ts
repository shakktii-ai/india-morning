// Mock environment variables before importing firebase-admin
process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = "india-mornings.appspot.com";
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "india-mornings";

import { db } from "./src/lib/firebase-admin";

async function inspectArticle(slug: string) {
    try {
        const snapshot = await db.collection("articles").where("slug", "==", slug).limit(1).get();
        if (snapshot.empty) {
            console.log("Article not found");
            return;
        }
        const data = snapshot.docs[0].data();
        console.log("--- TITLE ---");
        console.log(JSON.stringify(data.title));
        console.log("--- EXCERPT ---");
        console.log(JSON.stringify(data.excerpt));
        console.log("--- CONTENT HTML ---");
        console.log(JSON.stringify(data.contentHtml));
    } catch (e) {
        console.error("Inspection error:", e);
    }
}

const slug = "ambernath-congress-nagarsevak-bjp-pravesh-political-setback";
inspectArticle(slug);
//