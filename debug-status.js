const { db } = require("./src/lib/firebase-admin");

async function check() {
    const id = "VBgjlN8JpAGYbWKCWlhR";
    const doc = await db.collection("articles").doc(id).get();
    if (!doc.exists) {
        console.log("Article not found");
        return;
    }
    const data = doc.data();
    console.log("ID:", id);
    console.log("Status:", data.status);
    console.log("ScheduledAt:", data.scheduledAt);
    console.log("PublishedAt:", data.publishedAt);
    process.exit(0);
}

check();
