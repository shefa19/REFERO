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
  ProductReview,
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
  DEMO_REVIEWS,
} from '../data/seedData';
import { calculateEarnedPoints, pointsToBdt, formatBDT } from '../utils/formatters';
import { cleanUndefinedFields } from '../utils/cleaners';
import { resolveProductImage } from '../utils/imageAssets';
import { db, isFirebaseConfigured } from '../services/firebase/config';
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
  reviews: ProductReview[];
  filters: ProductFilterState;
  customerTab: 'overview' | 'orders' | 'points' | 'referrals' | 'transfers' | 'wishlist';
  setCustomerTab: (tab: 'overview' | 'orders' | 'points' | 'referrals' | 'transfers' | 'wishlist') => void;
  adminTab: 'overview' | 'users' | 'shops' | 'products' | 'orders' | 'reviews' | 'points_config' | 'audit_logs';
  setAdminTab: (tab: 'overview' | 'users' | 'shops' | 'products' | 'orders' | 'reviews' | 'points_config' | 'audit_logs') => void;
  previousView: AppView;

  // Navigation actions
  navigateTo: (
    view: AppView,
    params?: {
      productId?: string;
      shopId?: string;
      orderId?: string;
      customerTab?: 'overview' | 'orders' | 'points' | 'referrals' | 'transfers' | 'wishlist';
      adminTab?: 'overview' | 'users' | 'shops' | 'products' | 'orders' | 'reviews' | 'points_config' | 'audit_logs';
    }
  ) => void;
  goBack: () => void;
  closeProductModal: () => void;
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
  confirmOrderReceived: (orderId: string) => Promise<{ success: boolean; message: string }>;

  // Customer Point Transfers & Requests
  submitPointTransfer: (recipientEmail: string, points: number, note?: string) => Promise<{ success: boolean; message: string }>;
  requestPointsFromFriend: (targetEmail: string, points: number, note?: string) => Promise<{ success: boolean; message: string }>;
  approvePointTransfer: (requestId: string) => Promise<{ success: boolean; message: string }>;
  rejectPointTransfer: (requestId: string) => Promise<{ success: boolean; message: string }>;
  seedShopProducts: (shopId: string, shopName: string, ownerId?: string) => Promise<{ success: boolean; count: number; message: string }>;

  // Shopkeeper workflows
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'rating' | 'reviewCount'>) => void | Promise<void>;
  updateProduct: (productId: string, updates: Partial<Product>) => void | Promise<void>;
  deleteProduct: (productId: string) => void | Promise<void>;
  updateOrderItemStatus: (orderId: string, status: Order['orderStatus']) => void;
  updateOrderStatus: (orderId: string, status: Order['orderStatus']) => void;
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

  // Product Reviews & Ratings (Verified Purchases)
  checkReviewEligibility: (productId: string) => { isEligible: boolean; qualifyingOrderId?: string; reason?: string };
  submitProductReview: (reviewData: {
    productId: string;
    rating: number;
    comment: string;
    images?: string[];
  }) => Promise<{ success: boolean; message: string }>;
  updateProductReview: (
    reviewId: string,
    updates: { rating: number; comment: string; images?: string[] }
  ) => Promise<{ success: boolean; message: string }>;
  deleteProductReview: (reviewId: string) => Promise<{ success: boolean; message: string }>;
  moderateProductReview: (
    reviewId: string,
    action: 'published' | 'hidden' | 'flagged',
    reason?: string
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
  const [previousView, setPreviousView] = useState<AppView>('home');
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
  const [reviews, setReviews] = useState<ProductReview[]>(DEMO_REVIEWS);
  const [filters, setFilters] = useState<ProductFilterState>(defaultFilterState);
  const [customerTab, setCustomerTab] = useState<
    'overview' | 'orders' | 'points' | 'referrals' | 'transfers' | 'wishlist'
  >('overview');
  const [adminTab, setAdminTab] = useState<
    'overview' | 'users' | 'shops' | 'products' | 'orders' | 'reviews' | 'points_config' | 'audit_logs'
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
            const loadedProducts = productsSnap.docs.map((docSnap) => {
              const data = docSnap.data();
              const rawImages = Array.isArray(data.images)
                ? data.images
                : (data.image ? [data.image] : []);
              const resolvedImages = rawImages.map((img: string) => resolveProductImage(img));
              if (resolvedImages.length === 0) {
                resolvedImages.push(resolveProductImage());
              }
              return {
                id: docSnap.id,
                ...data,
                images: resolvedImages,
              };
            }) as Product[];
            setProducts(loadedProducts);
            setDataSources((prev) => ({ ...prev, products: 'live' }));
          } else {
            setDataSources((prev) => ({ ...prev, products: 'demo' }));
          }
        }

        // 2. Load shops
        let loadedShops: Shop[] = [];
        try {
          const shopsQuery = currentUser?.role === 'admin'
            ? collection(activeDb, 'shops')
            : query(collection(activeDb, 'shops'), where('status', '==', 'approved'));
          const shopsSnap = await getDocs(shopsQuery);
          if (isMounted) {
            if (shopsSnap.docs.length > 0) {
              loadedShops = shopsSnap.docs.map((docSnap) => ({
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

              // Also check if current user owns a shop by ownerId query
              if (currentUser && !loadedShops.some((s) => s.ownerId === currentUser.id)) {
                try {
                  const ownerShopQuery = query(
                    collection(activeDb, 'shops'),
                    where('ownerId', '==', currentUser.id),
                    limit(1)
                  );
                  const ownerSnap = await getDocs(ownerShopQuery);
                  if (!ownerSnap.empty) {
                    const ownedShop = { id: ownerSnap.docs[0].id, ...ownerSnap.docs[0].data() } as Shop;
                    loadedShops.push(ownedShop);
                    if (!currentUser.shopId) {
                      updateCurrentUserProfile({ shopId: ownedShop.id });
                    }
                  }
                } catch {
                  // Ignore non-indexed owner query error
                }
              }

              // Auto-synchronize role if user owns an approved shop
              const myApproved = loadedShops.find((s) => s.ownerId === currentUser?.id && s.status === 'approved');
              if (myApproved && currentUser && currentUser.role !== 'shopkeeper' && currentUser.role !== 'admin') {
                updateCurrentUserProfile({ role: 'shopkeeper', shopId: myApproved.id });
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
            const ordersMap = new Map<string, Order>();
            const sanitizeDoc = (docSnap: any) => {
              const oData = docSnap.data();
              const sanitizedItems = Array.isArray(oData.items)
                ? oData.items.map((it: OrderItem) => ({
                    ...it,
                    image: resolveProductImage(it.image),
                  }))
                : [];
              return {
                id: docSnap.id,
                ...oData,
                items: sanitizedItems,
              } as Order;
            };

            if (currentUser.role === 'admin') {
              const ordersSnap = await getDocs(collection(activeDb, 'orders'));
              ordersSnap.docs.forEach((d) => ordersMap.set(d.id, sanitizeDoc(d)));
            } else {
              // A. Fetch orders placed by this user as customer
              try {
                const custQuery = query(collection(activeDb, 'orders'), where('customerId', '==', currentUser.id));
                const custSnap = await getDocs(custQuery);
                custSnap.docs.forEach((d) => ordersMap.set(d.id, sanitizeDoc(d)));
              } catch (cErr) {
                console.warn('Customer orders fetch note:', cErr);
              }

              // B. If user is a shopkeeper or owns a shop, fetch orders belonging to their shop
              const allKnownShops: Shop[] = loadedShops.length > 0 ? loadedShops : shops;
              const userShop = allKnownShops.find((s: Shop) => s.ownerId === currentUser.id || (currentUser.shopId && s.id === currentUser.shopId));
              const targetShopId = currentUser.shopId || userShop?.id;

              if (targetShopId) {
                try {
                  const shopIdsQuery = query(collection(activeDb, 'orders'), where('shopIds', 'array-contains', targetShopId));
                  const shopIdsSnap = await getDocs(shopIdsQuery);
                  shopIdsSnap.docs.forEach((d) => ordersMap.set(d.id, sanitizeDoc(d)));
                } catch {}

                try {
                  const shopIdQuery = query(collection(activeDb, 'orders'), where('shopId', '==', targetShopId));
                  const shopIdSnap = await getDocs(shopIdQuery);
                  shopIdSnap.docs.forEach((d) => ordersMap.set(d.id, sanitizeDoc(d)));
                } catch {}
              }

              // C. Multi-vendor seller lookup by UID
              try {
                const sellerQuery = query(collection(activeDb, 'orders'), where('sellerUids', 'array-contains', currentUser.id));
                const sellerSnap = await getDocs(sellerQuery);
                sellerSnap.docs.forEach((d) => ordersMap.set(d.id, sanitizeDoc(d)));
              } catch {}
            }

            if (isMounted) {
              if (ordersMap.size > 0) {
                const loadedOrders = Array.from(ordersMap.values()).sort(
                  (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );
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

        // 4. Load reviews from Firestore & merge with DEMO_REVIEWS
        try {
          const revQuery = currentUser?.role === 'admin'
            ? collection(activeDb, 'reviews')
            : query(collection(activeDb, 'reviews'), where('status', '==', 'published'));
          const revSnap = await getDocs(revQuery);
          if (isMounted) {
            const firestoreReviews = revSnap.docs.map((d) => ({
              id: d.id,
              ...d.data(),
            })) as ProductReview[];
            // Seamlessly combine real reviews with DEMO_REVIEWS (avoiding duplicates)
            const combinedReviews = [
              ...firestoreReviews,
              ...DEMO_REVIEWS.filter((d) => !firestoreReviews.some((r) => r.id === d.id)),
            ];
            setReviews(combinedReviews);
          }
        } catch (revErr) {
          console.warn('Firestore reviews fetch note:', revErr);
          if (isMounted) {
            setReviews(DEMO_REVIEWS);
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

  // Body scroll lock behind modals, drawers, and overlays
  useEffect(() => {
    const isAnyModalOpen =
      isCartDrawerOpen ||
      isAuthModalOpen ||
      isFirebaseModalOpen ||
      isSellerModalOpen ||
      currentView === 'product_detail';

    if (isAnyModalOpen) {
      const originalOverflow = document.body.style.overflow;
      const originalPaddingRight = document.body.style.paddingRight;
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

      document.body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
      };
    }
  }, [isCartDrawerOpen, isAuthModalOpen, isFirebaseModalOpen, isSellerModalOpen, currentView]);

  const closeProductModal = () => {
    let savedY: string | null = null;
    try {
      savedY = sessionStorage.getItem('refero_modal_scroll');
    } catch {}
    const returnView = previousView && previousView !== 'product_detail' ? previousView : 'home';
    setCurrentView(returnView);
    setSelectedProductId(null);

    try {
      const stateObj = {
        view: returnView,
        productId: null,
      };
      window.history.pushState(stateObj, '', '');
    } catch {}

    if (savedY !== null) {
      const y = parseInt(savedY, 10);
      if (!isNaN(y)) {
        requestAnimationFrame(() => {
          window.scrollTo({ top: y, behavior: 'instant' });
        });
      }
    }
  };

  // HTML5 History navigation listener (browser Back/Forward buttons) & Scroll restoration
  useEffect(() => {
    try {
      if (!window.history.state || !window.history.state.view) {
        window.history.replaceState({ view: 'home' }, '', '');
      }
    } catch {}

    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
      if (state && state.view) {
        if (state.view === 'product_detail') {
          setCurrentView('product_detail');
          setSelectedProductId(state.productId || null);
          return;
        }

        const targetView = state.view as AppView;
        setCurrentView(targetView);
        setSelectedProductId(state.productId || null);
        setSelectedShopId(state.shopId || null);
        setSelectedOrderId(state.orderId || null);
        if (state.customerTab) setCustomerTab(state.customerTab);
        if (state.adminTab) setAdminTab(state.adminTab);

        // Restore scroll position for target view
        let savedY: string | null = null;
        try {
          savedY = sessionStorage.getItem(`refero_scroll_${targetView}`);
          if (!savedY && (targetView === 'home' || targetView === 'products')) {
            savedY = sessionStorage.getItem('refero_modal_scroll');
          }
        } catch {}

        if (savedY !== null) {
          const y = parseInt(savedY, 10);
          if (!isNaN(y)) {
            requestAnimationFrame(() => {
              window.scrollTo({ top: y, behavior: 'instant' });
            });
            return;
          }
        }
        window.scrollTo({ top: 0, behavior: 'instant' });
      } else {
        setCurrentView('home');
        setSelectedProductId(null);
        setSelectedShopId(null);
        setSelectedOrderId(null);
        let savedY: string | null = null;
        try {
          savedY = sessionStorage.getItem('refero_modal_scroll') || sessionStorage.getItem('refero_scroll_home');
        } catch {}
        if (savedY !== null) {
          const y = parseInt(savedY, 10);
          if (!isNaN(y)) {
            requestAnimationFrame(() => {
              window.scrollTo({ top: y, behavior: 'instant' });
            });
            return;
          }
        }
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [previousView]);

  const navigateTo = (
    view: AppView,
    params?: {
      productId?: string;
      shopId?: string;
      orderId?: string;
      customerTab?: 'overview' | 'orders' | 'points' | 'referrals' | 'transfers' | 'wishlist';
      adminTab?: 'overview' | 'users' | 'shops' | 'products' | 'orders' | 'reviews' | 'points_config' | 'audit_logs';
    }
  ) => {
    if (view === 'product_detail') {
      // Save current scroll position and current view before opening product modal
      if (currentView !== 'product_detail') {
        setPreviousView(currentView);
        try {
          sessionStorage.setItem('refero_modal_scroll', window.scrollY.toString());
          sessionStorage.setItem(`refero_scroll_${currentView}`, window.scrollY.toString());
        } catch {}
      }
      setCurrentView('product_detail');
      if (params?.productId !== undefined) setSelectedProductId(params.productId || null);

      try {
        const stateObj = {
          view: 'product_detail',
          productId: params?.productId || null,
          previousView: currentView !== 'product_detail' ? currentView : previousView,
        };
        window.history.pushState(stateObj, '', '');
      } catch {}

      // Preserve background scroll position - do NOT scroll to top
      return;
    }

    // Save scroll position for the page we are navigating away from
    try {
      sessionStorage.setItem(`refero_scroll_${currentView}`, window.scrollY.toString());
    } catch {}

    setPreviousView(currentView);
    setCurrentView(view);
    if (params?.productId !== undefined) setSelectedProductId(params.productId || null);
    if (params?.shopId !== undefined) setSelectedShopId(params.shopId || null);
    if (params?.orderId !== undefined) setSelectedOrderId(params.orderId || null);
    if (params?.customerTab) setCustomerTab(params.customerTab);
    if (params?.adminTab) setAdminTab(params.adminTab);

    // Push history state so browser Back/Forward navigation works seamlessly across all views
    try {
      const stateObj = {
        view,
        productId: params?.productId || null,
        shopId: params?.shopId || null,
        orderId: params?.orderId || null,
        customerTab: params?.customerTab,
        adminTab: params?.adminTab,
      };
      const currentState = window.history.state;
      if (!currentState || currentState.view !== view || currentState.productId !== (params?.productId || null)) {
        window.history.pushState(stateObj, '', '');
      }
    } catch {}

    // Check if we have a saved scroll position for the destination view (e.g. returning to it)
    let restoredScroll: number | null = null;
    try {
      const saved = sessionStorage.getItem(`refero_scroll_${view}`);
      if (saved !== null) {
        restoredScroll = parseInt(saved, 10);
      }
    } catch {}

    if (restoredScroll !== null && !isNaN(restoredScroll) && restoredScroll > 0) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: restoredScroll!, behavior: 'instant' });
      });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goBack = () => {
    if (currentView === 'product_detail') {
      closeProductModal();
      return;
    }
    try {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        navigateTo('home');
      }
    } catch {
      navigateTo('home');
    }
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

    const orderItems: OrderItem[] = cart.map((item) => {
      const parentShop = shops.find((s) => s.id === item.product.shopId);
      return {
        productId: item.product.id,
        title: item.product.title,
        price: item.product.price,
        quantity: item.quantity,
        image: resolveProductImage(item.product.images?.[0] || ''),
        shopId: item.product.shopId,
        shopName: item.product.shopName || parentShop?.name || 'REFERO Vendor',
        unit: item.product.unit,
        pointsEarnedPerUnit: item.product.pointsEarned,
      };
    });

    // Calculate earned points following strict business rules
    const pointsEarned = calculateEarnedPoints(orderItems, pointsConfig, discountFromPoints);

    const uniqueShopIds = Array.from(new Set(orderItems.map((it) => it.shopId).filter(Boolean)));
    const primaryShopId = uniqueShopIds[0] || '';
    const primaryShop = shops.find((s) => s.id === primaryShopId);
    const sellerUids = Array.from(
      new Set(
        shops
          .filter((s) => uniqueShopIds.includes(s.id) && s.ownerId)
          .map((s) => s.ownerId)
          .filter(Boolean)
      )
    );

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
      pointsCredited: false, // will be credited upon customer confirmation
      referralRewardCredited: false,
      productIds: orderItems.map((it) => it.productId),
      shopId: primaryShopId,
      shopName: primaryShop?.name || orderItems[0]?.shopName || '',
      shopIds: uniqueShopIds,
      sellerUids,
      sellerUid: sellerUids[0] || '',
      createdAt: new Date().toISOString(),
    };

    // 1. Authoritative Validation and Atomic Transaction
    const activeDb = db;
    let finalUserBalance = currentUser.pointsBalance;

    if (!isAdminPreviewActive && isFirebaseConfigured() && activeDb) {
      try {
        const orderRef = doc(activeDb, 'orders', newOrder.id);
        const userRef = doc(activeDb, 'users', currentUser.id);
        const txRef = doc(collection(activeDb, 'pointTransactions'));
        const nowIso = new Date().toISOString();

        await runTransaction(activeDb, async (transaction) => {
          // A. Verify customer points balance inside transaction
          let serverBal = 0;
          if (orderData.pointsToUse > 0) {
            const userSnap = await transaction.get(userRef);
            if (!userSnap.exists()) {
              throw new Error('Customer account not found on server.');
            }
            const uData = userSnap.data();
            serverBal = typeof uData.pointsBalance === 'number' ? uData.pointsBalance : 0;
            if (serverBal < orderData.pointsToUse) {
              throw new Error(`Insufficient points balance: you have ${serverBal} pts available, but requested ${orderData.pointsToUse} pts.`);
            }
          }

          // B. Verify stock for each cart product inside transaction
          for (const item of cart) {
            const prodRef = doc(activeDb, 'products', item.product.id);
            const prodSnap = await transaction.get(prodRef);
            if (prodSnap.exists()) {
              const pData = prodSnap.data();
              const serverStock = typeof pData.stock === 'number' ? pData.stock : 0;
              if (serverStock < item.quantity) {
                throw new Error(`Insufficient inventory: "${item.product.title}" has only ${serverStock} units available.`);
              }
              transaction.update(prodRef, {
                stock: serverStock - item.quantity,
                updatedAt: nowIso,
              });
            }
          }

          // C. If points were used for discount, update balance & ledger atomically
          if (orderData.pointsToUse > 0) {
            finalUserBalance = serverBal - orderData.pointsToUse;
            transaction.update(userRef, {
              pointsBalance: finalUserBalance,
              points: finalUserBalance,
              lastOrderRedemptionId: newOrder.id,
              updatedAt: nowIso,
            });

            transaction.set(txRef, {
              id: txRef.id,
              userId: currentUser.id,
              type: 'checkout_discount',
              points: -orderData.pointsToUse,
              relatedId: newOrder.id,
              description: `Applied ${orderData.pointsToUse} pts for ${pointsToBdt(orderData.pointsToUse, pointsConfig.pointsToBdtRate)} discount on order #${newOrder.orderNumber}`,
              ruleSnapshot: `Conversion rate: 1 pt = ৳${pointsConfig.pointsToBdtRate}`,
              status: 'completed',
              createdAt: nowIso,
            });
          }

          // D. Create order document atomically
          transaction.set(orderRef, cleanUndefinedFields(newOrder));
        });
      } catch (err: any) {
        console.error('Checkout atomic transaction error:', err);
        showToast(err.message || 'Checkout failed. Please review your cart and points balance.', 'error');
        throw err;
      }
    } else {
      // Offline / Preview Mode validation
      if (orderData.pointsToUse > 0) {
        if (currentUser.pointsBalance < orderData.pointsToUse) {
          showToast(`Insufficient points balance: you have ${currentUser.pointsBalance} pts available.`, 'error');
          throw new Error('Insufficient points balance.');
        }
        finalUserBalance = currentUser.pointsBalance - orderData.pointsToUse;
      }
    }

    // 2. State updates ONLY executed after authoritative transaction succeeds
    setProducts((prev) =>
      prev.map((p) => {
        const cartItem = cart.find((ci) => ci.product.id === p.id);
        if (cartItem) {
          return { ...p, stock: Math.max(0, p.stock - cartItem.quantity) };
        }
        return p;
      })
    );

    if (orderData.pointsToUse > 0) {
      updateCurrentUserProfile({
        pointsBalance: finalUserBalance,
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

    setOrders((prev) => [newOrder, ...prev]);
    clearCart();
    setSelectedOrderId(newOrder.id);

    // 3. Dispatch in-app order notifications to respective Shopkeeper(s)
    const targetSellerUids = (newOrder.sellerUids && newOrder.sellerUids.length > 0)
      ? newOrder.sellerUids
      : (newOrder.sellerUid ? [newOrder.sellerUid] : (primaryShop?.ownerId ? [primaryShop.ownerId] : []));

    const orderNotifTimestamp = new Date().toISOString();

    for (const sUid of targetSellerUids) {
      if (!sUid || sUid === currentUser.id) continue;
      const notifId = `notif_order_${newOrder.id}_${sUid}`;

      if (isFirebaseConfigured() && activeDb && !isAdminPreviewActive) {
        try {
          const notifRef = doc(collection(activeDb, 'notifications'), notifId);
          await setDoc(notifRef, {
            id: notifId,
            userId: sUid,
            type: 'order',
            title: 'New Order Received',
            message: `New order #${newOrder.orderNumber} received for ${formatBDT(newOrder.totalAmount)} from ${newOrder.customerName}.`,
            link: 'shopkeeper_dashboard',
            orderId: newOrder.id,
            read: false,
            createdAt: orderNotifTimestamp,
          });
        } catch (notifErr) {
          console.warn('Shopkeeper order notification dispatch note:', notifErr);
        }
      }

      // In-memory notification state update
      const sellerNotif: NotificationItem = {
        id: notifId,
        userId: sUid,
        type: 'order',
        title: 'New Order Received',
        message: `New order #${newOrder.orderNumber} received for ${formatBDT(newOrder.totalAmount)} from ${newOrder.customerName}.`,
        link: 'shopkeeper_dashboard',
        read: false,
        createdAt: orderNotifTimestamp,
      };
      setNotifications((prev) => [sellerNotif, ...prev]);
    }

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
        // Look up recipient user account by registered email (handled safely under privacy rules)
        let recipientId = '';
        let recipientData: any = {};
        try {
          const usersRef = collection(activeDb, 'users');
          const recipientQuery = query(usersRef, where('email', '==', cleanEmail), limit(1));
          const recipientSnap = await getDocs(recipientQuery);

          if (!recipientSnap.empty) {
            const recipientDoc = recipientSnap.docs[0];
            recipientId = recipientDoc.id;
            recipientData = recipientDoc.data();
          }
        } catch {
          // Privacy policy: other users cannot be queried; request routes securely via recipientEmail
        }

        if (recipientId && recipientId === currentUser.id) {
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
            requestType: 'transfer',
            createdAt: new Date().toISOString(),
          });

          // Incoming transfer notification for recipient (Event A)
          const isTargetAdmin = cleanEmail === 'admin@refero.com.bd' || recipientData.role === 'admin';
          const notifUserId = isTargetAdmin ? 'admin' : (recipientId || cleanEmail);
          const notifLink = isTargetAdmin ? 'admin_points' : 'transfers';
          const notifId = `notif_incoming_transfer_${newRequestId}`;
          const notifRef = doc(activeDb, 'notifications', notifId);
          transaction.set(notifRef, {
            id: notifId,
            userId: notifUserId,
            recipientEmail: cleanEmail,
            title: isTargetAdmin ? 'Customer Sent Points to Admin' : 'Incoming Point Transfer',
            message: `${currentUser.fullName} sent you a point transfer request for ${points} REFERO Points.${note ? ` Note: "${note}"` : ''}`,
            type: 'transfer',
            link: notifLink,
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
          requestType: 'transfer',
          createdAt: new Date().toISOString(),
        };

        setTransferRequests((prev) => [newRequest, ...prev]);

        // In-memory recipient notification
        const isTargetAdminLocal = cleanEmail === 'admin@refero.com.bd' || recipientData.role === 'admin';
        const incomingNotif: NotificationItem = {
          id: `notif_incoming_transfer_${newRequestId}`,
          userId: isTargetAdminLocal ? 'admin' : (recipientId || cleanEmail),
          recipientEmail: cleanEmail,
          title: isTargetAdminLocal ? 'Customer Sent Points to Admin' : 'Incoming Point Transfer',
          message: `${currentUser.fullName} sent you a point transfer request for ${points} REFERO Points.${note ? ` Note: "${note}"` : ''}`,
          type: 'transfer',
          link: isTargetAdminLocal ? 'admin_points' : 'transfers',
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
      requestType: 'transfer',
      createdAt: new Date().toISOString(),
    };

    setTransferRequests((prev) => [newRequest, ...prev]);

    // Recipient notification in demo mode
    const incomingNotif: NotificationItem = {
      id: `notif_incoming_transfer_${newRequestId}`,
      userId: recipientId,
      recipientEmail: cleanEmail,
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

  const requestPointsFromFriend = async (
    targetEmail: string,
    points: number,
    note?: string
  ): Promise<{ success: boolean; message: string }> => {
    if (!currentUser) {
      return { success: false, message: 'You must be logged in to request points.' };
    }

    const cleanEmail = targetEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, message: 'Please provide a valid email address.' };
    }

    if (cleanEmail === currentUser.email.toLowerCase()) {
      return { success: false, message: 'Self-requests are not permitted.' };
    }

    if (!points || points <= 0) {
      return { success: false, message: 'Point amount must be greater than zero.' };
    }

    const activeDb = db;
    if (isFirebaseConfigured() && activeDb && !isAdminPreviewActive) {
      try {
        let recipientId = '';
        let recipientData: any = {};
        try {
          const usersRef = collection(activeDb, 'users');
          const recipientQuery = query(usersRef, where('email', '==', cleanEmail), limit(1));
          const recipientSnap = await getDocs(recipientQuery);
          if (!recipientSnap.empty) {
            const recipientDoc = recipientSnap.docs[0];
            recipientId = recipientDoc.id;
            recipientData = recipientDoc.data();
          }
        } catch {}

        const newRequestId = `req_point_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const requestDocRef = doc(activeDb, 'pointTransferRequests', newRequestId);

        const newRequestData: PointTransferRequest = {
          id: newRequestId,
          senderId: currentUser.id,
          senderName: currentUser.fullName,
          senderEmail: currentUser.email,
          recipientId,
          recipientEmail: cleanEmail,
          recipientName: recipientData.fullName || cleanEmail.split('@')[0],
          points,
          note: note ? note.trim() : '',
          status: 'pending',
          requestType: 'request',
          createdAt: new Date().toISOString(),
        };

        await setDoc(requestDocRef, newRequestData);

        // Notification for the friend (or Admin) from whom points are requested
        const isTargetAdmin = cleanEmail === 'admin@refero.com.bd' || recipientData.role === 'admin';
        const notifUserId = isTargetAdmin ? 'admin' : (recipientId || cleanEmail);
        const notifLink = isTargetAdmin ? 'admin_points' : 'transfers';
        const notifId = `notif_incoming_req_${newRequestId}`;
        const notifRef = doc(activeDb, 'notifications', notifId);
        await setDoc(notifRef, {
          id: notifId,
          userId: notifUserId,
          recipientEmail: cleanEmail,
          title: isTargetAdmin ? 'Point Request Sent to Admin' : 'Incoming Point Request',
          message: `${currentUser.fullName} requested ${points} REFERO Points from you.${note ? ` Note: "${note}"` : ''}`,
          type: 'transfer',
          link: notifLink,
          read: false,
          createdAt: new Date().toISOString(),
        });

        setTransferRequests((prev) => [newRequestData, ...prev]);
        showToast(`Point request for ${points} points sent to ${cleanEmail}`);
        return { success: true, message: `Request for ${points} points sent successfully.` };
      } catch (err: any) {
        console.error('Request points error:', err);
        return { success: false, message: err.message || 'Failed to submit point request.' };
      }
    }

    // Demo Mode
    const newRequestId = `req_point_${Date.now()}`;
    const isTargetAdmin = cleanEmail === 'admin@refero.com.bd';
    const notifUserId = isTargetAdmin ? 'admin' : `user_recip_${Date.now()}`;
    const notifLink = isTargetAdmin ? 'admin_points' : 'transfers';

    const newRequestData: PointTransferRequest = {
      id: newRequestId,
      senderId: currentUser.id,
      senderName: currentUser.fullName,
      senderEmail: currentUser.email,
      recipientId: notifUserId,
      recipientEmail: cleanEmail,
      recipientName: cleanEmail.split('@')[0],
      points,
      note: note ? note.trim() : '',
      status: 'pending',
      requestType: 'request',
      createdAt: new Date().toISOString(),
    };
    setTransferRequests((prev) => [newRequestData, ...prev]);

    // Recipient notification in demo mode
    const incomingReqNotif: NotificationItem = {
      id: `notif_incoming_req_${newRequestId}`,
      userId: notifUserId,
      recipientEmail: cleanEmail,
      title: isTargetAdmin ? 'Point Request Sent to Admin' : 'Incoming Point Request',
      message: `${currentUser.fullName} requested ${points} REFERO Points from you.${note ? ` Note: "${note}"` : ''}`,
      type: 'transfer',
      link: notifLink,
      read: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications((prev) => [incomingReqNotif, ...prev]);

    showToast(`Point request for ${points} points sent to ${cleanEmail}`);
    return { success: true, message: `Request for ${points} points sent successfully.` };
  };

  const approvePointTransfer = async (requestId: string): Promise<{ success: boolean; message: string }> => {
    if (!currentUser) {
      return { success: false, message: 'You must be logged in to accept point requests or transfers.' };
    }

    const request = transferRequests.find((r) => r.id === requestId);
    if (!request) {
      return { success: false, message: 'Transfer request not found.' };
    }

    // Validation 1: Prevent accepting own transfer/request
    if (request.senderId === currentUser.id) {
      return { success: false, message: 'You cannot accept your own request.' };
    }

    // Validation 2: Ensure current user is the intended recipient
    const isRecipient =
      request.recipientId === currentUser.id ||
      request.recipientEmail.toLowerCase() === currentUser.email.toLowerCase();

    if (!isRecipient) {
      return { success: false, message: 'Unauthorized: This request was not sent to you.' };
    }

    // Validation 3: Ensure request is strictly pending
    if (request.status !== 'pending') {
      return { success: false, message: `This request has already been ${request.status}.` };
    }

    const pointsAmount = request.points;
    const isPointRequest = request.requestType === 'request';
    const activeDb = db;

    if (isFirebaseConfigured() && activeDb && !isAdminPreviewActive) {
      try {
        const requestRef = doc(activeDb, 'pointTransferRequests', requestId);
        await runTransaction(activeDb, async (transaction) => {
          const reqDoc = await transaction.get(requestRef);
          if (!reqDoc.exists()) {
            throw new Error('Request record not found on server.');
          }
          const reqData = reqDoc.data() as PointTransferRequest;
          if (reqData.status !== 'pending') {
            throw new Error(`This request has already been ${reqData.status}.`);
          }

          // Verify recipient ownership on server
          const serverIsRecipient =
            reqData.recipientId === currentUser.id ||
            reqData.recipientEmail.toLowerCase() === currentUser.email.toLowerCase();
          if (!serverIsRecipient) {
            throw new Error('Unauthorized: You are not the intended recipient of this request.');
          }

          if (reqData.senderId === currentUser.id) {
            throw new Error('You cannot accept your own request.');
          }

          const senderRef = doc(activeDb, 'users', reqData.senderId);
          const recipientRef = doc(activeDb, 'users', currentUser.id);

          const [sDoc, rDoc] = await Promise.all([
            transaction.get(senderRef),
            transaction.get(recipientRef),
          ]);

          if (!sDoc.exists() || !rDoc.exists()) {
            throw new Error('User profiles could not be retrieved.');
          }

          const sData = sDoc.data();
          const rData = rDoc.data();
          const sBalance = typeof sData.pointsBalance === 'number' ? sData.pointsBalance : (typeof sData.points === 'number' ? sData.points : 0);
          const rBalance = typeof rData.pointsBalance === 'number' ? rData.pointsBalance : (typeof rData.points === 'number' ? rData.points : 0);
          const transferPoints = Number(reqData.points);
          const timestamp = new Date().toISOString();

          if (isPointRequest) {
            // Point Request: User B (currentUser) is sending points to User A (reqData.senderId)
            if (rBalance < transferPoints) {
              throw new Error(`You have insufficient points balance (${rBalance} pts available, ${reqData.points} requested).`);
            }

            // Debit recipient (User B)
            transaction.update(recipientRef, {
              pointsBalance: rBalance - transferPoints,
              points: rBalance - transferPoints,
              lastTransferRequestId: requestId,
              updatedAt: timestamp,
            });

            // Credit requester (User A)
            transaction.update(senderRef, {
              pointsBalance: sBalance + transferPoints,
              points: sBalance + transferPoints,
              lastTransferRequestId: requestId,
              updatedAt: timestamp,
            });

            // Debit ledger for User B
            const rTxRef = doc(collection(activeDb, 'pointTransactions'));
            transaction.set(rTxRef, {
              id: rTxRef.id,
              userId: currentUser.id,
              type: 'transfer_sent',
              points: -transferPoints,
              relatedId: requestId,
              description: `Sent requested points to ${reqData.senderName} (${reqData.senderEmail})`,
              ruleSnapshot: 'P2P Point Request Fulfillment',
              status: 'completed',
              createdAt: timestamp,
            });

            // Credit ledger for User A
            const sTxRef = doc(collection(activeDb, 'pointTransactions'));
            transaction.set(sTxRef, {
              id: sTxRef.id,
              userId: reqData.senderId,
              type: 'transfer_received',
              points: transferPoints,
              relatedId: requestId,
              description: `Received requested points from ${currentUser.fullName} (${currentUser.email})`,
              ruleSnapshot: 'P2P Point Request Fulfillment',
              status: 'completed',
              createdAt: timestamp,
            });

            // Update request
            transaction.update(requestRef, {
              status: 'accepted',
              recipientId: currentUser.id,
              processedAt: timestamp,
            });

            // Notify User A
            const notifRef = doc(collection(activeDb, 'notifications'), `notif_transfer_acc_${requestId}`);
            transaction.set(notifRef, {
              id: `notif_transfer_acc_${requestId}`,
              userId: reqData.senderId,
              recipientEmail: reqData.senderEmail,
              title: 'Point Request Accepted',
              message: `${currentUser.fullName} accepted your request and sent you ${reqData.points} REFERO Points!`,
              type: 'transfer',
              link: 'transfers',
              read: false,
              createdAt: timestamp,
            });
          } else {
            // Standard Transfer: User A (reqData.senderId) sent points to User B (currentUser)
            if (sBalance < transferPoints) {
              throw new Error(`Sender has insufficient points balance (${sBalance} pts available, ${reqData.points} requested).`);
            }

            // Debit sender (User A)
            transaction.update(senderRef, {
              pointsBalance: sBalance - transferPoints,
              points: sBalance - transferPoints,
              lastTransferRequestId: requestId,
              updatedAt: timestamp,
            });

            // Credit recipient (User B)
            transaction.update(recipientRef, {
              pointsBalance: rBalance + transferPoints,
              points: rBalance + transferPoints,
              lastTransferRequestId: requestId,
              updatedAt: timestamp,
            });

            // Debit ledger for User A
            const sTxRef = doc(collection(activeDb, 'pointTransactions'));
            transaction.set(sTxRef, {
              id: sTxRef.id,
              userId: reqData.senderId,
              type: 'transfer_sent',
              points: -transferPoints,
              relatedId: requestId,
              description: `Transferred points to ${currentUser.fullName} (${currentUser.email})`,
              ruleSnapshot: 'P2P Point Transfer',
              status: 'completed',
              createdAt: timestamp,
            });

            // Credit ledger for User B
            const rTxRef = doc(collection(activeDb, 'pointTransactions'));
            transaction.set(rTxRef, {
              id: rTxRef.id,
              userId: currentUser.id,
              type: 'transfer_received',
              points: transferPoints,
              relatedId: requestId,
              description: `Received points transfer from ${reqData.senderName} (${reqData.senderEmail})`,
              ruleSnapshot: 'P2P Point Transfer',
              status: 'completed',
              createdAt: timestamp,
            });

            // Update request
            transaction.update(requestRef, {
              status: 'accepted',
              recipientId: currentUser.id,
              processedAt: timestamp,
            });

            // Notify User A
            const notifRef = doc(collection(activeDb, 'notifications'), `notif_transfer_acc_${requestId}`);
            transaction.set(notifRef, {
              id: `notif_transfer_acc_${requestId}`,
              userId: reqData.senderId,
              recipientEmail: reqData.senderEmail,
              title: 'Point Transfer Accepted',
              message: `${currentUser.fullName} accepted your transfer of ${reqData.points} REFERO Points.`,
              type: 'transfer',
              link: 'transfers',
              read: false,
              createdAt: timestamp,
            });
          }
        });
      } catch (err: any) {
        console.error('Accept transfer transaction error:', err);
        return {
          success: false,
          message: err.message || 'Failed to accept point request.',
        };
      }
    } else {
      // Demo Mode execution
      const senderUser = DEMO_USERS.find((u) => u.id === request.senderId);
      if (isPointRequest) {
        if (currentUser.pointsBalance < request.points) {
          return {
            success: false,
            message: `You have insufficient points balance (${currentUser.pointsBalance} pts available, ${request.points} requested).`,
          };
        }
        if (senderUser) {
          senderUser.pointsBalance += request.points;
        }
      } else {
        if (senderUser) {
          if (senderUser.pointsBalance < request.points) {
            return {
              success: false,
              message: `Sender has insufficient points balance (${senderUser.pointsBalance} pts available, ${request.points} requested).`,
            };
          }
          senderUser.pointsBalance -= request.points;
        }
      }

      // Add ledger entries
      const sTx: PointTransaction = {
        id: `tx_${Date.now()}_transfersent`,
        userId: isPointRequest ? currentUser.id : request.senderId,
        type: 'transfer_sent',
        points: -request.points,
        relatedId: requestId,
        description: isPointRequest
          ? `Sent requested points to ${request.senderName}`
          : `Transferred points to ${currentUser.fullName}`,
        ruleSnapshot: isPointRequest ? 'P2P Point Request Fulfillment' : 'P2P Point Transfer',
        status: 'completed',
        createdAt: new Date().toISOString(),
      };

      const rTx: PointTransaction = {
        id: `tx_${Date.now()}_transferrec`,
        userId: isPointRequest ? request.senderId : currentUser.id,
        type: 'transfer_received',
        points: request.points,
        relatedId: requestId,
        description: isPointRequest
          ? `Received requested points from ${currentUser.fullName}`
          : `Received points transfer from ${request.senderName}`,
        ruleSnapshot: isPointRequest ? 'P2P Point Request Fulfillment' : 'P2P Point Transfer',
        status: 'completed',
        createdAt: new Date().toISOString(),
      };

      setPointTransactions((prev) => [rTx, sTx, ...prev]);

      // Notify Sender in demo mode (Event B)
      const senderNotif: NotificationItem = {
        id: `notif_transfer_acc_${requestId}`,
        userId: request.senderId,
        recipientEmail: request.senderEmail,
        title: isPointRequest ? 'Point Request Accepted' : 'Point Transfer Accepted',
        message: isPointRequest
          ? `${currentUser.fullName} accepted your request and sent you ${request.points} REFERO Points!`
          : `${currentUser.fullName} accepted your transfer of ${request.points} REFERO Points.`,
        type: 'transfer',
        link: 'transfers',
        read: false,
        createdAt: new Date().toISOString(),
      };
      setNotifications((prev) => [senderNotif, ...prev]);
    }

    const newBalance = isPointRequest
      ? Math.max(0, currentUser.pointsBalance - pointsAmount)
      : currentUser.pointsBalance + pointsAmount;

    updateCurrentUserProfile({
      pointsBalance: newBalance,
      points: newBalance,
    });

    setTransferRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? { ...r, status: 'accepted', processedAt: new Date().toISOString() }
          : r
      )
    );

    const successMsg = isPointRequest
      ? `Transferred ${pointsAmount} REFERO Points to ${request.senderName}!`
      : `Accepted transfer of ${pointsAmount} REFERO Points!`;

    showToast(successMsg, 'success');
    return { success: true, message: successMsg };
  };

  const rejectPointTransfer = async (requestId: string): Promise<{ success: boolean; message: string }> => {
    if (!currentUser) {
      return { success: false, message: 'You must be logged in to decline requests.' };
    }

    const request = transferRequests.find((r) => r.id === requestId);
    if (!request) {
      return { success: false, message: 'Request not found.' };
    }

    const isRecipient =
      request.recipientId === currentUser.id ||
      request.recipientEmail.toLowerCase() === currentUser.email.toLowerCase();

    if (!isRecipient) {
      return { success: false, message: 'Unauthorized: This request was not sent to you.' };
    }

    if (request.status !== 'pending') {
      return { success: false, message: `This request has already been ${request.status}.` };
    }

    const isPointRequest = request.requestType === 'request';
    const notifTitle = isPointRequest ? 'Point Request Declined' : 'Point Transfer Declined';
    const notifMsg = isPointRequest
      ? `${currentUser.fullName} declined your request for ${request.points} REFERO Points.`
      : `${currentUser.fullName} declined your transfer of ${request.points} REFERO Points.`;

    const activeDb = db;
    if (isFirebaseConfigured() && activeDb && !isAdminPreviewActive) {
      try {
        const timestamp = new Date().toISOString();
        const requestRef = doc(activeDb, 'pointTransferRequests', requestId);
        await updateDoc(requestRef, {
          status: 'rejected',
          recipientId: currentUser.id,
          processedAt: timestamp,
        });

        const notifRef = doc(collection(activeDb, 'notifications'), `notif_transfer_dec_${requestId}`);
        await setDoc(notifRef, {
          id: `notif_transfer_dec_${requestId}`,
          userId: request.senderId,
          recipientEmail: request.senderEmail,
          title: notifTitle,
          message: notifMsg,
          type: 'transfer',
          link: 'transfers',
          read: false,
          createdAt: timestamp,
        });
      } catch (err: any) {
        console.error('Firestore reject transfer error:', err);
        return { success: false, message: err.message || 'Failed to decline request.' };
      }
    }

    // Demo notification for sender
    const notifItem: NotificationItem = {
      id: `notif_transfer_dec_${requestId}`,
      userId: request.senderId,
      recipientEmail: request.senderEmail,
      title: notifTitle,
      message: notifMsg,
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

    showToast('Point request declined.');
    return { success: true, message: 'Request declined.' };
  };

  const seedShopProducts = async (
    shopId: string,
    shopName: string,
    ownerId?: string
  ): Promise<{ success: boolean; count: number; message: string }> => {
    const activeDb = db;
    const nowIso = new Date().toISOString();
    const effectiveOwnerId = ownerId || currentUser?.id || 'usr_seller_habib';

    const sampleCatalog: Omit<Product, 'id' | 'createdAt' | 'rating' | 'reviewCount'>[] = [
      {
        shopId,
        shopName,
        title: 'ঘানি ভাঙা খাঁটি সরিষার তেল (Pure Cold-Pressed Mustard Oil - 1L)',
        description: 'Traditionally extracted wooden ghani cold-pressed mustard oil with a strong, natural pungent aroma. Zero chemical processing or adulteration.',
        category: 'Groceries & Organics',
        brand: shopName,
        price: 360,
        originalPrice: 400,
        discountPercent: 10,
        stock: 45,
        images: ['https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80'],
        unit: '1 Litre bottle',
        pointsEarned: 18,
        canRedeemWithPoints: true,
        pointPrice: 720,
        isFeatured: true,
        isTrending: true,
        isBestSeller: true,
      },
      {
        shopId,
        shopName,
        title: 'সুন্দরবনের প্রাকৃতিক খলিশা ফুলের মধু (Sundarbans Natural Khalisha Honey - 500g)',
        description: 'Freshly harvested wild forest honey collected by traditional Mouvals in the Sundarbans. Natural, raw, unheated, and rich in natural antioxidants.',
        category: 'Organic Products',
        brand: shopName,
        price: 650,
        originalPrice: 720,
        discountPercent: 10,
        stock: 30,
        images: ['https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=600&q=80'],
        unit: '500g glass jar',
        pointsEarned: 32,
        canRedeemWithPoints: true,
        pointPrice: 1300,
        isFeatured: true,
        isTrending: true,
        isBestSeller: true,
      },
      {
        shopId,
        shopName,
        title: 'খাঁটি গাওয়া ঘি - বগুড়ার ঐতিহ্যবাহী (Premium Bogura Cow Ghee - 500g)',
        description: 'Slow-simmered artisanal cow ghee prepared from fresh grass-fed milk. Distinctive golden granular texture and rich authentic aroma.',
        category: 'Groceries & Organics',
        brand: shopName,
        price: 850,
        originalPrice: 950,
        discountPercent: 11,
        stock: 25,
        images: ['https://images.unsplash.com/photo-1631451095765-2c91616fc9e6?auto=format&fit=crop&w=600&q=80'],
        unit: '500g jar',
        pointsEarned: 42,
        canRedeemWithPoints: true,
        pointPrice: 1700,
        isFeatured: true,
        isTrending: true,
        isBestSeller: true,
      },
      {
        shopId,
        shopName,
        title: 'দিনাজপুরের সুগন্ধি চিনিগুঁড়া চাল (Dinajpur Premium Chinigura Rice - 5kg)',
        description: 'Naturally aged fine aromatic Chinigura rice directly sourced from certified farmers in Dinajpur. Exceptional scent and fluffy texture.',
        category: 'Daily Essentials',
        brand: shopName,
        price: 750,
        originalPrice: 820,
        discountPercent: 9,
        stock: 60,
        images: ['https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80'],
        unit: '5kg pack',
        pointsEarned: 37,
        canRedeemWithPoints: true,
        pointPrice: 1500,
        isFeatured: false,
        isTrending: true,
        isBestSeller: true,
      },
      {
        shopId,
        shopName,
        title: 'শ্রীমঙ্গলের ব্ল্যাক টি - ফার্স্ট ফ্লাশ (Sreemangal Premium CTC Black Tea - 400g)',
        description: 'Single-estate handpicked whole-leaf black tea from the lush hills of Sreemangal. Produces an invigorating rich liquor with a brisk finish.',
        category: 'Tea & Beverages',
        brand: shopName,
        price: 290,
        originalPrice: 330,
        discountPercent: 12,
        stock: 50,
        images: ['https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80'],
        unit: '400g foil pack',
        pointsEarned: 14,
        canRedeemWithPoints: false,
        isFeatured: false,
        isTrending: true,
        isBestSeller: false,
      },
      {
        shopId,
        shopName,
        title: 'স্পেশাল পাঁচফোড়ন ও গোটা গরম মশলা (Artisanal Whole Garam Masala Blend - 250g)',
        description: 'A master blend of green cardamom, cinnamon quills, cloves, mace, and cumin seeds hand-sorted for maximum pungency and fragrance.',
        category: 'Kitchen & Spices',
        brand: shopName,
        price: 220,
        originalPrice: 250,
        discountPercent: 12,
        stock: 40,
        images: ['https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=600&q=80'],
        unit: '250g pouch',
        pointsEarned: 11,
        canRedeemWithPoints: false,
        isFeatured: false,
        isTrending: false,
        isBestSeller: false,
      },
      {
        shopId,
        shopName,
        title: 'পাহাড়ি অর্গানিক হলুদ গুঁড়া (Organic Hill Turmeric Powder - 200g)',
        description: 'High-curcumin organic turmeric sun-dried and finely stone-ground from the Chittagong Hill Tracts. Vibrant natural yellow color.',
        category: 'Kitchen & Spices',
        brand: shopName,
        price: 180,
        originalPrice: 210,
        discountPercent: 14,
        stock: 55,
        images: ['https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=600&q=80'],
        unit: '200g jar',
        pointsEarned: 9,
        canRedeemWithPoints: false,
        isFeatured: false,
        isTrending: false,
        isBestSeller: false,
      },
      {
        shopId,
        shopName,
        title: 'যশোরের খাঁটি ঝোলা খেজুর গুড় (Natural Date Palm Liquid Molasses - 1kg)',
        description: 'Traditional woodfire boiled winter date palm sap molasses from Jashore. Irresistible caramel aroma and smooth mouthfeel.',
        category: 'Groceries & Organics',
        brand: shopName,
        price: 480,
        originalPrice: 550,
        discountPercent: 13,
        stock: 35,
        images: ['https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=600&q=80'],
        unit: '1kg clay pot',
        pointsEarned: 24,
        canRedeemWithPoints: true,
        pointPrice: 960,
        isFeatured: true,
        isTrending: true,
        isBestSeller: true,
      },
      {
        shopId,
        shopName,
        title: 'বগুড়ার শুকনো লাল ঝাল মরিচ (Sariakandi Sun-Dried Whole Red Chili - 250g)',
        description: 'Naturally sun-cured whole red chilis from the riverbanks of Sariakandi, Bogura. Unmatched spiciness and fiery crimson color.',
        category: 'Kitchen & Spices',
        brand: shopName,
        price: 195,
        originalPrice: 230,
        discountPercent: 15,
        stock: 40,
        images: ['https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=600&q=80'],
        unit: '250g packet',
        pointsEarned: 10,
        canRedeemWithPoints: false,
        isFeatured: false,
        isTrending: false,
        isBestSeller: false,
      },
      {
        shopId,
        shopName,
        title: 'হিমালয়ান পিঙ্ক ক্রিস্টাল লবণ (Himalayan Pink Rock Salt Granules - 1kg)',
        description: 'Unrefined natural pink mineral salt containing 84 essential trace minerals. Healthy alternative to industrial table salt.',
        category: 'Daily Essentials',
        brand: shopName,
        price: 160,
        originalPrice: 190,
        discountPercent: 16,
        stock: 70,
        images: ['https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?auto=format&fit=crop&w=600&q=80'],
        unit: '1kg pouch',
        pointsEarned: 8,
        canRedeemWithPoints: true,
        pointPrice: 320,
        isFeatured: false,
        isTrending: false,
        isBestSeller: true,
      },
    ];

    let addedCount = 0;
    const newProductItems: Product[] = [];

    for (let i = 0; i < sampleCatalog.length; i++) {
      const p = sampleCatalog[i];
      const deterministicId = `prod_${shopId}_${String(i + 1).padStart(2, '0')}`;
      if (products.some((existing) => existing.id === deterministicId)) {
        continue;
      }
      const prod: Product = {
        ...p,
        id: deterministicId,
        rating: 4.8,
        reviewCount: 20 + i * 2,
        createdAt: nowIso,
      };

      if (isFirebaseConfigured() && activeDb && !isAdminPreviewActive) {
        try {
          await setDoc(doc(activeDb, 'products', deterministicId), cleanUndefinedFields(prod));
        } catch (err) {
          console.warn('Firestore product seed error for', deterministicId, err);
        }
      }
      newProductItems.push(prod);
      addedCount++;
    }

    if (newProductItems.length > 0) {
      setProducts((prev) => [...prev, ...newProductItems]);
    }

    showToast(`Successfully added ${addedCount} products to ${shopName}!`, 'success');
    return { success: true, count: addedCount, message: `Added ${addedCount} products to ${shopName}.` };
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
        // Persist shopId on the applicant's user document so page refresh preserves it
        await updateDoc(doc(db, 'users', currentUser.id), { shopId: newShop.id }).catch(() => {});
      } catch (err) {
        console.warn('Firestore shop application create error:', err);
      }
    }

    // 1. Applicant notification
    await addNotification({
      userId: currentUser.id,
      title: 'Seller Application Received',
      message: `Your storefront application for "${shopData.name}" has been submitted and is pending administrator review.`,
      type: 'system',
    });

    // 2. Admin notification (Event: Seller Application Submitted)
    const adminNotifId = `notif_seller_app_${newShop.id}`;
    await addNotification({
      id: adminNotifId,
      userId: 'admin',
      title: 'New Seller Storefront Application',
      message: `${currentUser.fullName} (${currentUser.email}) submitted application for "${shopData.name}". Review store details to approve or reject.`,
      type: 'system',
      link: 'admin_shops',
      metadata: {
        shopId: newShop.id,
        applicantId: currentUser.id,
        applicantName: currentUser.fullName,
        applicantEmail: currentUser.email,
        shopName: shopData.name,
      },
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

  const updateOrderItemStatus = async (orderId: string, newStatus: Order['orderStatus']) => {
    let targetOrder = orders.find((o) => o.id === orderId);
    const activeDb = db;

    // Fallback: If not currently in local store orders array, fetch directly from Firestore
    if (!targetOrder && activeDb && isFirebaseConfigured() && !isAdminPreviewActive) {
      try {
        const orderSnap = await getDoc(doc(activeDb, 'orders', orderId));
        if (orderSnap.exists()) {
          targetOrder = { id: orderSnap.id, ...orderSnap.data() } as Order;
        }
      } catch (fErr) {
        console.warn('Could not fetch order from Firestore:', fErr);
      }
    }

    if (!targetOrder) {
      showToast('Order not found.', 'error');
      return;
    }

    // Authorization check: Only Admin or the Seller of the order's shop can change status
    const isAdminUser = currentUser?.role === 'admin';
    const userShopId = currentUser?.shopId || shops.find((s) => s.ownerId === currentUser?.id)?.id;
    const isOrderSeller = (currentUser?.role === 'shopkeeper' || Boolean(userShopId) || isAdminUser) && (
      isAdminUser ||
      (userShopId && (targetOrder as any).shopId === userShopId) ||
      (userShopId && targetOrder.shopIds?.includes(userShopId)) ||
      (userShopId && targetOrder.items.some((it) => it.shopId === userShopId)) ||
      Boolean(targetOrder.sellerUids?.includes(currentUser?.id || '')) ||
      targetOrder.sellerUid === currentUser?.id
    );

    if (!isAdminUser && !isOrderSeller) {
      showToast('Unauthorized: Only Admin or the designated Seller can update order status.', 'error');
      return;
    }

    const timestamp = new Date().toISOString();

    if (isFirebaseConfigured() && activeDb && !isAdminPreviewActive) {
      try {
        const orderRef = doc(activeDb, 'orders', orderId);
        await updateDoc(orderRef, {
          orderStatus: newStatus,
          updatedAt: timestamp,
          ...(newStatus === 'delivered' ? { deliveredAt: timestamp } : {}),
        });

        // If seller marks as delivered, send customer a notification prompting confirmation
        if (newStatus === 'delivered') {
          const custNotifRef = doc(collection(activeDb, 'notifications'), `notif_order_delivered_${orderId}`);
          await setDoc(custNotifRef, {
            id: `notif_order_delivered_${orderId}`,
            userId: targetOrder.customerId,
            title: 'Order Delivered — Please Confirm Receipt!',
            message: `Order #${targetOrder.orderNumber} has arrived! Tap "Confirm Received" in your orders to claim your ${targetOrder.pointsEarned} REFERO Points.`,
            type: 'order',
            link: 'orders',
            read: false,
            createdAt: timestamp,
          });
        }
      } catch (err: any) {
        console.error('Firestore update order status error:', err);
        showToast(err.message || 'Failed to update order status in database.', 'error');
        throw err;
      }
    }

    // Update in-memory state
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id !== orderId) return ord;
        return {
          ...ord,
          orderStatus: newStatus,
          ...(newStatus === 'delivered' ? { deliveredAt: timestamp } : {}),
        };
      })
    );

    if (newStatus === 'delivered') {
      const custNotif: NotificationItem = {
        id: `notif_order_delivered_${targetOrder.id}`,
        userId: targetOrder.customerId,
        title: 'Order Delivered — Please Confirm Receipt!',
        message: `Order #${targetOrder.orderNumber} has arrived! Tap "Confirm Received" in your orders to claim your ${targetOrder.pointsEarned} REFERO Points.`,
        type: 'order',
        link: 'orders',
        read: false,
        createdAt: timestamp,
      };
      setNotifications((prev) => [custNotif, ...prev]);
    }

    showToast(`Order #${targetOrder.orderNumber} status updated to "${newStatus}".`);
  };

  /**
   * Simplified Customer Delivery Confirmation:
   * When the customer receives their order, they click "Confirm Received".
   * This transitions the order from 'delivered' to 'completed' and atomically
   * credits eligible loyalty points to the customer's balance exactly once.
   */
  const confirmOrderReceived = async (orderId: string): Promise<{ success: boolean; message: string }> => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) {
      showToast('Order not found.', 'error');
      return { success: false, message: 'Order not found.' };
    }

    if (!currentUser) {
      showToast('Please sign in to confirm receipt.', 'error');
      return { success: false, message: 'Must be logged in.' };
    }

    const isCustomer = currentUser.id === targetOrder.customerId;
    const isAdmin = currentUser.role === 'admin';

    if (!isCustomer && !isAdmin) {
      showToast('Unauthorized: Only the customer who placed this order can confirm receipt.', 'error');
      return { success: false, message: 'Unauthorized: Only the customer can confirm receipt.' };
    }

    if (targetOrder.pointsCredited || targetOrder.orderStatus === 'completed') {
      showToast('This order has already been confirmed and completed.', 'info');
      return { success: false, message: 'Already completed.' };
    }

    if (targetOrder.orderStatus !== 'delivered' && !isAdmin) {
      showToast('Order must be marked as Delivered by the seller before confirming receipt.', 'error');
      return { success: false, message: 'Order is not delivered yet.' };
    }

    const activeDb = db;
    const timestamp = new Date().toISOString();

    if (isFirebaseConfigured() && activeDb && !isAdminPreviewActive) {
      try {
        const orderRef = doc(activeDb, 'orders', orderId);
        const customerRef = doc(activeDb, 'users', targetOrder.customerId);

        await runTransaction(activeDb, async (transaction) => {
          const ordSnap = await transaction.get(orderRef);
          if (!ordSnap.exists()) {
            throw new Error('Order does not exist on server.');
          }
          const ordData = ordSnap.data() as Order;
          if (ordData.pointsCredited || ordData.orderStatus === 'completed') {
            throw new Error('Order has already been confirmed as completed.');
          }

          const custSnap = await transaction.get(customerRef);
          if (!custSnap.exists()) {
            throw new Error('Customer user profile does not exist.');
          }

          const custData = custSnap.data();
          const curBal = typeof custData.pointsBalance === 'number' ? custData.pointsBalance : 0;
          const curPending = typeof custData.pendingPoints === 'number' ? custData.pendingPoints : 0;
          const ptsToAward = ordData.pointsEarned || targetOrder.pointsEarned;

          // 1. Credit customer points balance with reference
          transaction.update(customerRef, {
            pointsBalance: curBal + ptsToAward,
            points: curBal + ptsToAward,
            pendingPoints: Math.max(0, curPending - ptsToAward),
            lastDeliveryOrderId: orderId,
            updatedAt: timestamp,
          });

          // 2. Create immutable pointTransactions ledger entry
          const earnLedgerRef = doc(collection(activeDb, 'pointTransactions'));
          transaction.set(earnLedgerRef, {
            id: earnLedgerRef.id,
            userId: ordData.customerId,
            type: 'order_earned',
            points: ptsToAward,
            relatedId: orderId,
            description: `Earned on completed order #${ordData.orderNumber}`,
            ruleSnapshot: 'Customer confirmed order receipt',
            status: 'completed',
            createdAt: timestamp,
          });

          // 3. Customer notification
          const earnNotifRef = doc(collection(activeDb, 'notifications'), `notif_order_completed_${orderId}`);
          transaction.set(earnNotifRef, {
            id: `notif_order_completed_${orderId}`,
            userId: ordData.customerId,
            title: `Points Credited! (+${ptsToAward} pts)`,
            message: `You confirmed receipt for order #${ordData.orderNumber}. ${ptsToAward} REFERO Points have been added to your balance!`,
            type: 'points',
            link: 'points',
            read: false,
            createdAt: timestamp,
          });

          // 4. Update order document to 'completed'
          transaction.update(orderRef, {
            orderStatus: 'completed',
            pointsCredited: true,
            completedAt: timestamp,
            confirmedBy: isCustomer ? 'customer' : 'admin',
          });
        });
      } catch (err: any) {
        console.error('Confirm order received error:', err);
        showToast(err.message || 'Failed to confirm receipt.', 'error');
        return { success: false, message: err.message || 'Failed to confirm receipt.' };
      }
    }

    // Update in-memory state
    setOrders((prev) =>
      prev.map((ord) =>
        ord.id === orderId
          ? {
              ...ord,
              orderStatus: 'completed',
              pointsCredited: true,
              completedAt: timestamp,
              confirmedBy: isCustomer ? 'customer' : 'admin',
            }
          : ord
      )
    );

    if (currentUser && currentUser.id === targetOrder.customerId) {
      updateCurrentUserProfile({
        pointsBalance: currentUser.pointsBalance + targetOrder.pointsEarned,
        pendingPoints: Math.max(0, (currentUser.pendingPoints || 0) - targetOrder.pointsEarned),
      });
    }

    const earnTx: PointTransaction = {
      id: `tx_${Date.now()}_earn`,
      userId: targetOrder.customerId,
      type: 'order_earned',
      points: targetOrder.pointsEarned,
      relatedId: targetOrder.id,
      description: `Earned on completed order #${targetOrder.orderNumber}`,
      ruleSnapshot: 'Customer confirmed order receipt',
      status: 'completed',
      createdAt: timestamp,
    };
    setPointTransactions((tPrev) => [earnTx, ...tPrev]);

    const earnNotif: NotificationItem = {
      id: `notif_order_completed_${targetOrder.id}`,
      userId: targetOrder.customerId,
      title: `Points Credited! (+${targetOrder.pointsEarned} pts)`,
      message: `You confirmed receipt for order #${targetOrder.orderNumber}. ${targetOrder.pointsEarned} REFERO Points have been added to your balance!`,
      type: 'points',
      link: 'points',
      read: false,
      createdAt: timestamp,
    };
    setNotifications((prev) => [earnNotif, ...prev]);

    // Check if fulfills first-order referral bonus
    const userReferral = referrals.find(
      (r) => r.referredUserId === targetOrder.customerId && r.status === 'registered'
    );
    if (userReferral) {
      setReferrals((rPrev) =>
        rPrev.map((ref) =>
          ref.id === userReferral.id
            ? {
                ...ref,
                status: 'reward_issued',
                qualifyingOrderId: targetOrder.id,
                rewardedAt: timestamp,
              }
            : ref
        )
      );

      const refBonusTx: PointTransaction = {
        id: `tx_${Date.now()}_refbonus`,
        userId: userReferral.referrerUserId,
        type: 'referral_bonus',
        points: userReferral.rewardPoints,
        relatedId: targetOrder.id,
        description: `Referral Reward: ${targetOrder.customerName}'s first qualifying completed order`,
        ruleSnapshot: `Referral rule: ${userReferral.rewardPoints} pts`,
        status: 'completed',
        createdAt: timestamp,
      };
      setPointTransactions((tPrev) => [refBonusTx, ...tPrev]);

      const refRewardNotif: NotificationItem = {
        id: `notif_ref_reward_${targetOrder.id}`,
        userId: userReferral.referrerUserId,
        title: `Referral Reward Earned! (+${userReferral.rewardPoints} pts)`,
        message: `You earned ${userReferral.rewardPoints} REFERO Points because ${targetOrder.customerName} completed their first qualifying order (#${targetOrder.orderNumber}).`,
        type: 'points',
        link: 'points',
        read: false,
        createdAt: timestamp,
      };
      setNotifications((prev) => [refRewardNotif, ...prev]);
    }

    showToast(`Order confirmed! +${targetOrder.pointsEarned} REFERO Points credited.`, 'success');
    return { success: true, message: 'Order receipt confirmed successfully.' };
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
    if (!currentUser || currentUser.role !== 'admin') {
      showToast('Unauthorized: Administrator privileges required to approve shops.', 'error');
      return;
    }
    const targetShop = shops.find((s) => s.id === shopId);
    const timestamp = new Date().toISOString();
    const adminEmail = currentUser?.email || 'admin@refero.com.bd';

    setShops((prev) =>
      prev.map((s) =>
        s.id === shopId
          ? {
              ...s,
              status: 'approved',
              rejectionReason: undefined,
              suspensionReason: undefined,
              reviewedAt: timestamp,
              reviewedBy: adminEmail,
            }
          : s
      )
    );

    if (targetShop && currentUser?.id === targetShop.ownerId) {
      updateCurrentUserProfile({ role: 'shopkeeper', shopId });
    }

    if (isFirebaseConfigured() && db && targetShop) {
      try {
        const shopRef = doc(db, 'shops', shopId);
        const userRef = doc(db, 'users', targetShop.ownerId);

        await runTransaction(db, async (txn) => {
          txn.update(shopRef, {
            status: 'approved',
            rejectionReason: '',
            suspensionReason: '',
            reviewedAt: timestamp,
            reviewedBy: adminEmail,
          });
          txn.update(userRef, {
            role: 'shopkeeper',
            shopId: shopId,
            updatedAt: timestamp,
          });
        });
      } catch (err) {
        console.warn('runTransaction approveShop error, falling back to sequential updateDoc:', err);
        try {
          await updateDoc(doc(db, 'shops', shopId), {
            status: 'approved',
            rejectionReason: '',
            suspensionReason: '',
            reviewedAt: timestamp,
            reviewedBy: adminEmail,
          });
          await updateDoc(doc(db, 'users', targetShop.ownerId), {
            role: 'shopkeeper',
            shopId: shopId,
            updatedAt: timestamp,
          });
        } catch (fallbackErr) {
          console.warn('Fallback approveShop error:', fallbackErr);
        }
      }
    }

    if (targetShop) {
      // 1. Applicant notification with direct link to Shopkeeper Dashboard
      await addNotification({
        userId: targetShop.ownerId,
        title: 'Shop Approved & Shopkeeper Access Granted!',
        message: `Congratulations! Your store "${targetShop.name}" is now approved and live on REFERO. You now have full access to your Shopkeeper Portal.`,
        type: 'system',
        link: 'shopkeeper_dashboard',
      });

      // 2. Mark the Admin seller application notification as read
      const adminNotifId = `notif_seller_app_${shopId}`;
      setNotifications((prev) =>
        prev.map((n) => (n.id === adminNotifId ? { ...n, read: true } : n))
      );
      if (isFirebaseConfigured() && db) {
        try {
          await updateDoc(doc(db, 'notifications', adminNotifId), { read: true });
        } catch (_) {}
      }
    }

    const log: AuditLog = {
      id: `audit_${Date.now()}`,
      adminId: currentUser?.id || 'admin',
      adminEmail: adminEmail,
      action: 'SHOP_APPLICATION_APPROVED',
      details: `Approved shop application ID ${shopId} (${targetShop?.name || 'Unknown'}). Owner ${targetShop?.ownerId} upgraded to shopkeeper.`,
      timestamp,
    };
    setAuditLogs((prev) => [log, ...prev]);
    showToast('Shop approved and published to marketplace. Owner promoted to Shopkeeper.');
  };

  const rejectShop = async (shopId: string, reason: string) => {
    if (!currentUser || currentUser.role !== 'admin') {
      showToast('Unauthorized: Administrator privileges required to reject shops.', 'error');
      return;
    }
    if (!reason || reason.trim().length === 0) {
      showToast('A mandatory rejection reason is required.', 'error');
      return;
    }
    const trimmedReason = reason.trim();
    const targetShop = shops.find((s) => s.id === shopId);
    const timestamp = new Date().toISOString();
    const adminEmail = currentUser?.email || 'admin@refero.com.bd';

    setShops((prev) =>
      prev.map((s) =>
        s.id === shopId
          ? {
              ...s,
              status: 'rejected',
              rejectionReason: trimmedReason,
              reviewedAt: timestamp,
              reviewedBy: adminEmail,
            }
          : s
      )
    );

    if (isFirebaseConfigured() && db && targetShop) {
      try {
        const shopRef = doc(db, 'shops', shopId);
        const userRef = doc(db, 'users', targetShop.ownerId);
        await runTransaction(db, async (txn) => {
          txn.update(shopRef, {
            status: 'rejected',
            rejectionReason: trimmedReason,
            reviewedAt: timestamp,
            reviewedBy: adminEmail,
          });
          txn.update(userRef, {
            role: 'customer',
            updatedAt: timestamp,
          });
        });
      } catch (err) {
        console.warn('Firestore rejectShop error:', err);
        try {
          await updateDoc(doc(db, 'shops', shopId), {
            status: 'rejected',
            rejectionReason: trimmedReason,
            reviewedAt: timestamp,
            reviewedBy: adminEmail,
          });
        } catch (subErr) {
          console.warn('Fallback rejectShop error:', subErr);
        }
      }
    }

    if (targetShop) {
      await addNotification({
        userId: targetShop.ownerId,
        title: 'Shop Application Status Update',
        message: `Your store application for "${targetShop.name}" was not approved at this time. Reason: ${trimmedReason}. You may review requirements and reapply.`,
        type: 'system',
        link: 'apply_seller',
      });

      // Mark the Admin seller application notification as read
      const adminNotifId = `notif_seller_app_${shopId}`;
      setNotifications((prev) =>
        prev.map((n) => (n.id === adminNotifId ? { ...n, read: true } : n))
      );
      if (isFirebaseConfigured() && db) {
        try {
          await updateDoc(doc(db, 'notifications', adminNotifId), { read: true });
        } catch (_) {}
      }
    }

    const log: AuditLog = {
      id: `audit_${Date.now()}`,
      adminId: currentUser?.id || 'admin',
      adminEmail: adminEmail,
      action: 'SHOP_APPLICATION_REJECTED',
      details: `Rejected shop ID ${shopId}. Mandatory Reason: ${trimmedReason}`,
      timestamp,
    };
    setAuditLogs((prev) => [log, ...prev]);
    showToast('Shop application rejected with mandatory reason recorded.', 'info');
  };

  const suspendShop = async (shopId: string, reason: string) => {
    if (!currentUser || currentUser.role !== 'admin') {
      showToast('Unauthorized: Administrator privileges required to suspend shops.', 'error');
      return;
    }
    if (!reason || reason.trim().length === 0) {
      showToast('A mandatory suspension reason is required.', 'error');
      return;
    }
    const trimmedReason = reason.trim();
    const targetShop = shops.find((s) => s.id === shopId);
    const timestamp = new Date().toISOString();
    const adminEmail = currentUser?.email || 'admin@refero.com.bd';

    setShops((prev) =>
      prev.map((s) =>
        s.id === shopId
          ? {
              ...s,
              status: 'suspended',
              suspensionReason: trimmedReason,
              reviewedAt: timestamp,
              reviewedBy: adminEmail,
            }
          : s
      )
    );
    if (isFirebaseConfigured() && db) {
      try {
        await updateDoc(doc(db, 'shops', shopId), {
          status: 'suspended',
          suspensionReason: trimmedReason,
          reviewedAt: timestamp,
          reviewedBy: adminEmail,
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
      adminEmail: adminEmail,
      action: 'SHOP_SUSPENDED',
      details: `Suspended shop ID ${shopId}. Mandatory Reason: ${trimmedReason}`,
      timestamp,
    };
    setAuditLogs((prev) => [log, ...prev]);
    showToast('Shop suspended with mandatory reason recorded.', 'info');
  };

  const reinstateShop = async (shopId: string) => {
    if (!currentUser || currentUser.role !== 'admin') {
      showToast('Unauthorized: Administrator privileges required to reinstate shops.', 'error');
      return;
    }
    const targetShop = shops.find((s) => s.id === shopId);
    const timestamp = new Date().toISOString();
    const adminEmail = currentUser?.email || 'admin@refero.com.bd';

    setShops((prev) =>
      prev.map((s) =>
        s.id === shopId
          ? {
              ...s,
              status: 'approved',
              suspensionReason: undefined,
              rejectionReason: undefined,
              reviewedAt: timestamp,
              reviewedBy: adminEmail,
            }
          : s
      )
    );

    if (targetShop && currentUser?.id === targetShop.ownerId) {
      updateCurrentUserProfile({ role: 'shopkeeper', shopId });
    }

    if (isFirebaseConfigured() && db && targetShop) {
      try {
        const shopRef = doc(db, 'shops', shopId);
        const userRef = doc(db, 'users', targetShop.ownerId);
        await runTransaction(db, async (txn) => {
          txn.update(shopRef, {
            status: 'approved',
            suspensionReason: '',
            rejectionReason: '',
            reviewedAt: timestamp,
            reviewedBy: adminEmail,
          });
          txn.update(userRef, {
            role: 'shopkeeper',
            shopId: shopId,
            updatedAt: timestamp,
          });
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
        link: 'shopkeeper_dashboard',
      });
    }
    const log: AuditLog = {
      id: `audit_${Date.now()}`,
      adminId: currentUser?.id || 'admin',
      adminEmail: adminEmail,
      action: 'SHOP_REINSTATED',
      details: `Reinstated shop ID ${shopId} (${targetShop?.name || 'Unknown'})`,
      timestamp,
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

  // Process Refund with strict points reversal and restoration
  const processRefund = async (orderId: string, reason: string): Promise<{ success: boolean; message: string }> => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return { success: false, message: 'Order not found' };

    // Authorization: Only Admin or Seller responsible for the order
    const isAdminUser = currentUser?.role === 'admin';
    const isOrderSeller = currentUser?.role === 'shopkeeper' && currentUser.shopId && (
      (order as any).shopId === currentUser.shopId ||
      order.items.some((it) => it.shopId === currentUser.shopId)
    );

    if (!isAdminUser && !isOrderSeller) {
      return { success: false, message: 'Unauthorized: Only Admin or Seller can process refunds.' };
    }

    if (order.orderStatus === 'refunded' || order.paymentStatus === 'refunded') {
      return { success: false, message: 'This order has already been refunded.' };
    }

    const activeDb = db;
    const timestamp = new Date().toISOString();

    if (isFirebaseConfigured() && activeDb && !isAdminPreviewActive) {
      try {
        const orderRef = doc(activeDb, 'orders', orderId);
        const customerRef = doc(activeDb, 'users', order.customerId);

        await runTransaction(activeDb, async (transaction) => {
          const ordSnap = await transaction.get(orderRef);
          if (!ordSnap.exists()) throw new Error('Order not found on server.');
          const ordData = ordSnap.data() as Order;

          if (ordData.orderStatus === 'refunded') {
            throw new Error('Order is already marked refunded.');
          }

          const custSnap = await transaction.get(customerRef);
          if (custSnap.exists()) {
            const custData = custSnap.data();
            let newBalance = typeof custData.pointsBalance === 'number' ? custData.pointsBalance : 0;

            // 1. If points were credited upon delivery, reverse exact earned amount
            if (ordData.pointsCredited && ordData.pointsEarned > 0) {
              if (newBalance < ordData.pointsEarned) {
                throw new Error(
                  `Refund point reversal rejected: customer available balance (${newBalance} pts) is lower than the loyalty points earned on this order (${ordData.pointsEarned} pts). Points must be accounted for without silent adjustments.`
                );
              }
              newBalance = newBalance - ordData.pointsEarned;

              const revLedgerRef = doc(collection(activeDb, 'pointTransactions'));
              transaction.set(revLedgerRef, {
                id: revLedgerRef.id,
                userId: ordData.customerId,
                type: 'refund_reversal',
                points: -ordData.pointsEarned,
                relatedId: orderId,
                description: `Point reversal for refunded order #${ordData.orderNumber} (${reason})`,
                ruleSnapshot: 'Order refund reversal',
                status: 'completed',
                createdAt: timestamp,
              });
            }

            // 2. If customer used points to pay/discount during checkout, restore them
            if (ordData.pointsUsed && ordData.pointsUsed > 0) {
              newBalance = newBalance + ordData.pointsUsed;

              const restoreLedgerRef = doc(collection(activeDb, 'pointTransactions'));
              transaction.set(restoreLedgerRef, {
                id: restoreLedgerRef.id,
                userId: ordData.customerId,
                type: 'admin_adjustment',
                points: ordData.pointsUsed,
                relatedId: orderId,
                description: `Restored ${ordData.pointsUsed} points spent on cancelled/refunded order #${ordData.orderNumber}`,
                ruleSnapshot: 'Cancellation point restore rule',
                status: 'completed',
                createdAt: timestamp,
              });
            }

            // Update customer balance with lastRefundOrderId reference for rules
            transaction.update(customerRef, {
              pointsBalance: newBalance,
              points: newBalance,
              lastRefundOrderId: orderId,
              updatedAt: timestamp,
            });
          }

          // 3. Update order document
          transaction.update(orderRef, {
            orderStatus: 'refunded',
            paymentStatus: 'refunded',
            refundReason: reason,
            refundedAt: timestamp,
            refundedBy: currentUser?.email || 'Admin',
          });

          // 4. Audit log
          const auditRef = doc(collection(activeDb, 'auditLogs'));
          transaction.set(auditRef, {
            id: auditRef.id,
            adminId: currentUser?.id || 'admin',
            adminEmail: currentUser?.email || 'admin@refero.com.bd',
            action: 'ORDER_REFUND_PROCESSED',
            details: `Processed refund for order #${order.orderNumber}. Reversal: ${order.pointsEarned} pts, Restored: ${order.pointsUsed} pts. Reason: ${reason}`,
            timestamp,
          });

          // 5. Notify Customer
          const notifRef = doc(collection(activeDb, 'notifications'), `notif_refund_${orderId}`);
          transaction.set(notifRef, {
            id: `notif_refund_${orderId}`,
            userId: order.customerId,
            title: 'Order Refunded',
            message: `Your order #${order.orderNumber} has been refunded. Points balance updated.`,
            type: 'order',
            link: 'orders',
            read: false,
            createdAt: timestamp,
          });
        });
      } catch (err: any) {
        console.error('Process refund transaction error:', err);
        return { success: false, message: err.message || 'Failed to process refund.' };
      }
    }

    // In-memory updates
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
        ruleSnapshot: 'Refund point reversal rule',
        status: 'completed',
        createdAt: timestamp,
      };
      setPointTransactions((prev) => [reversalTx, ...prev]);
    }

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
        ruleSnapshot: 'Cancellation point restore rule',
        status: 'completed',
        createdAt: timestamp,
      };
      setPointTransactions((prev) => [restoreTx, ...prev]);
    }

    const log: AuditLog = {
      id: `audit_${Date.now()}`,
      adminId: currentUser?.id || 'admin',
      adminEmail: currentUser?.email || 'admin@refero.com.bd',
      action: 'ORDER_REFUND_PROCESSED',
      details: `Processed refund for order #${order.orderNumber}. Reversal: ${order.pointsEarned} pts, Restored: ${order.pointsUsed} pts. Reason: ${reason}`,
      timestamp,
    };
    setAuditLogs((prev) => [log, ...prev]);

    showToast(`Refund processed for order #${order.orderNumber}. Points ledger adjusted.`);
    return { success: true, message: 'Refund complete and points reversed.' };
  };

  const updateUserRoleAction = async (userId: string, newRole: UserRole) => {
    if (currentUser && currentUser.id === userId) {
      updateCurrentUserProfile({ role: newRole });
    }
    if (isFirebaseConfigured() && db) {
      try {
        await updateDoc(doc(db, 'users', userId), {
          role: newRole,
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Firestore updateUserRoleAction error:', err);
      }
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

  // ---------------------------------------------------------------------------
  // Customer Product Reviews & Ratings (Verified Purchases only)
  // ---------------------------------------------------------------------------
  const checkReviewEligibility = (productId: string): { isEligible: boolean; qualifyingOrderId?: string; reason?: string } => {
    if (!currentUser) {
      return { isEligible: false, reason: 'Please sign in to write a product review.' };
    }

    // Find a genuinely completed or delivered order containing this product
    const deliveredOrder = orders.find(
      (o) =>
        o.customerId === currentUser.id &&
        (o.orderStatus === 'completed' || o.orderStatus === 'delivered') &&
        o.items.some((it) => it.productId === productId)
    );

    if (!deliveredOrder) {
      const pendingOrder = orders.find(
        (o) =>
          o.customerId === currentUser.id &&
          o.orderStatus !== 'cancelled' &&
          o.orderStatus !== 'refunded' &&
          o.items.some((it) => it.productId === productId)
      );

      if (pendingOrder) {
        return {
          isEligible: false,
          reason: `You can review this product after your order #${pendingOrder.orderNumber} is delivered.`,
        };
      }

      return {
        isEligible: false,
        reason: 'You can review this product after purchasing and receiving delivery.',
      };
    }

    // Check if user has already reviewed this product for this order
    const alreadyReviewed = reviews.some(
      (r) =>
        r.productId === productId &&
        r.customerId === currentUser.id &&
        r.orderId === deliveredOrder.id
    );

    if (alreadyReviewed) {
      return {
        isEligible: false,
        qualifyingOrderId: deliveredOrder.id,
        reason: 'You have already submitted a review for this delivered order.',
      };
    }

    return {
      isEligible: true,
      qualifyingOrderId: deliveredOrder.id,
    };
  };

  const submitProductReview = async (reviewData: {
    productId: string;
    rating: number;
    comment: string;
    images?: string[];
  }): Promise<{ success: boolean; message: string }> => {
    if (!currentUser) {
      return { success: false, message: 'You must be signed in to submit a review.' };
    }

    if (reviewData.rating < 1 || reviewData.rating > 5) {
      return { success: false, message: 'Please select a star rating between 1 and 5.' };
    }

    if (!reviewData.comment || reviewData.comment.trim().length < 5) {
      return { success: false, message: 'Please write a meaningful review (at least 5 characters).' };
    }

    const eligibility = checkReviewEligibility(reviewData.productId);
    if (!eligibility.isEligible || !eligibility.qualifyingOrderId) {
      return { success: false, message: eligibility.reason || 'You are not eligible to review this product.' };
    }

    const targetProduct = products.find((p) => p.id === reviewData.productId);
    if (!targetProduct) {
      return { success: false, message: 'Product not found.' };
    }

    // Deterministic review ID enforced by Firestore rules to strictly prevent duplicate reviews
    const reviewId = `review_${eligibility.qualifyingOrderId}_${reviewData.productId}`;
    const nowIso = new Date().toISOString();

    const initialStatus: ProductReview['status'] = currentUser.role === 'admin' ? 'published' : 'pending';

    const newReview: ProductReview = {
      id: reviewId,
      productId: reviewData.productId,
      productTitle: targetProduct.title,
      shopId: targetProduct.shopId,
      orderId: eligibility.qualifyingOrderId,
      customerId: currentUser.id,
      customerName: currentUser.fullName,
      customerEmail: currentUser.email,
      rating: reviewData.rating,
      comment: reviewData.comment.trim(),
      images: reviewData.images || [],
      status: initialStatus,
      createdAt: nowIso,
    };

    const activeDb = db;
    if (isFirebaseConfigured() && activeDb && !isAdminPreviewActive) {
      try {
        await setDoc(doc(activeDb, 'reviews', reviewId), cleanUndefinedFields(newReview));
        if (initialStatus === 'published') {
          const allExistingReviews = reviews.filter((r) => r.productId === reviewData.productId && r.status === 'published');
          const updatedReviewsList = [...allExistingReviews, newReview];
          const newRating = Number((updatedReviewsList.reduce((sum, r) => sum + r.rating, 0) / updatedReviewsList.length).toFixed(1));
          const newCount = updatedReviewsList.length;

          await updateDoc(doc(activeDb, 'products', reviewData.productId), {
            rating: newRating,
            reviewCount: newCount,
            updatedAt: nowIso,
          }).catch(() => {});
        }
      } catch (err: any) {
        console.error('Firestore submit review error:', err);
        return { success: false, message: err.message || 'Failed to save review to server.' };
      }
    }

    setReviews((prev) => [newReview, ...prev]);

    if (initialStatus === 'published') {
      const allExistingReviews = reviews.filter((r) => r.productId === reviewData.productId && r.status === 'published');
      const updatedReviewsList = [...allExistingReviews, newReview];
      const newRating = Number((updatedReviewsList.reduce((sum, r) => sum + r.rating, 0) / updatedReviewsList.length).toFixed(1));
      const newCount = updatedReviewsList.length;
      setProducts((prev) =>
        prev.map((p) => (p.id === reviewData.productId ? { ...p, rating: newRating, reviewCount: newCount } : p))
      );

      addNotification({
        userId: currentUser.id,
        title: 'Review Published',
        message: `Your verified purchase review for "${targetProduct.title}" was published!`,
        type: 'system',
      });

      showToast('Thank you! Your verified purchase review has been published.', 'success');
      return { success: true, message: 'Review published successfully.' };
    } else {
      addNotification({
        userId: currentUser.id,
        title: 'Review Submitted',
        message: `Your verified purchase review for "${targetProduct.title}" has been submitted for moderation.`,
        type: 'system',
      });

      showToast('Thank you! Your review has been submitted for moderation.', 'info');
      return { success: true, message: 'Review submitted for moderation.' };
    }
  };

  const updateProductReview = async (
    reviewId: string,
    updates: { rating: number; comment: string; images?: string[] }
  ): Promise<{ success: boolean; message: string }> => {
    const existing = reviews.find((r) => r.id === reviewId);
    if (!existing) return { success: false, message: 'Review not found.' };

    if (!currentUser || (currentUser.id !== existing.customerId && currentUser.role !== 'admin')) {
      return { success: false, message: 'Unauthorized to edit this review.' };
    }

    const nowIso = new Date().toISOString();
    const updatedReview: ProductReview = {
      ...existing,
      rating: updates.rating,
      comment: updates.comment.trim(),
      ...(updates.images ? { images: updates.images } : {}),
      updatedAt: nowIso,
    };

    const activeDb = db;
    if (isFirebaseConfigured() && activeDb && !isAdminPreviewActive) {
      try {
        await updateDoc(doc(activeDb, 'reviews', reviewId), {
          rating: updates.rating,
          comment: updates.comment.trim(),
          ...(updates.images ? { images: updates.images } : {}),
          updatedAt: nowIso,
        });
      } catch (err: any) {
        return { success: false, message: err.message || 'Failed to update review.' };
      }
    }

    setReviews((prev) => prev.map((r) => (r.id === reviewId ? updatedReview : r)));

    const prodReviews = reviews
      .map((r) => (r.id === reviewId ? updatedReview : r))
      .filter((r) => r.productId === existing.productId && r.status === 'published');
    const newRating = prodReviews.length > 0
      ? Number((prodReviews.reduce((sum, r) => sum + r.rating, 0) / prodReviews.length).toFixed(1))
      : 5.0;

    setProducts((prev) =>
      prev.map((p) => (p.id === existing.productId ? { ...p, rating: newRating } : p))
    );

    showToast('Your review has been updated.', 'success');
    return { success: true, message: 'Review updated.' };
  };

  const deleteProductReview = async (reviewId: string): Promise<{ success: boolean; message: string }> => {
    const existing = reviews.find((r) => r.id === reviewId);
    if (!existing) return { success: false, message: 'Review not found.' };

    if (!currentUser || (currentUser.id !== existing.customerId && currentUser.role !== 'admin')) {
      return { success: false, message: 'Unauthorized to delete this review.' };
    }

    const activeDb = db;
    if (isFirebaseConfigured() && activeDb && !isAdminPreviewActive) {
      try {
        await deleteDoc(doc(activeDb, 'reviews', reviewId));
      } catch (err: any) {
        return { success: false, message: err.message || 'Failed to delete review.' };
      }
    }

    setReviews((prev) => prev.filter((r) => r.id !== reviewId));

    const remaining = reviews
      .filter((r) => r.id !== reviewId)
      .filter((r) => r.productId === existing.productId && r.status === 'published');
    const newRating = remaining.length > 0
      ? Number((remaining.reduce((sum, r) => sum + r.rating, 0) / remaining.length).toFixed(1))
      : 5.0;
    const newCount = remaining.length;

    setProducts((prev) =>
      prev.map((p) => (p.id === existing.productId ? { ...p, rating: newRating, reviewCount: newCount } : p))
    );

    showToast('Review removed.', 'info');
    return { success: true, message: 'Review removed.' };
  };

  const moderateProductReview = async (
    reviewId: string,
    action: 'published' | 'hidden' | 'flagged',
    reason?: string
  ): Promise<{ success: boolean; message: string }> => {
    if (!currentUser || currentUser.role !== 'admin') {
      return { success: false, message: 'Administrator authorization required.' };
    }

    const existing = reviews.find((r) => r.id === reviewId);
    if (!existing) return { success: false, message: 'Review not found.' };

    const activeDb = db;
    const nowIso = new Date().toISOString();

    if (isFirebaseConfigured() && activeDb && !isAdminPreviewActive) {
      try {
        await updateDoc(doc(activeDb, 'reviews', reviewId), {
          status: action,
          moderationReason: reason || '',
          updatedAt: nowIso,
        });
      } catch (err: any) {
        return { success: false, message: err.message || 'Failed to moderate review.' };
      }
    }

    setReviews((prev) =>
      prev.map((r) => (r.id === reviewId ? { ...r, status: action, moderationReason: reason, updatedAt: nowIso } : r))
    );

    const log: AuditLog = {
      id: `audit_${Date.now()}`,
      adminId: currentUser.id,
      adminEmail: currentUser.email,
      action: `REVIEW_${action.toUpperCase()}`,
      details: `Admin ${currentUser.email} set review ${reviewId} (Product: ${existing.productTitle}) status to ${action}.${reason ? ` Reason: ${reason}` : ''}`,
      timestamp: nowIso,
    };
    setAuditLogs((prev) => [log, ...prev]);

    showToast(`Review status updated to "${action}".`);
    return { success: true, message: 'Review moderated.' };
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
        reviews,
        filters,
        customerTab,
        setCustomerTab,
        adminTab,
        setAdminTab,
        previousView,
        navigateTo,
        goBack,
        closeProductModal,
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
        confirmOrderReceived,
        submitPointTransfer,
        requestPointsFromFriend,
        approvePointTransfer,
        rejectPointTransfer,
        addProduct,
        updateProduct,
        deleteProduct,
        seedShopProducts,
        updateOrderItemStatus,
        updateOrderStatus: updateOrderItemStatus,
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
        checkReviewEligibility,
        submitProductReview,
        updateProductReview,
        deleteProductReview,
        moderateProductReview,
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
