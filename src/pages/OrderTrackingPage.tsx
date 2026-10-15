import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { formatBDT, formatPoints, formatDate } from '../utils/formatters';
import {
  CheckCircle2,
  Package,
  Truck,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  Clock,
  Printer,
  AlertCircle,
  X,
} from 'lucide-react';

export const OrderTrackingPage: React.FC = () => {
  const { selectedOrderId, orders, navigateTo, processRefund, showToast } = useStore();
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [refundError, setRefundError] = useState('');
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);

  const order = orders.find((o) => o.id === selectedOrderId) || orders[0];

  if (!order) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <h2 className="text-lg font-bold text-[#142B4A]">No order found</h2>
        <button
          onClick={() => navigateTo('home')}
          className="mt-4 px-4 py-2 bg-[#142B4A] text-white text-xs font-semibold rounded-lg"
        >
          Return Home
        </button>
      </div>
    );
  }

  const steps = [
    { key: 'placed', label: 'Order Placed', desc: 'Received by marketplace' },
    { key: 'confirmed', label: 'Confirmed', desc: 'Shopkeeper accepted' },
    { key: 'processing', label: 'Processing', desc: 'Packaging with seal' },
    { key: 'shipped', label: 'Dispatched', desc: 'With courier partner' },
    { key: 'delivered', label: 'Delivered', desc: 'Points awarded' },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === order.orderStatus);
  const isDelivered = order.orderStatus === 'delivered';
  const isRefunded = order.orderStatus === 'refunded';

  const handleOpenRefundModal = () => {
    setRefundReason('');
    setRefundError('');
    setIsRefundModalOpen(true);
  };

  const handleConfirmRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundReason.trim()) {
      setRefundError('A mandatory reason is required to process cancellation or refund.');
      return;
    }
    setIsSubmittingRefund(true);
    try {
      const res = await processRefund(order.id, refundReason.trim());
      setIsSubmittingRefund(false);
      setIsRefundModalOpen(false);
      if (res.success) {
        showToast('Refund and cancellation request submitted successfully.');
      } else {
        showToast(res.message, 'error');
      }
    } catch (err: any) {
      setIsSubmittingRefund(false);
      showToast(err.message || 'Failed to process refund', 'error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigateTo('home')}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#142B4A] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Continue Shopping</span>
        </button>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <Printer className="w-3.5 h-3.5 text-slate-500" />
          <span>Print Receipt</span>
        </button>
      </div>

      {/* Confirmation Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">
                {isRefunded ? 'Order Refunded' : 'Order Confirmed'}
              </span>
              <h1 className="text-xl font-extrabold text-[#142B4A]">
                Order #{order.orderNumber}
              </h1>
              <span className="text-xs text-slate-500">
                Placed on {formatDate(order.createdAt)} · Paid via {order.paymentMethod.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-500 block">Total Amount</span>
            <span className="text-xl font-extrabold text-[#142B4A] font-mono tabular-nums">
              {formatBDT(order.totalAmount)}
            </span>
          </div>
        </div>

        {/* Timeline Tracking Strip */}
        <div className="py-4">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">
            Live Fulfillment Tracking
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-2">
            {steps.map((step, idx) => {
              const isPast = idx <= (currentStepIndex === -1 ? 0 : currentStepIndex);
              const isCurrent = idx === currentStepIndex;

              return (
                <div
                  key={step.key}
                  className={`p-3 rounded-xl border text-xs ${
                    isPast
                      ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                        isPast ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span>{step.label}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Points Notification Box */}
        <div className="p-4 rounded-xl bg-[#EAF3FF] border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-5 h-5 text-[#F47B44] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#142B4A] block">
                REFERO Points Award: +{formatPoints(order.pointsEarned)} Points
              </span>
              <p className="text-slate-600 mt-0.5">
                {order.pointsCredited
                  ? 'Points have been authoritatively credited to your account ledger.'
                  : 'Points are pending and will be automatically credited to your balance once the order reaches "Delivered" status.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigateTo('customer_dashboard')}
            className="self-start sm:self-auto px-3.5 py-1.5 bg-[#142B4A] text-white text-xs font-semibold rounded-lg hover:bg-[#1E3A5F] transition-colors whitespace-nowrap cursor-pointer"
          >
            View Points Ledger
          </button>
        </div>

        {/* Items List & Delivery Address Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 text-xs">
          <div>
            <h4 className="font-bold text-slate-800 uppercase tracking-wider mb-2">Ordered Items</h4>
            <div className="space-y-3">
              {order.items.map((it) => (
                <div key={it.productId} className="flex items-center gap-3">
                  <img
                    src={it.image}
                    alt={it.title}
                    className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{it.title}</p>
                    <span className="text-slate-500 text-[11px]">
                      {it.quantity} × {formatBDT(it.price)} · Sold by {it.shopName}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-slate-800">
                    {formatBDT(it.price * it.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="font-bold text-slate-800 uppercase tracking-wider mb-1">
                Delivery Address
              </h4>
              <p className="text-slate-700 font-semibold">{order.deliveryAddress.fullName}</p>
              <p className="text-slate-500">{order.deliveryAddress.address}</p>
              <p className="text-slate-500">
                {order.deliveryAddress.district} · {order.deliveryAddress.phone}
              </p>
            </div>

            <div>
              <h4 className="font-bold text-slate-800 uppercase tracking-wider mb-1">
                Payment Breakdown
              </h4>
              <div className="space-y-1 text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-mono">{formatBDT(order.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span className="font-mono">{formatBDT(order.deliveryFee)}</span>
                </div>
                {order.discountFromPoints > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Points Discount ({order.pointsUsed} pts)</span>
                    <span className="font-mono">-{formatBDT(order.discountFromPoints)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                  <span>Total Paid</span>
                  <span className="font-mono text-sm">{formatBDT(order.totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Refund button if applicable */}
            {!isRefunded && order.orderStatus !== 'cancelled' && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleOpenRefundModal}
                  className="text-xs text-red-600 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Cancel Order or Request Refund</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cancellation & Refund Reason Modal */}
      {isRefundModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-red-600">
                <RotateCcw className="w-5 h-5" />
                <h3 className="font-bold text-slate-900 text-sm">Cancel Order / Request Refund</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRefundModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmRefund} className="mt-4 space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Please provide the mandatory reason for cancelling Order <span className="font-mono font-semibold text-slate-800">#{order.orderNumber}</span>. If loyalty points were credited, they will be adjusted according to refund policies.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Cancellation / Return <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={refundReason}
                  onChange={(e) => {
                    setRefundReason(e.target.value);
                    if (refundError) setRefundError('');
                  }}
                  placeholder="e.g., Ordered wrong variant, delivery delayed, item damaged upon arrival..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#142B4A] focus:border-transparent"
                />
                {refundError && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{refundError}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRefundModalOpen(false)}
                  disabled={isSubmittingRefund}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRefund}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {isSubmittingRefund ? 'Processing...' : 'Confirm Cancellation / Refund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
