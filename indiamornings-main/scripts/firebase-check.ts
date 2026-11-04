import "dotenv/config";
import { db } from "@/src/lib/firebase-admin";

async function main() {
    console.log("--- Firebase Status Check ---");

    // 1. Check Users
    const usersSnap = await db.collection("users").count().get();
    console.log(`Users: ${usersSnap.data().count}`);

    // 2. Check Articles
    const articlesSnap = await db.collection("articles").count().get();
    console.log(`Articles: ${articlesSnap.data().count}`);

    // 3. Check Categories
    const catSnap = await db.collection("categories").count().get();
    console.log(`Categories: ${catSnap.data().count}`);

    // 4. Article Status Distribution
    const statuses = ["DRAFT", "PUBLISHED", "IN_REVIEW", "REJECTED"];
    console.log("Article Statuses:");
    for (const s of statuses) {
        const c = await db.collection("articles").where("status", "==", s).count().get();
        console.log(`  ${s}: ${c.data().count}`);
    }
}

main().catch(console.error);
