import "dotenv/config";
import { executeDailyMorningNewsCron, discoverNewsForAllCategories } from "../src/lib/serpapi";
import { getHomeData } from "../src/lib/data-public";
import { db } from "../src/lib/firebase-admin";

async function main() {
  console.log("=================================================");
  console.log("India Mornings - Live Fresh News Synchronization");
  console.log("=================================================");
  console.log(`Current Time: ${new Date().toISOString()}`);

  console.log("\n1. Running SerpAPI Morning Cron & Live Site Publisher...");
  const cronResult = await executeDailyMorningNewsCron();
  console.log("Cron Result:", cronResult.message);

  console.log("\n2. Discovering & publishing fresh category news for all desks...");
  const catResult = await discoverNewsForAllCategories({
    limitPerCategory: 4,
    autoPublishToLive: true,
  });
  console.log(`Discovered & Published ${catResult.publishedLiveTotal} category articles across ${catResult.categoriesProcessed} desks.`);

  console.log("\n3. Verifying latest live published articles in database...");
  const latestSnap = await db.collection("articles")
    .where("status", "==", "PUBLISHED")
    .orderBy("publishedAt", "desc")
    .limit(8)
    .get();

  console.log("\nTop Live Stories Visible to Visitors:");
  latestSnap.docs.forEach((doc, idx) => {
    const data = doc.data();
    console.log(`  ${idx + 1}. [${data.publishedAt}] ${data.title}`);
    console.log(`     Slug: /article/${data.slug}`);
  });

  console.log("\n4. Verifying Public Home Page Data API (getHomeData)...");
  const homeData = await getHomeData({ region: "ALL", lang: "ALL" });
  console.log(`Featured story on homepage: "${homeData.topStories?.[0]?.title}"`);
  console.log(`Total top stories ready for user: ${homeData.topStories?.length}`);

  console.log("\n=================================================");
  console.log("SUCCESS: Fresh, live news is now active for users!");
  console.log("=================================================");
}

main().catch((err) => {
  console.error("Error syncing fresh news:", err);
  process.exit(1);
});

