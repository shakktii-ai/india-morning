
const { getFirestore } = require('firebase-admin/firestore');
const { initializeApp, cert } = require('firebase-admin/app');
const dotenv = require('dotenv');

dotenv.config();

const env = process.env;
const serviceAccount = env.FIREBASE_SERVICE_ACCOUNT_KEY ? JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_KEY) : null;

const app = initializeApp({
  credential: serviceAccount ? cert(serviceAccount) : undefined,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
});

const db = getFirestore(app);

function generateSearchKeywords(text) {
  if (!text) return [];
  const normalized = text.toLowerCase();
  const words = normalized.split(/[\s#_\-\.]+/).filter(w => w.length > 0);
  const keywords = new Set();
  for (const word of words) {
    for (let i = 1; i <= Math.min(word.length, 20); i++) {
      keywords.add(word.substring(0, i));
    }
  }
  return Array.from(keywords);
}

async function migrate() {
  console.log("Starting migration: Generating searchKeywords for all articles...");
  const snapshot = await db.collection('articles').get();
  console.log(`Found ${snapshot.size} articles.`);

  let count = 0;
  const batchSize = 500;
  let batch = db.batch();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (!data.title) continue;

    const searchKeywords = generateSearchKeywords(data.title);
    batch.set(doc.ref, { searchKeywords }, { merge: true });
    
    count++;
    if (count % batchSize === 0) {
      await batch.commit();
      console.log(`Updated ${count} articles...`);
      batch = db.batch();
    }
  }

  if (count % batchSize !== 0) {
    await batch.commit();
  }

  console.log(`Migration complete! Total articles updated: ${count}`);
  process.exit(0);
}

migrate().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
