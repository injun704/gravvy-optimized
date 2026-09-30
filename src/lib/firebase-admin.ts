import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

let firebaseConfig: any = {};
try {
  const configPath = join(process.cwd(), 'firebase-applet-config.json');
  if (existsSync(configPath)) {
    firebaseConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
  }
} catch (e) {
  console.warn('Notice: Could not load firebase-applet-config.json:', e);
}

const projectId = firebaseConfig.projectId || process.env.VITE_FIREBASE_PROJECT_ID || 'trans-anchor-459915-q9';
const databaseId = firebaseConfig.firestoreDatabaseId || process.env.VITE_FIREBASE_DATABASE_ID || 'ai-studio-gravvyfoodgrocer-26f18fd7-f5e1-4a47-9d2c-df0338a889fa';

const app = getApps().length > 0
  ? getApps()[0]
  : initializeApp({ projectId });

export const adminAuth = getAuth(app);

export const adminDb = databaseId
  ? getFirestore(app, databaseId)
  : getFirestore(app);

try {
  adminDb.settings({ ignoreUndefinedProperties: true });
} catch {}
