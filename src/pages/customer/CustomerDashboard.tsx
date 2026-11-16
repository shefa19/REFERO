import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { formatBDT, formatPoints, formatDate, formatDateTime } from '../../utils/formatters';
import { resolveProductImage, IMAGE_ASSETS } from '../../utils/imageAssets';
import {
  User,
  Sparkles,
  ShoppingBag,
  Share2,
  ArrowRightLeft,
  Heart,
  Copy,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCcw,
  Check,
  X,
  ExternalLink,
  ShieldCheck,
  Store,
  AlertTriangle,
  Send,
  Inbox,
  Star,
} from 'lucide-react';
import { WriteReviewModal } from '../../components/products/WriteReviewModal';

export const CustomerDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    orders,
    reviews,
    pointTransactions,
    transferRequests,
    referrals,
    wishlist,
    products,
    navigateTo,
    openAuthModal,
    customerTab,
    setCustomerTab,
    submitPointTransfer,
    requestPointsFromFriend,
    approvePointTransfer,
    rejectPointTransfer,
    confirmOrderReceived,
    showToast,
    pointsConfig,
    shops,
    openSellerModal,
  } = useStore();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'orders' | 'points' | 'referrals' | 'transfers' | 'wishlist'
  >(customerTab || 'overview');

  useEffect(() => {
    if (customerTab) {
      setActiveTab(customerTab);
    }
  }, [customerTab]);

  const [processingTransfers, setProcessingTransfers] = useState<Record<string, boolean>>({});
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);

  const [reviewModalData, setReviewModalData] = useState<{
    isOpen: boolean;
    orderId: string;
    orderNumber?: string;
    productId: string;
    productTitle?: string;
    productImage?: string;
  }>({
    isOpen: false,
    orderId: '',
    productId: '',
  });

  const isProductReviewedInOrder = (productId: string, orderId: string) => {
    if (!currentUser) return false;
    return reviews.some(
      (r) =>
        r.productId === productId &&
        r.orderId === orderId &&
        r.customerId === currentUser.id
    );
  };

  const handleAcceptTransfer = async (reqId: string) => {
    if (processingTransfers[reqId]) return;
    setProcessingTransfers((prev) => ({ ...prev, [reqId]: true }));
    try {
      const res = await approvePointTransfer(reqId);
      if (!res.success) {
        showToast(res.message, 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to accept point transfer.', 'error');
    } finally {
      setProcessingTransfers((prev) => ({ ...prev, [reqId]: false }));
    }
  };

  const handleDeclineTransfer = async (reqId: string) => {
    if (processingTransfers[reqId]) return;
    setProcessingTransfers((prev) => ({ ...prev, [reqId]: true }));
    try {
      const res = await rejectPointTransfer(reqId);
      if (!res.success) {
        showToast(res.message, 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to decline point transfer.', 'error');
    } finally {
      setProcessingTransfers((prev) => ({ ...prev, [reqId]: false }));
    }
  };

  // Transfer & Request forms
  const [transferFormMode, setTransferFormMode] = useState<'transfer' | 'request'>('transfer');
  const [transferRecipient, setTransferRecipient] = useState('');
  const [transferAmount, setTransferAmount] = useState<number>(50);
  const [transferNote, setTransferNote] = useState('');
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);

  const [requestTargetEmail, setRequestTargetEmail] = useState('');
  const [requestAmount, setRequestAmount] = useState<number>(50);
  const [requestNote, setRequestNote] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  const [copiedReferral, setCopiedReferral] = useState(false);

  if (!currentUser) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 shadow-sm space-y-6">
          <div className="w-16 h-16 bg-[#142B4A]/10 text-[#142B4A] rounded-2xl flex items-center justify-center mx-auto">
            <User className="w-8 h-8 text-[#F47B44]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#142B4A]">
              Customer Account Required
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              Please sign in to view your personal REFERO Points balance, track orders, share your referral code, and accept point transfers.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => openAuthModal('login')}
              className="w-full sm:w-auto px-6 py-2.5 bg-[#142B4A] hover:bg-[#1E3A5F] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
            >
              Sign In to Your Account
            </button>
            <button
              onClick={() => openAuthModal('register')}
              className="w-full sm:w-auto px-6 py-2.5 bg-[#F47B44] hover:bg-[#e06830] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
            >
              Create Free Account
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

  // Filtered customer-specific datasets
  const myOrders = orders.filter((o) => o.customerId === currentUser.id);
  const myTransactions = pointTransactions.filter((t) => t.userId === currentUser.id);
  const incomingTransfers = transferRequests.filter(
    (t) => t.recipientId === currentUser.id || t.recipientEmail.toLowerCase() === currentUser.email.toLowerCase()
  );
  const outgoingTransfers = transferRequests.filter((t) => t.senderId === currentUser.id);
  const myReferrals = referrals.filter((r) => r.referrerUserId === currentUser.id);
  const wishlistedProducts = products.filter((p) => wishlist.includes(p.id));

  const userShop = shops.find(
    (s) => s.ownerId === currentUser.id || (currentUser.shopId && s.id === currentUser.shopId)
  );
  const isShopkeeper = currentUser.role === 'shopkeeper' || userShop?.status === 'approved';
  const isPendingSeller = !isShopkeeper && userShop?.status === 'pending';
  const isRejectedSeller = !isShopkeeper && userShop?.status === 'rejected';

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(currentUser.referralCode);
    setCopiedReferral(true);
    showToast(`Referral code ${currentUser.referralCode} copied!`);
    setTimeout(() => setCopiedReferral(false), 2000);
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferRecipient || transferAmount <= 0) {
      showToast('Please provide a valid recipient email and points amount.', 'error');
      return;
    }
    if (currentUser.pointsBalance <= 0 || currentUser.pointsBalance < transferAmount) {
      showToast('Insufficient points balance.', 'error');
      return;
    }
    setIsSubmittingTransfer(true);
    const res = await submitPointTransfer(transferRecipient, transferAmount, transferNote);
    setIsSubmittingTransfer(false);
    if (res.success) {
      setTransferRecipient('');
      setTransferNote('');
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestTargetEmail || requestAmount <= 0) {
      showToast('Please provide a valid friend email and points amount to request.', 'error');
      return;
    }
    if (requestTargetEmail.trim().toLowerCase() === currentUser.email.toLowerCase()) {
      showToast('You cannot request points from yourself.', 'error');
      return;
    }
    setIsSubmittingRequest(true);
    const res = await requestPointsFromFriend(requestTargetEmail, requestAmount, requestNote);
    setIsSubmittingRequest(false);
    if (res.success) {
      setRequestTargetEmail('');
      setRequestNote('');
    } else {
      showToast(res.message, 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Customer Header Strip */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#142B4A] text-white flex items-center justify-center text-xl font-bold">
            {currentUser.fullName.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-[#142B4A]">{currentUser.fullName}</h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-[#EAF3FF] text-[#142B4A] rounded-md border border-blue-200">
                Verified Customer
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {currentUser.email} · Referral Code: <strong className="font-mono text-[#F47B44]">{currentUser.referralCode}</strong>
            </p>
          </div>
        </div>

        {/* Available Points Counter */}
        <div className="flex items-center gap-3">
          <div className="bg-[#EAF3FF] border border-blue-200 rounded-xl p-3.5 text-right">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
              Available REFERO Points
            </span>
            <div className="flex items-center justify-end gap-1.5 mt-0.5">
              <Sparkles className="w-5 h-5 text-[#F47B44]" />
              <span className="text-2xl font-extrabold font-mono tabular-nums text-[#142B4A]">
                {formatPoints(currentUser.pointsBalance)}
              </span>
              <span className="text-xs text-slate-500 font-semibold">pts</span>
            </div>
            <span className="text-[11px] text-[#F47B44] font-medium block">
              ≈ {formatBDT(currentUser.pointsBalance * pointsConfig.pointsToBdtRate)} Checkout Value
            </span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 gap-2 sm:gap-6 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-1 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'overview'
              ? 'text-[#142B4A] border-b-2 border-[#142B4A]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Account Overview
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 px-1 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'orders'
              ? 'text-[#142B4A] border-b-2 border-[#142B4A]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          My Orders ({myOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('points')}
          className={`pb-3 px-1 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'points'
              ? 'text-[#142B4A] border-b-2 border-[#142B4A]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Points Ledger ({myTransactions.length})
        </button>
        <button
          onClick={() => setActiveTab('referrals')}
          className={`pb-3 px-1 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'referrals'
              ? 'text-[#142B4A] border-b-2 border-[#142B4A]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Referral Centre ({myReferrals.length})
        </button>
        <button
          onClick={() => setActiveTab('transfers')}
          className={`pb-3 px-1 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'transfers'
              ? 'text-[#142B4A] border-b-2 border-[#142B4A]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Point Transfers ({incomingTransfers.filter((t) => t.status === 'pending').length} pending)
        </button>
        <button
          onClick={() => setActiveTab('wishlist')}
          className={`pb-3 px-1 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'wishlist'
              ? 'text-[#142B4A] border-b-2 border-[#142B4A]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Saved Wishlist ({wishlistedProducts.length})
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Total Orders Placed</span>
              <p className="text-2xl font-bold font-mono text-[#142B4A] mt-1">{myOrders.length}</p>
              <span className="text-[11px] text-slate-400">All vendors included</span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Pending Points</span>
              <p className="text-2xl font-bold font-mono text-[#F47B44] mt-1">
                +{formatPoints(currentUser.pendingPoints || 0)} pts
              </p>
              <span className="text-[11px] text-slate-400">Credits on order delivery</span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Successful Referrals</span>
              <p className="text-2xl font-bold font-mono text-emerald-700 mt-1">
                {myReferrals.filter((r) => r.status === 'reward_issued').length}
              </p>
              <span className="text-[11px] text-slate-400">150 pts awarded per referral</span>
            </div>
          </div>

          {/* Seller / Storefront Status Banner */}
          {isShopkeeper ? (
            <div className="bg-gradient-to-r from-[#142B4A] to-[#1E3A5F] text-white p-5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <Store className="w-5 h-5 text-[#F47B44]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <span>Approved Marketplace Seller</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                      Active
                    </span>
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Your store {userShop ? `"${userShop.name}"` : ''} is live. Manage your inventory, orders, and policies in your Shopkeeper Portal.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigateTo('shopkeeper_dashboard')}
                className="px-4 py-2 bg-[#F47B44] hover:bg-[#E06A33] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 shadow-xs flex items-center gap-1.5"
              >
                <span>Shopkeeper Portal</span>
                <span>&rarr;</span>
              </button>
            </div>
          ) : isPendingSeller ? (
            <div className="bg-amber-50 border border-amber-300 p-5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-200/60 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-amber-700 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-900 flex items-center gap-2">
                    <span>Seller Storefront Application Under Review</span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-800 text-[10px] font-bold">
                      In Review
                    </span>
                  </h4>
                  <p className="text-xs text-amber-800/90 mt-0.5">
                    Your application for "{userShop?.name || 'Your Store'}" has been submitted to marketplace administration. You will be notified immediately upon approval.
                  </p>
                </div>
              </div>
              <div className="text-xs font-semibold text-amber-700 bg-amber-100/80 px-3 py-1.5 rounded-lg shrink-0">
                Awaiting Admin Verification
              </div>
            </div>
          ) : isRejectedSeller ? (
            <div className="bg-rose-50 border border-rose-300 p-5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-rose-200/60 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-rose-700" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-rose-900">
                    Seller Application Status: Additional Information Required
                  </h4>
                  <p className="text-xs text-rose-800/90 mt-0.5">
                    Reason provided: <strong className="font-medium">{userShop?.rejectionReason || 'Application requirements not met.'}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={openSellerModal}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 shadow-xs"
              >
                Review & Reapply
              </button>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-slate-50 to-orange-50/40 border border-slate-200 p-5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#142B4A]/10 flex items-center justify-center shrink-0">
                  <Store className="w-5 h-5 text-[#142B4A]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#142B4A]">Sell on REFERO Marketplace</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Open your digital storefront, upload groceries and products, and start earning across Dhaka.
                  </p>
                </div>
              </div>
              <button
                onClick={openSellerModal}
                className="px-4 py-2 bg-[#F47B44] hover:bg-[#E06A33] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 shadow-xs flex items-center gap-1.5"
              >
                <span>Apply as Seller</span>
                <span>&rarr;</span>
              </button>
            </div>
          )}

          {/* Recent Orders Strip */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-[#142B4A]">Recent Orders</h3>
              <button
                onClick={() => setActiveTab('orders')}
                className="text-xs font-semibold text-[#142B4A] hover:underline"
              >
                View all orders
              </button>
            </div>

            {myOrders.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No orders placed yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {myOrders.slice(0, 3).map((ord) => (
                  <div key={ord.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                    <div>
                      <span className="font-bold text-[#142B4A]">#{ord.orderNumber}</span>
                      <p className="text-slate-500 text-[11px]">
                        {ord.items.length} items · {formatDate(ord.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold font-mono">{formatBDT(ord.totalAmount)}</span>
                      <span className="block text-[11px] font-semibold capitalize text-emerald-700">
                        {ord.orderStatus}
                      </span>
                    </div>
                    <button
                      onClick={() => navigateTo('order_tracking', { orderId: ord.id })}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-md transition-colors"
                    >
                      Track
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MY ORDERS */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {myOrders.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center">
              <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-[#142B4A]">You have no active orders</h3>
              <button
                onClick={() => navigateTo('products')}
                className="mt-3 px-4 py-2 bg-[#142B4A] text-white text-xs font-semibold rounded-lg"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            myOrders.map((ord) => (
              <div key={ord.id} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                  <div>
                    <span className="text-xs font-bold text-[#142B4A]">Order #{ord.orderNumber}</span>
                    <span className="text-slate-400 text-xs ml-2">Placed on {formatDate(ord.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold font-mono text-[#142B4A]">
                      {formatBDT(ord.totalAmount)}
                    </span>
                    <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full uppercase bg-slate-100 text-slate-700">
                      {ord.orderStatus}
                    </span>
                  </div>
                </div>

                {/* Items */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {ord.items.map((it) => {
                    const canReview = ord.orderStatus === 'completed' || ord.orderStatus === 'delivered';
                    const hasReviewed = isProductReviewedInOrder(it.productId, ord.id);

                    return (
                      <div
                        key={it.productId}
                        className="flex items-center justify-between gap-2.5 p-2 rounded-lg bg-slate-50/80 border border-slate-100"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <img
                            src={it.image}
                            alt={it.title}
                            className="w-10 h-10 rounded-md object-cover border border-slate-200 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-800 truncate">{it.title}</p>
                            <span className="text-[11px] text-slate-500 block truncate">
                              Qty: {it.quantity} · {it.shopName}
                            </span>
                          </div>
                        </div>

                        {canReview && (
                          <div className="shrink-0">
                            {hasReviewed ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>Reviewed</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  setReviewModalData({
                                    isOpen: true,
                                    orderId: ord.id,
                                    orderNumber: ord.orderNumber,
                                    productId: it.productId,
                                    productTitle: it.title,
                                    productImage: it.image,
                                  })
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#F47B44] hover:bg-[#e06830] text-white text-[10px] font-bold transition-all shadow-2xs hover:shadow-xs cursor-pointer active:scale-95"
                              >
                                <Star className="w-3 h-3 fill-white" />
                                <span>Rate Product</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between border-t border-slate-100 text-xs gap-2">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Sparkles className="w-3.5 h-3.5 text-[#F47B44]" />
                    <span>
                      Earned: <strong>+{ord.pointsEarned} pts</strong> (
                      {ord.pointsCredited ? 'Credited' : ord.orderStatus === 'delivered' ? 'Ready to Claim' : 'Pending Delivery'})
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Simplified Customer Confirmation: Click Confirm Received to claim loyalty points */}
                    {ord.orderStatus === 'delivered' && !ord.pointsCredited && (
                      <button
                        type="button"
                        onClick={async () => {
                          setConfirmingOrderId(ord.id);
                          try {
                            await confirmOrderReceived(ord.id);
                          } finally {
                            setConfirmingOrderId(null);
                          }
                        }}
                        disabled={confirmingOrderId === ord.id}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        {confirmingOrderId === ord.id ? (
                          <>
                            <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Claiming...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Confirm Received (+{ord.pointsEarned} pts)</span>
                          </>
                        )}
                      </button>
                    )}

                    {ord.orderStatus === 'completed' && (
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md text-[11px] font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Completed & Points Credited</span>
                      </span>
                    )}

                    <button
                      onClick={() => navigateTo('order_tracking', { orderId: ord.id })}
                      className="text-[#142B4A] hover:underline font-semibold flex items-center gap-1"
                    >
                      <span>View Tracking & Receipt</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: IMMUTABLE POINTS LEDGER */}
      {activeTab === 'points' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div>
              <h3 className="text-sm font-bold text-[#142B4A]">Immutable REFERO Points Ledger</h3>
              <p className="text-xs text-slate-500">
                Official audit trail of all loyalty points earned, redeemed, and transferred
              </p>
            </div>
            <button
              onClick={() => navigateTo('policy_points')}
              className="text-xs text-[#142B4A] hover:underline font-semibold"
            >
              Read Points Policy
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Transaction Description</th>
                  <th className="py-2.5 px-3">Rule Applied</th>
                  <th className="py-2.5 px-3 text-right">Points</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-3 text-slate-500 font-mono whitespace-nowrap">
                      {formatDateTime(tx.createdAt)}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-800">
                      {tx.description}
                    </td>
                    <td className="py-3 px-3 text-slate-500 text-[11px]">
                      {tx.ruleSnapshot}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold whitespace-nowrap">
                      <span className={tx.points > 0 ? 'text-emerald-700' : 'text-[#F47B44]'}>
                        {tx.points > 0 ? `+${tx.points}` : tx.points} pts
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 font-semibold text-[10px] rounded">
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: REFERRAL CENTRE */}
      {activeTab === 'referrals' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-[#142B4A] to-[#1E3A5F] rounded-2xl p-6 text-white space-y-4">
            <div className="max-w-xl">
              <span className="text-xs font-bold text-[#F47B44] uppercase tracking-wider">
                Earn 150 Points Per Referral
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold mt-1">
                Your Personal Referral Code
              </h2>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Give your code to friends. When they register with it, they get 50 bonus points. When they complete their first qualifying delivered order, you receive <strong>150 REFERO Points</strong>!
              </p>
            </div>

            <div className="flex items-center gap-3 max-w-sm">
              <div className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl font-mono text-lg font-bold tracking-widest text-white flex-1 text-center">
                {currentUser.referralCode}
              </div>
              <button
                onClick={handleCopyReferral}
                className="px-4 py-2.5 bg-[#F47B44] hover:bg-[#e06830] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedReferral ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedReferral ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <h3 className="text-sm font-bold text-[#142B4A]">Referred Friends & History</h3>
            {myReferrals.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                No referrals registered yet. Share your code to start earning!
              </p>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {myReferrals.map((ref) => (
                  <div key={ref.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-800">{ref.referredUserName}</p>
                      <span className="text-slate-500 text-[11px]">{ref.referredUserEmail}</span>
                    </div>
                    <div className="text-right">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          ref.status === 'reward_issued'
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        {ref.status === 'reward_issued' ? 'Reward Credited' : 'Registered (Order Pending)'}
                      </span>
                      {ref.status === 'reward_issued' && (
                        <span className="block text-[11px] font-mono font-bold text-[#F47B44]">
                          +{ref.rewardPoints} pts earned
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: POINT TRANSFERS & REQUESTS */}
      {activeTab === 'transfers' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Transfer & Request Form Card */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            {/* Mode Toggle Buttons */}
            <div className="flex rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setTransferFormMode('transfer')}
                className={`flex-1 py-2 px-3 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  transferFormMode === 'transfer'
                    ? 'bg-[#142B4A] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Transfer Points</span>
              </button>
              <button
                type="button"
                onClick={() => setTransferFormMode('request')}
                className={`flex-1 py-2 px-3 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  transferFormMode === 'request'
                    ? 'bg-[#142B4A] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Inbox className="w-3.5 h-3.5" />
                <span>Request Points</span>
              </button>
            </div>

            {transferFormMode === 'transfer' ? (
              /* Transfer Mode Form */
              <div>
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-3.5">
                  <ArrowRightLeft className="w-4 h-4 text-[#F47B44]" />
                  <div>
                    <h3 className="text-sm font-bold text-[#142B4A]">Transfer Points to a Friend</h3>
                    <p className="text-[11px] text-slate-500">Gift your earned points to any registered customer</p>
                  </div>
                </div>

                <form onSubmit={handleCreateTransfer} className="space-y-3.5 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Recipient Email Address *
                    </label>
                    <input
                      type="email"
                      value={transferRecipient}
                      onChange={(e) => setTransferRecipient(e.target.value)}
                      placeholder="e.g. friend@gmail.com"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#142B4A]"
                      required
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-slate-700">Points to Transfer *</label>
                      <span className="text-slate-500 font-mono">
                        Available: {formatPoints(currentUser.pointsBalance)} pts
                      </span>
                    </div>
                    <input
                      type="number"
                      min="1"
                      max={currentUser.pointsBalance}
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#142B4A] font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Short Gift Note (Optional)</label>
                    <input
                      type="text"
                      value={transferNote}
                      onChange={(e) => setTransferNote(e.target.value)}
                      placeholder="e.g. Enjoy this loyalty bonus!"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden"
                    />
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg text-slate-600 text-[11px] leading-relaxed border border-slate-200/80">
                    <strong>Bilateral Verification:</strong> A pending transfer is generated. Points are debited from your account and credited to your friend only when they click Accept.
                  </div>

                  {currentUser.pointsBalance <= 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-center gap-2">
                      <span className="font-semibold">Insufficient points:</span> You currently have 0 spendable REFERO Points.
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmittingTransfer || currentUser.pointsBalance <= 0 || currentUser.pointsBalance < transferAmount}
                    className="w-full py-2.5 bg-[#142B4A] hover:bg-[#1E3A5F] text-white font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                  >
                    <span>{isSubmittingTransfer ? 'Sending Transfer...' : 'Send Points Transfer'}</span>
                  </button>
                </form>
              </div>
            ) : (
              /* Request Mode Form */
              <div>
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-3.5">
                  <Inbox className="w-4 h-4 text-[#F47B44]" />
                  <div>
                    <h3 className="text-sm font-bold text-[#142B4A]">Request Points from a Friend</h3>
                    <p className="text-[11px] text-slate-500">Ask a friend or family member to transfer points</p>
                  </div>
                </div>

                <form onSubmit={handleCreateRequest} className="space-y-3.5 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Friend's Email Address *
                    </label>
                    <input
                      type="email"
                      value={requestTargetEmail}
                      onChange={(e) => setRequestTargetEmail(e.target.value)}
                      placeholder="e.g. friend@gmail.com"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#142B4A]"
                      required
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-slate-700">Points Needed *</label>
                      <span className="text-slate-500 font-mono">
                        Your balance: {formatPoints(currentUser.pointsBalance)} pts
                      </span>
                    </div>
                    <input
                      type="number"
                      min="1"
                      max="10000"
                      value={requestAmount}
                      onChange={(e) => setRequestAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#142B4A] font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Reason / Note (Optional)</label>
                    <input
                      type="text"
                      value={requestNote}
                      onChange={(e) => setRequestNote(e.target.value)}
                      placeholder="e.g. Need 50 points to complete grocery order!"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden"
                    />
                  </div>

                  <div className="p-3 bg-blue-50/70 rounded-lg text-blue-900 text-[11px] leading-relaxed border border-blue-200/80">
                    <strong>How Point Requests Work:</strong> Your friend will receive an in-app notification and an Incoming Request. When they review and click "Accept & Send", their points will be debited and credited directly to you.
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingRequest || requestAmount <= 0}
                    className="w-full py-2.5 bg-[#F47B44] hover:bg-[#E06A33] text-white font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                  >
                    <span>{isSubmittingRequest ? 'Sending Request...' : 'Send Point Request'}</span>
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Incoming & Outgoing Requests Column */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Incoming Point Transfers (Offers from others to you) */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-[#142B4A] flex items-center gap-2">
                  <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                  <span>Incoming Point Transfers (Gifts to You)</span>
                </h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                  {incomingTransfers.filter((t) => (!t.requestType || t.requestType === 'transfer') && t.status === 'pending').length} pending
                </span>
              </div>

              {incomingTransfers.filter((t) => !t.requestType || t.requestType === 'transfer').length === 0 ? (
                <p className="text-xs text-slate-500 py-2">No incoming point transfers from friends.</p>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {incomingTransfers
                    .filter((t) => !t.requestType || t.requestType === 'transfer')
                    .map((req) => (
                      <div key={req.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-800">
                            {req.senderName} ({req.senderEmail})
                          </p>
                          <p className="text-slate-500 text-[11px] mt-0.5">
                            Gifting you: <strong className="text-emerald-700 font-mono font-bold">+{req.points} pts</strong> {req.note && `· "${req.note}"`}
                          </p>
                          <span className="text-[10px] text-slate-400 font-mono">{formatDateTime(req.createdAt)}</span>
                        </div>

                        {req.status === 'pending' ? (
                          <div className="flex items-center gap-2 self-start sm:self-auto">
                            <button
                              type="button"
                              onClick={() => handleAcceptTransfer(req.id)}
                              disabled={Boolean(processingTransfers[req.id])}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-md font-semibold cursor-pointer transition-colors text-xs flex items-center gap-1.5 shadow-xs"
                            >
                              {processingTransfers[req.id] ? (
                                <span className="flex items-center gap-1.5">
                                  <span className="w-2.5 h-2.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                                  <span>Accepting...</span>
                                </span>
                              ) : (
                                <span>Accept (+{req.points} pts)</span>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeclineTransfer(req.id)}
                              disabled={Boolean(processingTransfers[req.id])}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-md font-semibold cursor-pointer transition-colors text-xs"
                            >
                              <span>Decline</span>
                            </button>
                          </div>
                        ) : (
                          <span
                            className={`px-2 py-0.5 uppercase text-[10px] font-bold rounded self-start sm:self-auto ${
                              req.status === 'accepted' || req.status === 'approved'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : req.status === 'rejected'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {req.status}
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* 2. Incoming Point Requests (Friends asking YOU for points) */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-[#142B4A] flex items-center gap-2">
                  <Inbox className="w-4 h-4 text-[#F47B44]" />
                  <span>Incoming Point Requests (Friends Asking You for Points)</span>
                </h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-100">
                  {incomingTransfers.filter((t) => t.requestType === 'request' && t.status === 'pending').length} pending
                </span>
              </div>

              {incomingTransfers.filter((t) => t.requestType === 'request').length === 0 ? (
                <p className="text-xs text-slate-500 py-2">No incoming point requests from friends.</p>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {incomingTransfers
                    .filter((t) => t.requestType === 'request')
                    .map((req) => {
                      const hasEnough = currentUser.pointsBalance >= req.points;
                      return (
                        <div key={req.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <p className="font-bold text-slate-800">
                              {req.senderName} ({req.senderEmail})
                            </p>
                            <p className="text-slate-500 text-[11px] mt-0.5">
                              Requesting: <strong className="text-[#F47B44] font-mono font-bold">{req.points} pts</strong> {req.note && `· "${req.note}"`}
                            </p>
                            <span className="text-[10px] text-slate-400 font-mono">{formatDateTime(req.createdAt)}</span>
                          </div>

                          {req.status === 'pending' ? (
                            <div className="flex items-center gap-2 self-start sm:self-auto">
                              <button
                                type="button"
                                onClick={() => handleAcceptTransfer(req.id)}
                                disabled={Boolean(processingTransfers[req.id]) || !hasEnough}
                                title={!hasEnough ? 'Insufficient balance to fulfill this request' : 'Accept and send points'}
                                className="px-3 py-1.5 bg-[#142B4A] hover:bg-[#1E3A5F] disabled:opacity-50 text-white rounded-md font-semibold cursor-pointer transition-colors text-xs flex items-center gap-1.5 shadow-xs"
                              >
                                {processingTransfers[req.id] ? (
                                  <span className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                                    <span>Sending...</span>
                                  </span>
                                ) : (
                                  <span>{hasEnough ? `Accept & Send (${req.points} pts)` : 'Insufficient Balance'}</span>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeclineTransfer(req.id)}
                                disabled={Boolean(processingTransfers[req.id])}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-md font-semibold cursor-pointer transition-colors text-xs"
                              >
                                <span>Decline</span>
                              </button>
                            </div>
                          ) : (
                            <span
                              className={`px-2 py-0.5 uppercase text-[10px] font-bold rounded self-start sm:self-auto ${
                                req.status === 'accepted' || req.status === 'approved'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : req.status === 'rejected'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                            >
                              {req.status}
                            </span>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* 3. Outgoing Point Transfers (Transfers you initiated) */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
              <h3 className="text-sm font-bold text-[#142B4A] flex items-center gap-2 pb-2 border-b border-slate-100">
                <ArrowUpRight className="w-4 h-4 text-[#142B4A]" />
                <span>Outgoing Point Transfers (Gifts Sent by You)</span>
              </h3>

              {outgoingTransfers.filter((t) => !t.requestType || t.requestType === 'transfer').length === 0 ? (
                <p className="text-xs text-slate-500 py-2">No outgoing point transfers.</p>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {outgoingTransfers
                    .filter((t) => !t.requestType || t.requestType === 'transfer')
                    .map((req) => (
                      <div key={req.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <div>
                          <span className="font-medium text-slate-800">To: {req.recipientEmail}</span>
                          <span className="text-slate-400 text-[11px] ml-2 font-mono">
                            {formatDate(req.createdAt)}
                          </span>
                          {req.note && <p className="text-[11px] text-slate-500 italic">"{req.note}"</p>}
                        </div>
                        <div className="flex items-center gap-2 font-mono self-start sm:self-auto">
                          <span className="font-bold text-[#142B4A]">{req.points} pts</span>
                          <span
                            className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded ${
                              req.status === 'accepted' || req.status === 'approved'
                                ? 'bg-emerald-50 text-emerald-700'
                                : req.status === 'pending'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {req.status}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* 4. Outgoing Point Requests (Requests you sent to friends) */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
              <h3 className="text-sm font-bold text-[#142B4A] flex items-center gap-2 pb-2 border-b border-slate-100">
                <Inbox className="w-4 h-4 text-[#F47B44]" />
                <span>Outgoing Point Requests (You Asked Friends for Points)</span>
              </h3>

              {outgoingTransfers.filter((t) => t.requestType === 'request').length === 0 ? (
                <p className="text-xs text-slate-500 py-2">No outgoing point requests sent.</p>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {outgoingTransfers
                    .filter((t) => t.requestType === 'request')
                    .map((req) => (
                      <div key={req.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <div>
                          <span className="font-medium text-slate-800">Requested from: {req.recipientEmail}</span>
                          <span className="text-slate-400 text-[11px] ml-2 font-mono">
                            {formatDate(req.createdAt)}
                          </span>
                          {req.note && <p className="text-[11px] text-slate-500 italic">"{req.note}"</p>}
                        </div>
                        <div className="flex items-center gap-2 font-mono self-start sm:self-auto">
                          <span className="font-bold text-[#F47B44]">+{req.points} pts</span>
                          <span
                            className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded ${
                              req.status === 'accepted' || req.status === 'approved'
                                ? 'bg-emerald-50 text-emerald-700'
                                : req.status === 'pending'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {req.status === 'accepted' || req.status === 'approved' ? 'Fulfilled' : req.status}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: WISHLIST */}
      {activeTab === 'wishlist' && (
        <div className="space-y-4">
          {wishlistedProducts.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center">
              <Heart className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-[#142B4A]">Your wishlist is empty</h3>
              <button
                onClick={() => navigateTo('products')}
                className="mt-3 px-4 py-2 bg-[#142B4A] text-white text-xs font-semibold rounded-lg"
              >
                Discover Items
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {wishlistedProducts.map((p) => (
                <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-4 flex gap-3 text-xs">
                  <img
                    src={p.images[0]}
                    alt={p.title}
                    className="w-16 h-16 rounded-lg object-cover border border-slate-200"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-slate-800 truncate">{p.title}</h4>
                      <span className="font-mono font-bold text-[#142B4A]">{formatBDT(p.price)}</span>
                    </div>
                    <button
                      onClick={() => navigateTo('product_detail', { productId: p.id })}
                      className="text-[#142B4A] hover:underline font-semibold text-[11px]"
                    >
                      View Product
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Product Review Modal */}
      <WriteReviewModal
        isOpen={reviewModalData.isOpen}
        onClose={() => setReviewModalData((prev) => ({ ...prev, isOpen: false }))}
        orderId={reviewModalData.orderId}
        orderNumber={reviewModalData.orderNumber}
        productId={reviewModalData.productId}
        productTitle={reviewModalData.productTitle}
        productImage={reviewModalData.productImage}
      />
    </div>
  );
};
