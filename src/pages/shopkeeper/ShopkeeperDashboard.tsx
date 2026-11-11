import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { formatBDT, formatPoints, formatDate } from '../../utils/formatters';
import { Product, Shop, Order, OrderItem } from '../../types';
import {
  Store,
  Package,
  Plus,
  Edit2,
  Trash2,
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  Sparkles,
  TrendingUp,
  ExternalLink,
  RotateCcw,
  AlertCircle,
  Save,
  ShieldCheck,
  Eye,
  Info,
  Upload,
  Image as ImageIcon,
  Link as LinkIcon,
  Check,
  ShoppingBag,
} from 'lucide-react';
import { db, isFirebaseConfigured, storage } from '../../services/firebase/config';
import { doc, updateDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { IMAGE_ASSETS, resolveProductImage } from '../../utils/imageAssets';

export const ShopkeeperDashboard: React.FC = () => {
  const { currentUser, updateCurrentUserProfile } = useAuth();
  const {
    shops,
    products,
    orders,
    navigateTo,
    addProduct,
    updateProduct,
    deleteProduct,
    seedShopProducts,
    updateOrderItemStatus,
    updateShopPolicies,
    showToast,
    openAuthModal,
    openSellerModal,
  } = useStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders' | 'settings'>('overview');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [isSeedingCatalog, setIsSeedingCatalog] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const handleStatusChange = async (orderId: string, newStatus: Order['orderStatus']) => {
    setUpdatingOrderId(orderId);
    try {
      setRealtimeOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, orderStatus: newStatus } : o))
      );
      await updateOrderItemStatus(orderId, newStatus);
    } catch (err) {
      console.error('Failed to update order status:', err);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Active shopkeeper's shop
  const fallbackShop: Shop = {
    id: 'shop_demo_01',
    name: 'Bengal Pure Agro & Grocery',
    slug: 'bengal-pure-agro',
    category: 'Groceries & Organics',
    status: 'approved' as const,
    ownerId: currentUser?.id || 'usr_seller_01',
    ownerName: currentUser?.fullName || 'Kabir Ahmed',
    ownerEmail: currentUser?.email || 'kabir@bengalpure.com.bd',
    contactPerson: currentUser?.fullName || 'Kabir Ahmed',
    businessEmail: currentUser?.email || 'kabir@bengalpure.com.bd',
    address: 'Plot 42, Block C, Uttara Sector 11, Dhaka',
    phone: '+880 1711 000000',
    description: 'Specializing in authentic mustard oils, pure honeys, tea, and aromatic rice directly from Bogura and Sylhet.',
    logo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=200&q=80',
    banner: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
    rating: 4.9,
    reviewCount: 328,
    totalSales: 142000,
    commissionRate: 8,
    deliveryPolicy: 'Same-day delivery inside Dhaka North.',
    returnPolicy: '7-day unconditional replacement for damaged seals.',
    cancellationPolicy: 'Orders may be cancelled prior to dispatch without fee.',
    customerSupportPhone: '+880 1711 000000',
    customerSupportEmail: 'kabir@bengalpure.com.bd',
    customerSupportHours: 'Sunday - Thursday: 9:00 AM - 8:00 PM',
    tradeLicenseNumber: 'TRAD/DNCC/082194/2023',
    taxIdNumber: 'TIN-4829103948',
    emailNotificationEnabled: true,
    orderSmsNotificationEnabled: true,
    createdAt: '2025-01-15T00:00:00Z',
  };
  // Identify current user's actual registered or applied shop
  const userShop = currentUser
    ? shops.find((s) => s.ownerId === currentUser.id || (currentUser.shopId && s.id === currentUser.shopId))
    : null;

  // For Admin evaluating the portal or approved sellers, provide safe shop access
  const myShop = userShop || (currentUser?.role === 'admin' ? (shops[0] || fallbackShop) : fallbackShop);
  const isApprovedSeller = currentUser?.role === 'shopkeeper' || userShop?.status === 'approved';
  const myProducts = products.filter((p) => p.shopId === myShop.id);

  // Authoritative role synchronization: If user's shop is approved, immediately promote role to shopkeeper
  useEffect(() => {
    if (userShop?.status === 'approved' && currentUser && currentUser.role !== 'shopkeeper' && currentUser.role !== 'admin') {
      updateCurrentUserProfile({ role: 'shopkeeper', shopId: userShop.id });
      if (isFirebaseConfigured() && db) {
        updateDoc(doc(db, 'users', currentUser.id), {
          role: 'shopkeeper',
          shopId: userShop.id,
          updatedAt: new Date().toISOString(),
        }).catch(() => {});
      }
    }
  }, [userShop?.status, currentUser?.id, currentUser?.role]);

  // Sync settings form when active store loads or switches
  useEffect(() => {
    if (myShop) {
      setSettingsForm({
        phone: myShop.phone || '',
        businessEmail: myShop.businessEmail || myShop.ownerEmail || '',
        contactPerson: myShop.contactPerson || myShop.ownerName || '',
        address: myShop.address || '',
        category: myShop.category || 'Groceries & Organics',
        logo: myShop.logo || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=200&q=80',
        banner: myShop.banner || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
        description: myShop.description || '',
        deliveryPolicy: myShop.deliveryPolicy || '',
        returnPolicy: myShop.returnPolicy || '',
        cancellationPolicy: myShop.cancellationPolicy || 'Orders may be cancelled prior to dispatch without fee. Once marked shipped, standard return rules apply.',
        customerSupportPhone: myShop.customerSupportPhone || myShop.phone || '',
        customerSupportEmail: myShop.customerSupportEmail || myShop.ownerEmail || '',
        customerSupportHours: myShop.customerSupportHours || 'Sunday - Thursday: 9:00 AM - 8:00 PM',
        tradeLicenseNumber: myShop.tradeLicenseNumber || '',
        taxIdNumber: myShop.taxIdNumber || '',
        emailNotificationEnabled: myShop.emailNotificationEnabled ?? true,
        orderSmsNotificationEnabled: myShop.orderSmsNotificationEnabled ?? true,
      });
    }
  }, [myShop?.id, myShop?.name]);

  // Policy & Profile Settings State
  const [settingsForm, setSettingsForm] = useState({
    phone: myShop.phone || '',
    businessEmail: myShop.businessEmail || myShop.ownerEmail || '',
    contactPerson: myShop.contactPerson || myShop.ownerName || '',
    address: myShop.address || '',
    category: myShop.category || 'Groceries & Organics',
    logo: myShop.logo || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=200&q=80',
    banner: myShop.banner || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
    description: myShop.description || '',
    deliveryPolicy: myShop.deliveryPolicy || '',
    returnPolicy: myShop.returnPolicy || '',
    cancellationPolicy: myShop.cancellationPolicy || 'Orders may be cancelled prior to dispatch without fee. Once marked shipped, standard return rules apply.',
    customerSupportPhone: myShop.customerSupportPhone || myShop.phone || '',
    customerSupportEmail: myShop.customerSupportEmail || myShop.ownerEmail || '',
    customerSupportHours: myShop.customerSupportHours || 'Sunday - Thursday: 9:00 AM - 8:00 PM',
    tradeLicenseNumber: myShop.tradeLicenseNumber || '',
    taxIdNumber: myShop.taxIdNumber || '',
    emailNotificationEnabled: myShop.emailNotificationEnabled ?? true,
    orderSmsNotificationEnabled: myShop.orderSmsNotificationEnabled ?? true,
  });

  const [isSavingPolicies, setIsSavingPolicies] = useState(false);
  const [policiesSavedSuccess, setPoliciesSavedSuccess] = useState(false);
  const [policiesError, setPoliciesError] = useState<string | null>(null);

  const handleResetSettings = () => {
    setSettingsForm({
      phone: myShop.phone || '',
      businessEmail: myShop.businessEmail || myShop.ownerEmail || '',
      contactPerson: myShop.contactPerson || myShop.ownerName || '',
      address: myShop.address || '',
      category: myShop.category || 'Groceries & Organics',
      logo: myShop.logo || '',
      banner: myShop.banner || '',
      description: myShop.description || '',
      deliveryPolicy: myShop.deliveryPolicy || '',
      returnPolicy: myShop.returnPolicy || '',
      cancellationPolicy: myShop.cancellationPolicy || '',
      customerSupportPhone: myShop.customerSupportPhone || myShop.phone || '',
      customerSupportEmail: myShop.customerSupportEmail || myShop.ownerEmail || '',
      customerSupportHours: myShop.customerSupportHours || '',
      tradeLicenseNumber: myShop.tradeLicenseNumber || '',
      taxIdNumber: myShop.taxIdNumber || '',
      emailNotificationEnabled: myShop.emailNotificationEnabled ?? true,
      orderSmsNotificationEnabled: myShop.orderSmsNotificationEnabled ?? true,
    });
    setPoliciesError(null);
    setPoliciesSavedSuccess(false);
  };

  const handleSavePolicies = async (e: React.FormEvent) => {
    e.preventDefault();
    setPoliciesError(null);
    setPoliciesSavedSuccess(false);

    if (!settingsForm.phone || !settingsForm.address || !settingsForm.description) {
      setPoliciesError('Please fill in all required contact and store description fields.');
      return;
    }

    setIsSavingPolicies(true);
    try {
      updateShopPolicies(myShop.id, settingsForm);
      setPoliciesSavedSuccess(true);
      showToast('Store policies and public profile updated successfully.');
      setTimeout(() => setPoliciesSavedSuccess(false), 4000);
    } catch (err: any) {
      setPoliciesError(err.message || 'Failed to update store policies.');
    } finally {
      setIsSavingPolicies(false);
    }
  };

  // Real-time Firestore orders for this shop
  const [realtimeOrders, setRealtimeOrders] = useState<Order[]>([]);

  // Real-time Firestore order listener for this shop
  useEffect(() => {
    if (!isFirebaseConfigured() || !db || !myShop?.id) return;

    const activeDb = db;
    const unsubscribers: (() => void)[] = [];

    const sanitizeOrderDoc = (docSnap: any): Order => {
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

    try {
      // 1. Listen for orders containing this shop in shopIds array
      const qShopIds = query(
        collection(activeDb, 'orders'),
        where('shopIds', 'array-contains', myShop.id)
      );

      const unsubShopIds = onSnapshot(
        qShopIds,
        (snap) => {
          const fetchedOrders = snap.docs.map(sanitizeOrderDoc);
          setRealtimeOrders((prev) => {
            const map = new Map<string, Order>();
            prev.forEach((o) => map.set(o.id, o));
            fetchedOrders.forEach((o) => map.set(o.id, o));
            return Array.from(map.values()).sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
          });
        },
        (err) => {
          console.warn('Real-time orders shopIds listener note:', err);
        }
      );
      unsubscribers.push(unsubShopIds);

      // 2. Also listen for orders with direct primary shopId matching this shop
      const qShopId = query(
        collection(activeDb, 'orders'),
        where('shopId', '==', myShop.id)
      );

      const unsubShopId = onSnapshot(
        qShopId,
        (snap) => {
          const fetchedOrders = snap.docs.map(sanitizeOrderDoc);
          setRealtimeOrders((prev) => {
            const map = new Map<string, Order>();
            prev.forEach((o) => map.set(o.id, o));
            fetchedOrders.forEach((o) => map.set(o.id, o));
            return Array.from(map.values()).sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
          });
        },
        (err) => {
          console.warn('Real-time orders shopId listener note:', err);
        }
      );
      unsubscribers.push(unsubShopId);

      // 3. Multi-vendor seller lookup if currentUser ID is recorded
      if (currentUser?.id) {
        const qSeller = query(
          collection(activeDb, 'orders'),
          where('sellerUids', 'array-contains', currentUser.id)
        );
        const unsubSeller = onSnapshot(
          qSeller,
          (snap) => {
            const fetchedOrders = snap.docs.map(sanitizeOrderDoc);
            setRealtimeOrders((prev) => {
              const map = new Map<string, Order>();
              prev.forEach((o) => map.set(o.id, o));
              fetchedOrders.forEach((o) => map.set(o.id, o));
              return Array.from(map.values()).sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              );
            });
          },
          () => {}
        );
        unsubscribers.push(unsubSeller);
      }
    } catch (e) {
      console.warn('Error setting up real-time orders listener:', e);
    }

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [myShop?.id, currentUser?.id]);

  // Combine real-time Firestore orders with StoreContext orders (deduplicating by order ID)
  const allOrdersMap = new Map<string, Order>();
  orders.forEach((o) => allOrdersMap.set(o.id, o));
  realtimeOrders.forEach((o) => allOrdersMap.set(o.id, o));
  const combinedAllOrders = Array.from(allOrdersMap.values());

  // Orders that belong to or contain this shop's items
  const myShopOrders = combinedAllOrders
    .filter((o) =>
      o.shopId === myShop.id ||
      (Array.isArray(o.shopIds) && o.shopIds.includes(myShop.id)) ||
      (Array.isArray(o.items) && o.items.some((it) => it.shopId === myShop.id)) ||
      (currentUser?.id && (o.sellerUid === currentUser.id || Boolean(o.sellerUids?.includes(currentUser.id))))
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalRevenue = myShopOrders
    .filter((o) => o.orderStatus !== 'cancelled' && o.orderStatus !== 'refunded')
    .reduce((sum, o) => {
      const itemsInShop = o.items.filter((it) => it.shopId === myShop.id);
      return sum + itemsInShop.reduce((iSum, it) => iSum + it.price * it.quantity, 0);
    }, 0);

  // Add / Edit Product Form State
  const [productForm, setProductForm] = useState({
    title: '',
    description: '',
    category: 'Groceries & Organics',
    brand: myShop.name,
    price: 350,
    originalPrice: 400,
    stock: 25,
    unit: '500g pack',
    pointsEarned: 25, // custom point override
    canRedeemWithPoints: true,
    pointPrice: 700,
    images: [] as string[],
  });

  const [imageInputMode, setImageInputMode] = useState<'url' | 'upload'>('url');
  const [singleImageUrl, setSingleImageUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);

  const handleAddImageUrl = () => {
    const url = singleImageUrl.trim();
    if (!url) return;
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:image/')) {
      setImageUploadError('Please enter a valid image URL starting with http:// or https://');
      return;
    }
    setImageUploadError(null);
    setProductForm((prev) => ({
      ...prev,
      images: [...prev.images, url],
    }));
    setSingleImageUrl('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    // Validate type
    if (!file.type.startsWith('image/')) {
      setImageUploadError('Invalid file type: Please select an image (JPEG, PNG, WebP).');
      return;
    }

    // Validate size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setImageUploadError('File size exceeds 5MB limit. Please choose a smaller image.');
      return;
    }

    setImageUploadError(null);
    setIsUploadingImage(true);
    setUploadProgress(20);

    // If storage is available, upload to Firebase Storage
    if (storage) {
      try {
        const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const storageRef = ref(storage, `products/${myShop.id}/${Date.now()}_${cleanName}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            setUploadProgress(progress);
          },
          (error) => {
            console.warn('Firebase Storage upload notice (using Data URL fallback):', error);
            // Fallback to Data URL if Storage is restricted on Spark plan
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = reader.result as string;
              setProductForm((prev) => ({
                ...prev,
                images: [...prev.images, dataUrl],
              }));
              setIsUploadingImage(false);
              setUploadProgress(0);
              showToast('Image attached as local preview.', 'info');
            };
            reader.readAsDataURL(file);
          },
          async () => {
            try {
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              setProductForm((prev) => ({
                ...prev,
                images: [...prev.images, downloadUrl],
              }));
              setIsUploadingImage(false);
              setUploadProgress(0);
              showToast('Image uploaded successfully!', 'success');
            } catch (urlErr) {
              setIsUploadingImage(false);
              setUploadProgress(0);
            }
          }
        );
        return;
      } catch (err: any) {
        console.warn('Storage upload initiation note:', err);
      }
    }

    // Fallback: Read as base64 Data URL
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setProductForm((prev) => ({
        ...prev,
        images: [...prev.images, dataUrl],
      }));
      setIsUploadingImage(false);
      setUploadProgress(0);
      showToast('Image preview attached.', 'info');
    };
    reader.onerror = () => {
      setImageUploadError('Failed to read image from device.');
      setIsUploadingImage(false);
      setUploadProgress(0);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setProductForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== indexToRemove),
    }));
  };

  const handleOpenAdd = () => {
    if (myShop.status !== 'approved') {
      showToast(`Cannot add products: Storefront status is "${myShop.status}". Only approved sellers can publish catalogue items.`, 'error');
      return;
    }
    setProductForm({
      title: '',
      description: '',
      category: 'Groceries & Organics',
      brand: myShop.name,
      price: 350,
      originalPrice: 400,
      stock: 25,
      unit: '500g pack',
      pointsEarned: 25,
      canRedeemWithPoints: true,
      pointPrice: 700,
      images: [IMAGE_ASSETS.defaultProduct],
    });
    setEditingProductId(null);
    setSingleImageUrl('');
    setImageUploadError(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    if (myShop.status !== 'approved') {
      showToast(`Cannot edit products: Storefront status is "${myShop.status}". Selling operations are restricted.`, 'error');
      return;
    }
    setProductForm({
      title: product.title,
      description: product.description,
      category: product.category,
      brand: product.brand,
      price: product.price,
      originalPrice: product.originalPrice || product.price,
      stock: product.stock,
      unit: product.unit,
      pointsEarned: product.pointsEarned,
      canRedeemWithPoints: product.canRedeemWithPoints,
      pointPrice: product.pointPrice || 0,
      images: Array.isArray(product.images) && product.images.length > 0 ? product.images : [IMAGE_ASSETS.defaultProduct],
    });
    setEditingProductId(product.id);
    setSingleImageUrl('');
    setImageUploadError(null);
    setIsAddModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (myShop.status !== 'approved') {
      showToast(`Cannot publish products: Storefront is currently "${myShop.status}". Awaiting administrator approval.`, 'error');
      return;
    }
    const finalImages = productForm.images.length > 0 ? productForm.images : [IMAGE_ASSETS.defaultProduct];

    if (editingProductId) {
      updateProduct(editingProductId, {
        title: productForm.title,
        description: productForm.description,
        category: productForm.category,
        brand: productForm.brand,
        price: productForm.price,
        originalPrice: productForm.originalPrice,
        stock: productForm.stock,
        unit: productForm.unit,
        pointsEarned: productForm.pointsEarned,
        canRedeemWithPoints: productForm.canRedeemWithPoints,
        pointPrice: productForm.pointPrice,
        images: finalImages,
      });
    } else {
      addProduct({
        shopId: myShop.id,
        shopName: myShop.name,
        title: productForm.title,
        description: productForm.description,
        category: productForm.category,
        brand: productForm.brand,
        price: productForm.price,
        originalPrice: productForm.originalPrice,
        discountPercent: productForm.originalPrice > productForm.price
          ? Math.round(((productForm.originalPrice - productForm.price) / productForm.originalPrice) * 100)
          : 0,
        stock: productForm.stock,
        images: finalImages,
        unit: productForm.unit,
        pointsEarned: productForm.pointsEarned,
        canRedeemWithPoints: productForm.canRedeemWithPoints,
        pointPrice: productForm.pointPrice,
        isFeatured: false,
        isTrending: false,
        isBestSeller: false,
      });
    }
    setIsAddModalOpen(false);
  };

  if (!currentUser) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-[#142B4A] text-[#F47B44] flex items-center justify-center mx-auto mb-4">
            <Store className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-[#142B4A] mb-2">Merchant Sign In Required</h2>
          <p className="text-xs text-slate-500 mb-6 max-w-md mx-auto leading-relaxed">
            Please log in to manage your storefront, products, orders, and customer fulfillment policies.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => openAuthModal('login')}
              className="w-full sm:w-auto px-6 py-2.5 bg-[#142B4A] hover:bg-[#1E3A5F] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Sign In to Merchant Account
            </button>
            <button
              onClick={() => openSellerModal()}
              className="w-full sm:w-auto px-5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Apply as a Merchant
            </button>
            <button
              onClick={() => navigateTo('home')}
              className="w-full sm:w-auto px-4 py-2.5 text-xs text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Back to Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If user has a pending seller application
  if (userShop && userShop.status === 'pending') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-2xl border border-amber-200 p-8 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8" />
          </div>
          <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-[11px] font-bold uppercase tracking-wider rounded-full mb-3">
            Application Under Review
          </span>
          <h2 className="text-xl font-extrabold text-[#142B4A] mb-2">{userShop.name}</h2>
          <p className="text-xs text-slate-500 mb-6 max-w-md mx-auto leading-relaxed">
            Your merchant storefront application is currently being evaluated by the REFERO Administration team. Once approved, your account will be immediately elevated to Shopkeeper and full storefront access will unlock automatically.
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-md mx-auto text-left text-xs mb-6 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Store Name:</span>
              <span className="font-semibold text-slate-800">{userShop.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Category:</span>
              <span className="font-semibold text-slate-800">{userShop.category}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Address:</span>
              <span className="font-semibold text-slate-800">{userShop.address}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Contact Phone:</span>
              <span className="font-semibold text-slate-800">{userShop.phone}</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigateTo('customer_dashboard')}
              className="w-full sm:w-auto px-6 py-2.5 bg-[#142B4A] hover:bg-[#1E3A5F] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Go to Customer Dashboard
            </button>
            <button
              onClick={() => navigateTo('home')}
              className="w-full sm:w-auto px-5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Back to Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If user's seller application was rejected
  if (userShop && userShop.status === 'rejected') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-2xl border border-rose-200 p-8 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <span className="inline-block px-3 py-1 bg-rose-100 text-rose-800 text-[11px] font-bold uppercase tracking-wider rounded-full mb-3">
            Application Not Approved
          </span>
          <h2 className="text-xl font-extrabold text-[#142B4A] mb-2">{userShop.name}</h2>
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 max-w-md mx-auto text-left text-xs mb-6">
            <p className="font-semibold text-rose-900 mb-1">Administrator Review Feedback:</p>
            <p className="text-rose-700 leading-relaxed">
              {userShop.rejectionReason || 'Please review your business details and contact details, and reapply with verified credentials.'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => openSellerModal()}
              className="w-full sm:w-auto px-6 py-2.5 bg-[#142B4A] hover:bg-[#1E3A5F] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Review & Re-apply as Seller
            </button>
            <button
              onClick={() => navigateTo('customer_dashboard')}
              className="w-full sm:w-auto px-5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Customer Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If user's store is suspended
  if (userShop && userShop.status === 'suspended') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <span className="inline-block px-3 py-1 bg-rose-100 text-rose-800 text-[11px] font-bold uppercase tracking-wider rounded-full mb-3">
            Storefront Suspended
          </span>
          <h2 className="text-xl font-extrabold text-[#142B4A] mb-2">{userShop.name}</h2>
          <p className="text-xs text-slate-500 mb-6 max-w-md mx-auto leading-relaxed">
            Storefront activities are currently halted. Reason: <strong>{userShop.suspensionReason || 'Administrative suspension pending policy review.'}</strong>
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigateTo('home')}
              className="w-full sm:w-auto px-6 py-2.5 bg-[#142B4A] hover:bg-[#1E3A5F] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Back to Marketplace
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If customer has NOT applied to sell at all
  if (!isApprovedSeller && currentUser.role === 'customer') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto mb-4">
            <Store className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-[#142B4A] mb-2">Merchant Account Required</h2>
          <p className="text-xs text-slate-500 mb-6 max-w-md mx-auto leading-relaxed">
            You are currently signed in as a customer account (<strong>{currentUser.email}</strong>). To manage an active vendor store on REFERO, submit a merchant application.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => openSellerModal()}
              className="w-full sm:w-auto px-6 py-2.5 bg-[#142B4A] hover:bg-[#1E3A5F] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Apply to Sell on REFERO
            </button>
            <button
              onClick={() => navigateTo('customer_dashboard')}
              className="w-full sm:w-auto px-5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Customer Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Shopkeeper Portal Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#142B4A] text-white flex items-center justify-center text-xl font-bold">
            <Store className="w-7 h-7 text-[#F47B44]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-[#142B4A]">{myShop.name}</h1>
              <span
                className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md border ${
                  myShop.status === 'approved'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                {myShop.status === 'approved' ? 'Active Approved Seller' : 'Pending Approval'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Managed by {myShop.ownerName || currentUser.fullName || 'Merchant Partner'} · {myShop.address}
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          disabled={myShop.status !== 'approved'}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-colors ${
            myShop.status === 'approved'
              ? 'bg-[#142B4A] hover:bg-[#1E3A5F] text-white cursor-pointer'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-75'
          }`}
          title={myShop.status === 'approved' ? 'Add New Product' : `Publishing restricted: Store status is ${myShop.status}`}
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Moderation Restriction Notice for Pending or Suspended Stores */}
      {myShop.status !== 'approved' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-amber-900 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h4 className="font-bold text-sm text-amber-950">
              Store Status: {myShop.status === 'pending' ? 'Application Under Review' : `Account ${myShop.status.toUpperCase()}`}
            </h4>
            <p className="leading-relaxed">
              {myShop.status === 'pending'
                ? 'Your seller application has been submitted and is currently pending review by a marketplace administrator. Product catalogue publishing is restricted until your storefront is approved.'
                : `Your storefront has been placed in "${myShop.status}" status: ${myShop.suspensionReason || myShop.rejectionReason || 'Please contact platform administration.'}. Active selling operations and product publishing are restricted.`}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 transition-colors cursor-pointer ${
            activeTab === 'overview'
              ? 'text-[#142B4A] border-b-2 border-[#142B4A]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Overview & Metrics
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`pb-3 transition-colors cursor-pointer ${
            activeTab === 'products'
              ? 'text-[#142B4A] border-b-2 border-[#142B4A]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Catalogue ({myProducts.length})
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 transition-colors cursor-pointer ${
            activeTab === 'orders'
              ? 'text-[#142B4A] border-b-2 border-[#142B4A]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Orders Fulfillment ({myShopOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3 transition-colors cursor-pointer ${
            activeTab === 'settings'
              ? 'text-[#142B4A] border-b-2 border-[#142B4A]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Policies & Profile
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Estimated Revenue</span>
              <p className="text-2xl font-bold font-mono text-[#142B4A] mt-1">{formatBDT(totalRevenue)}</p>
              <span className="text-[11px] text-emerald-700 font-semibold">Verified Orders</span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Total Products</span>
              <p className="text-2xl font-bold font-mono text-[#142B4A] mt-1">{myProducts.length}</p>
              <span className="text-[11px] text-slate-400">In marketplace catalogue</span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Orders Requiring Dispatch</span>
              <p className="text-2xl font-bold font-mono text-[#F47B44] mt-1">
                {myShopOrders.filter((o) => o.orderStatus !== 'delivered' && o.orderStatus !== 'cancelled').length}
              </p>
              <span className="text-[11px] text-slate-400">Needs packaging & shipping</span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Customer Rating</span>
              <p className="text-2xl font-bold font-mono text-amber-500 mt-1">★ {myShop.rating.toFixed(1)}</p>
              <span className="text-[11px] text-slate-400">From {myShop.reviewCount} customer reviews</span>
            </div>
          </div>

          {/* Low stock alerts */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <h3 className="text-sm font-bold text-[#142B4A]">Inventory Stock Health</h3>
            <div className="divide-y divide-slate-100 text-xs">
              {myProducts.map((p) => (
                <div key={p.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-800">{p.title}</span>
                    <span className="text-slate-400 ml-2 font-mono">{formatBDT(p.price)}</span>
                  </div>
                  <div>
                    {p.stock <= 5 ? (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-800 font-bold text-[10px] rounded">
                        Low Stock: {p.stock} units left
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-medium font-mono">
                        {p.stock} units available
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CATALOGUE MANAGEMENT */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#142B4A]">Product Catalogue</h3>
              <p className="text-xs text-slate-500">Configure prices, inventory stock, and point bonuses</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenAdd}
                className="px-3.5 py-1.5 bg-[#142B4A] text-white text-xs font-semibold rounded-lg hover:bg-[#1E3A5F] flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Product</span>
              </button>
            </div>
          </div>

          {myProducts.length === 0 ? (
            <div className="text-center py-12 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-3">
              <Package className="w-12 h-12 text-slate-400 mx-auto" />
              <h4 className="text-sm font-bold text-[#142B4A]">No products listed in your storefront yet</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Add your high-demand Bangladeshi grocery and organic items to start selling to verified customers across the marketplace.
              </p>
              <div className="flex items-center justify-center pt-2">
                <button
                  onClick={handleOpenAdd}
                  className="px-4 py-2 bg-[#142B4A] hover:bg-[#1E3A5F] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Product</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Price</th>
                    <th className="py-2.5 px-3">Stock</th>
                    <th className="py-2.5 px-3">Points Bonus</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-3 flex items-center gap-3">
                        <img
                          src={p.images[0]}
                          alt={p.title}
                          className="w-10 h-10 rounded-md object-cover border border-slate-200 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <span className="font-semibold text-slate-800 line-clamp-1 max-w-[200px]">
                          {p.title}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">{p.category}</td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-800">
                        {formatBDT(p.price)}
                      </td>
                      <td className="py-3 px-3 font-mono">
                        <span className={p.stock <= 5 ? 'text-amber-600 font-bold' : 'text-slate-700'}>
                          {p.stock} units
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {p.pointsEarned > 0 ? (
                          <span className="text-[#F47B44] font-semibold flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            <span>+{p.pointsEarned} pts</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">Platform 5%</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 text-slate-500 hover:text-[#142B4A] hover:bg-slate-100 rounded-md"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteProduct(p.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ORDER FULFILLMENT */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-[#142B4A]">Fulfillment & Dispatch Workflow</h3>
            <p className="text-xs text-slate-500">
              Update shipment progress. Marking an order as "Delivered" prompts the buyer to confirm receipt, which releases points and enables verified product reviews.
            </p>
          </div>

          {myShopOrders.length === 0 ? (
            <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">No orders received yet.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">When customers purchase items from your storefront, they will appear here in real time.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myShopOrders.map((ord) => {
                const shopItems = ord.items?.filter((it) => it.shopId === myShop.id);
                const itemsToDisplay = (shopItems && shopItems.length > 0) ? shopItems : (ord.items || []);
                const itemsTotal = itemsToDisplay.reduce((sum, it) => sum + it.price * it.quantity, 0);

                return (
                  <div key={ord.id} className="bg-slate-50/80 rounded-xl border border-slate-200 p-4 space-y-3.5 text-xs transition-shadow hover:shadow-xs">
                    {/* Top Row: Order Header & Customer Information */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#142B4A] text-sm flex items-center gap-1.5">
                            <ShoppingBag className="w-4 h-4 text-[#F47B44]" />
                            Order #{ord.orderNumber}
                          </span>
                          <span className="text-slate-400 font-mono text-[11px]">{formatDate(ord.createdAt)}</span>
                        </div>
                        <p className="text-slate-600 mt-1">
                          Buyer: <strong>{ord.customerName}</strong> ({ord.deliveryAddress?.phone || ord.customerPhone})
                        </p>
                        <p className="text-slate-500 text-[11px] mt-0.5">
                          Destination: {ord.deliveryAddress?.address}, {ord.deliveryAddress?.district}
                          {ord.deliveryAddress?.notes && <span className="text-amber-700 block italic mt-0.5">Note: {ord.deliveryAddress.notes}</span>}
                        </p>
                      </div>

                      {/* Status badge & selector */}
                      <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            ord.orderStatus === 'completed'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : ord.orderStatus === 'delivered'
                              ? 'bg-teal-100 text-teal-800 border border-teal-200'
                              : ord.orderStatus === 'shipped'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : ord.orderStatus === 'processing'
                              ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                              : ord.orderStatus === 'confirmed'
                              ? 'bg-sky-100 text-sky-800 border border-sky-200'
                              : ord.orderStatus === 'cancelled'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {ord.orderStatus === 'completed' ? '✓ Completed' : ord.orderStatus}
                        </span>

                        {ord.orderStatus === 'completed' ? (
                          <span className="text-xs text-emerald-700 font-semibold px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg">
                            Customer Confirmed
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <select
                              value={ord.orderStatus}
                              disabled={updatingOrderId === ord.id}
                              onChange={(e) => handleStatusChange(ord.id, e.target.value as Order['orderStatus'])}
                              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-[#142B4A] cursor-pointer disabled:opacity-60"
                            >
                              <option value="placed">Placed</option>
                              <option value="confirmed">Confirmed</option>
                              <option value="processing">Processing</option>
                              <option value="shipped">Dispatched (Shipped)</option>
                              <option value="delivered">Delivered (Notify Buyer)</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                            {updatingOrderId === ord.id && (
                              <span className="text-[10px] text-slate-400 animate-pulse">Saving...</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Middle Section: Ordered Products List */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <span>Ordered Items ({itemsToDisplay.length})</span>
                        <span>Item Subtotal</span>
                      </div>

                      <div className="divide-y divide-slate-100 bg-white rounded-lg border border-slate-200 overflow-hidden">
                        {itemsToDisplay.map((item, idx) => (
                          <div key={`${item.productId}_${idx}`} className="p-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={resolveProductImage(item.image)}
                                alt={item.title}
                                className="w-10 h-10 rounded-md object-cover border border-slate-200 shrink-0"
                                referrerPolicy="no-referrer"
                              />
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-800 line-clamp-1">{item.title}</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  {item.unit ? `${item.unit} • ` : ''}৳{item.price} per unit
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 shrink-0 text-right">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded text-[11px]">
                                Qty: {item.quantity}
                              </span>
                              <span className="font-bold text-[#142B4A] text-xs min-w-[70px]">
                                {formatBDT(item.price * item.quantity)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bottom Row: Financial Breakdown & Payment Info */}
                    <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500 border-t border-slate-200">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-slate-200/70 text-slate-700 px-2 py-0.5 rounded font-medium uppercase">
                          Payment: {ord.paymentMethod.toUpperCase()} ({ord.paymentStatus})
                        </span>
                        {ord.paymentReference && (
                          <span className="text-slate-500 font-mono">
                            TrxID: {ord.paymentReference}
                          </span>
                        )}
                        {ord.pointsUsed > 0 && (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                            {ord.pointsUsed} pts discount applied (-৳{ord.discountFromPoints})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 font-semibold text-xs text-slate-700">
                        <span>Items Total: <strong className="text-slate-900">{formatBDT(itemsTotal)}</strong></span>
                        <span>•</span>
                        <span>Order Total: <strong className="text-[#142B4A] font-bold">{formatBDT(ord.totalAmount)}</strong></span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SETTINGS & POLICIES */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSavePolicies} className="bg-white rounded-xl border border-slate-200 p-5 space-y-5 text-xs">
          {/* Moderation Status Banner */}
          {myShop.status === 'pending' && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Storefront Application Pending Review</strong>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Your store is currently in <code>pending</code> status. Marketplace administrators review applications before publishing products to buyers. You can configure your policies, contact details, and inventory while awaiting review.
                </p>
                {myShop.additionalInfoRequested && (
                  <div className="mt-2 p-2 bg-white/80 rounded-lg border border-amber-300 font-medium text-[11px]">
                    <strong>Note from Administrator:</strong> {myShop.additionalInfoRequested}
                  </div>
                )}
              </div>
            </div>
          )}

          {myShop.status === 'suspended' && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-900 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Storefront Currently Suspended</strong>
                <p className="text-[11px] text-red-800 mt-0.5">
                  Your store has been suspended by administration. All catalog products are hidden from public marketplace searches.
                </p>
                {myShop.suspensionReason && (
                  <div className="mt-2 p-2 bg-white/80 rounded-lg border border-red-300 font-medium text-[11px]">
                    <strong>Suspension Reason:</strong> {myShop.suspensionReason}
                  </div>
                )}
              </div>
            </div>
          )}

          {myShop.status === 'rejected' && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-900 flex items-start gap-2.5">
              <X className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Application Rejected</strong>
                {myShop.rejectionReason && (
                  <p className="text-[11px] text-red-800 mt-0.5">
                    <strong>Reason:</strong> {myShop.rejectionReason}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Form Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#142B4A]">Storefront Policies & Brand Profile</h3>
              <p className="text-slate-500">
                Maintain public contact information, business credentials, delivery terms, and buyer support policies.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigateTo('shop_profile', { shopId: myShop.id })}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                title="Preview public storefront"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                <span>Preview Store</span>
              </button>
              <button
                type="button"
                onClick={handleResetSettings}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-lg cursor-pointer transition-colors"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={isSavingPolicies}
                className="px-4 py-1.5 bg-[#142B4A] hover:bg-[#1E3A5F] text-white font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <Save className="w-3.5 h-3.5 text-[#F47B44]" />
                <span>{isSavingPolicies ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>

          {/* Feedback Alerts */}
          {policiesSavedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Policies & profile saved successfully and synced with marketplace records.</span>
            </div>
          )}
          {policiesError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{policiesError}</span>
            </div>
          )}

          {/* Form Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Section 1: Core Store Identity */}
            <div className="sm:col-span-2 pt-1 border-b border-slate-100 pb-2">
              <h4 className="text-xs font-bold text-[#142B4A] uppercase tracking-wider">1. Brand Identity & Marketplace Classification</h4>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Store / Brand Name (Protected)</label>
              <input
                type="text"
                disabled
                value={myShop.name}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed font-medium"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Store name change requires administrative verification.</span>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Primary Marketplace Category *</label>
              <select
                value={settingsForm.category}
                onChange={(e) => setSettingsForm({ ...settingsForm, category: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#142B4A]"
              >
                <option value="Groceries & Organics">Groceries & Organics</option>
                <option value="Kitchenware & Spices">Kitchenware & Spices</option>
                <option value="Beverages & Snacks">Beverages & Snacks</option>
                <option value="Household & Personal Care">Household & Personal Care</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">Shop Story & Overview *</label>
              <textarea
                value={settingsForm.description}
                onChange={(e) => setSettingsForm({ ...settingsForm, description: e.target.value })}
                rows={2}
                placeholder="Describe your artisan pedigree, sourcing standards, and authentic product specializations..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#142B4A]"
                required
              />
            </div>

            {/* Visual Assets */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Logo Image URL</label>
              <input
                type="url"
                value={settingsForm.logo}
                onChange={(e) => setSettingsForm({ ...settingsForm, logo: e.target.value })}
                placeholder="https://..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden"
              />
              {settingsForm.logo && (
                <div className="mt-2 flex items-center gap-2">
                  <img
                    src={settingsForm.logo}
                    alt="Logo preview"
                    className="w-8 h-8 rounded-lg object-cover border border-slate-200"
                    referrerPolicy="no-referrer"
                  />
                  <span className="text-[10px] text-slate-400">Logo preview</span>
                </div>
              )}
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Banner Image URL</label>
              <input
                type="url"
                value={settingsForm.banner}
                onChange={(e) => setSettingsForm({ ...settingsForm, banner: e.target.value })}
                placeholder="https://..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden"
              />
              {settingsForm.banner && (
                <div className="mt-2 flex items-center gap-2">
                  <img
                    src={settingsForm.banner}
                    alt="Banner preview"
                    className="w-16 h-8 rounded-lg object-cover border border-slate-200"
                    referrerPolicy="no-referrer"
                  />
                  <span className="text-[10px] text-slate-400">Banner preview</span>
                </div>
              )}
            </div>

            {/* Section 2: Contact & Business Verification */}
            <div className="sm:col-span-2 pt-3 border-b border-slate-100 pb-2">
              <h4 className="text-xs font-bold text-[#142B4A] uppercase tracking-wider">2. Business Contact & Legal Verification</h4>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Contact Person Name</label>
              <input
                type="text"
                value={settingsForm.contactPerson}
                onChange={(e) => setSettingsForm({ ...settingsForm, contactPerson: e.target.value })}
                placeholder="e.g. Mahinur Rahman"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Official Business Phone *</label>
              <input
                type="text"
                value={settingsForm.phone}
                onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                placeholder="+880 1..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Business Email Address</label>
              <input
                type="email"
                value={settingsForm.businessEmail}
                onChange={(e) => setSettingsForm({ ...settingsForm, businessEmail: e.target.value })}
                placeholder="sales@yourshop.com"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Trade License / BIN Number (Verification)</label>
              <input
                type="text"
                value={settingsForm.tradeLicenseNumber}
                onChange={(e) => setSettingsForm({ ...settingsForm, tradeLicenseNumber: e.target.value })}
                placeholder="e.g. TRAD/DNCC/102948/2025"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono focus:outline-hidden"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">Physical Warehouse / Fulfillment Address *</label>
              <input
                type="text"
                value={settingsForm.address}
                onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                placeholder="e.g. Plot 12, Road 4, Sector 7, Uttara, Dhaka-1230"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden"
                required
              />
            </div>

            {/* Section 3: Policies */}
            <div className="sm:col-span-2 pt-3 border-b border-slate-100 pb-2">
              <h4 className="text-xs font-bold text-[#142B4A] uppercase tracking-wider">3. Buyer Policies & Customer Support</h4>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Shipping & Dispatch Policy *</label>
              <textarea
                value={settingsForm.deliveryPolicy}
                onChange={(e) => setSettingsForm({ ...settingsForm, deliveryPolicy: e.target.value })}
                rows={3}
                placeholder="e.g. Standard delivery within 48 hours inside Dhaka..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Return & Replacement Policy *</label>
              <textarea
                value={settingsForm.returnPolicy}
                onChange={(e) => setSettingsForm({ ...settingsForm, returnPolicy: e.target.value })}
                rows={3}
                placeholder="e.g. 7-day replacement guarantee for damaged or defective items..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">Order Cancellation Terms</label>
              <textarea
                value={settingsForm.cancellationPolicy}
                onChange={(e) => setSettingsForm({ ...settingsForm, cancellationPolicy: e.target.value })}
                rows={2}
                placeholder="e.g. Orders may be cancelled without penalty before fulfillment status is marked dispatched..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Customer Support Phone</label>
              <input
                type="text"
                value={settingsForm.customerSupportPhone}
                onChange={(e) => setSettingsForm({ ...settingsForm, customerSupportPhone: e.target.value })}
                placeholder="+880 1..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Customer Support Operating Hours</label>
              <input
                type="text"
                value={settingsForm.customerSupportHours}
                onChange={(e) => setSettingsForm({ ...settingsForm, customerSupportHours: e.target.value })}
                placeholder="e.g. Sun - Thu: 9 AM - 8 PM"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden"
              />
            </div>

            {/* Notification preferences */}
            <div className="sm:col-span-2 pt-2">
              <label className="font-semibold text-slate-700 block mb-2">Shop Order Notification Preferences</label>
              <div className="flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={settingsForm.emailNotificationEnabled}
                    onChange={(e) => setSettingsForm({ ...settingsForm, emailNotificationEnabled: e.target.checked })}
                    className="rounded border-slate-300 text-[#142B4A]"
                  />
                  <span>Receive email notification on new incoming orders</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={settingsForm.orderSmsNotificationEnabled}
                    onChange={(e) => setSettingsForm({ ...settingsForm, orderSmsNotificationEnabled: e.target.checked })}
                    className="rounded border-slate-300 text-[#142B4A]"
                  />
                  <span>Receive SMS dispatch reminders</span>
                </label>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ADD / EDIT PRODUCT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setIsAddModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 z-10 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-[#142B4A]">
                {editingProductId ? 'Edit Product' : 'Add New Product to Catalogue'}
              </h3>
              <button onClick={() => setIsAddModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Product Title *</label>
                <input
                  type="text"
                  value={productForm.title}
                  onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                  placeholder="e.g. Organic Pressed Sesame Oil"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Category *</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="Groceries & Organics">Groceries & Organics</option>
                    <option value="Kitchenware & Spices">Kitchenware & Spices</option>
                    <option value="Beverages & Snacks">Beverages & Snacks</option>
                    <option value="Household & Personal Care">Household & Personal Care</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Pack Size / Unit *</label>
                  <input
                    type="text"
                    value={productForm.unit}
                    onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                    placeholder="e.g. 500g jar"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Price (৳) *</label>
                  <input
                    type="number"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Original Price (৳)</label>
                  <input
                    type="number"
                    value={productForm.originalPrice}
                    onChange={(e) => setProductForm({ ...productForm, originalPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Stock Units *</label>
                  <input
                    type="number"
                    value={productForm.stock}
                    onChange={(e) => setProductForm({ ...productForm, stock: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                    required
                  />
                </div>
              </div>

              {/* Product-Specific Points Override */}
              <div className="p-3 bg-[#EAF3FF] rounded-lg border border-blue-200 space-y-2">
                <label className="font-bold text-[#142B4A] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#F47B44]" />
                  <span>Product-Specific REFERO Points Override</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={productForm.pointsEarned}
                    onChange={(e) => setProductForm({ ...productForm, pointsEarned: Number(e.target.value) })}
                    className="w-32 px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                  />
                  <span className="text-slate-600 text-[11px]">
                    Points customer earns upon qualifying delivery (Overrides 5% fallback)
                  </span>
                </div>
              </div>

              {/* Product Images: Option A (Upload) & Option B (URL) */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-[#F47B44]" />
                    <span>Product Images ({productForm.images.length})</span>
                  </label>
                  <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setImageInputMode('url')}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                        imageInputMode === 'url' ? 'bg-[#142B4A] text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Image URL
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageInputMode('upload')}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                        imageInputMode === 'upload' ? 'bg-[#142B4A] text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Device Upload
                    </button>
                  </div>
                </div>

                {imageInputMode === 'url' ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={singleImageUrl}
                      onChange={(e) => setSingleImageUrl(e.target.value)}
                      placeholder="Paste public image URL (https://...)"
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={handleAddImageUrl}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg text-xs cursor-pointer shrink-0"
                    >
                      Add URL
                    </button>
                  </div>
                ) : (
                  <div>
                    <label className="flex items-center justify-center border-2 border-dashed border-slate-300 rounded-lg p-3 text-center cursor-pointer bg-white hover:bg-slate-50 transition-colors">
                      <div className="space-y-1">
                        <Upload className="w-5 h-5 text-slate-400 mx-auto" />
                        <span className="text-[11px] text-slate-600 font-medium block">
                          Choose image from device (JPEG, PNG, WebP &lt; 5MB)
                        </span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                    {isUploadingImage && (
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                          <span>Uploading...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#F47B44] transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {imageUploadError && (
                  <p className="text-[11px] text-rose-600 font-medium">{imageUploadError}</p>
                )}

                {/* Thumbnails preview strip */}
                {productForm.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-200/60">
                    {productForm.images.map((img, idx) => (
                      <div key={idx} className="relative group w-14 h-14 rounded-lg overflow-hidden border border-slate-300 bg-white shrink-0">
                        <img
                          src={resolveProductImage(img)}
                          alt={`Product thumbnail ${idx + 1}`}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = IMAGE_ASSETS.defaultProduct;
                          }}
                        />
                        {idx === 0 && (
                          <span className="absolute bottom-0 inset-x-0 bg-[#142B4A]/90 text-white text-[8px] font-bold text-center py-0.5">
                            Primary
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="absolute top-1 right-1 p-0.5 rounded bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          title="Remove image"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Description *</label>
                <textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#142B4A] text-white font-bold rounded-lg hover:bg-[#1E3A5F] transition-colors cursor-pointer mt-2"
              >
                {editingProductId ? 'Save Product Changes' : 'Publish Product to Store'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
