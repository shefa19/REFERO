/**
 * REFERO V2 - Safe Permanent Demo Auth User Creation Script
 * 
 * Purpose:
 * Creates the official demo Customer and Shopkeeper accounts in Firebase Authentication
 * with password "TestPass123!" for the project `refero-d897d`.
 * 
 * Accounts Created:
 * 1. Customer:
 *    Email: moumita.ahmed@gmail.com
 *    Password: TestPass123!
 *    DisplayName: Moumita Pramanik
 * 
 * 2. Shopkeeper:
 *    Email: mahin@greenvalley.bd
 *    Password: TestPass123!
 *    DisplayName: Mahinur Islam
 * 
 * Safety Invariants:
 * - NEVER creates or alters any Admin account.
 * - Checks if the user already exists before attempting creation.
 * - Does not expose private keys or secret tokens.
 * - Run locally with:
 *   GOOGLE_APPLICATION_CREDENTIALS="./service-account.json" node scripts/seed-demo-auth-users.mjs
 */

import admin from 'firebase-admin';

// Initialize Firebase Admin with Application Default Credentials
if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'refero-d897d',
  });
}

const auth = admin.auth();
const db = admin.firestore();

const DEMO_AUTH_ACCOUNTS = [
  {
    uid: 'user_customer_01',
    email: 'moumita.ahmed@gmail.com',
    password: 'TestPass123!',
    displayName: 'Moumita Pramanik',
    role: 'customer',
    pointsBalance: 840,
    referralCode: 'MOUMITA2026',
  },
  {
    uid: 'user_customer_02',
    email: 'nusrat.jahan@gmail.com',
    password: 'TestPass123!',
    displayName: 'Nusrat Jahan',
    role: 'customer',
    pointsBalance: 420,
    referralCode: 'NUSRAT26',
  },
  {
    uid: 'user_shopkeeper_01',
    email: 'mahin@greenvalley.bd',
    password: 'TestPass123!',
    displayName: 'Mahinur Islam',
    role: 'shopkeeper',
    shopId: 'shop_green_valley',
    pointsBalance: 650,
    referralCode: 'MAHIN88',
  },
  {
    uid: 'user_shopkeeper_02',
    email: 'sharmin@bengalpantry.bd',
    password: 'TestPass123!',
    displayName: 'Sharmin Sultana',
    role: 'shopkeeper',
    shopId: 'shop_bengal_pantry',
    pointsBalance: 510,
    referralCode: 'SHARMIN10',
  },
];

async function seedDemoAuthUsers() {
  console.log('--- REFERO Permanent Demo User Auth Provisioning ---');
  console.log(`Target Firebase Project: ${admin.app().options.projectId}`);

  for (const acc of DEMO_AUTH_ACCOUNTS) {
    try {
      // Check if user exists in Firebase Auth
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail(acc.email);
        console.log(`[AUTH] User "${acc.email}" already exists (UID: ${userRecord.uid}). Skipping creation.`);
      } catch (notFoundErr) {
        // Create user with stable UID & requested password
        userRecord = await auth.createUser({
          uid: acc.uid,
          email: acc.email,
          password: acc.password,
          displayName: acc.displayName,
          emailVerified: true,
        });
        console.log(`[AUTH] Successfully created user "${acc.email}" with UID "${userRecord.uid}".`);
      }

      // Ensure Firestore document exists
      const userDocRef = db.collection('users').doc(userRecord.uid);
      const docSnap = await userDocRef.get();
      if (!docSnap.exists) {
        await userDocRef.set({
          id: userRecord.uid,
          uid: userRecord.uid,
          email: acc.email,
          fullName: acc.displayName,
          role: acc.role,
          pointsBalance: acc.pointsBalance,
          points: acc.pointsBalance,
          pendingPoints: 0,
          referralCode: acc.referralCode,
          status: 'active',
          ...(acc.shopId ? { shopId: acc.shopId } : {}),
          createdAt: new Date().toISOString(),
        });
        console.log(`[FIRESTORE] Created matching profile document in /users/${userRecord.uid}.`);
      } else {
        console.log(`[FIRESTORE] Profile document /users/${userRecord.uid} already exists.`);
      }
    } catch (err) {
      console.error(`[ERROR] Failed to process ${acc.email}:`, err.message);
    }
  }

  console.log('--- Provisioning Process Completed ---');
}

seedDemoAuthUsers().catch(console.error);
