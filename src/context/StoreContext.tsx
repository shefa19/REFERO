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
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
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

  // Navigation actions
  navigateTo: (view: AppView, params?: { productId?: string; shopId?: string; orderId?: string }) => void;
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
  const { currentUser, updateCurrentUserProfile } = useAuth();

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
  const [orders, setOrders] = useState<Order[]>(DEMO_ORDERS);
  const [cart, setCart] = useState<CartItem[]>([
    { product: DEMO_PRODUCTS[0], quantity: 1 }, // Seed with 1 item for immediate cart discovery
  ]);
  const [wishlist, setWishlist] = useState<string[]>([DEMO_PRODUCTS[1].id]);
  const [pointTransactions, setPointTransactions] = useState<PointTransaction[]>(DEMO_POINT_TRANSACTIONS);
  const [transferRequests, setTransferRequests] = useState<PointTransferRequest[]>(DEMO_TRANSFER_REQUESTS);
  const [referrals, setReferrals] = useState<ReferralRecord[]>(DEMO_REFERRALS);
  const [pointsConfig, setPointsConfig] = useState<PointsConfig>(INITIAL_POINTS_CONFIG);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(DEMO_AUDIT_LOGS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(DEMO_NOTIFICATIONS);
  const [filters, setFilters] = useState<ProductFilterState>(defaultFilterState);
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

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3800);
  };

  const navigateTo = (
    view: AppView,
    params?: { productId?: string; shopId?: string; orderId?: string }
  ) => {
    setCurrentView(view);
    if (params?.productId) setSelectedProductId(params.productId);
    if (params?.shopId) setSelectedShopId(params.shopId);
    if (params?.orderId) setSelectedOrderId(params.orderId);
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

  const addNotification = (notif: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>) => {
    const newNotif: NotificationItem = {
      ...notif,
      id: `notif_${Date.now()}`,
      read: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const markNotificationAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
  };

  // Cart Actions
  const addToCart = (product: Product, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        const newQty = Math.min(product.stock, existing.quantity + quantity);
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: newQty } : item
        );
      }
      return [...prev, { product, quantity: Math.min(product.stock, quantity) }];
    });
    showToast(`Added ${product.title} to your cart`);
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
    showToast('Item removed from cart', 'info');
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? { ...item, quantity: Math.min(item.product.stock, quantity) }
          : item
      )
    );
  };

  const clearCart = () => setCart([]);

  // Wishlist Actions
  const toggleWishlist = (productId: string) => {
    setWishlist((prev) => {
      if (prev.includes(productId)) {
        showToast('Removed from your wishlist', 'info');
        return prev.filter((id) => id !== productId);
      } else {
        showToast('Saved to your wishlist', 'success');
        return [...prev, productId];
      }
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
    if (isFirebaseConfigured() && db) {
      try {
        await setDoc(doc(db, 'orders', newOrder.id), cleanUndefinedFields(newOrder));
      } catch (err) {
        console.warn('Firestore createOrder persistence note:', err);
      }
    }
    clearCart();
    setSelectedOrderId(newOrder.id);
    showToast(`Order #${newOrder.orderNumber} placed successfully!`);
    return newOrder;
  };

  // Point Transfers
  const submitPointTransfer = async (
    recipientEmail: string,
    points: number,
    note?: string
  ): Promise<{ success: boolean; message: string }> => {
    if (!currentUser) return { success: false, message: 'Must be logged in to transfer points.' };
    if (points <= 0) return { success: false, message: 'Points must be greater than zero.' };
    if (currentUser.pointsBalance < points) {
      return { success: false, message: 'Insufficient REFERO Points balance.' };
    }
    if (recipientEmail.toLowerCase() === currentUser.email.toLowerCase()) {
      return { success: false, message: 'Self-transfers are not permitted.' };
    }

    const newRequest: PointTransferRequest = {
      id: `req_transfer_${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.fullName,
      senderEmail: currentUser.email,
      recipientId: `user_recip_${Date.now()}`,
      recipientEmail,
      recipientName: recipientEmail.split('@')[0],
      points,
      note,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    setTransferRequests((prev) => [newRequest, ...prev]);
    showToast(`Transfer request for ${points} points sent to ${recipientEmail}`);
    return { success: true, message: 'Transfer request recorded as pending.' };
  };

  const approvePointTransfer = async (requestId: string): Promise<{ success: boolean; message: string }> => {
    const request = transferRequests.find((r) => r.id === requestId);
    if (!request) return { success: false, message: 'Request not found' };
    if (request.status !== 'pending') return { success: false, message: `Request is already ${request.status}` };

    // Atomically execute transfer: credit recipient, debit sender (or current user if simulated)
    const pointsAmount = request.points;

    // Credit current user (recipient)
    if (currentUser) {
      updateCurrentUserProfile({
        pointsBalance: currentUser.pointsBalance + pointsAmount,
      });
    }

    // Ledger for recipient
    const recipientLedger: PointTransaction = {
      id: `tx_${Date.now()}_recv`,
      userId: request.recipientId,
      type: 'transfer_received',
      points: pointsAmount,
      relatedId: requestId,
      description: `Received point transfer from ${request.senderName} (${request.senderEmail})`,
      ruleSnapshot: 'P2P Transfer Approval',
      status: 'completed',
      createdAt: new Date().toISOString(),
    };

    // Ledger for sender
    const senderLedger: PointTransaction = {
      id: `tx_${Date.now()}_send`,
      userId: request.senderId,
      type: 'transfer_sent',
      points: -pointsAmount,
      relatedId: requestId,
      description: `Transferred points to ${request.recipientName} (${request.recipientEmail})`,
      ruleSnapshot: 'P2P Transfer Approval',
      status: 'completed',
      createdAt: new Date().toISOString(),
    };

    setPointTransactions((prev) => [recipientLedger, senderLedger, ...prev]);

    setTransferRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? { ...r, status: 'approved', processedAt: new Date().toISOString() }
          : r
      )
    );

    showToast(`Approved transfer of ${pointsAmount} REFERO Points!`);
    return { success: true, message: 'Transfer approved and points credited.' };
  };

  const rejectPointTransfer = async (requestId: string): Promise<{ success: boolean; message: string }> => {
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
    if (isFirebaseConfigured() && db) {
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
    if (isFirebaseConfigured() && db) {
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
    if (isFirebaseConfigured() && db) {
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
          }
        }

        return updated;
      })
    );
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
        isSellerModalOpen,
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
        navigateTo,
        openCartDrawer,
        closeCartDrawer,
        openAuthModal,
        closeAuthModal,
        openFirebaseModal,
        closeFirebaseModal,
        openSellerModal,
        closeSellerModal,
        showToast,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        toggleWishlist,
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
