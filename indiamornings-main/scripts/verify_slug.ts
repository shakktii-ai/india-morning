import { db } from "../src/lib/firebase-admin";
import { slugify } from "../src/utils/slug";

async function testManualSlug() {
    console.log("Starting Manual Slug Verification...");

    const testTitle = "Test Manual Slug " + Date.now();
    const manualSlug = "manual-test-slug-" + Math.floor(Math.random() * 1000);

    console.log(`Setting up test article with title: "${testTitle}" and slug: "${manualSlug}"`);

    // 1. Simulate API logic for uniqueness (simplified)
    let slug = manualSlug;
    let i = 1;
    while (!(await db.collection("articles").where("slug", "==", slug).get()).empty) {
        slug = `${manualSlug}-${i++}`;
    }

    console.log(`Calculated unique slug: ${slug}`);

    // 2. Create the article
    const docRef = await db.collection("articles").add({
        title: testTitle,
        slug: slug,
        status: "DRAFT",
        contentHtml: "<p>Test content</p>",
        createdAt: new Date(),
        updatedAt: new Date(),
        categoryIds: ["test-category"],
        authorId: "test-author",
        language: "EN",
        region: "INDIA"
    });

    console.log(`Article created with ID: ${docRef.id}`);

    // 3. Verify it exists with the correct slug
    const createdDoc = await docRef.get();
    const data = createdDoc.data();
    if (data?.slug === slug) {
        console.log("✅ Creation Verification Passed: Slug matches expected value.");
    } else {
        console.log("❌ Creation Verification Failed: Slug mismatch.", data?.slug);
    }

    // 4. Test Collision
    console.log("Testing collision with the same slug...");
    let collisionSlug = manualSlug;
    let j = 1;
    while (!(await db.collection("articles").where("slug", "==", collisionSlug).get()).empty) {
        collisionSlug = `${manualSlug}-${j++}`;
    }
    console.log(`Collision test: Slug "${manualSlug}" resulted in "${collisionSlug}"`);
    if (collisionSlug !== manualSlug) {
        console.log("✅ Collision Verification Passed: Unique suffix added.");
    } else {
        console.log("❌ Collision Verification Failed: No suffix added for collision.");
    }

    // 5. Test PATCH update
    const newSlug = "updated-manual-slug-" + Math.floor(Math.random() * 1000);
    console.log(`Updating slug to: ${newSlug}`);

    // Simulate PATCH logic
    let targetSlug = slugify(newSlug);
    let k = 1;
    while (true) {
        const snapshot = await db.collection("articles")
            .where("slug", "==", targetSlug)
            .limit(1)
            .get();

        if (snapshot.empty || snapshot.docs[0].id === docRef.id) break;
        targetSlug = `${newSlug}-${k++}`;
    }

    await docRef.update({ slug: targetSlug, updatedAt: new Date() });

    const updatedDoc = await docRef.get();
    if (updatedDoc.data()?.slug === targetSlug) {
        console.log("✅ Patch Verification Passed: Slug successfully updated.");
    } else {
        console.log("❌ Patch Verification Failed: Slug not updated.", updatedDoc.data()?.slug);
    }

    // Cleanup
    await docRef.delete();
    console.log("Cleaned up test article.");
    console.log("Manual Slug Verification Finished.");
}

testManualSlug().catch(console.error);
