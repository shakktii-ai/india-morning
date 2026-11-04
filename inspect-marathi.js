import dotenv from "dotenv";
dotenv.config();

import { db } from "./src/lib/firebase-admin.js";

async function inspectArticle(slug) {
    try {
        const snapshot = await db.collection("articles").where("slug", "==", slug).limit(1).get();
        if (snapshot.empty) {
            console.log("Article not found");
            return;
        }
        const data = snapshot.docs[0].data();
        const content = data.contentHtml;

        console.log("--- RAW CONTENT PREVIEW ---");
        console.log(content.substring(0, 1000));

        // Find "जवळीक" and show characters around it
        const index = content.indexOf("ज");
        if (index !== -1) {
            console.log("\n--- CHARACTER CODES AROUND problematic word ---");
            const around = content.substring(index - 5, index + 10);
            for (let i = 0; i < around.length; i++) {
                console.log(`${around[i]} : ${around.charCodeAt(i).toString(16)}`);
            }
        }

        // Check for &nbsp;
        const nbspCount = (content.match(/&nbsp;/g) || []).length;
        console.log(`\nFound ${nbspCount} &nbsp; tags`);

    } catch (e) {
        console.error("Inspection error:", e);
    }
}

const slug = "ambernath-congress-nagarsevak-bjp-pravesh-political-setback";
inspectArticle(slug);
//