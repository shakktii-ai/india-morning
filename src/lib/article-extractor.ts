/**
 * High-performance, resilient article content extractor for news stories.
 * Extracts full story bodies from JSON-LD schema, semantic HTML <article> containers,
 * or meta descriptions, with smart fallback generation.
 */

export interface ExtractedArticleResult {
  success: boolean;
  contentHtml: string;
  excerpt: string;
  leadImage?: string | null;
  wordCount: number;
  extractedFrom: string;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, "-")
    .replace(/&#8212;/g, "—")
    .replace(/\s+/g, " ")
    .trim();
}

function isJunkParagraph(text: string): boolean {
  if (!text || text.length < 35) return true;
  const lower = text.toLowerCase();
  const junkPatterns = [
    "download our app",
    "download news18 app",
    "download the app",
    "subscribe now",
    "subscribe to our",
    "follow us on",
    "join our whatsapp",
    "join our telegram",
    "watch live 24x7",
    "all rights reserved",
    "terms of use",
    "privacy policy",
    "cookie policy",
    "advertisement",
    "also read:",
    "also watch:",
    "read more:",
    "click here to read",
    "stay updated with",
    "sign up for newsletter",
    "photo gallery",
    "video gallery",
  ];
  return junkPatterns.some((pattern) => lower.includes(pattern));
}

function splitIntoParagraphs(text: string): string[] {
  // First split by explicit line breaks
  const rawBlocks = text.split(/\r?\n+/).map(decodeHtmlEntities).filter(Boolean);
  const result: string[] = [];

  for (const block of rawBlocks) {
    if (block.length > 300) {
      // Split long blocks by sentence boundary (. or Marathi/Hindi danda । or ! or ?)
      const sentences = block.split(/(?<=[.।!?])\s+/);
      let currentPara = "";
      for (const s of sentences) {
        if ((currentPara + " " + s).trim().length > 280) {
          if (currentPara.trim()) result.push(currentPara.trim());
          currentPara = s;
        } else {
          currentPara = currentPara ? `${currentPara} ${s}` : s;
        }
      }
      if (currentPara.trim()) result.push(currentPara.trim());
    } else {
      result.push(block);
    }
  }

  return result.filter((p) => !isJunkParagraph(p));
}

/**
 * Extracts the full article text and lead image from a given news article URL
 */
export async function extractFullArticleContent(
  url: string,
  options?: {
    fallbackTitle?: string;
    fallbackSnippet?: string;
    sourceName?: string;
    timeoutMs?: number;
  }
): Promise<ExtractedArticleResult> {
  const fallbackTitle = options?.fallbackTitle || "";
  const fallbackSnippet = options?.fallbackSnippet || "";
  const sourceName = options?.sourceName || "News Source";
  const timeoutMs = options?.timeoutMs || 8000;

  if (!url || !url.startsWith("http")) {
    return createFallbackResult(fallbackTitle, fallbackSnippet, sourceName, url);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,mr;q=0.8,hi;q=0.7",
        "Cache-Control": "no-cache",
      },
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return createFallbackResult(fallbackTitle, fallbackSnippet, sourceName, url);
    }

    const html = await res.text();
    let leadImage: string | null = null;

    // Check OpenGraph Image
    const ogImg = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                  html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    if (ogImg && ogImg[1]) {
      leadImage = ogImg[1];
    }

    let paragraphs: string[] = [];
    let extractedFrom = "";

    // 1. Primary Strategy: Schema.org JSON-LD (NewsArticle, Article, BlogPosting)
    const jsonLdMatches = Array.from(
      html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gis)
    );

    for (const m of jsonLdMatches) {
      try {
        const rawJson = m[1].trim();
        const data = JSON.parse(rawJson);
        const candidates = Array.isArray(data["@graph"]) ? data["@graph"] : [data];

        for (const item of candidates) {
          // Check image if not found yet
          if (!leadImage && item.image) {
            leadImage = typeof item.image === "string" ? item.image : item.image?.url || null;
          }

          // Full article body from JSON-LD
          if (item.articleBody && typeof item.articleBody === "string" && item.articleBody.length > 150) {
            paragraphs = splitIntoParagraphs(item.articleBody);
            if (paragraphs.length >= 2) {
              extractedFrom = "JSON-LD articleBody";
              break;
            }
          }

          // In video stories (like News18 video articles), description contains full report
          if (
            (!paragraphs || paragraphs.length < 2) &&
            item.description &&
            typeof item.description === "string" &&
            item.description.length > 200
          ) {
            const descParas = splitIntoParagraphs(item.description);
            if (descParas.length >= 2) {
              paragraphs = descParas;
              extractedFrom = "JSON-LD description";
              break;
            }
          }
        }

        if (paragraphs.length >= 2) break;
      } catch (e) {
        // Continue to next JSON-LD block
      }
    }

    // 2. Secondary Strategy: Semantic HTML <article> / main container paragraphs
    if (paragraphs.length < 2) {
      const cleanHtml = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
        .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, "")
        .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, "")
        .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, "");

      const articleMatch =
        cleanHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
        cleanHtml.match(/<div[^>]*class=["'][^"']*(?:story-content|article-body|story_details|content-area|story-card)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);

      const targetHtml = articleMatch ? articleMatch[1] : cleanHtml;
      const pMatches = Array.from(targetHtml.matchAll(/<p[^>]*>(.*?)<\/p>/gis))
        .map((m) => decodeHtmlEntities(m[1].replace(/<[^>]+>/g, "")))
        .filter((t) => !isJunkParagraph(t));

      if (pMatches.length >= 2) {
        paragraphs = pMatches;
        extractedFrom = articleMatch ? "<article> body" : "HTML paragraphs";
      }
    }

    // 3. Tertiary Strategy: Meta description fallback if long
    if (paragraphs.length === 0) {
      const ogDesc =
        html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i);
      const metaDesc =
        html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);

      const rawDesc = ogDesc ? ogDesc[1] : metaDesc ? metaDesc[1] : "";
      if (rawDesc && rawDesc.length > 100) {
        paragraphs = splitIntoParagraphs(rawDesc);
        extractedFrom = "Meta Description";
      }
    }

    // If we gathered paragraphs, build clean HTML
    if (paragraphs.length > 0) {
      const fullText = paragraphs.join(" ");
      const wordCount = fullText.split(/\s+/).length;
      const excerpt = paragraphs[0]?.slice(0, 220) || fallbackSnippet || fallbackTitle;

      const contentHtml = `
<div class="article-content-body" style="font-family: inherit; line-height: 1.8; color: #1f2937;">
  ${paragraphs
    .map((p, idx) => {
      if (idx === 0) {
        return `<p style="font-size: 1.15rem; line-height: 1.75; font-weight: 500; margin-bottom: 1.35rem; color: #111827;">${p}</p>`;
      }
      return `<p style="font-size: 1.05rem; line-height: 1.8; margin-bottom: 1.25rem; color: #374151;">${p}</p>`;
    })
    .join("\n")}
  <hr style="margin: 2rem 0; border: none; border-top: 1px solid #e5e7eb;" />
  <p style="font-size: 0.875rem; color: #6b7280; font-style: italic;">
    Original reporting sourced from <strong>${sourceName}</strong>. Read the full original report here: <a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #4f46e5; text-decoration: underline;">${url}</a>
  </p>
</div>
      `.trim();

      return {
        success: true,
        contentHtml,
        excerpt,
        leadImage,
        wordCount,
        extractedFrom,
      };
    }
  } catch (err: any) {
    console.warn(`[Article Extractor] Error fetching ${url}:`, err?.message);
  }

  // Graceful fallback
  return createFallbackResult(fallbackTitle, fallbackSnippet, sourceName, url);
}

function createFallbackResult(
  title: string,
  snippet: string,
  sourceName: string,
  url: string
): ExtractedArticleResult {
  const leadText = snippet || title;
  const contentHtml = `
<div class="article-content-body" style="font-family: inherit; line-height: 1.8; color: #1f2937;">
  <p style="font-size: 1.15rem; line-height: 1.75; font-weight: 500; margin-bottom: 1.35rem; color: #111827;">
    ${leadText}
  </p>
  <p style="font-size: 1.05rem; line-height: 1.8; margin-bottom: 1.25rem; color: #374151;">
    Significant developments continue to unfold surrounding this story. Authorities, sector analysts, and field observers are closely monitoring key outcomes and public responses across the region.
  </p>
  <p style="font-size: 1.05rem; line-height: 1.8; margin-bottom: 1.25rem; color: #374151;">
    <strong>India Morning</strong> news desk is tracking all relevant updates. Additional details, statement releases, and verified background context will be incorporated as further official facts are confirmed.
  </p>
  <hr style="margin: 2rem 0; border: none; border-top: 1px solid #e5e7eb;" />
  <p style="font-size: 0.875rem; color: #6b7280; font-style: italic;">
    Discovered via <strong>${sourceName}</strong>. Original source: <a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #4f46e5; text-decoration: underline;">${url}</a>
  </p>
</div>
  `.trim();

  return {
    success: false,
    contentHtml,
    excerpt: leadText.slice(0, 220),
    wordCount: contentHtml.split(/\s+/).length,
    extractedFrom: "Structured fallback",
  };
}

