
import { db } from "@/src/lib/firebase-admin";
import { slugify } from "@/src/utils/slug";

/**
 * Generates an array of prefixes for each word in a string to enable "any-word prefix search" in Firestore.
 * Example: "Fadnavis News" -> ["f", "fa", "fad", ..., "n", "ne", "new", "news"]
 */
/**
 * Generates an array of prefixes for each word in the provided text(s) to enable search in Firestore.
 * Now accepts multiple input strings (e.g. title, region, excerpt).
 */
export function generateSearchKeywords(text: string | string[]): string[] {
    const inputs = Array.isArray(text) ? text : [text];
    const keywords = new Set<string>();

    for (const input of inputs) {
        if (!input) continue;
        
        // Normalize: lower case and split by common delimiters
        const normalized = input.toLowerCase();
        const words = normalized.split(/[\s#_\-\.]+/).filter(w => w.length > 0);

        for (const word of words) {
            // Generate prefixes for each word (limit to 20 to keep index reasonable)
            for (let i = 1; i <= Math.min(word.length, 20); i++) {
                keywords.add(word.substring(0, i));
            }
        }
    }

    return Array.from(keywords);
}

/**
 * Resolves a list of tag names to their existing Firestore document IDs.
 * If a tag doesn't exist, it creates it.
 */
export async function resolveTagIds(names: string[]): Promise<string[]> {
    if (!names || names.length === 0) return [];

    // Unique, trimmed names
    const uniqueNames = Array.from(new Set(names.map(n => n.trim()).filter(Boolean)));
    const tagIds: string[] = [];

    for (const name of uniqueNames) {
        const slug = slugify(name);

        // Try to find existing
        const snapshot = await db.collection("tags")
            .where("slug", "==", slug)
            .limit(1)
            .get();

        if (!snapshot.empty) {
            tagIds.push(snapshot.docs[0].id);
        } else {
            // Create new
            const searchKeywords = generateSearchKeywords(name);
            const docRef = await db.collection("tags").add({
                name,
                slug,
                searchKeywords,
                createdAt: new Date().toISOString()
            });
            tagIds.push(docRef.id);
        }
    }

    return tagIds;
}
