/**
 * Delete Articles Before December 31, 2025
 * 
 * This script deletes all articles with createdAt date before 2025-12-31.
 * It handles dates stored as strings (not Firestore Timestamps).
 * 
 * Usage:
 *   npx tsx scripts/delete-old-articles.ts --dry-run   # Preview only
 *   npx tsx scripts/delete-old-articles.ts             # Actually delete
 */

import "dotenv/config";
import { db } from "../src/lib/firebase-admin";

async function deleteOldArticles(dryRun: boolean = true) {
    try {
        // Set cutoff date to December 31, 2025 at 00:00:00
        const cutoffDate = new Date('2025-12-31T00:00:00Z');

        console.log(`\n🔍 Searching for articles created before ${cutoffDate.toISOString()}`);
        console.log(`Mode: ${dryRun ? '🔒 DRY RUN (no changes will be made)' : '⚠️  DELETE MODE'}\n`);

        // Fetch ALL articles (we'll filter in memory since dates are strings)
        const snapshot = await db.collection('articles').get();

        if (snapshot.empty) {
            console.log('❌ No articles found in the database.');
            return;
        }

        console.log(`📊 Checking ${snapshot.size} articles...\n`);

        // Filter articles that are before the cutoff date
        const articlesToDelete: { id: string; title: string; createdAt: Date }[] = [];

        snapshot.forEach(doc => {
            const data = doc.data();

            // Handle both string and Timestamp formats
            let createdAt: Date;
            if (typeof data.createdAt === 'string') {
                createdAt = new Date(data.createdAt);
            } else if (data.createdAt?.toDate) {
                createdAt = data.createdAt.toDate();
            } else {
                return; // Skip if no valid date
            }

            // Check if article is before cutoff date
            if (createdAt < cutoffDate) {
                articlesToDelete.push({
                    id: doc.id,
                    title: data.title || 'Untitled',
                    createdAt
                });
            }
        });

        if (articlesToDelete.length === 0) {
            console.log('✅ No articles found before the cutoff date.');
            return;
        }

        console.log(`📊 Found ${articlesToDelete.length} articles to delete:\n`);

        // Sort by date for better readability
        articlesToDelete.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

        // Display the list
        articlesToDelete.forEach((article, index) => {
            console.log(`${index + 1}. [${article.createdAt.toISOString().split('T')[0]}] ${article.title.substring(0, 60)}${article.title.length > 60 ? '...' : ''}`);
        });

        if (dryRun) {
            console.log(`\n🔒 DRY RUN: No articles were deleted.`);
            console.log(`\nTo actually delete these articles, run:`);
            console.log(`  npx tsx scripts/delete-old-articles.ts\n`);
            return;
        }

        // Confirm deletion
        console.log(`\n⚠️  WARNING: You are about to delete ${articlesToDelete.length} articles permanently!`);
        console.log(`This action cannot be undone.\n`);

        // Delete in batches (Firestore limit is 500 per batch)
        const batchSize = 500;
        let deletedCount = 0;

        for (let i = 0; i < articlesToDelete.length; i += batchSize) {
            const batch = db.batch();
            const batchArticles = articlesToDelete.slice(i, i + batchSize);

            batchArticles.forEach(article => {
                const docRef = db.collection('articles').doc(article.id);
                batch.delete(docRef);
            });

            await batch.commit();
            deletedCount += batchArticles.length;
            console.log(`✅ Deleted batch ${Math.floor(i / batchSize) + 1}: ${batchArticles.length} articles (Total: ${deletedCount}/${articlesToDelete.length})`);
        }

        console.log(`\n✅ Successfully deleted ${deletedCount} articles created before ${cutoffDate.toISOString().split('T')[0]}\n`);

    } catch (error) {
        console.error('❌ Error deleting articles:', error);
        process.exit(1);
    }
}

// Check command line arguments
const isDryRun = process.argv.includes('--dry-run');

deleteOldArticles(isDryRun)
    .then(() => {
        console.log('Done!');
        process.exit(0);
    })
    .catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
