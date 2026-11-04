import { db } from "@/src/lib/firebase-admin";
import { slugify } from "@/src/utils/slug";
import { generateSearchKeywords } from "@/src/utils/taxonomy";
import { extractFullArticleContent } from "@/src/lib/article-extractor";

export interface SerpApiSource {
  name: string;
  icon?: string;
  authors?: string[];
}

export interface SerpApiNewsArticle {
  id: string;
  title: string;
  link: string;
  source: SerpApiSource;
  snippet?: string;
  thumbnailUrl?: string | null;
  publishedAt?: string;
  isoDate?: string;
  category?: string;
  region?: string;
  position?: number;
}

export interface DiscoveredNewsArticle extends SerpApiNewsArticle {
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  status: "DISCOVERED" | "DISMISSED" | "DRAFT_CREATED";
  discoveredAt: string;
  dismissedAt?: string | null;
  dismissedBy?: string | null;
  draftArticleId?: string | null;
  publishedArticleId?: string | null;
  isLivePublished?: boolean;
  contentHtml?: string;
}

export interface SerpApiNewsOptions {
  query?: string;
  engine?: "google_news" | "google";
  gl?: string; // Geographic location, e.g. "in" for India
  hl?: string; // Language, e.g. "en" for English, "mr" for Marathi, "hi" for Hindi
  tbs?: string; // Time filter: "qdr:d" (past 24h), "qdr:w" (past week), "qdr:m" (past month)
  topicToken?: string;
  storyToken?: string;
  limit?: number;
}

export interface SerpApiNewsResponse {
  success: boolean;
  totalResults: number;
  articles: SerpApiNewsArticle[];
  fetchedAt: string;
  query?: string;
  engine?: string;
  error?: string;
}

const DEFAULT_SERPAPI_KEY = "604b591d2d85c95b5b563c1eb585068558070ecedd3cf1520519622566d6192e";

/**
 * Returns the configured SerpAPI key from environment or fallback
 */
export function getSerpApiKey(): string {
  return process.env.SERPAPI_API_KEY || DEFAULT_SERPAPI_KEY;
}

/**
 * Generates a stable deterministic ID from a string (e.g. link or title)
 */
function generateStableId(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return "serp_" + Math.abs(hash).toString(36);
}

/**
 * Sanitizes object data for Firestore by converting any undefined values to null or omitting them
 */
function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) => (value === undefined ? null : value))
  );
}

/**
 * Fetches news results from SerpAPI Google News engine
 */
export async function fetchGoogleNews(options: SerpApiNewsOptions = {}): Promise<SerpApiNewsResponse> {
  const apiKey = getSerpApiKey();
  const limit = options.limit || 20;
  const gl = options.gl || "in";
  const hl = options.hl || "en";

  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", options.engine || "google_news");
  url.searchParams.set("gl", gl);
  url.searchParams.set("hl", hl);
  url.searchParams.set("api_key", apiKey);

  if (options.query) {
    url.searchParams.set("q", options.query);
  }
  if (options.topicToken) {
    url.searchParams.set("topic_token", options.topicToken);
  }
  if (options.storyToken) {
    url.searchParams.set("story_token", options.storyToken);
  }

  // Ensure fresh, recent news (default to past 24 hours: "qdr:d")
  const timeFilter = options.tbs !== undefined ? options.tbs : "qdr:d";
  if (timeFilter) {
    url.searchParams.set("tbs", timeFilter);
  }

  const fetchedAt = new Date().toISOString();

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`SerpAPI error status ${res.status}:`, errText);
      return {
        success: false,
        totalResults: 0,
        articles: [],
        fetchedAt,
        error: `SerpAPI returned status ${res.status}: ${errText.slice(0, 200)}`,
      };
    }

    const data = await res.json();

    if (data.error) {
      return {
        success: false,
        totalResults: 0,
        articles: [],
        fetchedAt,
        error: data.error,
      };
    }

    const rawNewsResults = data.news_results || [];
    const normalizedArticles: SerpApiNewsArticle[] = [];

    for (const item of rawNewsResults) {
      if (normalizedArticles.length >= limit) break;

      // Handle direct article result
      if (item.title && item.link) {
        normalizedArticles.push({
          id: generateStableId(item.link || item.title),
          title: item.title,
          link: item.link,
          source: {
            name: item.source?.name || item.source || "Unknown",
            icon: item.source?.icon || undefined,
            authors: item.source?.authors || undefined,
          },
          snippet: item.snippet || "",
          thumbnailUrl: item.thumbnail || item.thumbnail_small || null,
          publishedAt: item.date || item.published_at || fetchedAt,
          isoDate: item.iso_date || fetchedAt,
          position: item.position,
        });
      }

      // Handle highlight item (Google News featured block)
      if (item.highlight && item.highlight.title && item.highlight.link) {
        const hlItem = item.highlight;
        normalizedArticles.push({
          id: generateStableId(hlItem.link || hlItem.title),
          title: hlItem.title,
          link: hlItem.link,
          source: {
            name: hlItem.source?.name || "Unknown",
            icon: hlItem.source?.icon || undefined,
            authors: hlItem.source?.authors || undefined,
          },
          snippet: hlItem.snippet || "",
          thumbnailUrl: hlItem.thumbnail || hlItem.thumbnail_small || null,
          publishedAt: hlItem.date || fetchedAt,
          isoDate: hlItem.iso_date || fetchedAt,
          position: item.position,
        });
      }

      // Handle grouped sub-stories in Google News topics
      if (Array.isArray(item.stories)) {
        for (const story of item.stories) {
          if (normalizedArticles.length >= limit) break;
          if (story.title && story.link) {
            normalizedArticles.push({
              id: generateStableId(story.link || story.title),
              title: story.title,
              link: story.link,
              source: {
                name: story.source?.name || "Unknown",
                icon: story.source?.icon || undefined,
                authors: story.source?.authors || undefined,
              },
              snippet: story.snippet || "",
              thumbnailUrl: story.thumbnail || story.thumbnail_small || null,
              publishedAt: story.date || fetchedAt,
              isoDate: story.iso_date || fetchedAt,
              position: story.position,
            });
          }
        }
      }
    }

    return {
      success: true,
      totalResults: normalizedArticles.length,
      articles: normalizedArticles,
      fetchedAt,
      query: options.query,
      engine: options.engine || "google_news",
    };
  } catch (error: any) {
    console.error("SerpAPI fetch failed:", error);
    return {
      success: false,
      totalResults: 0,
      articles: [],
      fetchedAt,
      error: error?.message || "Unknown SerpAPI error",
    };
  }
}

/**
 * Searches Google Search News tab (engine=google, tbm=nws) for deep keyword search
 */
export async function searchGoogleNews(query: string, options: SerpApiNewsOptions = {}): Promise<SerpApiNewsResponse> {
  const apiKey = getSerpApiKey();
  const limit = options.limit || 15;
  const gl = options.gl || "in";
  const hl = options.hl || "en";

  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google");
  url.searchParams.set("tbm", "nws");
  url.searchParams.set("q", query);
  url.searchParams.set("gl", gl);
  url.searchParams.set("hl", hl);
  url.searchParams.set("api_key", apiKey);

  const timeFilter = options.tbs !== undefined ? options.tbs : "qdr:d";
  if (timeFilter) {
    url.searchParams.set("tbs", timeFilter);
  }

  const fetchedAt = new Date().toISOString();

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        success: false,
        totalResults: 0,
        articles: [],
        fetchedAt,
        error: `SerpAPI Google News search returned status ${res.status}: ${errText.slice(0, 200)}`,
      };
    }

    const data = await res.json();
    const rawNewsResults = data.news_results || [];
    const articles: SerpApiNewsArticle[] = rawNewsResults.slice(0, limit).map((item: any) => ({
      id: generateStableId(item.link || item.title),
      title: item.title,
      link: item.link,
      source: {
        name: typeof item.source === "string" ? item.source : item.source?.name || "Unknown",
        icon: item.source?.icon,
      },
      snippet: item.snippet || "",
      thumbnailUrl: item.thumbnail || null,
      publishedAt: item.date || item.published_at || fetchedAt,
      isoDate: item.published_at || fetchedAt,
      position: item.position,
    }));

    return {
      success: true,
      totalResults: articles.length,
      articles,
      fetchedAt,
      query,
      engine: "google_nws",
    };
  } catch (error: any) {
    console.error("SerpAPI Google News search failed:", error);
    return {
      success: false,
      totalResults: 0,
      articles: [],
      fetchedAt,
      error: error?.message || "Unknown SerpAPI error",
    };
  }
}

/**
 * Fetches the daily morning news digest for India
 */
export async function fetchDailyMorningNews(options: { limit?: number; query?: string } = {}): Promise<SerpApiNewsResponse> {
  // Query top stories for India
  return fetchGoogleNews({
    query: options.query || "India top news",
    gl: "in",
    hl: "en",
    limit: options.limit || 25,
  });
}

/**
 * Saves a daily SerpAPI news snapshot into Firestore
 */
export async function saveMorningNewsToFirestore(data: SerpApiNewsResponse): Promise<{
  snapshotId: string;
  savedCount: number;
  message: string;
}> {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const timestamp = new Date().toISOString();

  try {
    const batch = db.batch();

    // 1. Update latest snapshot document
    const latestDocRef = db.collection("serpapi_news").doc("latest");
    batch.set(
      latestDocRef,
      sanitizeForFirestore({
        ...data,
        updatedAt: timestamp,
      })
    );

    // 2. Save daily archive document
    const dailyDocRef = db.collection("serpapi_news_history").doc(today);
    batch.set(
      dailyDocRef,
      sanitizeForFirestore({
        date: today,
        count: data.articles.length,
        articles: data.articles,
        fetchedAt: data.fetchedAt,
        updatedAt: timestamp,
      })
    );

    // 3. Save individual articles into serpapi_articles collection (upsert to prevent duplicate IDs)
    data.articles.forEach((art) => {
      const artRef = db.collection("serpapi_articles").doc(art.id);
      batch.set(
        artRef,
        sanitizeForFirestore({
          ...art,
          date: today,
          updatedAt: timestamp,
        }),
        { merge: true }
      );
    });

    await batch.commit();

    // 4. Record audit log
    await db.collection("audit_logs").add({
      actorId: "SYSTEM",
      actorRole: "CRON",
      action: "SERPAPI_DAILY_NEWS_SYNC",
      entity: "SerpApiNews",
      entityId: today,
      count: data.articles.length,
      createdAt: timestamp,
    });

    return {
      snapshotId: today,
      savedCount: data.articles.length,
      message: `Successfully synchronized ${data.articles.length} news items for ${today}`,
    };
  } catch (error: any) {
    console.error("Error saving morning news snapshot to Firestore:", error);
    throw error;
  }
}

/**
 * Executes the complete morning news cron job workflow:
 * 1. Fetches morning news via SerpAPI
 * 2. Persists to Firestore
 * 3. Returns execution summary
 */
export async function executeDailyMorningNewsCron(): Promise<{
  success: boolean;
  count: number;
  message: string;
  timestamp: string;
  articles?: SerpApiNewsArticle[];
  error?: string;
}> {
  const timestamp = new Date().toISOString();

  try {
    console.log(`[SerpAPI Cron] Starting morning news fetch at ${timestamp}...`);

    const newsResult = await fetchDailyMorningNews({ limit: 25 });

    if (!newsResult.success) {
      console.error("[SerpAPI Cron] Failed to fetch morning news:", newsResult.error);
      return {
        success: false,
        count: 0,
        message: newsResult.error || "Failed to fetch morning news",
        timestamp,
        error: newsResult.error,
      };
    }

    console.log(`[SerpAPI Cron] Fetched ${newsResult.articles.length} news items. Saving to database...`);
    const saveResult = await saveMorningNewsToFirestore(newsResult);

    // Automatically publish the fresh morning news to live 'articles' so users immediately see today's news!
    console.log("[SerpAPI Cron] Publishing fresh morning news to live articles...");
    let publishedLiveCount = 0;
    try {
      const publishRes = await publishNewsToLiveArticles(newsResult.articles);
      publishedLiveCount = publishRes.publishedCount;
      console.log(`[SerpAPI Cron] Published ${publishedLiveCount} fresh news stories to live website.`);
    } catch (pubErr) {
      console.warn("[SerpAPI Cron] Live article publishing warning:", pubErr);
    }

    // Also run category news discovery for all existing categories and publish
    console.log("[SerpAPI Cron] Running automated category discovery for desks...");
    let categoryDiscoveryCount = 0;
    try {
      const discoveryResult = await discoverNewsForAllCategories({ limitPerCategory: 5, autoPublishToLive: true });
      categoryDiscoveryCount = discoveryResult.totalAdded;
      console.log(`[SerpAPI Cron] Discovered & published ${categoryDiscoveryCount} new categorized articles across ${discoveryResult.categoriesProcessed} categories.`);
    } catch (discErr) {
      console.warn("[SerpAPI Cron] Category discovery non-fatal warning:", discErr);
    }

    console.log(`[SerpAPI Cron] Successfully executed: ${saveResult.message}`);
    return {
      success: true,
      count: saveResult.savedCount + categoryDiscoveryCount + publishedLiveCount,
      message: `${saveResult.message}. Published ${publishedLiveCount} top stories and ${categoryDiscoveryCount} category leads to the live site.`,
      timestamp,
      articles: newsResult.articles,
    };
  } catch (error: any) {
    console.error("[SerpAPI Cron] Error during execution:", error);
    return {
      success: false,
      count: 0,
      message: error?.message || "Execution failed",
      timestamp,
      error: error?.message,
    };
  }
}

/**
 * Query templates specifically tailored to existing categories
 */
export const CATEGORY_QUERY_MAP: Record<string, string> = {
  "astha": "spiritual news India",
  "breaking": "Breaking news India",
  "business": "Business news India",
  "crime": "Crime news India",
  "editorial": "opinion news India",
  "education": "Education news India",
  "entertainment": "Entertainment Bollywood news",
  "health": "Health news India",
  "national": "National news India",
  "international": "World news",
  "sports": "Sports news India",
  "lifestyle": "Lifestyle news India",
  "politices": "Politics news India",
  "politics": "Politics news India",
  "maharashtra": "Maharashtra news",
  "mumbai": "Mumbai news",
  "pune": "Pune news",
  "nashik": "Nashik city news",
  "vidharbha": "Vidarbha news",
  "rashi-bhavishya": "horoscope today India",
  "weather": "Weather forecast India",
  "news": "Top news India",
  "marathi": "Marathi news",
  "hindi": "Hindi news",
  "english": "India English news"
};

/**
 * Derives a targeted query for any existing category
 */
export function getCategorySearchQuery(name: string, slug: string): string {
  const normalizedSlug = (slug || "").toLowerCase().trim();
  if (CATEGORY_QUERY_MAP[normalizedSlug]) {
    return CATEGORY_QUERY_MAP[normalizedSlug];
  }
  const normalizedName = (name || "").toLowerCase().trim();
  if (CATEGORY_QUERY_MAP[normalizedName]) {
    return CATEGORY_QUERY_MAP[normalizedName];
  }
  return `${name} India news`;
}

/**
 * Automatically infers the most relevant category based on keywords in title & snippet
 */
export async function inferCategory(
  title: string,
  snippet: string = ""
): Promise<{ id: string; name: string; slug: string } | null> {
  const text = `${title} ${snippet}`.toLowerCase();

  const rules: { keywords: string[]; slug: string }[] = [
    { keywords: ["cricket", "match", "wicket", "tournament", "ipl", "odi", "t20", "score", "batsman", "bowler", "athletics", "football", "hockey", "sports", "coach"], slug: "sports" },
    { keywords: ["sensex", "nifty", "stock", "shares", "rbi", "inflation", "market", "gdp", "rupee", "bank", "investor", "revenue", "fiscal", "economy", "business"], slug: "business" },
    { keywords: ["police", "arrest", "murder", "fir", "crime", "custody", "gangster", "cbi", "ed", "fraud", "scam", "smuggling", "encounter"], slug: "crime" },
    { keywords: ["bollywood", "movie", "film", "actor", "actress", "box office", "trailer", "cinema", "ott", "entertainment"], slug: "entertainment" },
    { keywords: ["hospital", "patient", "doctor", "health", "disease", "wellness", "medical", "surgery", "cancer", "vaccine", "dhanteras"], slug: "health" },
    { keywords: ["rain", "monsoon", "cyclone", "temperature", "forecast", "weather", "imd", "heatwave", "delhi air", "pollution"], slug: "weather" },
    { keywords: ["school", "college", "exam", "student", "cbse", "university", "neet", "jee", "education", "teacher", "academic"], slug: "education" },
    { keywords: ["horoscope", "rashifal", "zodiac", "astrology", "astrological"], slug: "rashi-bhavishya" },
    { keywords: ["temple", "puja", "dharma", "spiritual", "bhakti", "astha", "prasad", "deity"], slug: "astha" },
    { keywords: ["election", "bjp", "congress", "vote", "poll", "minister", "parliament", "rahul gandhi", "modi", "politics", "cabinet", "mla", "mp"], slug: "politices" },
    { keywords: ["mumbai", "bmc", "borivali", "dadar", "thane"], slug: "mumbai" },
    { keywords: ["pune", "pmc"], slug: "pune" },
    { keywords: ["nashik"], slug: "nashik" },
    { keywords: ["vidarbha", "nagpur"], slug: "vidharbha" },
    { keywords: ["maharashtra", "mantralaya", "fadnavis", "shinde", "thackeray"], slug: "maharashtra" },
  ];

  for (const rule of rules) {
    if (rule.keywords.some((kw) => text.includes(kw))) {
      const snap = await db.collection("categories").where("slug", "==", rule.slug).limit(1).get();
      if (!snap.empty) {
        const doc = snap.docs[0];
        return { id: doc.id, name: doc.data().name, slug: doc.data().slug };
      }
    }
  }

  // Fallback to "national" or "news"
  const natSnap = await db.collection("categories").where("slug", "in", ["national", "news"]).limit(1).get();
  if (!natSnap.empty) {
    const doc = natSnap.docs[0];
    return { id: doc.id, name: doc.data().name, slug: doc.data().slug };
  }

  return null;
}

/**
 * Retrieves the set of all dismissed article IDs to guarantee they never reappear
 */
export async function getDismissedIdsSet(): Promise<Set<string>> {
  const set = new Set<string>();
  try {
    const snap = await db.collection("dismissed_news").get();
    snap.docs.forEach((doc) => set.add(doc.id));
  } catch (err) {
    console.warn("Could not load dismissed_news collection:", err);
  }
  return set;
}

/**
 * Discovers and saves latest relevant news for a single category
 */
export async function discoverNewsForCategory(
  category: { id: string; name: string; slug: string },
  limit = 8,
  options?: { autoPublishToLive?: boolean }
): Promise<{ added: number; totalFetched: number; publishedLive: number }> {
  const query = getCategorySearchQuery(category.name, category.slug);
  const serpRes = await fetchGoogleNews({
    query,
    gl: "in",
    hl: "en",
    tbs: "qdr:d",
    limit,
  });

  if (!serpRes.success || !serpRes.articles || serpRes.articles.length === 0) {
    return { added: 0, totalFetched: 0, publishedLive: 0 };
  }

  const dismissedSet = await getDismissedIdsSet();
  const timestamp = new Date().toISOString();
  let added = 0;
  let publishedLive = 0;

  for (const art of serpRes.articles) {
    // Crucial requirement: Ensure dismissed news NEVER reappears!
    if (dismissedSet.has(art.id)) {
      continue;
    }

    const docRef = db.collection("discovered_articles").doc(art.id);
    const existing = await docRef.get();

    if (existing.exists) {
      const data = existing.data();
      // If previously dismissed, preserve dismissed state and skip
      if (data?.status === "DISMISSED") {
        continue;
      }
      // If autoPublishToLive is enabled and this article hasn't been published yet, publish it to live
      if (options?.autoPublishToLive && !data?.draftArticleId) {
        try {
          const leadArt: DiscoveredNewsArticle = {
            id: art.id,
            ...(data as any),
            categoryId: category.id,
            categoryName: category.name,
            categorySlug: category.slug,
          };
          const pubRes = await publishArticleToLive(leadArt, {
            categoryId: category.id,
            categoryName: category.name,
            categorySlug: category.slug,
          });
          if (pubRes.success) {
            publishedLive++;
          }
        } catch (pubErr) {
          console.warn(`Could not auto-publish existing article "${art.title}" to live:`, pubErr);
        }
      }
      continue;
    }

    let leadImage: string | null = null;
    let fullExcerpt: string | undefined = undefined;
    let fullContentHtml: string | undefined = undefined;

    try {
      const extracted = await extractFullArticleContent(art.link, {
        fallbackTitle: art.title,
        fallbackSnippet: art.snippet,
        sourceName: art.source?.name,
        timeoutMs: 4000,
      });
      leadImage = extracted.leadImage || null;
      fullExcerpt = extracted.excerpt;
      fullContentHtml = extracted.contentHtml;
    } catch (e) {}

    const discoveredArt: DiscoveredNewsArticle = {
      ...art,
      snippet: fullExcerpt || art.snippet,
      thumbnailUrl: art.thumbnailUrl || leadImage || null,
      contentHtml: fullContentHtml,
      categoryId: category.id,
      categoryName: category.name,
      categorySlug: category.slug,
      status: "DISCOVERED",
      discoveredAt: timestamp,
      dismissedAt: null,
      dismissedBy: null,
      draftArticleId: null,
    };

    await docRef.set(sanitizeForFirestore(discoveredArt));
    added++;

    // If autoPublishToLive is enabled, immediately publish to the live site
    if (options?.autoPublishToLive) {
      try {
        const pubRes = await publishArticleToLive(discoveredArt, {
          categoryId: category.id,
          categoryName: category.name,
          categorySlug: category.slug,
        });
        if (pubRes.success) {
          publishedLive++;
        }
      } catch (pubErr) {
        console.warn(`Could not auto-publish article "${art.title}" to live:`, pubErr);
      }
    }
  }

  return { added, totalFetched: serpRes.articles.length, publishedLive };
}

/**
 * Discovers news for all existing categories in the database
 */
export async function discoverNewsForAllCategories(options?: {
  limitPerCategory?: number;
  categoryIds?: string[];
  autoPublishToLive?: boolean;
}): Promise<{ totalAdded: number; categoriesProcessed: number; publishedLiveTotal: number; details: Record<string, number> }> {
  const limitPerCat = options?.limitPerCategory || 5;
  const categoriesSnap = await db.collection("categories").get();
  const categories = categoriesSnap.docs.map((doc) => ({
    id: doc.id,
    name: doc.data().name,
    slug: doc.data().slug,
  }));

  const filteredCategories = options?.categoryIds && options.categoryIds.length > 0
    ? categories.filter((c) => options.categoryIds!.includes(c.id))
    : categories;

  let totalAdded = 0;
  let publishedLiveTotal = 0;
  const details: Record<string, number> = {};

  for (const cat of filteredCategories) {
    try {
      const res = await discoverNewsForCategory(cat, limitPerCat, { autoPublishToLive: options?.autoPublishToLive });
      details[cat.name] = res.added;
      totalAdded += res.added;
      publishedLiveTotal += res.publishedLive;
    } catch (err) {
      console.error(`Error discovering news for category ${cat.name}:`, err);
      details[cat.name] = 0;
    }
  }

  return {
    totalAdded,
    categoriesProcessed: filteredCategories.length,
    publishedLiveTotal,
    details,
  };
}

/**
 * Permanently dismisses a discovered news article so it will never reappear
 */
export async function dismissDiscoveredArticle(
  id: string,
  actorId: string,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  const timestamp = new Date().toISOString();

  // 1. Add to permanent dismissed_news collection so it can never reappear
  await db.collection("dismissed_news").doc(id).set({
    id,
    dismissedAt: timestamp,
    dismissedBy: actorId,
    reason: reason || "Irrelevant or not required",
  });

  // 2. Update status in discovered_articles collection, and archive from live site if published
  const artRef = db.collection("discovered_articles").doc(id);
  const existing = await artRef.get();
  if (existing.exists) {
    const d = existing.data();
    if (d?.draftArticleId) {
      try {
        await db.collection("articles").doc(d.draftArticleId).update({
          status: "ARCHIVED",
          updatedAt: timestamp,
        });
      } catch (err) {
        console.warn("Could not archive article from live collection:", err);
      }
    }
    await artRef.update({
      status: "DISMISSED",
      dismissedAt: timestamp,
      dismissedBy: actorId,
    });
  }

  // 3. Record audit log
  await db.collection("audit_logs").add({
    actorId,
    actorRole: "ADMIN",
    action: "DISCOVERY_ARTICLE_DISMISSED",
    entity: "DiscoveredArticle",
    entityId: id,
    createdAt: timestamp,
  });

  return { success: true, message: "Article dismissed and permanently excluded from future discovery." };
}

/**
 * Restores a dismissed article back to active discovery leads
 */
export async function restoreDiscoveredArticle(
  id: string,
  actorId: string
): Promise<{ success: boolean; message: string }> {
  const timestamp = new Date().toISOString();

  // 1. Remove from dismissed_news collection
  await db.collection("dismissed_news").doc(id).delete();

  // 2. Update status in discovered_articles collection and unarchive live article if exists
  const artRef = db.collection("discovered_articles").doc(id);
  const existing = await artRef.get();
  if (existing.exists) {
    const d = existing.data();
    if (d?.draftArticleId) {
      try {
        await db.collection("articles").doc(d.draftArticleId).update({
          status: "PUBLISHED",
          updatedAt: timestamp,
        });
      } catch (err) {
        console.warn("Could not restore live article status:", err);
      }
    }
    await artRef.update({
      status: "DISCOVERED",
      dismissedAt: null,
      dismissedBy: null,
    });
  }

  // 3. Audit log
  await db.collection("audit_logs").add({
    actorId,
    actorRole: "ADMIN",
    action: "DISCOVERY_ARTICLE_RESTORED",
    entity: "DiscoveredArticle",
    entityId: id,
    createdAt: timestamp,
  });

  return { success: true, message: "Article restored to active discovery leads." };
}

/**
 * Converts a discovered news item into a Draft in the CMS articles collection
 */
export async function convertDiscoveredToDraft(
  id: string,
  actor: { id: string; role: string; name?: string }
): Promise<{ success: boolean; articleId: string; slug: string; message: string }> {
  const artRef = db.collection("discovered_articles").doc(id);
  const doc = await artRef.get();
  if (!doc.exists) {
    throw new Error("Discovered article not found");
  }

  const data = doc.data() as DiscoveredNewsArticle;
  const timestamp = new Date().toISOString();

  const baseSlug = slugify(data.title);
  let slug = baseSlug;
  let counter = 1;
  while (!(await db.collection("articles").where("slug", "==", slug).get()).empty) {
    slug = `${baseSlug}-${counter++}`;
  }

  const searchKeywords = generateSearchKeywords([data.title, data.snippet || ""]);

  // Extract full rich article content from the original publisher URL
  const extracted = await extractFullArticleContent(data.link, {
    fallbackTitle: data.title,
    fallbackSnippet: data.snippet,
    sourceName: data.source?.name,
  });

  const contentHtml = extracted.contentHtml;
  const excerpt = extracted.excerpt || data.snippet || null;
  const coverImageUrl = data.thumbnailUrl || extracted.leadImage || null;

  const newArticle = {
    title: data.title,
    slug,
    searchKeywords,
    excerpt,
    contentHtml,
    coverImageUrl,
    language: "EN",
    region: "MAHARASHTRA",
    categoryIds: data.categoryId ? [data.categoryId] : [],
    categoryId: data.categoryId || null,
    authorId: actor.id,
    seoTitle: data.title,
    metaDescription: excerpt,
    canonicalUrl: data.link || null,
    tagIds: [],
    status: "DRAFT",
    scheduledAt: null,
    publishedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const articleRef = await db.collection("articles").add(newArticle);

  await artRef.update({
    status: "DRAFT_CREATED",
    draftArticleId: articleRef.id,
    updatedAt: timestamp,
  });

  await db.collection("audit_logs").add({
    actorId: actor.id,
    actorRole: actor.role,
    action: "DISCOVERY_CONVERT_DRAFT",
    entity: "Article",
    entityId: articleRef.id,
    sourceDiscoveryId: id,
    createdAt: timestamp,
  });

  return {
    success: true,
    articleId: articleRef.id,
    slug,
    message: "Article converted to draft successfully!",
  };
}

/**
 * Directly publishes a discovered or SerpAPI news article to 'articles' with status PUBLISHED
 */
export async function publishArticleToLive(
  art: SerpApiNewsArticle | DiscoveredNewsArticle,
  options?: {
    categoryId?: string;
    categorySlug?: string;
    categoryName?: string;
    actorId?: string;
  }
): Promise<{ success: boolean; articleId: string; slug: string; message: string }> {
  if (!art.title) {
    throw new Error("Article title is missing");
  }

  const dismissedSet = await getDismissedIdsSet();
  if (dismissedSet.has(art.id)) {
    throw new Error("Article has been dismissed and will not be published to live site.");
  }

  let authorId = options?.actorId;
  if (!authorId) {
    const adminSnap = await db.collection("users").where("role", "in", ["SUPER_ADMIN", "ADMIN"]).limit(1).get();
    authorId = !adminSnap.empty ? adminSnap.docs[0].id : "55hpLfCdinmJKUlZj81I";
  }

  // Resolve category
  let categoryId = options?.categoryId || (art as DiscoveredNewsArticle).categoryId;
  if (!categoryId) {
    const itemCat = (art as DiscoveredNewsArticle).categorySlug || (art as DiscoveredNewsArticle).categoryName;
    if (itemCat) {
      const catSnap = await db.collection("categories").where("slug", "==", itemCat.toLowerCase()).limit(1).get();
      if (!catSnap.empty) {
        categoryId = catSnap.docs[0].id;
      }
    }
  }

  if (!categoryId) {
    const inferred = await inferCategory(art.title, art.snippet || "");
    if (inferred) {
      categoryId = inferred.id;
    }
  }

  if (!categoryId) {
    const defaultCatSnap = await db.collection("categories").limit(1).get();
    if (!defaultCatSnap.empty) {
      categoryId = defaultCatSnap.docs[0].id;
    }
  }

  // Check if article with this title or link already exists in 'articles'
  const existingSnap = await db.collection("articles")
    .where("title", "==", art.title)
    .limit(1)
    .get();

  if (!existingSnap.empty) {
    const existingDoc = existingSnap.docs[0];
    return {
      success: true,
      articleId: existingDoc.id,
      slug: existingDoc.data()?.slug || "",
      message: "Article already published on live site.",
    };
  }

  const baseSlug = slugify(art.title);
  let slug = baseSlug;
  let counter = 1;
  while (!(await db.collection("articles").where("slug", "==", slug).get()).empty) {
    slug = `${baseSlug}-${counter++}`;
  }

  const searchKeywords = generateSearchKeywords([art.title, art.snippet || ""]);
  const now = new Date().toISOString();
  const publishedAt = art.isoDate || now;
  const sourceName = art.source?.name || "India Morning News Desk";

  // Extract full rich article content from the original publisher URL
  const extracted = await extractFullArticleContent(art.link, {
    fallbackTitle: art.title,
    fallbackSnippet: art.snippet,
    sourceName,
  });

  const contentHtml = extracted.contentHtml;
  const excerpt = extracted.excerpt || art.snippet || art.title;
  const coverImageUrl = art.thumbnailUrl || extracted.leadImage || null;

  const newArticle = {
    title: art.title,
    slug,
    searchKeywords,
    excerpt,
    contentHtml,
    coverImageUrl,
    language: "EN",
    region: "MAHARASHTRA",
    categoryIds: categoryId ? [categoryId] : [],
    categoryId: categoryId || null,
    authorId,
    seoTitle: art.title,
    metaDescription: excerpt,
    focusKeyphrase: art.title.split(" ").slice(0, 4).join(" "),
    canonicalUrl: art.link || null,
    tagIds: [],
    status: "PUBLISHED",
    scheduledAt: null,
    publishedAt,
    createdAt: now,
    updatedAt: now,
  };

  const articleRef = await db.collection("articles").add(sanitizeForFirestore(newArticle));

  if (art.id) {
    const discRef = db.collection("discovered_articles").doc(art.id);
    const discDoc = await discRef.get();
    if (discDoc.exists) {
      await discRef.update({
        status: "DRAFT_CREATED",
        draftArticleId: articleRef.id,
        updatedAt: now,
      });
    }
  }

  await db.collection("audit_logs").add({
    actorId: authorId,
    actorRole: "SYSTEM",
    action: "SERPAPI_LIVE_ARTICLE_PUBLISH",
    entity: "Article",
    entityId: articleRef.id,
    sourceDiscoveryId: art.id,
    createdAt: now,
  });

  return {
    success: true,
    articleId: articleRef.id,
    slug,
    message: "Article published live to user-facing website!",
  };
}

/**
 * Publishes an array of articles to live site in 'articles' collection
 */
export async function publishNewsToLiveArticles(
  articles: Array<SerpApiNewsArticle | DiscoveredNewsArticle>,
  options?: {
    categoryId?: string;
    actorId?: string;
  }
): Promise<{ publishedCount: number; articleIds: string[] }> {
  const publishedIds: string[] = [];

  for (const art of articles) {
    try {
      const res = await publishArticleToLive(art, options);
      if (res.success && res.articleId) {
        publishedIds.push(res.articleId);
      }
    } catch (err) {
      console.warn("Failed to publish live article:", art.title, err);
    }
  }

  return { publishedCount: publishedIds.length, articleIds: publishedIds };
}
