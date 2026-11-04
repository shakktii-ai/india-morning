import { NextResponse } from 'next/server';
import Parser from 'rss-parser';

const parser = new Parser();

const FEED_URLS = {
  top: 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms',
  india: 'https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms',
  world: 'https://timesofindia.indiatimes.com/rssfeeds/296589292.cms',
  business: 'https://timesofindia.indiatimes.com/rssfeeds/1898055.cms',
  sports: 'https://timesofindia.indiatimes.com/rssfeeds/4719148.cms',
  entertainment: 'https://timesofindia.indiatimes.com/rssfeeds/1081479906.cms',
  tech: 'https://timesofindia.indiatimes.com/rssfeeds/66949542.cms',
  education: 'https://timesofindia.indiatimes.com/rssfeeds/91316884.cms',
  health: 'https://timesofindia.indiatimes.com/rssfeeds/3947259.cms',
  science: 'https://timesofindia.indiatimes.com/rssfeeds/3947260.cms',
  auto: 'https://timesofindia.indiatimes.com/rssfeeds/3013155.cms',
  mumbai: 'https://timesofindia.indiatimes.com/rssfeeds/7355827.cms',
  delhi: 'https://timesofindia.indiatimes.com/rssfeeds/9033615.cms',
  bengaluru: 'https://timesofindia.indiatimes.com/rssfeeds/3947260.cms',
  hyderabad: 'https://timesofindia.indiatimes.com/rssfeeds/9033615.cms',
  pune: 'https://timesofindia.indiatimes.com/rssfeeds/-2128817995.cms',
};

function escapeXml(unsafe: string) {
  return (unsafe || '').replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'top';
  const format = searchParams.get('format');

  const feedUrl = FEED_URLS[category as keyof typeof FEED_URLS];

  if (!feedUrl) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
  }

  const commonHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*'
  };

  try {
    const response = await fetch(feedUrl, { headers: commonHeaders });
    const rawContent = await response.text();
    
    // Attempt to parse with rss-parser regardless of format for validation
    let feed: Parser.Output<{ [key: string]: any }> | undefined;
    try {
      feed = await parser.parseString(rawContent);
    } catch (parseError) {
      // Fallback: If direct XML failed, it might be due to the stylesheet error mentioned by user.
      // We try fetching again with even simpler headers or strictly as a feed fetcher.
      const secondTry = await fetch(feedUrl, {
        headers: { 'User-Agent': 'FeedFetcher-Google; (+http://www.google.com/feedfetcher.html)' }
      });
      feed = await parser.parseString(await secondTry.text());
    }

    if (!feed) {
      return NextResponse.json({ error: 'Failed to parse RSS feed.' }, { status: 500 });
    }

    if (format === 'xml') {
      // Re-serialize the feed to GUARANTEED valid XML to fix "EntityRef: expecting ';'" errors.
      const xmlItems = feed.items.map(item => `
    <item>
      <title>${escapeXml(item.title || '')}</title>
      <link>${escapeXml(item.link || '')}</link>
      <guid>${escapeXml(item.link || '')}</guid>
      <pubDate>${escapeXml(item.pubDate || '')}</pubDate>
      <description>${escapeXml(item.contentSnippet || item.content || '')}</description>
    </item>`).join('');

      const cleanXml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
  <title>${escapeXml(feed.title || 'IndiaMorning Feed')}</title>
  <link>${escapeXml(feedUrl)}</link>
  <description>Latest news from IndiaMorning</description>
  ${xmlItems}
</channel>
</rss>`;

      return new Response(cleanXml, {
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 's-maxage=60, stale-while-revalidate',
        },
      });
    }

    const items = feed.items.slice(0, 10).map(item => ({
      title: item.title,
      link: item.link,
      pubDate: item.pubDate,
      contentSnippet: item.contentSnippet,
      image: item.enclosure?.url || null
    }));

    return NextResponse.json({
      title: feed.title,
      items: items
    });
  } catch (error) {
    console.error('RSS Proxy Error:', error);
    return NextResponse.json({ error: 'Failed to fetch or parse RSS feed. The source might be blocking automated requests.' }, { status: 500 });
  }
}
