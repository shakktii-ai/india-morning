import "dotenv/config";
import { db } from "@/src/lib/firebase-admin";
import { XMLParser } from "fast-xml-parser";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

const XML_PATH = path.join(process.cwd(), "indiamorningnews.WordPress.2025-12-25.xml");

async function main() {
    if (!fs.existsSync(XML_PATH)) {
        console.error(`XML file not found at ${XML_PATH}`);
        return;
    }

    console.log(`Reading XML file: ${XML_PATH}`);
    const xmlData = fs.readFileSync(XML_PATH, "utf-8");

    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
    });

    console.log("Parsing XML...");
    const jsonObj = parser.parse(xmlData);
    const channel = jsonObj.rss.channel;

    console.log(`Site Title: ${channel.title}`);

    // --- 0. Date Filter Setup ---
    // User requested "last months data". Let's assume last 30 days from today (Dec 28, 2025).
    // Or strictly "last month" (November)? Usually means recent data.
    // I will filter for posts after Nov 28, 2025.
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    console.log(`Filtering for articles published after: ${cutoffDate.toISOString()}`);

    // --- 1. Import Authors ---
    const authors = Array.isArray(channel["wp:author"]) ? channel["wp:author"] : [channel["wp:author"]];
    const authorMap = new Map<string, string>(); // login -> userId

    console.log(`Found ${authors.length} authors.`);
    const defaultPwd = await bcrypt.hash("ChangeMe@123", 10);

    for (const a of authors) {
        if (!a) continue;
        const login = a["wp:author_login"];
        const email = a["wp:author_email"];
        const name = a["wp:author_display_name"] || login;

        if (!email) continue;

        // Simple optimization: check local map first (not needed here but good practice)

        const q = await db.collection("users").where("email", "==", email).limit(1).get();
        let userId = "";

        if (!q.empty) {
            userId = q.docs[0].id;
        } else {
            console.log(`Creating user: ${login} (${email})`);
            const docRef = await db.collection("users").add({
                name,
                email,
                passwordHash: defaultPwd,
                role: "JOURNALIST",
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            userId = docRef.id;
        }
        authorMap.set(login, userId);
    }

    // --- 2. Import Categories ---
    const categories = Array.isArray(channel["wp:category"]) ? channel["wp:category"] : [channel["wp:category"]];
    const catNamedMap = new Map<string, string>(); // cat_name -> id
    console.log(`Found ${categories.length} categories.`);

    for (const c of categories) {
        if (!c) continue;
        const name = c["wp:cat_name"];
        const slug = c["wp:category_nicename"];
        if (!name || !slug) continue;

        const q = await db.collection("categories").where("slug", "==", slug).limit(1).get();
        let catId = "";

        if (!q.empty) {
            catId = q.docs[0].id;
        } else {
            const docRef = await db.collection("categories").add({
                name,
                slug,
                createdAt: new Date().toISOString()
            });
            catId = docRef.id;
        }
        catNamedMap.set(name, catId);
    }

    // --- 3. Import Tags ---
    const tags = Array.isArray(channel["wp:tag"]) ? channel["wp:tag"] : [channel["wp:tag"]];
    const tagNamedMap = new Map<string, string>(); // tag_name -> id
    console.log(`Found ${tags.length} tags.`);

    for (const t of tags) {
        if (!t) continue;
        const name = t["wp:tag_name"];
        const slug = t["wp:tag_slug"];
        if (!name || !slug) continue;
        const slugStr = String(slug);
        const nameStr = String(name);

        const q = await db.collection("tags").where("slug", "==", slugStr).limit(1).get();
        let tagId = "";

        if (!q.empty) {
            tagId = q.docs[0].id;
        } else {
            try {
                const docRef = await db.collection("tags").add({
                    name: nameStr,
                    slug: slugStr,
                    createdAt: new Date().toISOString()
                });
                tagId = docRef.id;
            } catch (e: any) {
                continue;
            }
        }
        tagNamedMap.set(name, tagId);
    }


    // --- 4. Pre-process Items (Build Attachment Map) ---
    const items = Array.isArray(channel.item) ? channel.item : [channel.item];
    console.log(`Scanning ${items.length} items for images...`);

    const attachmentMap = new Map<string, string>(); // post_id -> attachment_url

    for (const item of items) {
        if (!item) continue;
        const postType = item["wp:post_type"];
        const postId = String(item["wp:post_id"]);

        if (postType === "attachment") {
            const url = item["wp:attachment_url"];
            if (postId && url) {
                attachmentMap.set(postId, url);
            }
        }
    }
    console.log(`Found ${attachmentMap.size} attachments.`);


    // --- 5. Import Articles ---
    console.log("Importing recent articles...");
    let importedCount = 0;
    let skippedCount = 0;

    for (const item of items) {
        if (!item) continue;
        const postType = item["wp:post_type"];

        if (postType !== "post") continue;

        const postDate = new Date(item["wp:post_date"]);
        // DATE FILTER
        if (postDate < cutoffDate) {
            skippedCount++;
            continue;
        }

        const title = item.title;
        const slug = item["wp:post_name"];
        const content = item["content:encoded"];
        const excerpt = item["excerpt:encoded"];
        const statusRaw = item["wp:status"];
        const creator = item["dc:creator"];

        if (!title || !slug) continue;

        let status = "PUBLISHED";
        const s = statusRaw ? String(statusRaw).trim() : "";
        if (s === "publish") status = "PUBLISHED";
        else if (s === "trash") status = "REJECTED";
        else if (s === "draft" || s === "auto-draft") status = "DRAFT";
        else if (s === "pending") status = "IN_REVIEW";
        else if (s === "future") status = "DRAFT";

        // Author
        let authorId = authorMap.get(creator);
        if (!authorId) {
            const firstUser = (await db.collection("users").limit(1).get());
            if (!firstUser.empty) authorId = firstUser.docs[0].id;
        }
        if (!authorId) {
            console.warn(`No author for ${slug}, skipping.`);
            continue;
        }

        // Categories & Tags
        const catsAndTags = item.category;
        const taxList = Array.isArray(catsAndTags) ? catsAndTags : (catsAndTags ? [catsAndTags] : []);

        const catIds: string[] = [];
        const tagIds: string[] = [];
        let primaryCatId: string | null = null;

        for (const t of taxList) {
            const domain = t["@_domain"];
            const val = t["#text"];
            if (domain === "category" && val) {
                const id = catNamedMap.get(val);
                if (id) {
                    catIds.push(id);
                    if (!primaryCatId) primaryCatId = id;
                }
            } else if (domain === "post_tag" && val) {
                const id = tagNamedMap.get(val);
                if (id) tagIds.push(id);
            }
        }


        // ... (imports)

        // Helper to scrape og:image
        async function fetchCoverImage(url: string): Promise<string | null> {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout
                const res = await fetch(url, { signal: controller.signal });
                clearTimeout(timeout);

                if (!res.ok) return null;
                const html = await res.text();

                // Simple regex to find og:image
                // <meta property="og:image" content="..." />
                // Handle various quote styles and spacing
                const match = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
                if (match && match[1]) {
                    return match[1];
                }
                return null;
            } catch (e) {
                // console.warn(`Failed to scrape ${url}:`, e);
                return null;
            }
        }

        // ... (in check existing loop)
        // --- Cover Image Logic ---
        let coverImageUrl = "";
        const postMeta = item["wp:postmeta"];
        if (postMeta) {
            const metaList = Array.isArray(postMeta) ? postMeta : [postMeta];
            const thumbMeta = metaList.find((m: any) => m["wp:meta_key"] === "_thumbnail_id");
            if (thumbMeta) {
                const thumbId = String(thumbMeta["wp:meta_value"]);
                const foundUrl = attachmentMap.get(thumbId);
                if (foundUrl) coverImageUrl = foundUrl;
            }
        }

        // Fallback: If no image found in XML, try scraping the live URL
        if (!coverImageUrl && item.link) {
            // Only scrape if we are actually importing this item (date check passed)
            console.log(`Scraping cover image for: ${slug}...`);
            const scrapedUrl = await fetchCoverImage(item.link);
            if (scrapedUrl) {
                coverImageUrl = scrapedUrl;
                console.log(`  -> Found: ${coverImageUrl}`);
            } else {
                console.log(`  -> Not found.`);
            }
        }
        // ...


        // Check Existing
        const existsQ = await db.collection("articles").where("slug", "==", slug).limit(1).get();
        if (!existsQ.empty) {
            console.log(`Skipping existing: ${slug}`);
            continue;
        }

        const articleData = {
            title: String(title).substring(0, 190),
            slug,
            contentHtml: content || "",
            excerpt: excerpt || null,
            status,
            authorId,
            categoryId: primaryCatId,
            tagIds,
            coverImageUrl: coverImageUrl || null,
            region: "ALL",
            language: "ALL",
            publishedAt: status === "PUBLISHED" ? postDate.toISOString() : null,
            createdAt: postDate.toISOString(),
            updatedAt: new Date().toISOString()
        };

        try {
            await db.collection("articles").add(articleData);
            importedCount++;
            console.log(`Imported: ${slug} (Cover: ${!!coverImageUrl})`);
        } catch (e: any) {
            console.error(`Failed to import ${slug}: ${e.message}`);
        }
    }

    console.log(`Import complete!`);
    console.log(`Attributes:`);
    console.log(`- Imported: ${importedCount}`);
    console.log(`- Skipped (Old): ${skippedCount}`);
}

main().catch(console.error);
