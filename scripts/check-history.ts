import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: privateKey,
  }),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

async function check() {
  const bucket = admin.storage().bucket();
  const file = bucket.file('history_all.json');
  const [buffer] = await file.download();
  const data = JSON.parse(buffer.toString('utf-8'));

  console.log('67400003 (질서의 젬 안정) 데이터:');
  console.log(JSON.stringify(data['67400003'], null, 2));
}

check().catch(console.error);
