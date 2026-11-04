import "dotenv/config";
import { db } from "../src/lib/firebase-admin";

async function checkArticles() {
    try {
        const snapshot = await db.collection("articles").limit(5).get();
        if (snapshot.empty) {
            console.log("No articles found in collection 'articles'.");
            return;
        }
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            console.log(`ID: ${doc.id} | Slug: ${data.slug} | Status: ${data.status} | Region: ${data.region} | Lang: ${data.language}`);
        });
    } catch (error) {
        console.error("Error fetching articles:", error);
    } finally {
        process.exit();
    }
}

checkArticles();
