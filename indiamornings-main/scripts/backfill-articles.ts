import "dotenv/config";
import { db } from "../src/lib/firebase-admin";

async function backfill() {
    console.log("Starting backfill for region and language...");
    try {
        const snapshot = await db.collection("articles").get();
        console.log(`Found ${snapshot.size} articles.`);

        const batch = db.batch();
        let count = 0;

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const updates: any = {};

            if (data.region !== "ALL") updates.region = "ALL";
            if (data.language !== "ALL") updates.language = "ALL";

            if (Object.keys(updates).length > 0) {
                batch.update(doc.ref, updates);
                count++;
            }
        });

        if (count > 0) {
            await batch.commit();
            console.log(`Successfully updated ${count} articles.`);
        } else {
            console.log("No common updates needed.");
        }
    } catch (error) {
        console.error("Backfill failed:", error);
    } finally {
        process.exit();
    }
}

backfill();
