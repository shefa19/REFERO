import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { formatBDT, formatPoints, formatDate, formatDateTime } from '../../utils/formatters';
import { UserRole, Shop, UserProfile } from '../../types';
import { DEMO_USERS } from '../../data/seedData';
import { collection, getDocs } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../services/firebase/config';
import {
  ShieldCheck,
  Users,
  Store,
  Package,
  ShoppingBag,
  Coins,
  Settings,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  XCircle,
  FileText,
  Save,
  Search,
  Eye,
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  Filter,
  Clock,
  Database,
  UploadCloud,
} from 'lucide-react';
import { migrateDemoDataToFirestore, MigrationSummary } from '../../services/firebase/migrationService';

export const AdminDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    products,
    shops,
    orders,
    pointTransactions,
    pointsConfig,
    auditLogs,
    updatePointsConfig,
    approveShop,
    rejectShop,
    suspendShop,
    reinstateShop,
    requestShopInfo,
    processRefund,
    updateUserRoleAction,
    adjustUserPoints,
    showToast,
    dataSources,
    navigateTo,
    openAuthModal,
  } = useStore();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'users' | 'shops' | 'products' | 'orders' | 'points_config' | 'audit_logs'
  >('overview');

  // Config Form State
  const [configForm, setConfigForm] = useState({
    pointsToBdtRate: pointsConfig.pointsToBdtRate,
    defaultEarnPercent: pointsConfig.defaultEarnPercent,
    referralBonusPoints: pointsConfig.referralBonusPoints,
    allowCheckoutDiscount: pointsConfig.allowCheckoutDiscount,
    maxCheckoutDiscountPercent: pointsConfig.maxCheckoutDiscountPercent,
    minPointsToRedeem: pointsConfig.minPointsToRedeem,
  });

  // User Management State
  const [userList, setUserList] = useState(DEMO_USERS);
  const [userSearch, setUserSearch] = useState('');

  // Administrative Point Adjustment State (Strictly separated from customer-to-customer gifting)
  const [adjustModalUser, setAdjustModalUser] = useState<UserProfile | null>(null);
  const [adjustDelta, setAdjustDelta] = useState<number>(100);
  const [adjustType, setAdjustType] = useState<'credit' | 'debit'>('credit');
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [isAdjusting, setIsAdjusting] = useState<boolean>(false);

  // Permanent Demo Data Migration State
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationSummary | null>(null);

  const handleMigrateData = async () => {
    if (!currentUser || currentUser.role !== 'admin') {
      showToast('Admin authorization required to run migration.');
      return;
    }
    setIsMigrating(true);
    try {
      const res = await migrateDemoDataToFirestore(currentUser.id);
      setMigrationResult(res);
      showToast(`Migration complete! ${res.usersMigrated} users, ${res.shopsMigrated} shops, ${res.productsMigrated} products added to Firebase.`);
    } catch (err: any) {
      showToast(`Migration error: ${err.message}`);
    } finally {
      setIsMigrating(false);
    }
  };

  useEffect(() => {
    if (isFirebaseConfigured() && db && currentUser?.role === 'admin') {
      getDocs(collection(db, 'users'))
        .then((snap) => {
          if (snap.docs.length > 0) {
            const list = snap.docs.map((d) => ({
              id: d.id,
              ...d.data(),
            })) as UserProfile[];
            setUserList(list);
          }
        })
        .catch((err) => {
          console.warn('Firestore users fetch note in AdminDashboard:', err);
        });
    }
  }, [currentUser?.role, migrationResult]);

  // Calculations
  const totalSales = orders
    .filter((o) => o.orderStatus !== 'cancelled' && o.orderStatus !== 'refunded')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const totalPointsDistributed = pointTransactions
    .filter((t) => t.points > 0)
    .reduce((sum, t) => sum + t.points, 0);

  const pendingRefunds = orders.filter((o) => o.orderStatus === 'refund_requested');
  const pendingShops = shops.filter((s) => s.status === 'pending');

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    updatePointsConfig(configForm);
  };

  // Seller Moderation Search, Filter & Modals State
  const [shopFilter, setShopFilter] = useState<'all' | 'pending' | 'approved' | 'suspended' | 'rejected'>('all');
  const [shopSearch, setShopSearch] = useState('');
  const [selectedShopForDetails, setSelectedShopForDetails] = useState<Shop | null>(null);

  const [activeActionModal, setActiveActionModal] = useState<{
    type: 'reject' | 'suspend' | 'request_info' | 'reinstate' | 'refund';
    id: string;
    title: string;
    targetName: string;
    description: string;
    requireReason: boolean;
    reasonPlaceholder?: string;
  } | null>(null);
  const [modalReasonInput, setModalReasonInput] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);

  const openActionModal = (
    type: 'reject' | 'suspend' | 'request_info' | 'reinstate' | 'refund',
    id: string,
    targetName: string,
    title: string,
    description: string,
    requireReason: boolean,
    reasonPlaceholder?: string
  ) => {
    setActiveActionModal({
      type,
      id,
      targetName,
      title,
      description,
      requireReason,
      reasonPlaceholder,
    });
    setModalReasonInput('');
    setModalError(null);
  };

  const handleConfirmAction = async () => {
    if (!activeActionModal) return;
    const { type, id, requireReason } = activeActionModal;
    const trimmed = modalReasonInput.trim();

    if (requireReason && trimmed.length === 0) {
      setModalError('A non-empty, detailed reason is mandatory for this administrative action.');
      return;
    }

    if (type === 'reject') {
      rejectShop(id, trimmed);
    } else if (type === 'suspend') {
      suspendShop(id, trimmed);
    } else if (type === 'request_info') {
      requestShopInfo(id, trimmed);
    } else if (type === 'reinstate') {
      reinstateShop(id);
    } else if (type === 'refund') {
      await processRefund(id, trimmed);
    }

    setActiveActionModal(null);
    setModalReasonInput('');
    setModalError(null);
  };

  const handleRefundClick = (orderId: string, orderNumber: string) => {
    openActionModal(
      'refund',
      orderId,
      `Order #${orderNumber}`,
      'Issue Full Order Refund & Points Reversal',
      'This will cancel the order, mark payment as refunded, authoritatively reverse earned points from customer balance, restore spent points, and record an immutable audit log.',
      true,
      'e.g. Defective merchandise reported, customer return approved'
    );
  };

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    setUserList((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
    updateUserRoleAction(userId, newRole);
  };

  const handleAdjustPointsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModalUser) return;
    if (!adjustReason || adjustReason.trim().length < 5) {
      showToast('A mandatory audit reason (minimum 5 characters) is required.', 'error');
      return;
    }
    const delta = adjustType === 'credit' ? Math.abs(adjustDelta) : -Math.abs(adjustDelta);
    setIsAdjusting(true);
    const res = await adjustUserPoints(adjustModalUser.id, delta, adjustReason);
    setIsAdjusting(false);
    if (res.success) {
      setUserList((prev) =>
        prev.map((u) =>
          u.id === adjustModalUser.id
            ? { ...u, pointsBalance: Math.max(0, u.pointsBalance + delta) }
            : u
        )
      );
      setAdjustModalUser(null);
      setAdjustReason('');
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleRejectShop = (shop: Shop) => {
    openActionModal(
      'reject',
      shop.id,
      shop.name,
      'Reject Seller Storefront Application',
      'Under marketplace policy, rejecting an application requires a clear, non-empty reason that will be communicated to the applicant via in-app notification and recorded in audit logs.',
      true,
      'e.g. Incomplete warehouse address and missing trade license documentation'
    );
  };

  const handleSuspendShop = (shop: Shop) => {
    openActionModal(
      'suspend',
      shop.id,
      shop.name,
      'Suspend Active Storefront',
      'Suspension immediately pulls all shop products from public marketplace visibility and freezes seller actions. A clear mandatory reason is required.',
      true,
      'e.g. Multiple counterfeit product reports and policy violation notices unaddressed'
    );
  };

  const handleRequestShopInfo = (shop: Shop) => {
    openActionModal(
      'request_info',
      shop.id,
      shop.name,
      'Request Additional Store Information',
      'Send an official information request to this seller without rejecting the application. State clearly what proof or policy clarifications are required.',
      true,
      'e.g. Please provide your updated BIN certificate and Banani trade license copy'
    );
  };

  const handleReinstateShop = (shop: Shop) => {
    openActionModal(
      'reinstate',
      shop.id,
      shop.name,
      'Reinstate Suspended / Rejected Shop',
      'Reinstating this store will clear suspension flags, restore active approved status, publish the storefront, and notify the owner.',
      false
    );
  };

  if (!currentUser) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-[#142B4A] text-[#F47B44] flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-[#142B4A] mb-2">Administrator Access Required</h2>
          <p className="text-xs text-slate-500 mb-6 max-w-md mx-auto leading-relaxed">
            Marketplace administration, point configuration, and vendor governance controls are restricted to verified administrators. Please sign in with your administrative account.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => openAuthModal('login')}
              className="w-full sm:w-auto px-6 py-2.5 bg-[#142B4A] hover:bg-[#1E3A5F] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Sign In as Admin
            </button>
            <button
              onClick={() => navigateTo('home')}
              className="w-full sm:w-auto px-4 py-2.5 text-xs text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Back to Marketplace
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentUser.role !== 'admin') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-[#142B4A] mb-2">Access Restricted</h2>
          <p className="text-xs text-slate-500 mb-6 max-w-md mx-auto leading-relaxed">
            You are currently signed in as <strong>{currentUser.fullName}</strong> (<span className="capitalize">{currentUser.role}</span>). Super Administrator privileges are required to view and modify platform governance settings.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigateTo(currentUser.role === 'shopkeeper' ? 'shopkeeper_dashboard' : 'customer_dashboard')}
              className="w-full sm:w-auto px-6 py-2.5 bg-[#142B4A] hover:bg-[#1E3A5F] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Go to Your Dashboard
            </button>
            <button
              onClick={() => navigateTo('home')}
              className="w-full sm:w-auto px-4 py-2.5 text-xs text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Back to Marketplace
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Admin Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#142B4A] text-white flex items-center justify-center text-xl font-bold">
            <ShieldCheck className="w-8 h-8 text-[#F47B44]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-[#142B4A]">Marketplace Administration</h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200">
                Super Admin Access
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Signed in as {currentUser?.fullName} ({currentUser?.email})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            Conversion Rate: <strong className="font-mono text-[#142B4A]">1 pt = ৳{pointsConfig.pointsToBdtRate}</strong>
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4 sm:gap-6 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 whitespace-nowrap cursor-pointer ${
            activeTab === 'overview'
              ? 'text-[#142B4A] border-b-2 border-[#142B4A]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Overview KPIs
        </button>
        <button
          onClick={() => setActiveTab('points_config')}
          className={`pb-3 whitespace-nowrap cursor-pointer ${
            activeTab === 'points_config'
              ? 'text-[#142B4A] border-b-2 border-[#142B4A]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Points & Rewards Engine
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 whitespace-nowrap cursor-pointer ${
            activeTab === 'users'
              ? 'text-[#142B4A] border-b-2 border-[#142B4A]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          User & Roles ({userList.length})
        </button>
        <button
          onClick={() => setActiveTab('shops')}
          className={`pb-3 whitespace-nowrap cursor-pointer ${
            activeTab === 'shops'
              ? 'text-[#142B4A] border-b-2 border-[#142B4A]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Shops & Approvals ({pendingShops.length} pending)
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 whitespace-nowrap cursor-pointer ${
            activeTab === 'orders'
              ? 'text-[#142B4A] border-b-2 border-[#142B4A]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Orders & Refunds ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`pb-3 whitespace-nowrap cursor-pointer ${
            activeTab === 'products'
              ? 'text-[#142B4A] border-b-2 border-[#142B4A]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Products ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('audit_logs')}
          className={`pb-3 whitespace-nowrap cursor-pointer ${
            activeTab === 'audit_logs'
              ? 'text-[#142B4A] border-b-2 border-[#142B4A]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Audit Trail ({auditLogs.length})
        </button>
      </div>

      {/* TAB 1: OVERVIEW KPIS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Total Marketplace GMV</span>
              <p className="text-2xl font-bold font-mono text-[#142B4A] mt-1">{formatBDT(totalSales)}</p>
              <span className="text-[11px] text-emerald-700 font-semibold">{orders.length} orders placed</span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Total Loyalty Points Awarded</span>
              <p className="text-2xl font-bold font-mono text-[#F47B44] mt-1">
                {formatPoints(totalPointsDistributed)} pts
              </p>
              <span className="text-[11px] text-slate-400">≈ {formatBDT(totalPointsDistributed * pointsConfig.pointsToBdtRate)} liability</span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Approved Active Vendors</span>
              <p className="text-2xl font-bold font-mono text-[#142B4A] mt-1">
                {shops.filter((s) => s.status === 'approved').length}
              </p>
              <span className="text-[11px] text-[#F47B44] font-semibold">
                {pendingShops.length} application(s) pending review
              </span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Active Catalogue Items</span>
              <p className="text-2xl font-bold font-mono text-[#142B4A] mt-1">{products.length}</p>
              <span className="text-[11px] text-slate-400">Across all categories</span>
            </div>
          </div>

          {/* Pending Applications Callout */}
          {pendingShops.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-amber-900">
                  {pendingShops.length} Shop Application Awaiting Review
                </h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  Fresh Roots Agro submitted an application for the Fresh Produce category.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('shops')}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Review Now
              </button>
            </div>
          )}

          {/* Permanent Firebase Data Migration Panel */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EAF3FF] text-[#142B4A] flex items-center justify-center shrink-0">
                  <Database className="w-5 h-5 text-[#F47B44]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#142B4A] flex items-center gap-2">
                    <span>Permanent Demo Data Migration (Firestore)</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                      refero-d897d
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Add demo customers (Moumita, Nusrat) and shopkeepers (Green Valley, Bengal Pantry, Dhaka Mart) permanently to Firestore so live records show in your Admin dashboard.
                  </p>
                </div>
              </div>
              <button
                onClick={handleMigrateData}
                disabled={isMigrating}
                className="px-4 py-2.5 bg-[#142B4A] hover:bg-[#1E3A5F] text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-60 transition-colors shrink-0"
              >
                <UploadCloud className={`w-4 h-4 text-[#F47B44] ${isMigrating ? 'animate-bounce' : ''}`} />
                <span>{isMigrating ? 'Writing to Firestore...' : 'Sync Demo Data to Firebase'}</span>
              </button>
            </div>

            {/* Current Status & Safety Guarantees */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                <span className="text-slate-400 font-mono text-[10px] uppercase font-bold block">Safety Policy</span>
                <span className="text-emerald-700 font-semibold text-xs flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Real Admin Preserved
                </span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Excludes Admin account; your authenticated profile is never overwritten or mutated.
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                <span className="text-slate-400 font-mono text-[10px] uppercase font-bold block">Idempotence</span>
                <span className="text-[#142B4A] font-semibold text-xs flex items-center gap-1 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#F47B44]" /> Duplicate-Safe
                </span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Uses deterministic IDs (`user_customer_01`, `shop_green_valley`) to prevent duplicate records.
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                <span className="text-slate-400 font-mono text-[10px] uppercase font-bold block">Live Collections</span>
                <span className="text-slate-800 font-semibold text-xs flex items-center gap-1 mt-0.5">
                  <Database className="w-3.5 h-3.5 text-blue-600" />
                  <span>Products: {dataSources.products} · Shops: {dataSources.shops}</span>
                </span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Orders: {dataSources.orders} · Synchronized live with remote Firestore rules.
                </p>
              </div>
            </div>

            {/* Migration Results Banner if completed */}
            {migrationResult && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-2">
                <div className="flex items-center gap-2 text-emerald-900 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Migration Run Summary ({formatDateTime(migrationResult.timestamp)}):</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                  <div className="bg-white/80 p-2 rounded border border-emerald-200">
                    <span className="text-slate-500 block">Users</span>
                    <strong className="text-emerald-800">{migrationResult.usersMigrated} added</strong>
                    <span className="text-slate-400 block text-[10px]">({migrationResult.usersSkipped} existing)</span>
                  </div>
                  <div className="bg-white/80 p-2 rounded border border-emerald-200">
                    <span className="text-slate-500 block">Shops</span>
                    <strong className="text-emerald-800">{migrationResult.shopsMigrated} added</strong>
                    <span className="text-slate-400 block text-[10px]">({migrationResult.shopsSkipped} existing)</span>
                  </div>
                  <div className="bg-white/80 p-2 rounded border border-emerald-200">
                    <span className="text-slate-500 block">Products</span>
                    <strong className="text-emerald-800">{migrationResult.productsMigrated} added</strong>
                    <span className="text-slate-400 block text-[10px]">({migrationResult.productsSkipped} existing)</span>
                  </div>
                  <div className="bg-white/80 p-2 rounded border border-emerald-200">
                    <span className="text-slate-500 block">Orders</span>
                    <strong className="text-emerald-800">{migrationResult.ordersMigrated} added</strong>
                    <span className="text-slate-400 block text-[10px]">({migrationResult.ordersSkipped} existing)</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: POINTS & REWARDS ENGINE */}
      {activeTab === 'points_config' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
          <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#142B4A]">Configurable REFERO Points Engine</h3>
              <p className="text-xs text-slate-500">
                Control the currency conversion rate, fallback earning rates, and referral incentives in real time.
              </p>
            </div>
            <span className="text-[11px] text-slate-400">
              Last saved: {formatDateTime(pointsConfig.lastUpdated)}
            </span>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-6 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Conversion Rate */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="font-bold text-slate-800 block">
                  Points to Currency Conversion Rate (BDT per Point)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold font-mono text-[#142B4A]">1 Point = ৳</span>
                  <input
                    type="number"
                    step="0.05"
                    min="0.1"
                    max="5.0"
                    value={configForm.pointsToBdtRate}
                    onChange={(e) =>
                      setConfigForm({ ...configForm, pointsToBdtRate: Number(e.target.value) })
                    }
                    className="w-32 px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-sm"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Example: At ৳0.50, a customer redeeming 200 points receives a ৳100 checkout discount.
                </p>
              </div>

              {/* Purchase Earning Fallback */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="font-bold text-slate-800 block">
                  Default Purchase Earning Rate (%)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="25"
                    value={configForm.defaultEarnPercent}
                    onChange={(e) =>
                      setConfigForm({ ...configForm, defaultEarnPercent: Number(e.target.value) })
                    }
                    className="w-32 px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-sm"
                    required
                  />
                  <span className="text-base font-bold font-mono text-[#142B4A]">% of order cash subtotal</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Applies when a product does not specify a custom product-specific point rule.
                </p>
              </div>

              {/* Referral Bonus */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="font-bold text-slate-800 block">
                  Referral Reward Incentive (Points)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="10"
                    min="0"
                    max="1000"
                    value={configForm.referralBonusPoints}
                    onChange={(e) =>
                      setConfigForm({ ...configForm, referralBonusPoints: Number(e.target.value) })
                    }
                    className="w-32 px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-sm"
                    required
                  />
                  <span className="text-base font-bold font-mono text-[#142B4A]">points per referral</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Credited to the referrer ONLY after the referred friend completes their first qualifying delivered order.
                </p>
              </div>

              {/* Maximum Checkout Discount Cap */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="font-bold text-slate-800 block">
                  Max Checkout Discount Percentage (%)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="5"
                    min="5"
                    max="100"
                    value={configForm.maxCheckoutDiscountPercent}
                    onChange={(e) =>
                      setConfigForm({ ...configForm, maxCheckoutDiscountPercent: Number(e.target.value) })
                    }
                    className="w-32 px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-sm"
                    required
                  />
                  <span className="text-base font-bold font-mono text-[#142B4A]">% maximum order discount</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Protects marketplace cash flow by capping how much of an order subtotal can be paid using points.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={configForm.allowCheckoutDiscount}
                  onChange={(e) =>
                    setConfigForm({ ...configForm, allowCheckoutDiscount: e.target.checked })
                  }
                  className="rounded text-[#142B4A]"
                />
                <span>Enable Point Discounts at Checkout Platform-Wide</span>
              </label>

              <button
                type="submit"
                className="px-6 py-2.5 bg-[#142B4A] hover:bg-[#1E3A5F] text-white font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
              >
                <Save className="w-4 h-4" />
                <span>Save Configuration & Log Audit</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: USER MANAGEMENT & ROLE ASSIGNMENT */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-[#142B4A]">Registered Users & Role Management</h3>
              <p className="text-slate-500">Assign privileged roles or inspect customer point balances</p>
            </div>
            <div className="relative">
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">User</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Points Balance</th>
                  <th className="py-2.5 px-3">Referral Code</th>
                  <th className="py-2.5 px-3 text-right">Administrative Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {userList
                  .filter(
                    (u) =>
                      u.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
                      u.email.toLowerCase().includes(userSearch.toLowerCase())
                  )
                  .map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-3">
                        <p className="font-semibold text-slate-800">{u.fullName}</p>
                        <span className="text-[11px] text-slate-500 font-mono">{u.email}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            u.role === 'admin'
                              ? 'bg-red-50 text-red-700'
                              : u.role === 'shopkeeper'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-800">
                        {formatPoints(u.pointsBalance)} pts
                      </td>
                      <td className="py-3 px-3 font-mono text-[#F47B44] font-semibold">
                        {u.referralCode}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setAdjustModalUser(u);
                              setAdjustReason('');
                              setAdjustDelta(100);
                              setAdjustType('credit');
                            }}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-md transition-colors cursor-pointer"
                            title="Perform administrative ledger balance adjustment"
                          >
                            Adjust Pts
                          </button>
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-semibold"
                          >
                            <option value="customer">Customer</option>
                            <option value="shopkeeper">Shopkeeper</option>
                            <option value="admin">Administrator</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Administrative Points Adjustment Modal */}
          {adjustModalUser && (
            <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setAdjustModalUser(null)} />
              <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 z-10 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-[#142B4A]">Administrative Point Adjustment</h3>
                    <p className="text-xs text-slate-500">
                      User: <strong className="text-slate-800">{adjustModalUser.fullName}</strong> ({adjustModalUser.email})
                    </p>
                  </div>
                  <button
                    onClick={() => setAdjustModalUser(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleAdjustPointsSubmit} className="space-y-3.5 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-500 block mb-0.5">Current Spendable Balance</span>
                    <strong className="font-mono text-base text-[#142B4A]">
                      {formatPoints(adjustModalUser.pointsBalance)} pts
                    </strong>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAdjustType('credit')}
                      className={`py-2 rounded-lg font-bold border transition-colors cursor-pointer ${
                        adjustType === 'credit'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      + Credit Points
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustType('debit')}
                      className={`py-2 rounded-lg font-bold border transition-colors cursor-pointer ${
                        adjustType === 'debit'
                          ? 'bg-red-50 border-red-500 text-red-800'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      - Debit Points
                    </button>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Points Amount *</label>
                    <input
                      type="number"
                      min="1"
                      value={adjustDelta}
                      onChange={(e) => setAdjustDelta(Math.max(1, Number(e.target.value)))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Mandatory Audit Reason * (Min 5 chars)
                    </label>
                    <input
                      type="text"
                      value={adjustReason}
                      onChange={(e) => setAdjustReason(e.target.value)}
                      placeholder="e.g. Compensation for order issue, promotional credit correction"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      required
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      This adjustment is strictly separated from ordinary customer gifting and will be permanently recorded in the Admin Audit Trail.
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setAdjustModalUser(null)}
                      className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isAdjusting || !adjustReason || adjustReason.trim().length < 5}
                      className="px-4 py-2 bg-[#142B4A] hover:bg-[#1E3A5F] text-white font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isAdjusting ? 'Processing...' : 'Confirm Adjustment'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SHOPS & APPLICATIONS */}
      {activeTab === 'shops' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#142B4A]">Seller Applications & Storefront Moderation</h3>
              <p className="text-slate-500">
                Inspect complete seller portfolios, verify business credentials, approve or reject with mandatory audit reasons.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  dataSources.shops === 'live'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                {dataSources.shops === 'live' ? '● Live Firestore Data' : '○ Demo Showcase Mode'}
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                Pending Reviews: <strong className="text-amber-700 font-mono">{shops.filter((s) => s.status === 'pending').length}</strong>
              </span>
            </div>
          </div>

          {/* Search & Status Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            {/* Status Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'all', label: 'All Shops', count: shops.length },
                  { id: 'pending', label: 'Pending Approval', count: shops.filter((s) => s.status === 'pending').length },
                  { id: 'approved', label: 'Active Approved', count: shops.filter((s) => s.status === 'approved').length },
                  { id: 'suspended', label: 'Suspended', count: shops.filter((s) => s.status === 'suspended').length },
                  { id: 'rejected', label: 'Rejected', count: shops.filter((s) => s.status === 'rejected').length },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setShopFilter(tab.id)}
                  className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 cursor-pointer text-xs ${
                    shopFilter === tab.id
                      ? 'bg-[#142B4A] text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-200/60 border border-slate-200'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      shopFilter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <input
                type="text"
                value={shopSearch}
                onChange={(e) => setShopSearch(e.target.value)}
                placeholder="Search by name, owner, email, phone..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-[#142B4A]"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* Shops List */}
          <div className="space-y-3">
            {shops
              .filter((s) => {
                const matchesFilter = shopFilter === 'all' || s.status === shopFilter;
                const matchesSearch =
                  !shopSearch ||
                  s.name.toLowerCase().includes(shopSearch.toLowerCase()) ||
                  s.ownerName.toLowerCase().includes(shopSearch.toLowerCase()) ||
                  s.ownerEmail.toLowerCase().includes(shopSearch.toLowerCase()) ||
                  s.category.toLowerCase().includes(shopSearch.toLowerCase()) ||
                  s.phone.includes(shopSearch);
                return matchesFilter && matchesSearch;
              })
              .map((s) => (
                <div
                  key={s.id}
                  className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-slate-900 text-sm">{s.name}</h4>
                      <span className="text-[11px] text-slate-400 font-mono">({s.category})</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          s.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : s.status === 'pending'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : s.status === 'suspended'
                            ? 'bg-red-50 text-red-800 border border-red-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {s.status}
                      </span>
                    </div>

                    <p className="text-slate-600 text-[11px]">
                      <strong>Owner:</strong> {s.ownerName} (<span className="text-slate-500">{s.ownerEmail}</span>) · Phone: <span className="font-mono">{s.phone}</span>
                    </p>
                    <p className="text-slate-500 text-[11px] truncate max-w-xl">
                      <strong>Address:</strong> {s.address}
                    </p>

                    {/* Reasons & Moderation alerts */}
                    {s.status === 'rejected' && s.rejectionReason && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-[11px]">
                        <strong>Mandatory Rejection Reason:</strong> {s.rejectionReason}
                      </div>
                    )}
                    {s.status === 'suspended' && s.suspensionReason && (
                      <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px]">
                        <strong>Mandatory Suspension Reason:</strong> {s.suspensionReason}
                      </div>
                    )}
                    {s.additionalInfoRequested && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-[11px]">
                        <strong>Info Requested:</strong> {s.additionalInfoRequested}
                      </div>
                    )}
                    {s.reviewedBy && (
                      <div className="text-[10px] text-slate-400">
                        Last audited by {s.reviewedBy} on {s.reviewedAt ? formatDate(s.reviewedAt) : 'N/A'}
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      onClick={() => setSelectedShopForDetails(s)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                      title="Inspect complete seller portfolio & policies"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect Profile</span>
                    </button>

                    {s.status === 'pending' && (
                      <>
                        <button
                          onClick={() => approveShop(s.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => handleRequestShopInfo(s)}
                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Info className="w-3.5 h-3.5" />
                          <span>Request Info</span>
                        </button>
                        <button
                          onClick={() => handleRejectShop(s)}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject...</span>
                        </button>
                      </>
                    )}

                    {s.status === 'approved' && (
                      <>
                        <button
                          onClick={() => handleRequestShopInfo(s)}
                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Info className="w-3.5 h-3.5" />
                          <span>Request Info</span>
                        </button>
                        <button
                          onClick={() => handleSuspendShop(s)}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-lg cursor-pointer transition-colors"
                        >
                          Suspend...
                        </button>
                      </>
                    )}

                    {(s.status === 'suspended' || s.status === 'rejected') && (
                      <button
                        onClick={() => handleReinstateShop(s)}
                        className="px-3 py-1.5 bg-[#142B4A] hover:bg-[#1E3A5F] text-white font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reinstate Shop</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* TAB 5: ORDERS & REFUNDS */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 text-xs">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-[#142B4A]">Marketplace Orders & Refund Processing</h3>
            <p className="text-slate-500">
              Triggering a refund authoritatively calculates point reversals and records audit history.
            </p>
          </div>

          <div className="divide-y divide-slate-100 space-y-3">
            {orders.map((ord) => (
              <div key={ord.id} className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#142B4A] text-sm">#{ord.orderNumber}</span>
                    <span className="text-slate-400 font-mono">{formatDate(ord.createdAt)}</span>
                    <span className="px-2 py-0.5 uppercase text-[10px] font-bold rounded bg-slate-100 text-slate-700">
                      {ord.orderStatus}
                    </span>
                  </div>
                  <p className="text-slate-600 mt-1">
                    Customer: {ord.customerName} · {ord.items.length} items · Amount: <strong className="font-mono">{formatBDT(ord.totalAmount)}</strong>
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Points: +{ord.pointsEarned} pts {ord.pointsCredited ? '(Credited)' : '(Pending)'} · Points Used: {ord.pointsUsed} pts
                  </p>
                </div>

                <div>
                  {ord.orderStatus !== 'refunded' && ord.orderStatus !== 'cancelled' ? (
                    <button
                      onClick={() => handleRefundClick(ord.id, ord.orderNumber)}
                      className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Issue Refund & Reversal</span>
                    </button>
                  ) : (
                    <span className="text-red-600 font-semibold text-xs">Refunded / Cancelled</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: PRODUCTS MODERATION */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 text-xs">
          <h3 className="text-sm font-bold text-[#142B4A]">Product Catalogue Moderation</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {products.map((p) => (
              <div key={p.id} className="p-3 border border-slate-200 rounded-lg flex gap-3">
                <img
                  src={p.images[0]}
                  alt={p.title}
                  className="w-14 h-14 rounded-md object-cover border border-slate-200"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-800 truncate">{p.title}</h4>
                  <span className="text-slate-500 text-[11px] block">{p.shopName}</span>
                  <span className="font-mono font-bold text-[#142B4A]">{formatBDT(p.price)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: AUDIT TRAIL */}
      {activeTab === 'audit_logs' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 text-xs">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-[#142B4A]">Administrative Audit Trail</h3>
            <p className="text-slate-500">Permanent record of all platform-wide changes, approvals, and refunds</p>
          </div>

          <div className="space-y-3">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold font-mono text-[#142B4A]">{log.action}</span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    {formatDateTime(log.timestamp)}
                  </span>
                </div>
                <p className="text-slate-700">{log.details}</p>
                <span className="text-[10px] text-slate-500 block">
                  Executed by: {log.adminEmail}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: COMPLETE SELLER APPLICATION & POLICIES INSPECTION     */}
      {/* ------------------------------------------------------------- */}
      {selectedShopForDetails && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setSelectedShopForDetails(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 sm:p-7 z-10 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-[#142B4A]">{selectedShopForDetails.name}</h3>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      selectedShopForDetails.status === 'approved'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : selectedShopForDetails.status === 'pending'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : selectedShopForDetails.status === 'suspended'
                        ? 'bg-red-50 text-red-800 border border-red-200'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {selectedShopForDetails.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Category: <strong>{selectedShopForDetails.category}</strong> · Public Slug: <span className="font-mono">{selectedShopForDetails.slug}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedShopForDetails(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Visual Banner & Logo Preview */}
              <div className="relative rounded-xl overflow-hidden border border-slate-200 h-28 bg-slate-100">
                <img
                  src={selectedShopForDetails.banner}
                  alt="Shop Banner"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute -bottom-2 left-4 w-14 h-14 rounded-xl border-2 border-white shadow-md overflow-hidden bg-white">
                  <img
                    src={selectedShopForDetails.logo}
                    alt="Shop Logo"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>

              {/* Owner and Contact details */}
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Shop Owner</span>
                  <p className="font-medium text-slate-800 mt-0.5">{selectedShopForDetails.ownerName}</p>
                  <p className="text-slate-500 text-[11px]">{selectedShopForDetails.ownerEmail}</p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Official Phone & Support</span>
                  <p className="font-mono text-slate-800 mt-0.5">{selectedShopForDetails.phone}</p>
                  {selectedShopForDetails.contactPerson && (
                    <p className="text-slate-500 text-[11px]">Contact Person: {selectedShopForDetails.contactPerson}</p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Physical Warehouse / Fulfillment Address</span>
                  <p className="text-slate-700 mt-0.5">{selectedShopForDetails.address}</p>
                </div>
                {selectedShopForDetails.tradeLicenseNumber && (
                  <div className="sm:col-span-2">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Business Trade License / BIN</span>
                    <p className="font-mono font-bold text-slate-800 mt-0.5">{selectedShopForDetails.tradeLicenseNumber}</p>
                  </div>
                )}
              </div>

              {/* Store Story */}
              <div>
                <span className="font-bold text-[#142B4A] block mb-1">Store Overview & Story</span>
                <p className="p-3 bg-slate-50 rounded-lg text-slate-700 border border-slate-200 leading-relaxed">
                  {selectedShopForDetails.description}
                </p>
              </div>

              {/* Delivery & Return Policies */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-800 block mb-1">Dispatch & Delivery Policy</span>
                  <p className="text-slate-600 text-[11px]">{selectedShopForDetails.deliveryPolicy}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-800 block mb-1">Return, Refund & Cancellation</span>
                  <p className="text-slate-600 text-[11px]">{selectedShopForDetails.returnPolicy}</p>
                </div>
              </div>

              {/* Moderation Notes & Audit */}
              {(selectedShopForDetails.rejectionReason || selectedShopForDetails.suspensionReason || selectedShopForDetails.additionalInfoRequested) && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg space-y-1">
                  <span className="font-bold text-amber-900 block">Moderation History Notes</span>
                  {selectedShopForDetails.rejectionReason && (
                    <p className="text-red-700 text-[11px]">
                      <strong>Rejection Reason:</strong> {selectedShopForDetails.rejectionReason}
                    </p>
                  )}
                  {selectedShopForDetails.suspensionReason && (
                    <p className="text-amber-800 text-[11px]">
                      <strong>Suspension Reason:</strong> {selectedShopForDetails.suspensionReason}
                    </p>
                  )}
                  {selectedShopForDetails.additionalInfoRequested && (
                    <p className="text-blue-800 text-[11px]">
                      <strong>Additional Info Requested:</strong> {selectedShopForDetails.additionalInfoRequested}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <span className="text-[11px] text-slate-400">
                Created: {formatDate(selectedShopForDetails.createdAt)}
              </span>
              <div className="flex items-center gap-2">
                {selectedShopForDetails.status === 'pending' && (
                  <>
                    <button
                      onClick={() => {
                        approveShop(selectedShopForDetails.id);
                        setSelectedShopForDetails(null);
                      }}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve Shop</span>
                    </button>
                    <button
                      onClick={() => {
                        const s = selectedShopForDetails;
                        setSelectedShopForDetails(null);
                        handleRequestShopInfo(s);
                      }}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <Info className="w-3.5 h-3.5" />
                      <span>Request Info...</span>
                    </button>
                    <button
                      onClick={() => {
                        const s = selectedShopForDetails;
                        setSelectedShopForDetails(null);
                        handleRejectShop(s);
                      }}
                      className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject...</span>
                    </button>
                  </>
                )}
                {selectedShopForDetails.status === 'approved' && (
                  <button
                    onClick={() => {
                      const s = selectedShopForDetails;
                      setSelectedShopForDetails(null);
                      handleSuspendShop(s);
                    }}
                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-lg cursor-pointer"
                  >
                    Suspend Shop...
                  </button>
                )}
                {(selectedShopForDetails.status === 'suspended' || selectedShopForDetails.status === 'rejected') && (
                  <button
                    onClick={() => {
                      reinstateShop(selectedShopForDetails.id);
                      setSelectedShopForDetails(null);
                    }}
                    className="px-3.5 py-1.5 bg-[#142B4A] hover:bg-[#1E3A5F] text-white font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reinstate Shop</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: INTERACTIVE DECISION MODAL (REASON REQUIRED)          */}
      {/* ------------------------------------------------------------- */}
      {activeActionModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setActiveActionModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 z-10 border border-slate-200 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                {activeActionModal.type === 'reject' || activeActionModal.type === 'suspend' ? (
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                ) : activeActionModal.type === 'refund' ? (
                  <RotateCcw className="w-5 h-5 text-[#F47B44]" />
                ) : activeActionModal.type === 'reinstate' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <Info className="w-5 h-5 text-blue-500" />
                )}
                <h3 className="text-sm font-bold text-[#142B4A]">{activeActionModal.title}</h3>
              </div>
              <button
                onClick={() => setActiveActionModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-2 leading-relaxed">
              Target: <strong className="text-slate-900">{activeActionModal.targetName}</strong>
            </p>
            <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
              {activeActionModal.description}
            </p>

            {modalError && (
              <div className="mb-3 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {activeActionModal.requireReason && (
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mandatory Reason / Audit Notes *
                </label>
                <textarea
                  value={modalReasonInput}
                  onChange={(e) => {
                    setModalReasonInput(e.target.value);
                    if (modalError) setModalError(null);
                  }}
                  rows={3}
                  placeholder={activeActionModal.reasonPlaceholder || 'Enter specific, verifiable reason...'}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#142B4A]"
                  required
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  This justification is permanently stored in the audit trail and shown to the user.
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveActionModal(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg text-white shadow-xs transition-colors cursor-pointer ${
                  activeActionModal.type === 'reject' || activeActionModal.type === 'suspend'
                    ? 'bg-red-600 hover:bg-red-700'
                    : activeActionModal.type === 'reinstate'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-[#142B4A] hover:bg-[#1E3A5F]'
                }`}
              >
                Confirm & Record Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
