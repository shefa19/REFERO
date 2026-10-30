import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { db, isFirebaseConfigured, firebaseConfig } from './config';
import {
  DEMO_USERS,
  DEMO_SHOPS,
  DEMO_PRODUCTS,
  DEMO_ORDERS,
  DEMO_POINT_TRANSACTIONS,
  DEMO_REFERRALS,
  INITIAL_POINTS_CONFIG,
  DEMO_AUDIT_LOGS,
} from '../../data/seedData';
import { UserProfile } from '../../types';

export interface MigrationSummary {
  timestamp: string;
  projectId: string;
  usersMigrated: number;
  usersSkipped: number;
  shopsMigrated: number;
  shopsSkipped: number;
  productsMigrated: number;
  productsSkipped: number;
  ordersMigrated: number;
  ordersSkipped: number;
  details: {
    users: { id: string; email: string; role: string; status: 'migrated' | 'already_exists' | 'conflict_skipped' }[];
    shops: { id: string; name: string; ownerId: string; status: 'migrated' | 'already_exists' }[];
    conflicts: string[];
  };
}

/**
 * Permanently migrates demo Customers, Shopkeepers, Shops, Products and Orders to Firestore
 * SAFELY AND IDEMPOTENTLY.
 * 
 * Safety invariants:
 * 1. Strictly excludes any admin user account to never touch, overwrite, or mutate the real Admin profile.
 * 2. Uses stable document IDs (`user_customer_01`, `shop_green_valley`, etc.) to guarantee idempotence.
 * 3. Never overwrites existing production records.
 */
export async function migrateDemoDataToFirestore(currentAdminUid: string): Promise<MigrationSummary> {
  if (!isFirebaseConfigured() || !db) {
    throw new Error('Firebase Firestore is not configured or offline.');
  }

  const activeDb = db;
  const summary: MigrationSummary = {
    timestamp: new Date().toISOString(),
    projectId: firebaseConfig.projectId || 'refero-d897d',
    usersMigrated: 0,
    usersSkipped: 0,
    shopsMigrated: 0,
    shopsSkipped: 0,
    productsMigrated: 0,
    productsSkipped: 0,
    ordersMigrated: 0,
    ordersSkipped: 0,
    details: {
      users: [],
      shops: [],
      conflicts: [],
    },
  };

  // 1. Migrate Demo Users (Customers and Shopkeepers ONLY - strictly excluding admin)
  const targetUsers = DEMO_USERS.filter((u) => u.role !== 'admin' && u.id !== currentAdminUid);

  for (const user of targetUsers) {
    try {
      const userRef = doc(activeDb, 'users', user.id);
      const existingSnap = await getDoc(userRef);

      if (existingSnap.exists()) {
        summary.usersSkipped++;
        summary.details.users.push({
          id: user.id,
          email: user.email,
          role: user.role,
          status: 'already_exists',
        });
      } else {
        // Prepare clean user document
        const userData: UserProfile & { points: number; uid: string } = {
          ...user,
          points: user.pointsBalance,
          uid: user.id,
        };
        await setDoc(userRef, userData);
        summary.usersMigrated++;
        summary.details.users.push({
          id: user.id,
          email: user.email,
          role: user.role,
          status: 'migrated',
        });
      }
    } catch (err: any) {
      summary.details.conflicts.push(`User ${user.email} error: ${err.message}`);
    }
  }

  // 2. Migrate Demo Shops (Preserving approval statuses)
  for (const shop of DEMO_SHOPS) {
    try {
      const shopRef = doc(activeDb, 'shops', shop.id);
      const existingSnap = await getDoc(shopRef);

      if (existingSnap.exists()) {
        summary.shopsSkipped++;
        summary.details.shops.push({
          id: shop.id,
          name: shop.name,
          ownerId: shop.ownerId,
          status: 'already_exists',
        });
      } else {
        await setDoc(shopRef, shop);
        summary.shopsMigrated++;
        summary.details.shops.push({
          id: shop.id,
          name: shop.name,
          ownerId: shop.ownerId,
          status: 'migrated',
        });
      }
    } catch (err: any) {
      summary.details.conflicts.push(`Shop ${shop.name} error: ${err.message}`);
    }
  }

  // 3. Migrate Demo Products
  for (const product of DEMO_PRODUCTS) {
    try {
      const productRef = doc(activeDb, 'products', product.id);
      const existingSnap = await getDoc(productRef);

      if (existingSnap.exists()) {
        summary.productsSkipped++;
      } else {
        await setDoc(productRef, product);
        summary.productsMigrated++;
      }
    } catch (err: any) {
      summary.details.conflicts.push(`Product ${product.title} error: ${err.message}`);
    }
  }

  // 4. Migrate Demo Orders
  for (const order of DEMO_ORDERS) {
    try {
      const orderRef = doc(activeDb, 'orders', order.id);
      const existingSnap = await getDoc(orderRef);

      if (existingSnap.exists()) {
        summary.ordersSkipped++;
      } else {
        await setDoc(orderRef, order);
        summary.ordersMigrated++;
      }
    } catch (err: any) {
      summary.details.conflicts.push(`Order ${order.orderNumber} error: ${err.message}`);
    }
  }

  // 5. Migrate Points Configuration if absent
  try {
    const configRef = doc(activeDb, 'pointsConfig', 'current');
    const existingSnap = await getDoc(configRef);
    if (!existingSnap.exists()) {
      await setDoc(configRef, INITIAL_POINTS_CONFIG);
    }
  } catch (err: any) {
    summary.details.conflicts.push(`Points config error: ${err.message}`);
  }

  return summary;
}
