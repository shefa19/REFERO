import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { DEMO_USERS } from '../data/seedData';
import { isFirebaseConfigured, auth, db } from '../services/firebase/config';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AuthContextType {
  currentUser: UserProfile | null;
  userRole: UserRole;
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
  switchDemoRole: (role: UserRole | 'guest') => void;
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
  // Default to customer Moumita for immediate pleasant demo exploration, easily switchable in 1 click
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(DEMO_USERS[2]);
  const [userRole, setUserRole] = useState<UserRole>('customer');
  const [isDemoMode, setIsDemoMode] = useState<boolean>(!isFirebaseConfigured());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFirebaseActive, setIsFirebaseActive] = useState<boolean>(isFirebaseConfigured());

  useEffect(() => {
    const firestore = db;
    if (isFirebaseConfigured() && auth && firestore) {
      setIsFirebaseActive(true);
      const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
          // 1. Instant optimistic profile from localStorage if exists
          const cachedProfileStr = localStorage.getItem(`refero_user_${fbUser.uid}`);
          let initialProfile: UserProfile | null = null;
          if (cachedProfileStr) {
            try {
              initialProfile = JSON.parse(cachedProfileStr);
              if (initialProfile) {
                setCurrentUser(initialProfile);
                setUserRole(initialProfile.role);
                setIsDemoMode(false);
              }
            } catch {}
          }

          // 2. Prepare fallback profile in case Firestore client is offline
          const fallbackProfile: UserProfile = initialProfile || {
            id: fbUser.uid,
            email: fbUser.email || '',
            fullName: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
            role: 'customer',
            referralCode: `REF${Math.floor(1000 + Math.random() * 9000)}`,
            pointsBalance: 50,
            pendingPoints: 0,
            status: 'active',
            createdAt: new Date().toISOString(),
          };

          try {
            const userDocRef = doc(firestore, 'users', fbUser.uid);
            
            // Race getDoc with a 3.5s timeout to avoid hanging if client is offline
            const fetchPromise = getDoc(userDocRef);
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Firestore connection timeout / client offline')), 3500)
            );

            const userSnap = await Promise.race([fetchPromise, timeoutPromise]);
            if (userSnap.exists()) {
              const data = userSnap.data() as UserProfile;
              setCurrentUser(data);
              setUserRole(data.role);
              setIsDemoMode(false);
              localStorage.setItem(`refero_user_${fbUser.uid}`, JSON.stringify(data));
            } else {
              // Create default customer profile
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
              setDoc(userDocRef, firestoreData).catch(() => {});
              setCurrentUser(newProfile);
              setUserRole('customer');
              setIsDemoMode(false);
              localStorage.setItem(`refero_user_${fbUser.uid}`, JSON.stringify(newProfile));
            }
          } catch (err: any) {
            console.warn('Firestore user profile offline/fallback:', err?.message || err);
            setCurrentUser(fallbackProfile);
            setUserRole(fallbackProfile.role);
            setIsDemoMode(false);
            localStorage.setItem(`refero_user_${fbUser.uid}`, JSON.stringify(fallbackProfile));
          }
        }
      });
      return () => unsubscribe();
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

      // Demo Mode login fallback
      await new Promise((r) => setTimeout(r, 400));
      const found = DEMO_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (found) {
        setCurrentUser(found);
        setUserRole(found.role);
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
        pointsBalance: 50,
        pendingPoints: 0,
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      setCurrentUser(dynamicUser);
      setUserRole('customer');
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'Login failed. Please verify credentials.' };
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

          // Both Auth & Firestore succeeded
          localStorage.setItem(`refero_user_${userCred.user.uid}`, JSON.stringify(newProfile));
          setCurrentUser(newProfile);
          setUserRole('customer');
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
        }

        setCurrentUser(newDemoUser);
        setUserRole('customer');
        return { success: true };
      };

      const result = await Promise.race([executeRegisterFlow(), timeoutPromise]);
      return result;
    } catch (err: any) {
      console.error('Registration flow exception:', err.code || 'TIMEOUT_OR_FATAL', err.message, err);
      return { success: false, error: err.message || 'Registration failed.' };
    } finally {
      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
      }
      setIsLoading(false); // ALWAYS reset loading state so button never stays stuck
    }
  };

  const logout = async () => {
    if (isFirebaseConfigured() && auth) {
      await fbSignOut(auth);
    }
    setCurrentUser(null);
    setUserRole('customer');
  };

  const switchDemoRole = (role: UserRole | 'guest') => {
    if (role === 'guest') {
      setCurrentUser(null);
      setUserRole('customer');
      return;
    }
    const match = DEMO_USERS.find((u) => u.role === role);
    if (match) {
      setCurrentUser(match);
      setUserRole(match.role);
    }
  };

  const updateCurrentUserProfile = (updates: Partial<UserProfile>) => {
    if (!currentUser) return;
    setCurrentUser({ ...currentUser, ...updates });
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userRole,
        isDemoMode,
        isLoading,
        isFirebaseActive,
        login,
        register,
        logout,
        switchDemoRole,
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
