import "dotenv/config";
import { db } from "../src/lib/firebase-admin";
import { discoverNewsForAllCategories } from "../src/lib/serpapi";
import { getHomeData } from "../src/lib/data-public";

async function main() {
  console.log("=================================================");
  console.log("Full Fresh News Sync & Verification Across All Desks");
  console.log("=================================================");
  console.log(`Current Time: ${new Date().toISOString()}`);

  console.log("\n1. Running category discovery & live publishing across all 24 categories...");
  const res = await discoverNewsForAllCategories({
    limitPerCategory: 4,
    autoPublishToLive: true,
  });

  console.log(`Done! Processed ${res.categoriesProcessed} categories. Added: ${res.totalAdded}, Published live: ${res.publishedLiveTotal}`);

  console.log("\n2. Verifying public site data across all 24 categories via getHomeData...");
  const catsSnap = await db.collection("categories").get();
  let freshCount = 0;
  let totalCount = catsSnap.size;

  for (const cat of catsSnap.docs) {
    const d = cat.data();
    const data = await getHomeData({ categorySlug: d.slug });
    const topStory = data.topStories?.[0];
    const pubDate = topStory?.publishedAt ? new Date(topStory.publishedAt).toISOString() : "NO STORIES";
    const isFresh = pubDate.startsWith("2026-11-04") || pubDate.startsWith("2026-11-03");

    if (isFresh) {
      freshCount++;
      console.log(`✓ [LIVE FRESH] ${d.name.padEnd(16)} (${d.slug.padEnd(16)}) -> ${pubDate} | "${topStory?.title?.slice(0, 45)}"`);
    } else {
      console.log(`✗ [STALE]      ${d.name.padEnd(16)} (${d.slug.padEnd(16)}) -> ${pubDate} | "${topStory?.title?.slice(0, 45)}"`);
    }
  }

  console.log("\n3. Verifying Homepage (/) Live Feed...");
  const homeData = await getHomeData({});
  console.log(`Home top stories count: ${homeData.topStories?.length}`);
  console.log(`Home featured: "${homeData.topStories?.[0]?.title}" (${homeData.topStories?.[0]?.publishedAt})`);
  console.log(`Home 2nd story: "${homeData.topStories?.[1]?.title}" (${homeData.topStories?.[1]?.publishedAt})`);
  console.log(`Home 3rd story: "${homeData.topStories?.[2]?.title}" (${homeData.topStories?.[2]?.publishedAt})`);

  console.log("\n=================================================");
  console.log(`VERIFICATION RESULT: ${freshCount}/${totalCount} categories are LIVE FRESH (November 2026)!`);
  console.log("=================================================");
}

main().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});

