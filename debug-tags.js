
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // I hope this exists

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function run() {
  const s = await db.collection('tags').count().get();
  console.log('Total tags:', s.data().count);
  
  const sample = await db.collection('tags').limit(5).get();
  sample.forEach(d => console.log(d.id, '=>', d.data()));
  
  process.exit(0);
}

run();
