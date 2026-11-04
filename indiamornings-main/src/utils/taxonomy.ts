
/**
 * Generates an array of prefixes for each word in a string to enable "any-word prefix search" in Firestore.
 * Example: "Fadnavis News" -> ["f", "fa", "fad", ..., "n", "ne", "new", "news"]
 */
export function generateSearchKeywords(text: string): string[] {
    if (!text) return [];

    // Normalize: lower case and split by common delimiters (space, #, _, -, .)
    const normalized = text.toLowerCase();
    const words = normalized.split(/[\s#_\-\.]+/).filter(w => w.length > 0);

    const keywords = new Set<string>();

    for (const word of words) {
        // Generate prefixes for each word
        // We can limit prefix length to 20 to keep index size reasonable
        for (let i = 1; i <= Math.min(word.length, 20); i++) {
            keywords.add(word.substring(0, i));
        }
    }

    return Array.from(keywords);
}
