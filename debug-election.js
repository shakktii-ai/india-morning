import { db } from "./src/lib/firebase-admin.js";

async function check() {
    try {
        const id0 = "VBgjlN8JpAGYbWKCWlhR";
        const doc0 = await db.collection("articles").doc(id0).get();
        if (doc0.exists) {
            console.log(`ID: ${id0} | Title: ${doc0.data().title} | Status: ${doc0.data().status} | ScheduledAt: ${doc0.data().scheduledAt}`);
        } else {
            console.log(`ID ${id0} not found`);
        }

        const snaps = await db.collection("articles").where("title", "==", "election").get();
        if (snaps.empty) {
            console.log("No articles found with title 'election'");
        }
        snaps.forEach(doc => {
            console.log(`FOUND BY TITLE | ID: ${doc.id} | Status: ${doc.data().status} | ScheduledAt: ${doc.data().scheduledAt}`);
        });
    } catch (error) {
        console.error("Error checking status:", error);
    }
    process.exit(0);
}

check();

////