import "dotenv/config";
import { executeDailyMorningNewsCron } from "../src/lib/serpapi";

async function main() {
  console.log("=========================================");
  console.log("India Mornings - SerpAPI Morning Cron Job");
  console.log("=========================================");
  console.log(`Starting execution at ${new Date().toISOString()}...`);

  const result = await executeDailyMorningNewsCron();

  console.log("-----------------------------------------");
  console.log(`Success:   ${result.success}`);
  console.log(`Count:     ${result.count} articles`);
  console.log(`Message:   ${result.message}`);
  console.log(`Timestamp: ${result.timestamp}`);
  if (result.error) {
    console.error(`Error:     ${result.error}`);
  }
  if (result.articles && result.articles.length > 0) {
    console.log("Sample Headlines fetched:");
    result.articles.slice(0, 5).forEach((art, idx) => {
      console.log(`  ${idx + 1}. [${art.source.name}] ${art.title}`);
      console.log(`     Link: ${art.link}`);
    });
  }
  console.log("=========================================");
}

main().catch((err) => {
  console.error("Fatal error running SerpAPI cron script:", err);
  process.exit(1);
});

