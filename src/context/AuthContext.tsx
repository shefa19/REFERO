import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { DEMO_USERS, DEMO_REFERRALS, DEMO_NOTIFICATIONS } from '../data/seedData';
import { isFirebaseConfigured, auth, db } from '../services/firebase/config';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { formatAuthError } from '../utils/authErrors';

export type DemoPreviewMode = 'customer' | 'seller' | 'guest' | null;

interface AuthContextType {
  currentUser: UserProfile | null;
  userRole: UserRole;
  isRealAdmin: boolean;
  isAdminPreviewActive: boolean;
  previewRole: DemoPreviewMode;
  isDemoMode: boolean;
  isLoading: boolean;
  isFirebaseActive: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  register: (
    name: string,
    email: string,
    pass: string,
    referralCode?: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  enterPreview: (mode: 'customer' | 'seller' | 'guest') => void;
  switchDemoRole: (role: UserRole | 'guest' | 'exit') => void;
  exitAdminPreview: () => void;
  updateCurrentUserProfile: (updates: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Strips all undefined fields from an object so Firestore setDoc never
 * encounters unsupported undefined field values.
 */
function cleanUndefinedFields<T extends Record<string, any>>(obj: T): T {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        cleaned[key] = cleanUndefinedFields(value);
      } else {
        cleaned[key] = value;
      }
    }
  }
  return cleaned as T;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Real authenticated user state (starts as null for unauthenticated public/guest visitors)
  const [realUser, setRealUser] = useState<UserProfile | null>(null);
  // Sandboxed preview state (strictly accessible only when realUser.role === 'admin')
  const [previewRole, setPreviewRole] = useState<DemoPreviewMode>(null);
  const [adminPreviewPersona, setAdminPreviewPersona] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFirebaseActive, setIsFirebaseActive] = useState<boolean>(isFirebaseConfigured());
  const [isDemoMode, setIsDemoMode] = useState<boolean>(!isFirebaseConfigured());

  // Genuine Admin privilege check is strictly bound to real authenticated user
  const isRealAdmin = Boolean(realUser && realUser.role === 'admin');
  const isAdminPreviewActive = Boolean(isRealAdmin && previewRole !== null);

  // Active user exposed to UI components:
  // When Admin is running a sandboxed preview:
  // - If previewRole === 'guest', currentUser is null (public visitor simulation)
  // - If previewRole === 'customer' or 'seller', currentUser is the simulated persona
  // Otherwise, currentUser is strictly the real authenticated user.
  const currentUser = isAdminPreviewActive
    ? (previewRole === 'guest' ? null : adminPreviewPersona)
    : realUser;
  const userRole: UserRole = currentUser ? currentUser.role : 'customer';

  useEffect(() => {
    const firestore = db;
    if (isFirebaseConfigured() && auth && firestore) {
      setIsFirebaseActive(true);
      let userDocUnsubscribe: (() => void) | null = null;

      const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
        // Tear down any previous document listener immediately on auth change
        if (userDocUnsubscribe) {
          userDocUnsubscribe();
          userDocUnsubscribe = null;
        }

        if (fbUser) {
          // 1. Instant optimistic profile from localStorage if exists for this exact UID
          const cachedProfileStr = localStorage.getItem(`refero_user_${fbUser.uid}`);
          if (cachedProfileStr) {
            try {
              const cached = JSON.parse(cachedProfileStr);
              if (cached && (cached.id === fbUser.uid || cached.uid === fbUser.uid)) {
                setRealUser(cached);
                setIsDemoMode(false);
              }
            } catch {}
          }

          // 2. Authoritative live Firestore document listener
          const userDocRef = doc(firestore, 'users', fbUser.uid);
          userDocUnsubscribe = onSnapshot(
            userDocRef,
            (userSnap) => {
              if (userSnap.exists()) {
                const data = userSnap.data() as UserProfile;
                // Normalize points and pointsBalance
                const normalized: UserProfile = {
                  ...data,
                  id: data.id || fbUser.uid,
                  pointsBalance: typeof data.pointsBalance === 'number'
                    ? data.pointsBalance
                    : (typeof (data as any).points === 'number' ? (data as any).points : 0),
                  pendingPoints: typeof data.pendingPoints === 'number' ? data.pendingPoints : 0,
                };
                setRealUser(normalized);
                setIsDemoMode(false);
                localStorage.setItem(`refero_user_${fbUser.uid}`, JSON.stringify(normalized));
              } else {
                // First-time registration fallback document creation
                const newProfile: UserProfile & { points: number; uid: string } = {
                  id: fbUser.uid,
                  uid: fbUser.uid,
                  email: fbUser.email || '',
                  fullName: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
                  role: 'customer',
                  referralCode: `REF${Math.floor(1000 + Math.random() * 9000)}`,
                  points: 0,
                  pointsBalance: 0,
                  pendingPoints: 0,
                  status: 'active',
                  createdAt: new Date().toISOString(),
                };
                const firestoreData = cleanUndefinedFields(newProfile);
                setDoc(userDocRef, firestoreData).catch((err) => {
                  console.warn('Initial profile create error:', err);
                });
                setRealUser(newProfile);
                setIsDemoMode(false);
                localStorage.setItem(`refero_user_${fbUser.uid}`, JSON.stringify(newProfile));
              }
            },
            (err) => {
              console.warn('Firestore live user onSnapshot note:', err.message);
            }
          );
        } else {
          // Unauthenticated public visitor: thoroughly reset user state
          setRealUser(null);
          setAdminPreviewPersona(null);
          setPreviewRole(null);
          setIsDemoMode(false);
        }
      });

      return () => {
        if (userDocUnsubscribe) {
          userDocUnsubscribe();
        }
        unsubscribeAuth();
      };
    }
  }, []);

  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      if (isFirebaseConfigured() && auth) {
        await signInWithEmailAndPassword(auth, email, pass);
        setIsLoading(false);
        return { success: true };
      }

      // Demo Mode login fallback when Firebase is not active
      await new Promise((r) => setTimeout(r, 400));
      const found = DEMO_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (found) {
        setRealUser(found);
        setIsDemoMode(true);
        setIsLoading(false);
        return { success: true };
      }

      // Dynamic demo user login
      const dynamicUser: UserProfile = {
        id: `user_${Date.now()}`,
        email,
        fullName: email.split('@')[0].replace('.', ' '),
        role: 'customer', // Always customer by default as required by security rules
        referralCode: `REF${Math.floor(1000 + Math.random() * 9000)}`,
        pointsBalance: 0,
        pendingPoints: 0,
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      setRealUser(dynamicUser);
      setIsDemoMode(true);
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: formatAuthError(err) };
    }
  };

  const register = async (
    name: string,
    email: string,
    pass: string,
    referralCode?: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);

    let timeoutTimer: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<{ success: false; error: string }>((_, reject) => {
      timeoutTimer = setTimeout(() => {
        reject(new Error('Registration timed out after 20 seconds. Please check your network and Firebase status.'));
      }, 20000);
    });

    try {
      const executeRegisterFlow = async (): Promise<{ success: boolean; error?: string }> => {
        const firestore = db;
        const trimmedReferral = referralCode?.trim();

        if (isFirebaseConfigured() && auth && firestore) {
          // STEP 1: Firebase Auth user creation with its own try/catch
          let userCred;
          try {
            userCred = await createUserWithEmailAndPassword(auth, email, pass);
          } catch (authErr: any) {
            console.error('Registration Auth error:', authErr.code, authErr.message, authErr);
            let friendlyError = authErr.message || 'Authentication registration failed.';
            if (authErr.code === 'auth/email-already-in-use') {
              friendlyError = 'This email address is already in use. Please sign in instead.';
            } else if (authErr.code === 'auth/weak-password') {
              friendlyError = 'Password is too weak. Please use at least 6 characters.';
            } else if (authErr.code === 'auth/invalid-email') {
              friendlyError = 'Invalid email address format.';
            } else if (authErr.code === 'auth/network-request-failed') {
              friendlyError = 'Network error: could not connect to Firebase Auth server.';
            }
            return { success: false, error: friendlyError };
          }

          // Build clean profile with role "customer", points: 0, pointsBalance: 0, uid: userCred.user.uid
          const newProfile: UserProfile & { points: number; uid: string } = {
            id: userCred.user.uid,
            uid: userCred.user.uid,
            email,
            fullName: name,
            role: 'customer',
            points: 0,
            pointsBalance: 0,
            pendingPoints: 0,
            referralCode: `${name.slice(0, 3).toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`,
            status: 'active',
            createdAt: new Date().toISOString(),
          };

          if (trimmedReferral) {
            newProfile.referredBy = trimmedReferral;
          }

          const firestoreData = cleanUndefinedFields(newProfile);

          // STEP 2: Firestore document write with its own SEPARATE try/catch
          try {
            await setDoc(doc(firestore, 'users', userCred.user.uid), firestoreData);
          } catch (setDocErr: any) {
            console.error('Registration Firestore error:', setDocErr.code, setDocErr.message, setDocErr);
            let firestoreError = `Firestore profile creation failed: ${setDocErr.message} (code: ${setDocErr.code || 'unknown'})`;
            if (setDocErr.code === 'permission-denied') {
              firestoreError = 'Permission denied by Firestore security rules. Please publish the required rules allowing profile creation with role "customer" and points: 0.';
            } else if (setDocErr.code === 'unavailable') {
              firestoreError = 'Firestore service is currently unavailable or offline.';
            }
            return { success: false, error: firestoreError };
          }

          // STEP 3: Handle Referral Attribution & Referrer Notification (Event C)
          if (trimmedReferral && trimmedReferral.toUpperCase() !== newProfile.referralCode.toUpperCase()) {
            try {
              const usersRef = collection(firestore, 'users');
              const q = query(usersRef, where('referralCode', '==', trimmedReferral));
              const refSnap = await getDocs(q);
              if (!refSnap.empty) {
                const referrerDoc = refSnap.docs[0];
                const referrerData = referrerDoc.data();
                if (referrerDoc.id !== userCred.user.uid) {
                  const refRecordId = `ref_${userCred.user.uid}`;
                  await setDoc(doc(firestore, 'referrals', refRecordId), {
                    id: refRecordId,
                    referrerUserId: referrerDoc.id,
                    referrerCode: trimmedReferral,
                    referredUserId: userCred.user.uid,
                    referredUserName: name,
                    referredUserEmail: email,
                    status: 'registered',
                    rewardPoints: 150,
                    createdAt: new Date().toISOString(),
                  });

                  // Notify Referrer that new customer joined (Event C)
                  const notifId = `notif_ref_signup_${userCred.user.uid}`;
                  await setDoc(doc(firestore, 'notifications', notifId), {
                    id: notifId,
                    userId: referrerDoc.id,
                    title: 'New Customer Joined With Your Referral Code!',
                    message: `${name} joined REFERO using your referral code (${trimmedReferral}). Your 150 REFERO Points bonus will be awarded after their first order is delivered!`,
                    type: 'points',
                    link: 'referrals',
                    read: false,
                    createdAt: new Date().toISOString(),
                  });
                }
              }
            } catch (refErr) {
              console.warn('Referral recording warning:', refErr);
            }
          }

          // STEP 4: Persistent Welcome Notification for new account (Event E)
          try {
            const welcomeId = `notif_welcome_${userCred.user.uid}`;
            await setDoc(doc(firestore, 'notifications', welcomeId), {
              id: welcomeId,
              userId: userCred.user.uid,
              title: 'Welcome to REFERO!',
              message: 'Earn REFERO Points on every qualifying order and invite friends using your personal referral code.',
              type: 'system',
              read: false,
              createdAt: new Date().toISOString(),
            });
          } catch (notifErr) {
            console.warn('Welcome notification warning:', notifErr);
          }

          // Both Auth & Firestore succeeded
          localStorage.setItem(`refero_user_${userCred.user.uid}`, JSON.stringify(newProfile));
          setRealUser(newProfile);
          return { success: true };
        }

        // Demo Mode Registration fallback
        await new Promise((r) => setTimeout(r, 400));
        const newDemoUser: UserProfile = {
          id: `user_${Date.now()}`,
          email,
          fullName: name,
          role: 'customer',
          referralCode: `${name.slice(0, 3).toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`,
          pointsBalance: 0,
          pendingPoints: 0,
          status: 'active',
          createdAt: new Date().toISOString(),
        };
        if (trimmedReferral) {
          newDemoUser.referredBy = trimmedReferral;
          // Demo referral record & referrer notification
          const referrerUser = DEMO_USERS.find(
            (u) => u.referralCode?.toUpperCase() === trimmedReferral.toUpperCase()
          );
          if (referrerUser && referrerUser.id !== newDemoUser.id) {
            DEMO_REFERRALS.push({
              id: `ref_${newDemoUser.id}`,
              referrerUserId: referrerUser.id,
              referrerCode: trimmedReferral,
              referredUserId: newDemoUser.id,
              referredUserName: name,
              referredUserEmail: email,
              status: 'registered',
              rewardPoints: 150,
              createdAt: new Date().toISOString(),
            });

            DEMO_NOTIFICATIONS.push({
              id: `notif_ref_signup_${newDemoUser.id}`,
              userId: referrerUser.id,
              title: 'New Customer Joined With Your Referral Code!',
              message: `${name} joined REFERO using your referral code (${trimmedReferral}). Your 150 REFERO Points bonus will be awarded after their first order is delivered!`,
              type: 'points',
              link: 'referrals',
              read: false,
              createdAt: new Date().toISOString(),
            });
          }
        }

        // Welcome notification for demo user (Event E)
        DEMO_NOTIFICATIONS.push({
          id: `notif_welcome_${newDemoUser.id}`,
          userId: newDemoUser.id,
          title: 'Welcome to REFERO!',
          message: 'Earn REFERO Points on every qualifying order and invite friends using your personal referral code.',
          type: 'system',
          read: false,
          createdAt: new Date().toISOString(),
        });

        setRealUser(newDemoUser);
        return { success: true };
      };

      const result = await Promise.race([executeRegisterFlow(), timeoutPromise]);
      return result;
    } catch (err: any) {
      console.error('Registration flow exception:', err.code || 'TIMEOUT_OR_FATAL', err.message, err);
      return { success: false, error: formatAuthError(err) };
    } finally {
      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
      }
      setIsLoading(false);
    }
  };

  const logout = async () => {
    if (isFirebaseConfigured() && auth) {
      await fbSignOut(auth);
    }
    setRealUser(null);
    setPreviewRole(null);
    setAdminPreviewPersona(null);
    setIsDemoMode(false);
  };

  /**
   * Enters an isolated preview mode for demonstration purposes (e.g. for professors / evaluators).
   * STRICT SECURITY: Only genuinely verified Administrators can activate preview mode.
   * Does NOT alter the real Firebase Auth token, session, custom claims, or production Firestore roles.
   */
  const enterPreview = (mode: 'customer' | 'seller' | 'guest') => {
    if (!isRealAdmin) {
      console.warn('Security restriction: Demo persona switching is restricted strictly to verified Administrators.');
      return;
    }

    setPreviewRole(mode);

    if (mode === 'customer') {
      const customerPersona = DEMO_USERS.find((u) => u.role === 'customer') || {
        id: 'preview_customer_moumita',
        email: 'moumita.ahmed@gmail.com',
        fullName: 'Moumita Pramanik',
        phone: '+880 1913 555666',
        role: 'customer' as const,
        referralCode: 'MOUMITA2026',
        pointsBalance: 840,
        pendingPoints: 45,
        status: 'active' as const,
        createdAt: '2026-02-01T08:30:00Z',
      };
      setAdminPreviewPersona({
        ...customerPersona,
        id: customerPersona.id,
        fullName: `${customerPersona.fullName} [Demo Preview]`,
      });
    } else if (mode === 'seller') {
      const sellerPersona = DEMO_USERS.find((u) => u.role === 'shopkeeper') || {
        id: 'user_shopkeeper_01',
        email: 'mahin@greenvalley.bd',
        fullName: 'Mahinur Islam',
        phone: '+880 1812 333444',
        role: 'shopkeeper' as const,
        shopId: 'shop_green_valley',
        referralCode: 'MAHIN88',
        pointsBalance: 650,
        pendingPoints: 0,
        status: 'active' as const,
        createdAt: '2026-01-15T12:00:00Z',
      };
      setAdminPreviewPersona({
        ...sellerPersona,
        id: sellerPersona.id,
        fullName: `${sellerPersona.fullName} [Demo Preview]`,
      });
    } else {
      // mode === 'guest': currentUser will evaluate to null
      setAdminPreviewPersona(null);
    }
  };

  const switchDemoRole = (role: UserRole | 'guest' | 'exit') => {
    if (role === 'exit' || role === 'admin') {
      exitAdminPreview();
    } else if (role === 'guest') {
      enterPreview('guest');
    } else if (role === 'shopkeeper') {
      enterPreview('seller');
    } else if (role === 'customer') {
      enterPreview('customer');
    }
  };

  const exitAdminPreview = () => {
    setPreviewRole(null);
    setAdminPreviewPersona(null);
  };

  const updateCurrentUserProfile = (updates: Partial<UserProfile>) => {
    if (!currentUser) return;
    if (adminPreviewPersona) {
      setAdminPreviewPersona({ ...adminPreviewPersona, ...updates });
    } else if (realUser) {
      setRealUser({ ...realUser, ...updates });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userRole,
        isRealAdmin,
        isAdminPreviewActive,
        previewRole,
        isDemoMode,
        isLoading,
        isFirebaseActive,
        login,
        register,
        logout,
        enterPreview,
        switchDemoRole,
        exitAdminPreview,
        updateCurrentUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
