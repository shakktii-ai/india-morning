import { db } from "@/src/lib/firebase-admin";
import { slugify } from "@/src/utils/slug";
import { generateSearchKeywords } from "@/src/utils/taxonomy";
import {
  extractFullArticleContent,
  cleanHeadline,
  clusterAndDeduplicateArticles,
  identifyPublisher,
  TrustedPublisherInfo,
} from "@/src/lib/article-extractor";
import {
  checkDailySerpApiQuota,
  recordSerpApiCallUsage,
  getDailySerpApiUsage,
  MAX_DAILY_SERPAPI_CALLS,
} from "@/src/lib/serpapi-tracker";

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
  language?: "MR" | "EN";
  wordCount?: number;
  isMultiSourceVerified?: boolean;
  sourceUrls?: { name: string; url: string }[];
  keyFacts?: string[];
}

export interface SerpApiNewsOptions {
  query?: string;
  engine?: "google_news" | "google";
  gl?: string;
  hl?: string;
  tbs?: string;
  topicToken?: string;
  storyToken?: string;
  limit?: number;
  skipQuotaCheck?: boolean;
  bucketId?: string;
}

export interface SerpApiNewsResponse {
  success: boolean;
  totalResults: number;
  articles: SerpApiNewsArticle[];
  fetchedAt: string;
  query?: string;
  engine?: string;
  error?: string;
  quotaRemaining?: number;
}

const DEFAULT_SERPAPI_KEY = "604b591d2d85c95b5b563c1eb585068558070ecedd3cf1520519622566d6192e";

export function getSerpApiKey(): string {
  return process.env.SERPAPI_API_KEY || DEFAULT_SERPAPI_KEY;
}

function generateStableId(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return "serp_" + Math.abs(hash).toString(36);
}

function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) => (value === undefined ? null : value))
  );
}

/**
 * 4 Strategic Thematic Buckets strictly covering all news requirements
 * within exactly 4 SerpAPI calls per daily cron execution.
 */
export const DAILY_FOUR_BUCKETS = [
  {
    id: "bucket_1_maharashtra_marathi",
    name: "Maharashtra & Marathi News",
    query: `(site:loksatta.com OR site:esakal.com OR site:lokmat.com OR site:maharashtratimes.com OR site:marathi.abplive.com OR site:tv9marathi.com OR site:news18marathi.com OR site:pudhari.news OR site:bbc.com/marathi) (Maharashtra OR Mumbai OR Pune OR Nagpur OR Vidarbha OR Mantralaya OR शासन)`,
    hl: "mr",
    gl: "in",
    limit: 25,
    defaultRegion: "MAHARASHTRA",
    defaultLanguage: "MR" as const,
  },
  {
    id: "bucket_2_national_politics",
    name: "National & Indian Politics",
    query: `(site:thehindu.com OR site:indianexpress.com OR site:ndtv.com OR site:indiatoday.in OR site:hindustantimes.com OR site:pib.gov.in) (India OR politics OR Parliament OR Cabinet OR "Supreme Court" OR election)`,
    hl: "en",
    gl: "in",
    limit: 25,
    defaultRegion: "INDIA",
    defaultLanguage: "EN" as const,
  },
  {
    id: "bucket_3_business_economy",
    name: "Business, Economy & Finance",
    query: `(site:economictimes.indiatimes.com OR site:business-standard.com OR site:livemint.com OR site:rbi.org.in) (economy OR markets OR Sensex OR Nifty OR RBI OR inflation OR rupee OR finance India)`,
    hl: "en",
    gl: "in",
    limit: 25,
    defaultRegion: "INDIA",
    defaultLanguage: "EN" as const,
  },
  {
    id: "bucket_4_world_sports_desks",
    name: "International, Sports, Health, Education & Tech",
    query: `(site:thehindu.com OR site:indianexpress.com OR site:hindustantimes.com OR site:ndtv.com OR site:bbc.com) (sports OR cricket OR world OR international OR technology OR health OR education OR crime) India`,
    hl: "en",
    gl: "in",
    limit: 25,
    defaultRegion: "GLOBAL",
    defaultLanguage: "EN" as const,
  },
];

/**
 * Fetches news results from SerpAPI Google News engine with strict daily quota check
 */
export async function fetchGoogleNews(options: SerpApiNewsOptions = {}): Promise<SerpApiNewsResponse> {
  const fetchedAt = new Date().toISOString();

  // 1. Quota Check (unless explicitly bypassed)
  if (!options.skipQuotaCheck) {
    const quota = await checkDailySerpApiQuota();
    if (!quota.canProceed) {
      console.warn(`[SerpAPI] Daily quota limit of ${MAX_DAILY_SERPAPI_CALLS} reached (${quota.callsMade} made today). Aborting request to conserve quota.`);
      return {
        success: false,
        totalResults: 0,
        articles: [],
        fetchedAt,
        error: `Daily SerpAPI quota limit reached (${quota.callsMade}/${MAX_DAILY_SERPAPI_CALLS} calls used today).`,
        quotaRemaining: 0,
      };
    }
  }

  const apiKey = getSerpApiKey();
  const limit = options.limit || 25;
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

  const timeFilter = options.tbs !== undefined ? options.tbs : "qdr:d";
  if (timeFilter) {
    url.searchParams.set("tbs", timeFilter);
  }

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
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

    // 2. Record API call usage immediately upon success
    if (!options.skipQuotaCheck) {
      await recordSerpApiCallUsage(
        options.bucketId || "custom_query",
        options.query || "news",
        (data.news_results || []).length
      );
    }

    const rawNewsResults = data.news_results || [];
    const normalizedArticles: SerpApiNewsArticle[] = [];

    for (const item of rawNewsResults) {
      if (normalizedArticles.length >= limit) break;

      if (item.title && item.link) {
        normalizedArticles.push({
          id: generateStableId(item.link || item.title),
          title: cleanHeadline(item.title),
          link: item.link,
          source: {
            name: item.source?.name || item.source || "News Source",
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

      if (item.highlight && item.highlight.title && item.highlight.link) {
        const hlItem = item.highlight;
        normalizedArticles.push({
          id: generateStableId(hlItem.link || hlItem.title),
          title: cleanHeadline(hlItem.title),
          link: hlItem.link,
          source: {
            name: hlItem.source?.name || "News Source",
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

      if (Array.isArray(item.stories)) {
        for (const story of item.stories) {
          if (normalizedArticles.length >= limit) break;
          if (story.title && story.link) {
            normalizedArticles.push({
              id: generateStableId(story.link || story.title),
              title: cleanHeadline(story.title),
              link: story.link,
              source: {
                name: story.source?.name || "News Source",
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
 * Searches Google Search News tab (tbm=nws) for deep keyword search with quota check
 */
export async function searchGoogleNews(query: string, options: SerpApiNewsOptions = {}): Promise<SerpApiNewsResponse> {
  return fetchGoogleNews({
    ...options,
    query,
    engine: "google_news",
  });
}

/**
 * Fetches the daily morning news digest for India
 */
export async function fetchDailyMorningNews(options: { limit?: number; query?: string } = {}): Promise<SerpApiNewsResponse> {
  return fetchGoogleNews({
    query: options.query || "India Maharashtra top news",
    gl: "in",
    hl: "en",
    limit: options.limit || 25,
    bucketId: "morning_digest",
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
  const today = new Date().toISOString().slice(0, 10);
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

    // 3. Save individual articles into serpapi_articles collection
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
 * Retrieves the set of all dismissed article IDs to guarantee they NEVER reappear
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
 * Maps discovered news directly to existing categories
 */
export async function inferCategory(
  title: string,
  snippet: string = ""
): Promise<{ id: string; name: string; slug: string } | null> {
  const text = `${title} ${snippet}`.toLowerCase();

  const rules: { keywords: string[]; slug: string }[] = [
    { keywords: ["cricket", "match", "wicket", "tournament", "ipl", "odi", "t20", "score", "batsman", "bowler", "athletics", "football", "hockey", "sports", "coach", "खेळ", "क्रिकेट"], slug: "sports" },
    { keywords: ["sensex", "nifty", "stock", "shares", "rbi", "inflation", "market", "gdp", "rupee", "bank", "investor", "revenue", "fiscal", "economy", "business", "व्यापार", "अर्थव्यवस्था", "शेअर बाजार"], slug: "business" },
    { keywords: ["police", "arrest", "murder", "fir", "crime", "custody", "gangster", "cbi", "ed", "fraud", "scam", "smuggling", "encounter", "गुन्हे", "हत्या", "अटक", "पोलीस"], slug: "crime" },
    { keywords: ["bollywood", "movie", "film", "actor", "actress", "box office", "trailer", "cinema", "ott", "entertainment", "मनोरंजन", "चित्रपट", "अभिनेता"], slug: "entertainment" },
    { keywords: ["hospital", "patient", "doctor", "health", "disease", "wellness", "medical", "surgery", "cancer", "vaccine", "आरोग्य", "रुग्णालय", "डॉक्टर"], slug: "health" },
    { keywords: ["rain", "monsoon", "cyclone", "temperature", "forecast", "weather", "imd", "heatwave", "delhi air", "pollution", "हवामान", "पाऊस"], slug: "weather" },
    { keywords: ["school", "college", "exam", "student", "cbse", "university", "neet", "jee", "education", "teacher", "academic", "शिक्षण", "विद्यापीठ", "परीक्षा"], slug: "education" },
    { keywords: ["horoscope", "rashifal", "zodiac", "astrology", "astrological", "राशी", "भविष्य", "कुंडली"], slug: "rashi-bhavishya" },
    { keywords: ["temple", "puja", "dharma", "spiritual", "bhakti", "astha", "prasad", "deity", "मंदिर", "पूजा", "आस्था", "अध्यात्मिक"], slug: "astha" },
    { keywords: ["election", "bjp", "congress", "vote", "poll", "minister", "parliament", "rahul gandhi", "modi", "politics", "cabinet", "mla", "mp", "निवडणूक", "राजकारण", "मंत्रिमंडळ"], slug: "politices" },
    { keywords: ["mumbai", "bmc", "borivali", "dadar", "thane", "मुंबई", "ठाणे"], slug: "mumbai" },
    { keywords: ["pune", "pmc", "पुणे"], slug: "pune" },
    { keywords: ["nashik", "नाशिक"], slug: "nashik" },
    { keywords: ["vidarbha", "nagpur", "विदर्भ", "नागपूर"], slug: "vidharbha" },
    { keywords: ["maharashtra", "mantralaya", "fadnavis", "shinde", "thackeray", "महाराष्ट्र", "मंत्रालय"], slug: "maharashtra" },
    { keywords: ["editorial", "opinion", "analysis", "संपादकीय", "अग्रलेख"], slug: "editorial" },
    { keywords: ["world", "global", "us", "russia", "china", "uk", "israel", "iran", "international", "आंतरराष्ट्रीय", "परदेश"], slug: "international" },
    { keywords: ["breaking", "urgent", "flash", "ताजी बातमी", "महत्त्वाचे वृत्त"], slug: "breaking" },
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

  // Fallback to "maharashtra" or "national"
  const natSnap = await db.collection("categories").where("slug", "in", ["maharashtra", "national", "news"]).limit(1).get();
  if (!natSnap.empty) {
    const doc = natSnap.docs[0];
    return { id: doc.id, name: doc.data().name, slug: doc.data().slug };
  }

  return null;
}

/**
 * Core 4-Bucket News Discovery Engine:
 * Strictly executes MAXIMUM 4 SerpAPI calls, discovering 80-100 high-quality stories,
 * extracts full newspaper-grade articles, and synchronizes to Discovery & Live site.
 */
export async function executeFourBucketMorningNewsCron(options?: {
  autoPublishToLive?: boolean;
}): Promise<{
  success: boolean;
  count: number;
  message: string;
  timestamp: string;
  callsMade: number;
  publishedLiveCount: number;
  articles?: DiscoveredNewsArticle[];
  error?: string;
}> {
  const timestamp = new Date().toISOString();
  console.log(`[SerpAPI 4-Bucket Engine] Starting morning execution at ${timestamp}...`);

  // Verify daily quota
  const quota = await checkDailySerpApiQuota();
  if (!quota.canProceed) {
    return {
      success: false,
      count: 0,
      message: `Daily SerpAPI call quota exhausted (${quota.callsMade}/${MAX_DAILY_SERPAPI_CALLS} calls used today).`,
      timestamp,
      callsMade: quota.callsMade,
      publishedLiveCount: 0,
      error: "Daily quota exhausted",
    };
  }

  const dismissedSet = await getDismissedIdsSet();
  const rawArticles: SerpApiNewsArticle[] = [];
  let callsMadeThisRun = 0;

  // Execute up to the remaining quota (at most 4 calls)
  for (const bucket of DAILY_FOUR_BUCKETS) {
    if (callsMadeThisRun >= quota.remaining) {
      console.log(`[SerpAPI 4-Bucket Engine] Reached remaining daily quota limit (${callsMadeThisRun} calls made).`);
      break;
    }

    console.log(`[SerpAPI 4-Bucket Engine] Executing Call #${callsMadeThisRun + 1}: ${bucket.name}...`);
    try {
      const res = await fetchGoogleNews({
        query: bucket.query,
        gl: bucket.gl,
        hl: bucket.hl,
        limit: bucket.limit,
        bucketId: bucket.id,
      });

      callsMadeThisRun++;

      if (res.success && res.articles && res.articles.length > 0) {
        // Tag with bucket defaults
        for (const art of res.articles) {
          art.region = bucket.defaultRegion;
          rawArticles.push(art);
        }
        console.log(`[SerpAPI 4-Bucket Engine] Bucket "${bucket.name}" fetched ${res.articles.length} stories.`);
      } else {
        console.warn(`[SerpAPI 4-Bucket Engine] Bucket "${bucket.name}" returned 0 articles or error:`, res.error);
      }
    } catch (bucketErr) {
      console.error(`[SerpAPI 4-Bucket Engine] Bucket "${bucket.name}" failed:`, bucketErr);
    }
  }

  console.log(`[SerpAPI 4-Bucket Engine] Completed ${callsMadeThisRun} API calls. Total raw articles gathered: ${rawArticles.length}`);

  // Deduplicate and cluster across the 4 buckets
  const clustered = clusterAndDeduplicateArticles(rawArticles);
  console.log(`[SerpAPI 4-Bucket Engine] Clustered into ${clustered.length} unique news stories.`);

  const discoveredArticles: DiscoveredNewsArticle[] = [];
  let publishedLiveCount = 0;
  const shouldAutoPublish = options?.autoPublishToLive !== false; // Default true for morning cron

  // Process and extract rich newspaper articles
  for (const item of clustered) {
    // 1. Skip if dismissed
    if (dismissedSet.has(item.id)) {
      continue;
    }

    const docRef = db.collection("discovered_articles").doc(item.id);
    const existing = await docRef.get();

    // 2. Infer existing category
    const cat = await inferCategory(item.title, item.snippet || "");
    const categoryId = cat?.id || "news";
    const categoryName = cat?.name || "News";
    const categorySlug = cat?.slug || "news";

    // 3. Extract real newspaper article content
    let extractedResult;
    try {
      extractedResult = await extractFullArticleContent(item.link, {
        fallbackTitle: item.title,
        fallbackSnippet: item.snippet,
        sourceName: item.source?.name,
        timeoutMs: 5000,
      });
    } catch (extErr) {
      console.warn(`[SerpAPI Extraction] Warning for ${item.link}:`, extErr);
    }

    const discoveredArt: DiscoveredNewsArticle = {
      id: item.id,
      title: extractedResult?.cleanTitle || cleanHeadline(item.title),
      link: item.link,
      source: item.source,
      snippet: extractedResult?.excerpt || item.snippet,
      thumbnailUrl: extractedResult?.leadImage || item.thumbnailUrl || null,
      publishedAt: extractedResult?.publishedTime || item.publishedAt || timestamp,
      isoDate: extractedResult?.publishedTime || item.isoDate || timestamp,
      categoryId,
      categoryName,
      categorySlug,
      status: existing.exists ? (existing.data()?.status || "DISCOVERED") : "DISCOVERED",
      discoveredAt: existing.exists ? (existing.data()?.discoveredAt || timestamp) : timestamp,
      dismissedAt: null,
      dismissedBy: null,
      draftArticleId: existing.exists ? (existing.data()?.draftArticleId || null) : null,
      contentHtml: extractedResult?.contentHtml,
      language: extractedResult?.language || (item.region === "MAHARASHTRA" ? "MR" : "EN"),
      wordCount: extractedResult?.wordCount,
      isMultiSourceVerified: item.duplicateCount > 1,
      sourceUrls: item.combinedSources,
      keyFacts: extractedResult?.keyFacts || [],
    };

    // Upsert into discovered_articles
    await docRef.set(sanitizeForFirestore(discoveredArt), { merge: true });
    discoveredArticles.push(discoveredArt);

    // 4. If autoPublish is enabled and not already published, publish to live articles!
    if (shouldAutoPublish && !discoveredArt.draftArticleId && discoveredArt.status === "DISCOVERED") {
      try {
        const pubRes = await publishArticleToLive(discoveredArt, {
          categoryId,
          categoryName,
          categorySlug,
        });
        if (pubRes.success) {
          publishedLiveCount++;
        }
      } catch (pubErr) {
        console.warn(`Could not auto-publish article "${discoveredArt.title}" to live:`, pubErr);
      }
    }
  }

  // Save morning snapshot
  await saveMorningNewsToFirestore({
    success: true,
    totalResults: rawArticles.length,
    articles: rawArticles,
    fetchedAt: timestamp,
    query: "4-Bucket India & Maharashtra Strategic Digest",
  });

  return {
    success: true,
    count: discoveredArticles.length,
    callsMade: callsMadeThisRun,
    publishedLiveCount,
    message: `Completed 4-bucket morning run with ${callsMadeThisRun} SerpAPI calls. Discovered ${discoveredArticles.length} unique stories, published ${publishedLiveCount} to live site.`,
    timestamp,
    articles: discoveredArticles,
  };
}

/**
 * Standard Daily Morning News Cron Job Handler (called at 8:00 AM IST)
 */
export async function executeDailyMorningNewsCron(): Promise<{
  success: boolean;
  count: number;
  message: string;
  timestamp: string;
  articles?: SerpApiNewsArticle[];
  error?: string;
}> {
  const result = await executeFourBucketMorningNewsCron({ autoPublishToLive: true });
  return {
    success: result.success,
    count: result.count,
    message: result.message,
    timestamp: result.timestamp,
    articles: result.articles,
    error: result.error,
  };
}

/**
 * Alias for discoverNewsForAllCategories to guarantee it NEVER makes 24 calls!
 * It routes directly to the strict 4-bucket engine.
 */
export async function discoverNewsForAllCategories(options?: {
  limitPerCategory?: number;
  categoryIds?: string[];
  autoPublishToLive?: boolean;
}): Promise<{ totalAdded: number; categoriesProcessed: number; publishedLiveTotal: number; details: Record<string, number> }> {
  console.log("[SerpAPI Discovery] Running 4-bucket discovery engine (max 4 calls enforced)...");
  const res = await executeFourBucketMorningNewsCron({
    autoPublishToLive: options?.autoPublishToLive,
  });

  const details: Record<string, number> = {};
  if (res.articles) {
    for (const art of res.articles) {
      details[art.categoryName] = (details[art.categoryName] || 0) + 1;
    }
  }

  return {
    totalAdded: res.count,
    categoriesProcessed: Object.keys(details).length,
    publishedLiveTotal: res.publishedLiveCount,
    details,
  };
}

/**
 * Single-category discovery with daily quota check
 */
export async function discoverNewsForCategory(
  category: { id: string; name: string; slug: string },
  limit = 8,
  options?: { autoPublishToLive?: boolean }
): Promise<{ added: number; totalFetched: number; publishedLive: number }> {
  const quota = await checkDailySerpApiQuota();
  if (!quota.canProceed) {
    console.warn(`[SerpAPI] Daily quota exhausted (${quota.callsMade}/${MAX_DAILY_SERPAPI_CALLS}). Skipping single-category API call.`);
    return { added: 0, totalFetched: 0, publishedLive: 0 };
  }

  const serpRes = await fetchGoogleNews({
    query: `${category.name} news India`,
    gl: "in",
    hl: category.slug === "marathi" || category.slug === "maharashtra" ? "mr" : "en",
    limit,
    bucketId: `category_${category.slug}`,
  });

  if (!serpRes.success || !serpRes.articles || serpRes.articles.length === 0) {
    return { added: 0, totalFetched: 0, publishedLive: 0 };
  }

  const dismissedSet = await getDismissedIdsSet();
  const timestamp = new Date().toISOString();
  let added = 0;
  let publishedLive = 0;

  for (const art of serpRes.articles) {
    if (dismissedSet.has(art.id)) continue;

    const docRef = db.collection("discovered_articles").doc(art.id);
    const existing = await docRef.get();
    if (existing.exists && existing.data()?.status === "DISMISSED") continue;

    const extracted = await extractFullArticleContent(art.link, {
      fallbackTitle: art.title,
      fallbackSnippet: art.snippet,
      sourceName: art.source?.name,
    });

    const discoveredArt: DiscoveredNewsArticle = {
      ...art,
      title: extracted.cleanTitle || art.title,
      snippet: extracted.excerpt || art.snippet,
      thumbnailUrl: extracted.leadImage || art.thumbnailUrl || null,
      contentHtml: extracted.contentHtml,
      categoryId: category.id,
      categoryName: category.name,
      categorySlug: category.slug,
      status: "DISCOVERED",
      discoveredAt: timestamp,
      dismissedAt: null,
      dismissedBy: null,
      draftArticleId: null,
      language: extracted.language,
      wordCount: extracted.wordCount,
      keyFacts: extracted.keyFacts,
    };

    await docRef.set(sanitizeForFirestore(discoveredArt), { merge: true });
    added++;

    if (options?.autoPublishToLive) {
      try {
        const pubRes = await publishArticleToLive(discoveredArt, {
          categoryId: category.id,
          categoryName: category.name,
          categorySlug: category.slug,
        });
        if (pubRes.success) publishedLive++;
      } catch (e) {}
    }
  }

  return { added, totalFetched: serpRes.articles.length, publishedLive };
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
    reason: reason || "Irrelevant or dismissed by editor",
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

  await db.collection("dismissed_news").doc(id).delete();

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

  // Extract full rich newspaper content
  let contentHtml = data.contentHtml;
  let excerpt = data.snippet;
  let coverImageUrl = data.thumbnailUrl;
  let lang = data.language || "EN";

  if (!contentHtml) {
    const extracted = await extractFullArticleContent(data.link, {
      fallbackTitle: data.title,
      fallbackSnippet: data.snippet,
      sourceName: data.source?.name,
    });
    contentHtml = extracted.contentHtml;
    excerpt = extracted.excerpt || data.snippet;
    coverImageUrl = coverImageUrl || extracted.leadImage || null;
    lang = extracted.language;
  }

  const newArticle = {
    title: data.title,
    slug,
    searchKeywords,
    excerpt: excerpt || null,
    contentHtml,
    coverImageUrl: coverImageUrl || null,
    language: lang,
    region: lang === "MR" ? "MAHARASHTRA" : "INDIA",
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

  const articleRef = await db.collection("articles").add(sanitizeForFirestore(newArticle));

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

  // Use pre-extracted content or extract full newspaper content
  let contentHtml = (art as DiscoveredNewsArticle).contentHtml;
  let excerpt = art.snippet || art.title;
  let coverImageUrl = art.thumbnailUrl || null;
  let lang = (art as DiscoveredNewsArticle).language;

  if (!contentHtml) {
    const extracted = await extractFullArticleContent(art.link, {
      fallbackTitle: art.title,
      fallbackSnippet: art.snippet,
      sourceName,
    });
    contentHtml = extracted.contentHtml;
    excerpt = extracted.excerpt || art.snippet || art.title;
    coverImageUrl = coverImageUrl || extracted.leadImage || null;
    lang = extracted.language;
  }

  if (!lang) {
    lang = /[\u0900-\u097F]/.test(art.title) ? "MR" : "EN";
  }

  const newArticle = {
    title: art.title,
    slug,
    searchKeywords,
    excerpt,
    contentHtml,
    coverImageUrl,
    language: lang,
    region: lang === "MR" ? "MAHARASHTRA" : "INDIA",
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
        isLivePublished: true,
        publishedArticleId: articleRef.id,
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
