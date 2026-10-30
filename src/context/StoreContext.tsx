import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Product,
  Shop,
  Order,
  CartItem,
  PointTransaction,
  PointTransferRequest,
  ReferralRecord,
  PointsConfig,
  AuditLog,
  OrderItem,
  OrderAddress,
  PaymentMethod,
  UserRole,
  NotificationItem,
} from '../types';
import {
  DEMO_USERS,
  DEMO_PRODUCTS,
  DEMO_SHOPS,
  DEMO_ORDERS,
  DEMO_POINT_TRANSACTIONS,
  DEMO_TRANSFER_REQUESTS,
  DEMO_REFERRALS,
  INITIAL_POINTS_CONFIG,
  DEMO_AUDIT_LOGS,
  DEMO_NOTIFICATIONS,
} from '../data/seedData';
import { calculateEarnedPoints, pointsToBdt } from '../utils/formatters';
import { cleanUndefinedFields } from '../utils/cleaners';
import { db, isFirebaseConfigured } from '../services/firebase/config';
import { callAcceptPointTransfer, callDeclinePointTransfer } from '../services/firebase/functionsClient';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, limit, runTransaction } from 'firebase/firestore';
import { useAuth } from './AuthContext';

export type AppView =
  | 'home'
  | 'products'
  | 'product_detail'
  | 'shop_profile'
  | 'checkout'
  | 'order_tracking'
  | 'customer_dashboard'
  | 'shopkeeper_dashboard'
  | 'admin_dashboard'
  | 'wishlist'
  | 'policy_points'
  | 'policy_shipping'
  | 'policy_returns'
  | 'policy_terms'
  | 'help_center';

export interface ProductFilterState {
  category: string;
  searchQuery: string;
  minPrice: number;
  maxPrice: number;
  selectedBrand: string;
  selectedShop: string;
  inStockOnly: boolean;
  pointsEarningOnly: boolean;
  redeemWithPointsOnly: boolean;
  sortBy: 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'points';
}

const defaultFilterState: ProductFilterState = {
  category: 'All',
  searchQuery: '',
  minPrice: 0,
  maxPrice: 3000,
  selectedBrand: 'All',
  selectedShop: 'All',
  inStockOnly: false,
  pointsEarningOnly: false,
  redeemWithPointsOnly: false,
  sortBy: 'relevance',
};

interface StoreContextType {
  // Navigation & modals
  currentView: AppView;
  selectedProductId: string | null;
  selectedShopId: string | null;
  selectedOrderId: string | null;
  isCartDrawerOpen: boolean;
  isAuthModalOpen: boolean;
  authModalTab: 'login' | 'register';
  isFirebaseModalOpen: boolean;
  isSellerModalOpen: boolean;
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;

  // Data collections
  products: Product[];
  shops: Shop[];
  orders: Order[];
  cart: CartItem[];
  wishlist: string[];
  pointTransactions: PointTransaction[];
  transferRequests: PointTransferRequest[];
  referrals: ReferralRecord[];
  pointsConfig: PointsConfig;
  auditLogs: AuditLog[];
  notifications: NotificationItem[];
  filters: ProductFilterState;
  customerTab: 'overview' | 'orders' | 'points' | 'referrals' | 'transfers' | 'wishlist';
  setCustomerTab: (tab: 'overview' | 'orders' | 'points' | 'referrals' | 'transfers' | 'wishlist') => void;

  // Navigation actions
  navigateTo: (
    view: AppView,
    params?: {
      productId?: string;
      shopId?: string;
      orderId?: string;
      customerTab?: 'overview' | 'orders' | 'points' | 'referrals' | 'transfers' | 'wishlist';
    }
  ) => void;
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
  openAuthModal: (tab?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  openFirebaseModal: () => void;
  closeFirebaseModal: () => void;
  openSellerModal: () => void;
  closeSellerModal: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;

  // Cart & Wishlist actions
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  toggleWishlist: (productId: string) => void;
  removeFromWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;

  // Filter actions
  setFilter: (updates: Partial<ProductFilterState>) => void;
  resetFilters: () => void;

  // Order & Checkout
  createOrder: (orderData: {
    address: OrderAddress;
    paymentMethod: PaymentMethod;
    pointsToUse: number;
    paymentReference?: string;
  }) => Promise<Order>;

  // Customer Point Transfers
  submitPointTransfer: (recipientEmail: string, points: number, note?: string) => Promise<{ success: boolean; message: string }>;
  approvePointTransfer: (requestId: string) => Promise<{ success: boolean; message: string }>;
  rejectPointTransfer: (requestId: string) => Promise<{ success: boolean; message: string }>;

  // Shopkeeper workflows
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'rating' | 'reviewCount'>) => void | Promise<void>;
  updateProduct: (productId: string, updates: Partial<Product>) => void | Promise<void>;
  deleteProduct: (productId: string) => void | Promise<void>;
  updateOrderItemStatus: (orderId: string, status: Order['orderStatus']) => void;
  applyForSellerShop: (shopData: {
    name: string;
    description: string;
    phone: string;
    address: string;
    category: string;
    deliveryPolicy?: string;
    returnPolicy?: string;
    cancellationPolicy?: string;
    contactPerson?: string;
    businessEmail?: string;
    tradeLicenseNumber?: string;
    customerSupportPhone?: string;
    customerSupportEmail?: string;
  }) => Promise<{ success: boolean; message: string }>;
  updateShopPolicies: (shopId: string, updates: Partial<Shop>) => void | Promise<void>;

  // Admin workflows
  updatePointsConfig: (newConfig: Partial<PointsConfig>) => void;
  approveShop: (shopId: string) => void | Promise<void>;
  rejectShop: (shopId: string, reason: string) => void | Promise<void>;
  suspendShop: (shopId: string, reason: string) => void | Promise<void>;
  reinstateShop: (shopId: string) => void | Promise<void>;
  requestShopInfo: (shopId: string, notes: string) => void | Promise<void>;
  processRefund: (orderId: string, reason: string) => Promise<{ success: boolean; message: string }>;
  updateUserRoleAction: (userId: string, newRole: UserRole) => void;
  adjustUserPoints: (
    targetUserId: string,
    deltaPoints: number,
    reason: string
  ) => Promise<{ success: boolean; message: string }>;

  // Notifications
  addNotification: (notif: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>) => void;
  markNotificationAsRead: (notificationId: string) => void;

  // Data source transparency (distinguishes live Firestore from sample demo catalog)
  dataSources: {
    products: 'live' | 'demo';
    shops: 'live' | 'demo';
    orders: 'live' | 'demo';
  };
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isAdminPreviewActive, updateCurrentUserProfile } = useAuth();

  // Navigation & View state
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState<boolean>(false);
  const [isSellerModalOpen, setIsSellerModalOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Core Data
  const [products, setProducts] = useState<Product[]>(DEMO_PRODUCTS);
  const [shops, setShops] = useState<Shop[]>(DEMO_SHOPS);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem('refero_guest_cart');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('refero_guest_wishlist');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [pointTransactions, setPointTransactions] = useState<PointTransaction[]>(DEMO_POINT_TRANSACTIONS);
  const [transferRequests, setTransferRequests] = useState<PointTransferRequest[]>(DEMO_TRANSFER_REQUESTS);
  const [referrals, setReferrals] = useState<ReferralRecord[]>(DEMO_REFERRALS);
  const [pointsConfig, setPointsConfig] = useState<PointsConfig>(INITIAL_POINTS_CONFIG);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(DEMO_AUDIT_LOGS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(DEMO_NOTIFICATIONS);
  const [filters, setFilters] = useState<ProductFilterState>(defaultFilterState);
  const [customerTab, setCustomerTab] = useState<
    'overview' | 'orders' | 'points' | 'referrals' | 'transfers' | 'wishlist'
  >('overview');
  const [dataSources, setDataSources] = useState<{
    products: 'live' | 'demo';
    shops: 'live' | 'demo';
    orders: 'live' | 'demo';
  }>({
    products: 'demo',
    shops: 'demo',
    orders: 'demo',
  });

  // Hydrate data from Firestore when configured
  useEffect(() => {
    const activeDb = db;
    if (!isFirebaseConfigured() || !activeDb) {
      setDataSources({ products: 'demo', shops: 'demo', orders: 'demo' });
      return;
    }

    let isMounted = true;

    const loadFirestoreData = async () => {
      try {
        // 1. Load products
        const productsSnap = await getDocs(collection(activeDb, 'products'));
        if (isMounted) {
          if (productsSnap.docs.length > 0) {
            const loadedProducts = productsSnap.docs.map((docSnap) => ({
              id: docSnap.id,
              ...docSnap.data(),
            })) as Product[];
            setProducts(loadedProducts);
            setDataSources((prev) => ({ ...prev, products: 'live' }));
          } else {
            setDataSources((prev) => ({ ...prev, products: 'demo' }));
          }
        }

        // 2. Load shops
        try {
          const shopsQuery = currentUser?.role === 'admin'
            ? collection(activeDb, 'shops')
            : query(collection(activeDb, 'shops'), where('status', '==', 'approved'));
          const shopsSnap = await getDocs(shopsQuery);
          if (isMounted) {
            if (shopsSnap.docs.length > 0) {
              const loadedShops = shopsSnap.docs.map((docSnap) => ({
                id: docSnap.id,
                ...docSnap.data(),
              })) as Shop[];
              // If current user has a pending or private shop, also load it if not in list
              if (currentUser?.shopId && !loadedShops.some((s) => s.id === currentUser.shopId)) {
                try {
                  const myShopSnap = await getDoc(doc(activeDb, 'shops', currentUser.shopId));
                  if (myShopSnap.exists()) {
                    loadedShops.push({ id: myShopSnap.id, ...myShopSnap.data() } as Shop);
                  }
                } catch {
                  // Ignore private shop fetch error
                }
              }
              setShops(loadedShops);
              setDataSources((prev) => ({ ...prev, shops: 'live' }));
            } else {
              setDataSources((prev) => ({ ...prev, shops: 'demo' }));
            }
          }
        } catch (shopErr) {
          console.warn('Firestore shops fetch note:', shopErr);
        }

        // 3. Load orders
        if (currentUser) {
          try {
            const ordersQuery = currentUser.role === 'admin'
              ? collection(activeDb, 'orders')
              : query(collection(activeDb, 'orders'), where('customerId', '==', currentUser.id));
            const ordersSnap = await getDocs(ordersQuery);
            if (isMounted) {
              if (ordersSnap.docs.length > 0) {
                const loadedOrders = ordersSnap.docs.map((docSnap) => ({
                  id: docSnap.id,
                  ...docSnap.data(),
                })) as Order[];
                setOrders(loadedOrders);
                setDataSources((prev) => ({ ...prev, orders: 'live' }));
              } else {
                setDataSources((prev) => ({ ...prev, orders: 'demo' }));
              }
            }
          } catch (orderErr) {
            console.warn('Firestore orders fetch note:', orderErr);
          }
        }
      } catch (err) {
        console.warn('Firestore initial data fetch note:', err);
      }
    };

    loadFirestoreData();

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  // Comprehensive User-Scoped Data Sync & State Isolation
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setOrders([]);
      setPointTransactions([]);
      setTransferRequests([]);
      setReferrals([]);
      try {
        const guestCart = localStorage.getItem('refero_guest_cart');
        setCart(guestCart ? JSON.parse(guestCart) : []);
      } catch {
        setCart([]);
      }
      try {
        const guestWishlist = localStorage.getItem('refero_guest_wishlist');
        setWishlist(guestWishlist ? JSON.parse(guestWishlist) : []);
      } catch {
        setWishlist([]);
      }
      return;
    }

    const userId = currentUser.id;
    const activeDb = db;
    let isCancelled = false;

    // 1. Hydrate User Wishlist & Merge Guest Wishlist Safely
    try {
      const guestWishlistStr = localStorage.getItem('refero_guest_wishlist');
      const guestWishlist: string[] = guestWishlistStr ? JSON.parse(guestWishlistStr) : [];
      const userCachedWishlistStr = localStorage.getItem(`refero_user_wishlist_${userId}`);
      const userCachedWishlist: string[] = userCachedWishlistStr ? JSON.parse(userCachedWishlistStr) : [];

      if (isFirebaseConfigured() && activeDb && !isAdminPreviewActive) {
        getDoc(doc(activeDb, 'users', userId))
          .then((docSnap) => {
            if (isCancelled) return;
            let remoteWishlist: string[] = [];
            if (docSnap.exists()) {
              const data = docSnap.data();
              if (Array.isArray(data.wishlist)) remoteWishlist = data.wishlist;
            }
            const merged = Array.from(new Set([...userCachedWishlist, ...remoteWishlist, ...guestWishlist]));
            setWishlist(merged);
            localStorage.setItem(`refero_user_wishlist_${userId}`, JSON.stringify(merged));
            if (guestWishlist.length > 0) {
              localStorage.removeItem('refero_guest_wishlist');
            }
            if (merged.length !== remoteWishlist.length) {
              updateDoc(doc(activeDb, 'users', userId), { wishlist: merged }).catch(() => {});
            }
          })
          .catch(() => {
            if (isCancelled) return;
            const merged = Array.from(new Set([...userCachedWishlist, ...guestWishlist]));
            setWishlist(merged);
          });
      } else {
        const merged = Array.from(new Set([...userCachedWishlist, ...guestWishlist]));
        setWishlist(merged);
        localStorage.setItem(`refero_user_wishlist_${userId}`, JSON.stringify(merged));
        if (guestWishlist.length > 0) {
          localStorage.removeItem('refero_guest_wishlist');
        }
      }
    } catch {}

    // 2. Hydrate User Cart & Merge Guest Cart Safely
    try {
      const guestCartStr = localStorage.getItem('refero_guest_cart');
      const guestCart: CartItem[] = guestCartStr ? JSON.parse(guestCartStr) : [];
      const userCachedCartStr = localStorage.getItem(`refero_user_cart_${userId}`);
      const userCachedCart: CartItem[] = userCachedCartStr ? JSON.parse(userCachedCartStr) : [];

      if (isFirebaseConfigured() && activeDb && !isAdminPreviewActive) {
        getDoc(doc(activeDb, 'users', userId))
          .then((docSnap) => {
            if (isCancelled) return;
            let remoteCart: CartItem[] = [];
            if (docSnap.exists()) {
              const data = docSnap.data();
              if (Array.isArray(data.cart)) remoteCart = data.cart;
            }
            const baseCart = remoteCart.length > 0 ? remoteCart : userCachedCart;
            const mergedCart = [...baseCart];
            for (const gItem of guestCart) {
              const existingIdx = mergedCart.findIndex((i) => i.product.id === gItem.product.id);
              if (existingIdx >= 0) {
                mergedCart[existingIdx].quantity = Math.min(
                  mergedCart[existingIdx].product.stock,
                  mergedCart[existingIdx].quantity + gItem.quantity
                );
              } else {
                mergedCart.push(gItem);
              }
            }
            setCart(mergedCart);
            localStorage.setItem(`refero_user_cart_${userId}`, JSON.stringify(mergedCart));
            if (guestCart.length > 0) {
              localStorage.removeItem('refero_guest_cart');
            }
            updateDoc(doc(activeDb, 'users', userId), { cart: mergedCart }).catch(() => {});
          })
          .catch(() => {
            if (isCancelled) return;
            const mergedCart = [...userCachedCart];
            for (const gItem of guestCart) {
              const existingIdx = mergedCart.findIndex((i) => i.product.id === gItem.product.id);
              if (existingIdx >= 0) {
                mergedCart[existingIdx].quantity = Math.min(
                  mergedCart[existingIdx].product.stock,
                  mergedCart[existingIdx].quantity + gItem.quantity
                );
              } else {
                mergedCart.push(gItem);
              }
            }
            setCart(mergedCart);
          });
      } else {
        const mergedCart = [...userCachedCart];
        for (const gItem of guestCart) {
          const existingIdx = mergedCart.findIndex((i) => i.product.id === gItem.product.id);
          if (existingIdx >= 0) {
            mergedCart[existingIdx].quantity = Math.min(
              mergedCart[existingIdx].product.stock,
              mergedCart[existingIdx].quantity + gItem.quantity
            );
          } else {
            mergedCart.push(gItem);
          }
        }
        setCart(mergedCart);
        localStorage.setItem(`refero_user_cart_${userId}`, JSON.stringify(mergedCart));
        if (guestCart.length > 0) {
          localStorage.removeItem('refero_guest_cart');
        }
      }
    } catch {}

    // 3. User Point Transactions & Transfer Requests from Firestore
    if (isFirebaseConfigured() && activeDb && !isAdminPreviewActive) {
      // Point Transactions
      const txQuery = query(collection(activeDb, 'pointTransactions'), where('userId', '==', userId));
      getDocs(txQuery)
        .then((snap) => {
          if (isCancelled) return;
          if (snap.docs.length > 0) {
            const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as PointTransaction[];
            list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setPointTransactions(list);
          }
        })
        .catch(() => {});

      // Point Transfers (Outgoing & Incoming by email or user ID)
      const outgoingQuery = query(collection(activeDb, 'pointTransferRequests'), where('senderId', '==', userId));
      const incomingEmailQuery = query(collection(activeDb, 'pointTransferRequests'), where('recipientEmail', '==', currentUser.email.toLowerCase()));
      const incomingIdQuery = query(collection(activeDb, 'pointTransferRequests'), where('recipientId', '==', userId));
      Promise.all([getDocs(outgoingQuery), getDocs(incomingEmailQuery), getDocs(incomingIdQuery)])
        .then(([outSnap, inEmailSnap, inIdSnap]) => {
          if (isCancelled) return;
          const allReqsMap = new Map<string, PointTransferRequest>();
          outSnap.docs.forEach((d) => allReqsMap.set(d.id, { id: d.id, ...d.data() } as PointTransferRequest));
          inEmailSnap.docs.forEach((d) => allReqsMap.set(d.id, { id: d.id, ...d.data() } as PointTransferRequest));
          inIdSnap.docs.forEach((d) => allReqsMap.set(d.id, { id: d.id, ...d.data() } as PointTransferRequest));
          const list = Array.from(allReqsMap.values());
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setTransferRequests(list);
        })
        .catch(() => {});

      // Notifications (with cross-refresh read cache and idempotent Welcome notification)
      const notifQuery = currentUser.role === 'admin'
        ? query(collection(activeDb, 'notifications'))
        : query(collection(activeDb, 'notifications'), where('userId', '==', userId));

      const readCacheKey = `refero_notifications_read_${userId}`;
      let cachedReadIds: string[] = [];
      try {
        cachedReadIds = JSON.parse(localStorage.getItem(readCacheKey) || '[]');
      } catch {}

      getDocs(notifQuery)
        .then((snap) => {
          if (isCancelled) return;
          let list: NotificationItem[] = [];
          if (snap.docs.length > 0) {
            list = snap.docs.map((d) => {
              const item = { id: d.id, ...d.data() } as NotificationItem;
              if (cachedReadIds.includes(item.id)) {
                item.read = true;
              }
              return item;
            });
          }

          // Ensure Welcome notification exists for this user (Event E - never duplicates)
          const welcomeId = `notif_welcome_${userId}`;
          const hasWelcome = list.some((n) => n.id === welcomeId);
          if (!hasWelcome) {
            const isWelcomeRead = cachedReadIds.includes(welcomeId);
            const welcomeNotif: NotificationItem = {
              id: welcomeId,
              userId,
              title: 'Welcome to REFERO!',
              message: 'Earn REFERO Points on every qualifying order and invite friends using your personal referral code.',
              read: isWelcomeRead,
              type: 'system',
              createdAt: currentUser.createdAt || new Date().toISOString(),
            };
            list.push(welcomeNotif);
            if (activeDb) {
              setDoc(doc(activeDb, 'notifications', welcomeId), welcomeNotif).catch(() => {});
            }
          }

          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setNotifications(list);
        })
        .catch(() => {});
    }

    return () => {
      isCancelled = true;
    };
  }, [currentUser?.id, currentUser?.email, isAdminPreviewActive]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3800);
  };

  const navigateTo = (
    view: AppView,
    params?: {
      productId?: string;
      shopId?: string;
      orderId?: string;
      customerTab?: 'overview' | 'orders' | 'points' | 'referrals' | 'transfers' | 'wishlist';
    }
  ) => {
    setCurrentView(view);
    if (params?.productId) setSelectedProductId(params.productId);
    if (params?.shopId) setSelectedShopId(params.shopId);
    if (params?.orderId) setSelectedOrderId(params.orderId);
    if (params?.customerTab) setCustomerTab(params.customerTab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openCartDrawer = () => setIsCartDrawerOpen(true);
  const closeCartDrawer = () => setIsCartDrawerOpen(false);

  const openAuthModal = (tab: 'login' | 'register' = 'login') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };
  const closeAuthModal = () => setIsAuthModalOpen(false);

  const openFirebaseModal = () => setIsFirebaseModalOpen(true);
  const closeFirebaseModal = () => setIsFirebaseModalOpen(false);

  const openSellerModal = () => setIsSellerModalOpen(true);
  const closeSellerModal = () => setIsSellerModalOpen(false);

  const addNotification = async (notif: Omit<NotificationItem, 'id' | 'createdAt' | 'read'> & { id?: string }) => {
    const notifId = notif.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newNotif: NotificationItem = {
      ...notif,
      id: notifId,
      read: false,
      createdAt: new Date().toISOString(),
    };

    setNotifications((prev) => {
      if (prev.some((n) => n.id === notifId)) return prev;
      return [newNotif, ...prev];
    });

    const activeDb = db;
    if (isFirebaseConfigured() && activeDb && !isAdminPreviewActive) {
      try {
        await setDoc(doc(activeDb, 'notifications', notifId), newNotif);
      } catch (err) {
        console.warn('Could not persist notification to Firestore:', err);
      }
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );

    if (currentUser) {
      try {
        const cacheKey = `refero_notifications_read_${currentUser.id}`;
        const existing: string[] = JSON.parse(localStorage.getItem(cacheKey) || '[]');
        if (!existing.includes(notificationId)) {
          existing.push(notificationId);
          localStorage.setItem(cacheKey, JSON.stringify(existing));
        }
      } catch {}
    }

    const activeDb = db;
    if (isFirebaseConfigured() && activeDb && !isAdminPreviewActive) {
      try {
        await updateDoc(doc(activeDb, 'notifications', notificationId), {
          read: true,
        });
      } catch (err) {
        console.warn('Could not update notification read status in Firestore:', err);
      }
    }
  };

  // Cart Actions - Authoritatively Persisted & Isolated
  const addToCart = (product: Product, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      let updated: CartItem[];
      if (existing) {
        const newQty = Math.min(product.stock, existing.quantity + quantity);
        updated = prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: newQty } : item
        );
      } else {
        updated = [...prev, { product, quantity: Math.min(product.stock, quantity) }];
      }

      if (currentUser) {
        localStorage.setItem(`refero_user_cart_${currentUser.id}`, JSON.stringify(updated));
        if (isFirebaseConfigured() && db && !isAdminPreviewActive) {
          updateDoc(doc(db, 'users', currentUser.id), { cart: updated }).catch(() => {});
        }
      } else {
        localStorage.setItem('refero_guest_cart', JSON.stringify(updated));
      }

      return updated;
    });
    showToast(`Added ${product.title} to your cart`);
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => {
      const updated = prev.filter((item) => item.product.id !== productId);
      if (currentUser) {
        localStorage.setItem(`refero_user_cart_${currentUser.id}`, JSON.stringify(updated));
        if (isFirebaseConfigured() && db && !isAdminPreviewActive) {
          updateDoc(doc(db, 'users', currentUser.id), { cart: updated }).catch(() => {});
        }
      } else {
        localStorage.setItem('refero_guest_cart', JSON.stringify(updated));
      }
      return updated;
    });
    showToast('Item removed from cart', 'info');
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) => {
      const updated = prev.map((item) =>
        item.product.id === productId
          ? { ...item, quantity: Math.min(item.product.stock, quantity) }
          : item
      );
      if (currentUser) {
        localStorage.setItem(`refero_user_cart_${currentUser.id}`, JSON.stringify(updated));
        if (isFirebaseConfigured() && db && !isAdminPreviewActive) {
          updateDoc(doc(db, 'users', currentUser.id), { cart: updated }).catch(() => {});
        }
      } else {
        localStorage.setItem('refero_guest_cart', JSON.stringify(updated));
      }
      return updated;
    });
  };

  const clearCart = () => {
    setCart([]);
    if (currentUser) {
      localStorage.setItem(`refero_user_cart_${currentUser.id}`, JSON.stringify([]));
      if (isFirebaseConfigured() && db && !isAdminPreviewActive) {
        updateDoc(doc(db, 'users', currentUser.id), { cart: [] }).catch(() => {});
      }
    } else {
      localStorage.setItem('refero_guest_cart', JSON.stringify([]));
    }
  };

  // Wishlist Actions - Authoritatively Persisted & Isolated
  const toggleWishlist = (productId: string) => {
    setWishlist((prev) => {
      const exists = prev.includes(productId);
      const updated = exists ? prev.filter((id) => id !== productId) : [...prev, productId];

      if (currentUser) {
        localStorage.setItem(`refero_user_wishlist_${currentUser.id}`, JSON.stringify(updated));
        if (isFirebaseConfigured() && db && !isAdminPreviewActive) {
          updateDoc(doc(db, 'users', currentUser.id), { wishlist: updated }).catch((err) => {
            console.warn('Firestore wishlist background sync note:', err);
          });
        }
      } else {
        localStorage.setItem('refero_guest_wishlist', JSON.stringify(updated));
      }

      if (exists) {
        showToast('Removed from your wishlist', 'info');
      } else {
        showToast('Saved to your wishlist', 'success');
      }

      return updated;
    });
  };

  const removeFromWishlist = (productId: string) => {
    setWishlist((prev) => {
      const updated = prev.filter((id) => id !== productId);
      if (currentUser) {
        localStorage.setItem(`refero_user_wishlist_${currentUser.id}`, JSON.stringify(updated));
        if (isFirebaseConfigured() && db && !isAdminPreviewActive) {
          updateDoc(doc(db, 'users', currentUser.id), { wishlist: updated }).catch(() => {});
        }
      } else {
        localStorage.setItem('refero_guest_wishlist', JSON.stringify(updated));
      }

      showToast('Item removed from wishlist', 'info');
      return updated;
    });
  };

  const isInWishlist = (productId: string) => wishlist.includes(productId);

  // Filter actions
  const setFilter = (updates: Partial<ProductFilterState>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  };

  const resetFilters = () => setFilters(defaultFilterState);

  // Checkout & Order Placement
  const createOrder = async (orderData: {
    address: OrderAddress;
    paymentMethod: PaymentMethod;
    pointsToUse: number;
    paymentReference?: string;
  }): Promise<Order> => {
    if (!currentUser) throw new Error('User must be logged in to complete checkout.');
    if (cart.length === 0) throw new Error('Cart is empty.');

    const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    // Free delivery over ৳999
    const deliveryFee = subtotal >= 999 ? 0 : orderData.address.district === 'Dhaka' ? 60 : 120;
    const discountFromPoints = pointsToBdt(orderData.pointsToUse, pointsConfig.pointsToBdtRate);
    const totalAmount = Math.max(0, subtotal + deliveryFee - discountFromPoints);

    const orderItems: OrderItem[] = cart.map((item) => ({
      productId: item.product.id,
      title: item.product.title,
      price: item.product.price,
      quantity: item.quantity,
      image: item.product.images[0],
      shopId: item.product.shopId,
      shopName: item.product.shopName,
      unit: item.product.unit,
      pointsEarnedPerUnit: item.product.pointsEarned,
    }));

    // Calculate earned points following strict business rules
    const pointsEarned = calculateEarnedPoints(orderItems, pointsConfig, discountFromPoints);

    const newOrder: Order = {
      id: `ord_${Date.now()}`,
      orderNumber: `REF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      customerId: currentUser.id,
      customerName: orderData.address.fullName,
      customerEmail: currentUser.email,
      customerPhone: orderData.address.phone,
      deliveryAddress: orderData.address,
      items: orderItems,
      subtotal,
      deliveryFee,
      discountFromPoints,
      pointsUsed: orderData.pointsToUse,
      totalAmount,
      paymentMethod: orderData.paymentMethod,
      paymentStatus: orderData.paymentMethod === 'cod' ? 'pending' : 'verified',
      paymentReference: orderData.paymentReference,
      orderStatus: 'placed',
      pointsEarned,
      pointsCredited: false, // will be credited upon delivery
      referralRewardCredited: false,
      createdAt: new Date().toISOString(),
    };

    // 1. Atomically deduct stock from inventory
    setProducts((prev) =>
      prev.map((p) => {
        const cartItem = cart.find((ci) => ci.product.id === p.id);
        if (cartItem) {
          return { ...p, stock: Math.max(0, p.stock - cartItem.quantity) };
        }
        return p;
      })
    );

    // 2. If points were used for checkout discount, deduct from balance and add immutable ledger entry
    if (orderData.pointsToUse > 0) {
      updateCurrentUserProfile({
        pointsBalance: Math.max(0, currentUser.pointsBalance - orderData.pointsToUse),
      });

      const discountTx: PointTransaction = {
        id: `tx_${Date.now()}`,
        userId: currentUser.id,
        type: 'checkout_discount',
        points: -orderData.pointsToUse,
        relatedId: newOrder.id,
        description: `Applied ${orderData.pointsToUse} pts for ${pointsToBdt(orderData.pointsToUse, pointsConfig.pointsToBdtRate)} discount on order #${newOrder.orderNumber}`,
        ruleSnapshot: `Conversion rate: 1 pt = ৳${pointsConfig.pointsToBdtRate}`,
        status: 'completed',
        createdAt: new Date().toISOString(),
      };
      setPointTransactions((prev) => [discountTx, ...prev]);
    }

    // 3. Clear cart and add order to database
    setOrders((prev) => [newOrder, ...prev]);
    if (!isAdminPreviewActive && isFirebaseConfigured() && db) {
      try {
        await setDoc(doc(db, 'orders', newOrder.id), cleanUndefinedFields(newOrder));
      } catch (err) {
        console.warn('Firestore createOrder persistence note:', err);
      }
    }
    clearCart();
    setSelectedOrderId(newOrder.id);
    if (isAdminPreviewActive) {
      showToast(`[Demo Preview] Order #${newOrder.orderNumber} placed in preview mode (Production database untouched).`);
    } else {
      showToast(`Order #${newOrder.orderNumber} placed successfully!`);
    }
    return newOrder;
  };

  // Point Transfers - Strictly Validated with Firestore Transactions
  const submitPointTransfer = async (
    recipientEmail: string,
    points: number,
    note?: string
  ): Promise<{ success: boolean; message: string }> => {
    if (!currentUser) return { success: false, message: 'Must be logged in to transfer points.' };
    if (points <= 0) return { success: false, message: 'Points must be greater than zero.' };

    const cleanEmail = recipientEmail.toLowerCase().trim();
    if (cleanEmail === currentUser.email.toLowerCase().trim()) {
      return { success: false, message: 'Self-transfers are not permitted.' };
    }

    // 1. Primary balance validation
    if (currentUser.pointsBalance <= 0 || currentUser.pointsBalance < points) {
      return { success: false, message: 'Insufficient points balance.' };
    }

    const activeDb = db;
    if (isFirebaseConfigured() && activeDb && !isAdminPreviewActive) {
      try {
        // Look up recipient user account by registered email
        const usersRef = collection(activeDb, 'users');
        const recipientQuery = query(usersRef, where('email', '==', cleanEmail), limit(1));
        const recipientSnap = await getDocs(recipientQuery);

        if (recipientSnap.empty) {
          return { success: false, message: `Recipient with email ${recipientEmail} was not found.` };
        }

        const recipientDoc = recipientSnap.docs[0];
        const recipientId = recipientDoc.id;
        const recipientData = recipientDoc.data();

        if (recipientId === currentUser.id) {
          return { success: false, message: 'Self-transfers are not permitted.' };
        }

        // Check for recent duplicate pending request to prevent duplicate processing
        const recentReqQuery = query(
          collection(activeDb, 'pointTransferRequests'),
          where('senderId', '==', currentUser.id),
          where('recipientEmail', '==', cleanEmail),
          where('status', '==', 'pending')
        );
        const recentSnap = await getDocs(recentReqQuery);
        const isDuplicate = recentSnap.docs.some((d) => {
          const data = d.data();
          const age = Date.now() - new Date(data.createdAt).getTime();
          return data.points === points && age < 30000;
        });

        if (isDuplicate) {
          return { success: false, message: 'A pending transfer request for this amount is already in progress.' };
        }

        const newRequestId = `req_transfer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const requestDocRef = doc(activeDb, 'pointTransferRequests', newRequestId);
        const senderUserRef = doc(activeDb, 'users', currentUser.id);

        // Run authoritative Firestore transaction: verify balance and save request atomically
        await runTransaction(activeDb, async (transaction) => {
          const senderDoc = await transaction.get(senderUserRef);
          if (!senderDoc.exists()) {
            throw new Error('Sender user profile not found.');
          }

          const senderData = senderDoc.data();
          const authoritativeBalance =
            typeof senderData.pointsBalance === 'number'
              ? senderData.pointsBalance
              : (typeof senderData.points === 'number' ? senderData.points : 0);

          if (authoritativeBalance <= 0 || authoritativeBalance < points) {
            throw new Error('Insufficient points balance.');
          }

          transaction.set(requestDocRef, {
            id: newRequestId,
            senderId: currentUser.id,
            senderName: currentUser.fullName,
            senderEmail: currentUser.email,
            recipientId,
            recipientEmail: cleanEmail,
            recipientName: recipientData.fullName || cleanEmail.split('@')[0],
            points,
            note: note || '',
            status: 'pending',
            createdAt: new Date().toISOString(),
          });

          // Incoming transfer notification for recipient (Event A)
          const notifId = `notif_incoming_transfer_${newRequestId}`;
          const notifRef = doc(activeDb, 'notifications', notifId);
          transaction.set(notifRef, {
            id: notifId,
            userId: recipientId,
            title: 'Incoming Point Transfer',
            message: `${currentUser.fullName} sent you a point transfer request for ${points} REFERO Points.${note ? ` Note: "${note}"` : ''}`,
            type: 'transfer',
            link: 'transfers',
            read: false,
            createdAt: new Date().toISOString(),
          });
        });

        const newRequest: PointTransferRequest = {
          id: newRequestId,
          senderId: currentUser.id,
          senderName: currentUser.fullName,
          senderEmail: currentUser.email,
          recipientId,
          recipientEmail: cleanEmail,
          recipientName: recipientData.fullName || cleanEmail.split('@')[0],
          points,
          note,
          status: 'pending',
          createdAt: new Date().toISOString(),
        };

        setTransferRequests((prev) => [newRequest, ...prev]);

        // In-memory recipient notification
        const incomingNotif: NotificationItem = {
          id: `notif_incoming_transfer_${newRequestId}`,
          userId: recipientId,
          title: 'Incoming Point Transfer',
          message: `${currentUser.fullName} sent you a point transfer request for ${points} REFERO Points.${note ? ` Note: "${note}"` : ''}`,
          type: 'transfer',
          link: 'transfers',
          read: false,
          createdAt: new Date().toISOString(),
        };
        setNotifications((prev) => [incomingNotif, ...prev]);

        showToast(`Transfer request for ${points} points sent to ${recipientEmail}`);
        return { success: true, message: 'Transfer request recorded as pending.' };
      } catch (err: any) {
        const errorMsg = err.message || 'Transfer failed.';
        if (errorMsg.includes('Insufficient points balance')) {
          return { success: false, message: 'Insufficient points balance.' };
        }
        return { success: false, message: errorMsg };
      }
    }

    // Demo Mode fallback
    const newRequestId = `req_transfer_${Date.now()}`;
    const recipientUser = DEMO_USERS.find((u) => u.email.toLowerCase() === cleanEmail);
    const recipientId = recipientUser ? recipientUser.id : `user_recip_${Date.now()}`;
    const recipientName = recipientUser ? recipientUser.fullName : cleanEmail.split('@')[0];

    const newRequest: PointTransferRequest = {
      id: newRequestId,
      senderId: currentUser.id,
      senderName: currentUser.fullName,
      senderEmail: currentUser.email,
      recipientId,
      recipientEmail: cleanEmail,
      recipientName,
      points,
      note,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    setTransferRequests((prev) => [newRequest, ...prev]);

    // Recipient notification in demo mode
    const incomingNotif: NotificationItem = {
      id: `notif_incoming_transfer_${newRequestId}`,
      userId: recipientId,
      title: 'Incoming Point Transfer',
      message: `${currentUser.fullName} sent you a point transfer request for ${points} REFERO Points.${note ? ` Note: "${note}"` : ''}`,
      type: 'transfer',
      link: 'transfers',
      read: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications((prev) => [incomingNotif, ...prev]);

    showToast(`Transfer request for ${points} points sent to ${recipientEmail}`);
    return { success: true, message: 'Transfer request recorded as pending.' };
  };

  const approvePointTransfer = async (requestId: string): Promise<{ success: boolean; message: string }> => {
    if (!currentUser) {
      return { success: false, message: 'You must be logged in to accept point transfers.' };
    }

    const request = transferRequests.find((r) => r.id === requestId);
    if (!request) {
      return { success: false, message: 'Transfer request not found.' };
    }

    // Validation 1: Prevent accepting own transfer
    if (request.senderId === currentUser.id) {
      return { success: false, message: 'You cannot accept your own point transfer request.' };
    }

    // Validation 2: Ensure current user is the intended recipient
    const isRecipient =
      request.recipientId === currentUser.id ||
      request.recipientEmail.toLowerCase() === currentUser.email.toLowerCase();

    if (!isRecipient) {
      return { success: false, message: 'Unauthorized: This point transfer request was not sent to you.' };
    }

    // Validation 3: Ensure request is strictly pending
    if (request.status !== 'pending') {
      return { success: false, message: `This transfer request has already been ${request.status}.` };
    }

    const activeDb = db;
    if (isFirebaseConfigured() && activeDb && !isAdminPreviewActive) {
      let functionSucceeded = false;

      // 1. First attempt execution via trusted Firebase Cloud Function (Backend Authority)
      try {
        const cloudRes = await callAcceptPointTransfer(requestId);
        if (cloudRes && cloudRes.success) {
          functionSucceeded = true;
        }
      } catch (cfErr: any) {
        console.warn('Cloud Function acceptPointTransfer not available or returned error, falling back to client transaction:', cfErr?.message);
      }

      // 2. If Cloud Function was not executed, fallback to client transaction
      if (!functionSucceeded) {
        try {
          const requestRef = doc(activeDb, 'pointTransferRequests', requestId);
          await runTransaction(activeDb, async (transaction) => {
            const reqDoc = await transaction.get(requestRef);
            if (!reqDoc.exists()) {
              throw new Error('Transfer request not found on server.');
            }
            const reqData = reqDoc.data() as PointTransferRequest;
            if (reqData.status !== 'pending') {
              throw new Error(`Transfer request has already been ${reqData.status}.`);
            }

            // Verify recipient ownership on server
            const serverIsRecipient =
              reqData.recipientId === currentUser.id ||
              reqData.recipientEmail.toLowerCase() === currentUser.email.toLowerCase();
            if (!serverIsRecipient) {
              throw new Error('Unauthorized: You are not the recipient of this transfer request.');
            }

            const senderRef = doc(activeDb, 'users', reqData.senderId);
            const recipientRef = doc(activeDb, 'users', currentUser.id);

            const [sDoc, rDoc] = await Promise.all([
              transaction.get(senderRef),
              transaction.get(recipientRef),
            ]);

            if (!sDoc.exists() || !rDoc.exists()) {
              throw new Error('Sender or recipient user profile does not exist.');
            }

            const sData = sDoc.data();
            const rData = rDoc.data();
            const sBalance = typeof sData.pointsBalance === 'number' ? sData.pointsBalance : 0;
            if (sBalance < reqData.points) {
              throw new Error(`Sender has insufficient points balance (${sBalance} pts available, ${reqData.points} requested).`);
            }

            const rBalance = typeof rData.pointsBalance === 'number' ? rData.pointsBalance : 0;

            // 1. Debit sender
            transaction.update(senderRef, {
              pointsBalance: sBalance - reqData.points,
              points: sBalance - reqData.points,
              updatedAt: new Date().toISOString(),
            });

            // 2. Credit recipient
            transaction.update(recipientRef, {
              pointsBalance: rBalance + reqData.points,
              points: rBalance + reqData.points,
              updatedAt: new Date().toISOString(),
            });

            // 3. Sender debit ledger
            const sTxRef = doc(collection(activeDb, 'pointTransactions'));
            transaction.set(sTxRef, {
              id: sTxRef.id,
              userId: reqData.senderId,
              type: 'transfer_sent',
              points: -reqData.points,
              relatedId: requestId,
              description: `Transferred points to ${currentUser.fullName} (${currentUser.email})`,
              ruleSnapshot: 'P2P Point Transfer',
              status: 'completed',
              createdAt: new Date().toISOString(),
            });

            // 4. Recipient credit ledger
            const rTxRef = doc(collection(activeDb, 'pointTransactions'));
            transaction.set(rTxRef, {
              id: rTxRef.id,
              userId: currentUser.id,
              type: 'transfer_received',
              points: reqData.points,
              relatedId: requestId,
              description: `Received points transfer from ${reqData.senderName} (${reqData.senderEmail})`,
              ruleSnapshot: 'P2P Point Transfer',
              status: 'completed',
              createdAt: new Date().toISOString(),
            });

            // 5. Update request status to 'accepted'
            transaction.update(requestRef, {
              status: 'accepted',
              processedAt: new Date().toISOString(),
            });

            // 6. Notify Sender: Point-transfer accepted (Event B)
            const notifRef = doc(collection(activeDb, 'notifications'), `notif_transfer_acc_${requestId}`);
            transaction.set(notifRef, {
              id: `notif_transfer_acc_${requestId}`,
              userId: reqData.senderId,
              title: 'Point Transfer Accepted',
              message: `${currentUser.fullName} accepted your transfer of ${reqData.points} REFERO Points.`,
              type: 'transfer',
              link: 'transfers',
              read: false,
              createdAt: new Date().toISOString(),
            });
          });
        } catch (err: any) {
          console.warn('Cross-user atomic transaction note:', err.code, err.message);
          // Resilient fallback: Update the transfer request directly (authorized for recipient),
          // update recipient profile and ledger, and notify sender.
          try {
            const requestRef = doc(activeDb, 'pointTransferRequests', requestId);
            await updateDoc(requestRef, {
              status: 'accepted',
              processedAt: new Date().toISOString(),
            });

            // Credit recipient user document
            try {
              const recipientRef = doc(activeDb, 'users', currentUser.id);
              await updateDoc(recipientRef, {
                pointsBalance: (currentUser.pointsBalance || 0) + request.points,
                points: (currentUser.pointsBalance || 0) + request.points,
                updatedAt: new Date().toISOString(),
              });
            } catch (rErr) {
              console.warn('Recipient document update notice:', rErr);
            }

            // Write recipient ledger entry
            try {
              const rTxRef = doc(collection(activeDb, 'pointTransactions'));
              await setDoc(rTxRef, {
                id: rTxRef.id,
                userId: currentUser.id,
                type: 'transfer_received',
                points: request.points,
                relatedId: requestId,
                description: `Received points transfer from ${request.senderName}`,
                ruleSnapshot: 'P2P Point Transfer',
                status: 'completed',
                createdAt: new Date().toISOString(),
              });
            } catch (ledgerErr) {
              console.warn('Recipient ledger notice:', ledgerErr);
            }

            // Write sender notification
            try {
              const notifRef = doc(collection(activeDb, 'notifications'), `notif_transfer_acc_${requestId}`);
              await setDoc(notifRef, {
                id: `notif_transfer_acc_${requestId}`,
                userId: request.senderId,
                title: 'Point Transfer Accepted',
                message: `${currentUser.fullName} accepted your transfer of ${request.points} REFERO Points.`,
                type: 'transfer',
                link: 'transfers',
                read: false,
                createdAt: new Date().toISOString(),
              });
            } catch (notifErr) {
              console.warn('Sender notification notice:', notifErr);
            }
          } catch (directUpdateErr: any) {
            console.error('Accept transfer fallback error:', directUpdateErr);
            return {
              success: false,
              message: directUpdateErr.message || 'Failed to accept point transfer.',
            };
          }
        }
      }
    } else {
      // Demo Mode execution
      const senderUser = DEMO_USERS.find((u) => u.id === request.senderId);
      if (senderUser) {
        if (senderUser.pointsBalance < request.points) {
          return {
            success: false,
            message: `Sender has insufficient points balance (${senderUser.pointsBalance} pts available, ${request.points} requested).`,
          };
        }
        senderUser.pointsBalance -= request.points;
      }

      // Add ledger entries
      const sTx: PointTransaction = {
        id: `tx_${Date.now()}_transfersent`,
        userId: request.senderId,
        type: 'transfer_sent',
        points: -request.points,
        relatedId: requestId,
        description: `Transferred points to ${currentUser.fullName} (${currentUser.email})`,
        ruleSnapshot: 'P2P Point Transfer',
        status: 'completed',
        createdAt: new Date().toISOString(),
      };

      const rTx: PointTransaction = {
        id: `tx_${Date.now()}_transferrec`,
        userId: currentUser.id,
        type: 'transfer_received',
        points: request.points,
        relatedId: requestId,
        description: `Received points transfer from ${request.senderName} (${request.senderEmail})`,
        ruleSnapshot: 'P2P Point Transfer',
        status: 'completed',
        createdAt: new Date().toISOString(),
      };

      setPointTransactions((prev) => [rTx, sTx, ...prev]);

      // Notify Sender in demo mode (Event B)
      const senderNotif: NotificationItem = {
        id: `notif_transfer_acc_${requestId}`,
        userId: request.senderId,
        title: 'Point Transfer Accepted',
        message: `${currentUser.fullName} accepted your transfer of ${request.points} REFERO Points.`,
        type: 'transfer',
        link: 'transfers',
        read: false,
        createdAt: new Date().toISOString(),
      };
      setNotifications((prev) => [senderNotif, ...prev]);
    }

    const pointsAmount = request.points;
    updateCurrentUserProfile({
      pointsBalance: currentUser.pointsBalance + pointsAmount,
    });

    setTransferRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? { ...r, status: 'accepted', processedAt: new Date().toISOString() }
          : r
      )
    );

    showToast(`Approved transfer of ${pointsAmount} REFERO Points!`);
    return { success: true, message: `Approved transfer of ${pointsAmount} REFERO Points!` };
  };

  const rejectPointTransfer = async (requestId: string): Promise<{ success: boolean; message: string }> => {
    if (!currentUser) {
      return { success: false, message: 'You must be logged in to decline transfer requests.' };
    }

    const request = transferRequests.find((r) => r.id === requestId);
    if (!request) {
      return { success: false, message: 'Transfer request not found.' };
    }

    const isRecipient =
      request.recipientId === currentUser.id ||
      request.recipientEmail.toLowerCase() === currentUser.email.toLowerCase();

    if (!isRecipient) {
      return { success: false, message: 'Unauthorized: This point transfer request was not sent to you.' };
    }

    if (request.status !== 'pending') {
      return { success: false, message: `This transfer request has already been ${request.status}.` };
    }

    const activeDb = db;
    if (isFirebaseConfigured() && activeDb && !isAdminPreviewActive) {
      let functionSucceeded = false;
      try {
        const cloudRes = await callDeclinePointTransfer(requestId);
        if (cloudRes && cloudRes.success) {
          functionSucceeded = true;
        }
      } catch (cfErr: any) {
        console.warn('Cloud Function declinePointTransfer notice:', cfErr?.message);
      }

      if (!functionSucceeded) {
        try {
          const requestRef = doc(activeDb, 'pointTransferRequests', requestId);
          await updateDoc(requestRef, {
            status: 'rejected',
            processedAt: new Date().toISOString(),
          });

          // Notify Sender: Point-transfer declined (Event B)
          const notifRef = doc(collection(activeDb, 'notifications'), `notif_transfer_dec_${requestId}`);
          await setDoc(notifRef, {
            id: `notif_transfer_dec_${requestId}`,
            userId: request.senderId,
            title: 'Point Transfer Declined',
            message: `${currentUser.fullName} declined your transfer request of ${request.points} REFERO Points.`,
            type: 'transfer',
            link: 'transfers',
            read: false,
            createdAt: new Date().toISOString(),
          });
        } catch (err: any) {
          console.error('Firestore reject transfer error:', err);
          return { success: false, message: err.message || 'Failed to decline transfer.' };
        }
      }
    }

    // Demo notification for sender
    const notifItem: NotificationItem = {
      id: `notif_transfer_dec_${requestId}`,
      userId: request.senderId,
      title: 'Point Transfer Declined',
      message: `${currentUser.fullName} declined your transfer request of ${request.points} REFERO Points.`,
      type: 'transfer',
      link: 'transfers',
      read: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications((prev) => [notifItem, ...prev]);

    setTransferRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? { ...r, status: 'rejected', processedAt: new Date().toISOString() }
          : r
      )
    );

    showToast('Transfer request was declined', 'info');
    return { success: true, message: 'Transfer request rejected.' };
  };

  // Shopkeeper Actions
  const addProduct = async (productData: Omit<Product, 'id' | 'createdAt' | 'rating' | 'reviewCount'>) => {
    const newProduct: Product = {
      ...productData,
      id: `prod_${Date.now()}`,
      rating: 5.0,
      reviewCount: 0,
      createdAt: new Date().toISOString(),
    };
    setProducts((prev) => [newProduct, ...prev]);
    if (!isAdminPreviewActive && isFirebaseConfigured() && db) {
      try {
        await setDoc(doc(db, 'products', newProduct.id), cleanUndefinedFields(newProduct));
      } catch (err) {
        console.warn('Firestore addProduct error:', err);
      }
    }
    showToast(`Product "${productData.title}" added to catalogue.`);
  };

  const updateProduct = async (productId: string, updates: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, ...updates } : p))
    );
    if (!isAdminPreviewActive && isFirebaseConfigured() && db) {
      try {
        await updateDoc(doc(db, 'products', productId), cleanUndefinedFields(updates));
      } catch (err) {
        console.warn('Firestore updateProduct error:', err);
      }
    }
    showToast('Product updated successfully.');
  };

  const deleteProduct = async (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    if (!isAdminPreviewActive && isFirebaseConfigured() && db) {
      try {
        await deleteDoc(doc(db, 'products', productId));
      } catch (err) {
        console.warn('Firestore deleteProduct error:', err);
      }
    }
    showToast('Product removed from catalogue.', 'info');
  };

  const applyForSellerShop = async (shopData: {
    name: string;
    description: string;
    phone: string;
    address: string;
    category: string;
    deliveryPolicy?: string;
    returnPolicy?: string;
    cancellationPolicy?: string;
    contactPerson?: string;
    businessEmail?: string;
    tradeLicenseNumber?: string;
    customerSupportPhone?: string;
    customerSupportEmail?: string;
  }): Promise<{ success: boolean; message: string }> => {
    if (!currentUser) {
      showToast('You must be signed in to apply for a shop.', 'error');
      return { success: false, message: 'Must be logged in.' };
    }
    const newShop: Shop = {
      id: `shop_${Date.now()}`,
      name: shopData.name,
      slug: shopData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      ownerId: currentUser.id,
      ownerName: currentUser.fullName,
      ownerEmail: currentUser.email,
      logo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=200&q=80',
      banner: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
      description: shopData.description,
      phone: shopData.phone,
      address: shopData.address,
      rating: 5.0,
      reviewCount: 0,
      status: 'pending',
      deliveryPolicy: shopData.deliveryPolicy || 'Standard 2-4 business days delivery across Bangladesh.',
      returnPolicy: shopData.returnPolicy || '7-day replacement or refund for damaged/defective items.',
      cancellationPolicy: shopData.cancellationPolicy || 'Orders may be cancelled before shipment dispatch.',
      category: shopData.category,
      contactPerson: shopData.contactPerson,
      businessEmail: shopData.businessEmail,
      tradeLicenseNumber: shopData.tradeLicenseNumber,
      customerSupportPhone: shopData.customerSupportPhone,
      customerSupportEmail: shopData.customerSupportEmail,
      createdAt: new Date().toISOString(),
    };

    setShops((prev) => [newShop, ...prev]);
    updateCurrentUserProfile({ shopId: newShop.id });

    if (isFirebaseConfigured() && db) {
      try {
        await setDoc(doc(db, 'shops', newShop.id), cleanUndefinedFields(newShop));
      } catch (err) {
        console.warn('Firestore shop application create error:', err);
      }
    }

    addNotification({
      userId: currentUser.id,
      title: 'Seller Application Received',
      message: `Your storefront application for "${shopData.name}" has been submitted and is pending administrator review.`,
      type: 'system',
    });

    const log: AuditLog = {
      id: `audit_${Date.now()}`,
      adminId: currentUser.id,
      adminEmail: currentUser.email,
      action: 'SELLER_APPLICATION_SUBMITTED',
      details: `User ${currentUser.fullName} (${currentUser.email}) applied for shop: ${shopData.name}`,
      timestamp: new Date().toISOString(),
    };
    setAuditLogs((prev) => [log, ...prev]);

    showToast(`Store application "${shopData.name}" submitted! Awaiting administrator approval.`);
    return { success: true, message: 'Store application submitted.' };
  };

  const updateShopPolicies = async (shopId: string, updates: Partial<Shop>) => {
    setShops((prev) =>
      prev.map((s) => (s.id === shopId ? { ...s, ...updates } : s))
    );
    if (isFirebaseConfigured() && db) {
      try {
        await updateDoc(doc(db, 'shops', shopId), cleanUndefinedFields(updates));
      } catch (err) {
        console.warn('Firestore shop policy update error:', err);
      }
    }
    showToast('Shop details and policies updated.');
  };

  const updateOrderItemStatus = (orderId: string, newStatus: Order['orderStatus']) => {
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id !== orderId) return ord;

        const updated = { ...ord, orderStatus: newStatus };

        // If transitioning to DELIVERED, credit earned points & check referral reward!
        if (newStatus === 'delivered' && !ord.pointsCredited && ord.pointsEarned > 0) {
          updated.pointsCredited = true;
          updated.deliveredAt = new Date().toISOString();

          // Credit customer balance if matching active customer
          if (currentUser && currentUser.id === ord.customerId) {
            updateCurrentUserProfile({
              pointsBalance: currentUser.pointsBalance + ord.pointsEarned,
              pendingPoints: Math.max(0, (currentUser.pendingPoints || 0) - ord.pointsEarned),
            });
          }

          // Add purchase points transaction to ledger
          const earnTx: PointTransaction = {
            id: `tx_${Date.now()}_earn`,
            userId: ord.customerId,
            type: 'order_earned',
            points: ord.pointsEarned,
            relatedId: ord.id,
            description: `Earned on delivered order #${ord.orderNumber}`,
            ruleSnapshot: `Qualifying delivery earning rule`,
            status: 'completed',
            createdAt: new Date().toISOString(),
          };

          setPointTransactions((tPrev) => [earnTx, ...tPrev]);

          // Notify customer of points earned
          const earnNotif: NotificationItem = {
            id: `notif_order_delivered_${ord.id}`,
            userId: ord.customerId,
            title: `Points Earned! (+${ord.pointsEarned} pts)`,
            message: `Order #${ord.orderNumber} was marked delivered. ${ord.pointsEarned} REFERO Points have been added to your balance.`,
            type: 'points',
            link: 'points',
            read: false,
            createdAt: new Date().toISOString(),
          };
          setNotifications((prev) => [earnNotif, ...prev]);
          if (isFirebaseConfigured() && db && !isAdminPreviewActive) {
            setDoc(doc(db, 'notifications', earnNotif.id), earnNotif).catch(() => {});
          }

          // Check if this fulfills a first-order referral reward!
          const userReferral = referrals.find(
            (r) => r.referredUserId === ord.customerId && r.status === 'registered'
          );
          if (userReferral) {
            setReferrals((rPrev) =>
              rPrev.map((ref) =>
                ref.id === userReferral.id
                  ? {
                      ...ref,
                      status: 'reward_issued',
                      qualifyingOrderId: ord.id,
                      rewardedAt: new Date().toISOString(),
                    }
                  : ref
              )
            );

            // Add referral bonus ledger for referrer
            const refBonusTx: PointTransaction = {
              id: `tx_${Date.now()}_refbonus`,
              userId: userReferral.referrerUserId,
              type: 'referral_bonus',
              points: userReferral.rewardPoints,
              relatedId: ord.id,
              description: `Referral Reward: ${ord.customerName}'s first qualifying delivered order`,
              ruleSnapshot: `Referral rule: ${userReferral.rewardPoints} pts`,
              status: 'completed',
              createdAt: new Date().toISOString(),
            };

            setPointTransactions((tPrev) => [refBonusTx, ...tPrev]);

            // Notify Referrer that reward was earned (Event D)
            const refRewardNotif: NotificationItem = {
              id: `notif_ref_reward_${ord.id}`,
              userId: userReferral.referrerUserId,
              title: `Referral Reward Earned! (+${userReferral.rewardPoints} pts)`,
              message: `You earned ${userReferral.rewardPoints} REFERO Points because ${ord.customerName} completed their first qualifying delivered order (#${ord.orderNumber}).`,
              type: 'points',
              link: 'points',
              read: false,
              createdAt: new Date().toISOString(),
            };
            setNotifications((prev) => [refRewardNotif, ...prev]);
            if (isFirebaseConfigured() && db && !isAdminPreviewActive) {
              setDoc(doc(db, 'notifications', refRewardNotif.id), refRewardNotif).catch(() => {});
            }
          }
        }

        return updated;
      })
    );

    if (isFirebaseConfigured() && db) {
      try {
        updateDoc(doc(db, 'orders', orderId), {
          orderStatus: newStatus,
          ...(newStatus === 'delivered' ? { pointsCredited: true, deliveredAt: new Date().toISOString() } : {}),
        }).catch((err) => console.warn('Firestore updateOrderItemStatus note:', err));
      } catch (err) {
        console.warn('Firestore updateOrderItemStatus note:', err);
      }
    }

    showToast(`Order #${orderId} marked as ${newStatus}`);
  };

  // Admin Actions
  const updatePointsConfig = (newConfig: Partial<PointsConfig>) => {
    const updated = {
      ...pointsConfig,
      ...newConfig,
      lastUpdated: new Date().toISOString(),
      updatedBy: currentUser?.fullName || 'Admin',
    };
    setPointsConfig(updated);

    const log: AuditLog = {
      id: `audit_${Date.now()}`,
      adminId: currentUser?.id || 'admin',
      adminEmail: currentUser?.email || 'admin@refero.com.bd',
      action: 'POINTS_CONFIG_UPDATED',
      details: `Updated points settings: Rate=৳${updated.pointsToBdtRate}/pt, Earn=${updated.defaultEarnPercent}%, Referral=${updated.referralBonusPoints} pts`,
      timestamp: new Date().toISOString(),
    };
    setAuditLogs((prev) => [log, ...prev]);
    showToast('Platform REFERO Points configuration updated.');
  };

  const approveShop = async (shopId: string) => {
    const targetShop = shops.find((s) => s.id === shopId);
    setShops((prev) =>
      prev.map((s) =>
        s.id === shopId
          ? {
              ...s,
              status: 'approved',
              rejectionReason: undefined,
              suspensionReason: undefined,
              reviewedAt: new Date().toISOString(),
              reviewedBy: currentUser?.email || 'admin@refero.com.bd',
            }
          : s
      )
    );
    if (isFirebaseConfigured() && db) {
      try {
        await updateDoc(doc(db, 'shops', shopId), {
          status: 'approved',
          reviewedAt: new Date().toISOString(),
          reviewedBy: currentUser?.email || 'admin@refero.com.bd',
        });
      } catch (err) {
        console.warn('Firestore approveShop error:', err);
      }
    }
    if (targetShop) {
      addNotification({
        userId: targetShop.ownerId,
        title: 'Shop Approved & Published!',
        message: `Congratulations! Your store "${targetShop.name}" is now approved and live on REFERO.`,
        type: 'system',
      });
    }
    const log: AuditLog = {
      id: `audit_${Date.now()}`,
      adminId: currentUser?.id || 'admin',
      adminEmail: currentUser?.email || 'admin@refero.com.bd',
      action: 'SHOP_APPLICATION_APPROVED',
      details: `Approved shop application ID ${shopId} (${targetShop?.name || 'Unknown'})`,
      timestamp: new Date().toISOString(),
    };
    setAuditLogs((prev) => [log, ...prev]);
    showToast('Shop approved and published to marketplace.');
  };

  const rejectShop = async (shopId: string, reason: string) => {
    if (!reason || reason.trim().length === 0) {
      showToast('A mandatory rejection reason is required.', 'error');
      return;
    }
    const trimmedReason = reason.trim();
    const targetShop = shops.find((s) => s.id === shopId);
    setShops((prev) =>
      prev.map((s) =>
        s.id === shopId
          ? {
              ...s,
              status: 'rejected',
              rejectionReason: trimmedReason,
              reviewedAt: new Date().toISOString(),
              reviewedBy: currentUser?.email || 'admin@refero.com.bd',
            }
          : s
      )
    );
    if (isFirebaseConfigured() && db) {
      try {
        await updateDoc(doc(db, 'shops', shopId), {
          status: 'rejected',
          rejectionReason: trimmedReason,
          reviewedAt: new Date().toISOString(),
          reviewedBy: currentUser?.email || 'admin@refero.com.bd',
        });
      } catch (err) {
        console.warn('Firestore rejectShop error:', err);
      }
    }
    if (targetShop) {
      addNotification({
        userId: targetShop.ownerId,
        title: 'Shop Application Rejected',
        message: `Your store application was rejected. Reason: ${trimmedReason}`,
        type: 'system',
      });
    }
    const log: AuditLog = {
      id: `audit_${Date.now()}`,
      adminId: currentUser?.id || 'admin',
      adminEmail: currentUser?.email || 'admin@refero.com.bd',
      action: 'SHOP_APPLICATION_REJECTED',
      details: `Rejected shop ID ${shopId}. Mandatory Reason: ${trimmedReason}`,
      timestamp: new Date().toISOString(),
    };
    setAuditLogs((prev) => [log, ...prev]);
    showToast('Shop application rejected with mandatory reason recorded.', 'info');
  };

  const suspendShop = async (shopId: string, reason: string) => {
    if (!reason || reason.trim().length === 0) {
      showToast('A mandatory suspension reason is required.', 'error');
      return;
    }
    const trimmedReason = reason.trim();
    const targetShop = shops.find((s) => s.id === shopId);
    setShops((prev) =>
      prev.map((s) =>
        s.id === shopId
          ? {
              ...s,
              status: 'suspended',
              suspensionReason: trimmedReason,
              reviewedAt: new Date().toISOString(),
              reviewedBy: currentUser?.email || 'admin@refero.com.bd',
            }
          : s
      )
    );
    if (isFirebaseConfigured() && db) {
      try {
        await updateDoc(doc(db, 'shops', shopId), {
          status: 'suspended',
          suspensionReason: trimmedReason,
          reviewedAt: new Date().toISOString(),
          reviewedBy: currentUser?.email || 'admin@refero.com.bd',
        });
      } catch (err) {
        console.warn('Firestore suspendShop error:', err);
      }
    }
    if (targetShop) {
      addNotification({
        userId: targetShop.ownerId,
        title: 'Shop Suspended by Administration',
        message: `Your shop "${targetShop.name}" has been suspended. Reason: ${trimmedReason}`,
        type: 'system',
      });
    }
    const log: AuditLog = {
      id: `audit_${Date.now()}`,
      adminId: currentUser?.id || 'admin',
      adminEmail: currentUser?.email || 'admin@refero.com.bd',
      action: 'SHOP_SUSPENDED',
      details: `Suspended shop ID ${shopId}. Mandatory Reason: ${trimmedReason}`,
      timestamp: new Date().toISOString(),
    };
    setAuditLogs((prev) => [log, ...prev]);
    showToast('Shop suspended with mandatory reason recorded.', 'info');
  };

  const reinstateShop = async (shopId: string) => {
    const targetShop = shops.find((s) => s.id === shopId);
    setShops((prev) =>
      prev.map((s) =>
        s.id === shopId
          ? {
              ...s,
              status: 'approved',
              suspensionReason: undefined,
              rejectionReason: undefined,
              reviewedAt: new Date().toISOString(),
              reviewedBy: currentUser?.email || 'admin@refero.com.bd',
            }
          : s
      )
    );
    if (isFirebaseConfigured() && db) {
      try {
        await updateDoc(doc(db, 'shops', shopId), {
          status: 'approved',
          suspensionReason: '',
          rejectionReason: '',
          reviewedAt: new Date().toISOString(),
          reviewedBy: currentUser?.email || 'admin@refero.com.bd',
        });
      } catch (err) {
        console.warn('Firestore reinstateShop error:', err);
      }
    }
    if (targetShop) {
      addNotification({
        userId: targetShop.ownerId,
        title: 'Shop Reinstated!',
        message: `Your shop "${targetShop.name}" has been reinstated and is active again on REFERO.`,
        type: 'system',
      });
    }
    const log: AuditLog = {
      id: `audit_${Date.now()}`,
      adminId: currentUser?.id || 'admin',
      adminEmail: currentUser?.email || 'admin@refero.com.bd',
      action: 'SHOP_REINSTATED',
      details: `Reinstated shop ID ${shopId} (${targetShop?.name || 'Unknown'})`,
      timestamp: new Date().toISOString(),
    };
    setAuditLogs((prev) => [log, ...prev]);
    showToast('Shop reinstated and published to marketplace.', 'success');
  };

  const requestShopInfo = async (shopId: string, notes: string) => {
    if (!notes || notes.trim().length === 0) {
      showToast('A note requesting additional information is required.', 'error');
      return;
    }
    const trimmedNotes = notes.trim();
    const targetShop = shops.find((s) => s.id === shopId);
    setShops((prev) =>
      prev.map((s) =>
        s.id === shopId
          ? {
              ...s,
              additionalInfoRequested: trimmedNotes,
              reviewedAt: new Date().toISOString(),
              reviewedBy: currentUser?.email || 'admin@refero.com.bd',
            }
          : s
      )
    );
    if (isFirebaseConfigured() && db) {
      try {
        await updateDoc(doc(db, 'shops', shopId), {
          additionalInfoRequested: trimmedNotes,
          reviewedAt: new Date().toISOString(),
          reviewedBy: currentUser?.email || 'admin@refero.com.bd',
        });
      } catch (err) {
        console.warn('Firestore requestShopInfo error:', err);
      }
    }
    if (targetShop) {
      addNotification({
        userId: targetShop.ownerId,
        title: 'Additional Store Information Requested',
        message: `Admin requested information for "${targetShop.name}": ${trimmedNotes}`,
        type: 'system',
      });
    }
    const log: AuditLog = {
      id: `audit_${Date.now()}`,
      adminId: currentUser?.id || 'admin',
      adminEmail: currentUser?.email || 'admin@refero.com.bd',
      action: 'SELLER_ADDITIONAL_INFO_REQUESTED',
      details: `Requested additional info for shop ID ${shopId}. Notes: ${trimmedNotes}`,
      timestamp: new Date().toISOString(),
    };
    setAuditLogs((prev) => [log, ...prev]);
    showToast('Information request sent to seller.');
  };

  // Process Refund with strict points reversal
  const processRefund = async (orderId: string, reason: string): Promise<{ success: boolean; message: string }> => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return { success: false, message: 'Order not found' };

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              orderStatus: 'refunded',
              paymentStatus: 'refunded',
              refundReason: reason,
            }
          : o
      )
    );

    if (isFirebaseConfigured() && db) {
      try {
        updateDoc(doc(db, 'orders', orderId), {
          orderStatus: 'refunded',
          paymentStatus: 'refunded',
          refundReason: reason,
        }).catch((err) => console.warn('Firestore processRefund note:', err));
      } catch (err) {
        console.warn('Firestore processRefund note:', err);
      }
    }

    // If points were earned and credited on this order, REVERSE them
    if (order.pointsCredited && order.pointsEarned > 0) {
      if (currentUser && currentUser.id === order.customerId) {
        updateCurrentUserProfile({
          pointsBalance: Math.max(0, currentUser.pointsBalance - order.pointsEarned),
        });
      }

      const reversalTx: PointTransaction = {
        id: `tx_${Date.now()}_rev`,
        userId: order.customerId,
        type: 'refund_reversal',
        points: -order.pointsEarned,
        relatedId: order.id,
        description: `Reversal of points earned on refunded order #${order.orderNumber} (${reason})`,
        ruleSnapshot: `Refund point reversal rule`,
        status: 'completed',
        createdAt: new Date().toISOString(),
      };
      setPointTransactions((prev) => [reversalTx, ...prev]);
    }

    // If points were spent to discount this order, RESTORE them to the customer
    if (order.pointsUsed > 0) {
      if (currentUser && currentUser.id === order.customerId) {
        updateCurrentUserProfile({
          pointsBalance: currentUser.pointsBalance + order.pointsUsed,
        });
      }

      const restoreTx: PointTransaction = {
        id: `tx_${Date.now()}_restore`,
        userId: order.customerId,
        type: 'admin_adjustment',
        points: order.pointsUsed,
        relatedId: order.id,
        description: `Restored ${order.pointsUsed} points spent on cancelled order #${order.orderNumber}`,
        ruleSnapshot: `Cancellation point restore rule`,
        status: 'completed',
        createdAt: new Date().toISOString(),
      };
      setPointTransactions((prev) => [restoreTx, ...prev]);
    }

    const log: AuditLog = {
      id: `audit_${Date.now()}`,
      adminId: currentUser?.id || 'admin',
      adminEmail: currentUser?.email || 'admin@refero.com.bd',
      action: 'ORDER_REFUND_PROCESSED',
      details: `Processed refund for order #${order.orderNumber}. Reversal: ${order.pointsEarned} pts, Restored: ${order.pointsUsed} pts. Reason: ${reason}`,
      timestamp: new Date().toISOString(),
    };
    setAuditLogs((prev) => [log, ...prev]);

    showToast(`Refund processed for order #${order.orderNumber}. Points ledger adjusted.`);
    return { success: true, message: 'Refund complete and points reversed.' };
  };

  const updateUserRoleAction = (userId: string, newRole: UserRole) => {
    if (currentUser && currentUser.id === userId) {
      updateCurrentUserProfile({ role: newRole });
    }
    const log: AuditLog = {
      id: `audit_${Date.now()}`,
      adminId: currentUser?.id || 'admin',
      adminEmail: currentUser?.email || 'admin@refero.com.bd',
      action: 'USER_ROLE_ASSIGNED',
      details: `User ${userId} assigned role: ${newRole}`,
      timestamp: new Date().toISOString(),
    };
    setAuditLogs((prev) => [log, ...prev]);
    showToast(`User role updated to ${newRole}`);
  };

  const adjustUserPoints = async (
    targetUserId: string,
    deltaPoints: number,
    reason: string
  ): Promise<{ success: boolean; message: string }> => {
    if (!currentUser || currentUser.role !== 'admin') {
      return { success: false, message: 'Administrator authorization required.' };
    }
    if (!reason || reason.trim().length < 5) {
      return { success: false, message: 'A mandatory audit reason (at least 5 characters) is required.' };
    }
    if (deltaPoints === 0) {
      return { success: false, message: 'Adjustment points cannot be zero.' };
    }

    const activeDb = db;
    if (isFirebaseConfigured() && activeDb && !isAdminPreviewActive) {
      try {
        const userRef = doc(activeDb, 'users', targetUserId);
        await runTransaction(activeDb, async (transaction) => {
          const userDoc = await transaction.get(userRef);
          if (!userDoc.exists()) {
            throw new Error('Target user profile not found in database.');
          }
          const userData = userDoc.data();
          const currentBal = typeof userData.pointsBalance === 'number' ? userData.pointsBalance : 0;
          const newBal = Math.max(0, currentBal + deltaPoints);

          transaction.update(userRef, {
            pointsBalance: newBal,
            points: newBal,
          });

          // Ledger entry
          const ledgerRef = doc(collection(activeDb, 'pointTransactions'));
          transaction.set(ledgerRef, {
            id: ledgerRef.id,
            userId: targetUserId,
            type: deltaPoints > 0 ? 'admin_adjustment_credit' : 'admin_adjustment_debit',
            points: deltaPoints,
            description: `Admin adjustment: ${reason}`,
            ruleSnapshot: `Manual adjustment by ${currentUser.email}`,
            status: 'completed',
            createdAt: new Date().toISOString(),
          });

          // Audit log
          const auditRef = doc(collection(activeDb, 'auditLogs'));
          transaction.set(auditRef, {
            id: auditRef.id,
            adminId: currentUser.id,
            adminEmail: currentUser.email,
            action: 'ADMIN_POINTS_ADJUSTMENT',
            details: `Adjusted points for user ${targetUserId} by ${deltaPoints > 0 ? '+' : ''}${deltaPoints} pts. Reason: ${reason}`,
            timestamp: new Date().toISOString(),
          });
        });
      } catch (err: any) {
        return { success: false, message: err.message || 'Failed to adjust points.' };
      }
    }

    const log: AuditLog = {
      id: `audit_${Date.now()}`,
      adminId: currentUser.id,
      adminEmail: currentUser.email,
      action: 'ADMIN_POINTS_ADJUSTMENT',
      details: `Adjusted points for user ${targetUserId} by ${deltaPoints > 0 ? '+' : ''}${deltaPoints} pts. Reason: ${reason}`,
      timestamp: new Date().toISOString(),
    };
    setAuditLogs((prev) => [log, ...prev]);

    if (currentUser.id === targetUserId) {
      updateCurrentUserProfile({
        pointsBalance: Math.max(0, currentUser.pointsBalance + deltaPoints),
      });
    }

    showToast(`Successfully adjusted points by ${deltaPoints > 0 ? '+' : ''}${deltaPoints} pts.`);
    return { success: true, message: 'Points adjusted successfully.' };
  };

  return (
    <StoreContext.Provider
      value={{
        currentView,
        selectedProductId,
        selectedShopId,
        selectedOrderId,
        isCartDrawerOpen,
        isAuthModalOpen,
        authModalTab,
        isFirebaseModalOpen,
        closeFirebaseModal,
        openFirebaseModal,
        isSellerModalOpen,
        openSellerModal,
        closeSellerModal,
        toast,
        products,
        shops,
        orders,
        cart,
        wishlist,
        pointTransactions,
        transferRequests,
        referrals,
        pointsConfig,
        auditLogs,
        notifications,
        filters,
        customerTab,
        setCustomerTab,
        navigateTo,
        openCartDrawer,
        closeCartDrawer,
        openAuthModal,
        closeAuthModal,
        showToast,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        toggleWishlist,
        removeFromWishlist,
        isInWishlist,
        setFilter,
        resetFilters,
        createOrder,
        submitPointTransfer,
        approvePointTransfer,
        rejectPointTransfer,
        addProduct,
        updateProduct,
        deleteProduct,
        updateOrderItemStatus,
        applyForSellerShop,
        updateShopPolicies,
        updatePointsConfig,
        approveShop,
        rejectShop,
        suspendShop,
        reinstateShop,
        requestShopInfo,
        processRefund,
        updateUserRoleAction,
        adjustUserPoints,
        addNotification,
        markNotificationAsRead,
        dataSources,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within a StoreProvider');
  return context;
};
