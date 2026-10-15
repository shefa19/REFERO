import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { formatBDT, formatPoints, formatDate } from '../../utils/formatters';
import { Product } from '../../types';
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
} from 'lucide-react';

export const ShopkeeperDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    shops,
    products,
    orders,
    navigateTo,
    addProduct,
    updateProduct,
    deleteProduct,
    updateOrderItemStatus,
    updateShopPolicies,
    showToast,
  } = useStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders' | 'settings'>('overview');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  // Active shopkeeper's shop
  const myShop = shops.find((s) => s.ownerId === currentUser?.id) || shops[0];
  const myProducts = products.filter((p) => p.shopId === myShop.id);

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

  // Orders that contain this shop's items
  const myShopOrders = orders.filter((o) =>
    o.items.some((it) => it.shopId === myShop.id)
  );

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
    image: myProducts[0]?.images[0] || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
  });

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
      image: myProducts[0]?.images[0] || '',
    });
    setEditingProductId(null);
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
      image: product.images[0],
    });
    setEditingProductId(product.id);
    setIsAddModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (myShop.status !== 'approved') {
      showToast(`Cannot publish products: Storefront is currently "${myShop.status}". Awaiting administrator approval.`, 'error');
      return;
    }
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
        images: [productForm.image || myProducts[0]?.images[0]],
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
              Managed by Kabir Ahmed · {myShop.address}
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
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-[#142B4A]">Product Catalogue</h3>
              <p className="text-xs text-slate-500">Configure prices, inventory stock, and point bonuses</p>
            </div>
            <button
              onClick={handleOpenAdd}
              className="px-3.5 py-1.5 bg-[#142B4A] text-white text-xs font-semibold rounded-lg hover:bg-[#1E3A5F] flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Product</span>
            </button>
          </div>

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
        </div>
      )}

      {/* TAB 3: ORDER FULFILLMENT */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-[#142B4A]">Fulfillment & Dispatch Workflow</h3>
            <p className="text-xs text-slate-500">
              Update shipment status. Marking an order as "Delivered" triggers customer loyalty points and referral rewards!
            </p>
          </div>

          {myShopOrders.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No orders received yet.</p>
          ) : (
            <div className="divide-y divide-slate-100 space-y-3">
              {myShopOrders.map((ord) => (
                <div key={ord.id} className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                  <div>
                    <span className="font-bold text-[#142B4A]">Order #{ord.orderNumber}</span>
                    <span className="text-slate-400 ml-2 font-mono">{formatDate(ord.createdAt)}</span>
                    <p className="text-slate-600 mt-0.5">
                      Customer: <strong>{ord.customerName}</strong> ({ord.deliveryAddress.phone})
                    </p>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Destination: {ord.deliveryAddress.address}, {ord.deliveryAddress.district}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        ord.orderStatus === 'delivered'
                          ? 'bg-emerald-50 text-emerald-800'
                          : ord.orderStatus === 'shipped'
                          ? 'bg-blue-50 text-blue-800'
                          : 'bg-amber-50 text-amber-800'
                      }`}
                    >
                      {ord.orderStatus}
                    </span>

                    {/* Status updater dropdown */}
                    <select
                      value={ord.orderStatus}
                      onChange={(e) => updateOrderItemStatus(ord.id, e.target.value as any)}
                      className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                    >
                      <option value="placed">Placed</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Dispatched (Shipped)</option>
                      <option value="delivered">Delivered (Award Points)</option>
                    </select>
                  </div>
                </div>
              ))}
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
