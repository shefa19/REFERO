import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { formatBDT, formatPoints, pointsToBdt, bdtToPoints, calculateEarnedPoints } from '../utils/formatters';
import { resolveProductImage, IMAGE_ASSETS } from '../utils/imageAssets';
import { PaymentMethod, OrderAddress } from '../types';
import {
  ShieldCheck,
  Truck,
  Sparkles,
  CreditCard,
  Banknote,
  Smartphone,
  ArrowRight,
  Info,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export const CheckoutPage: React.FC = () => {
  const { cart, pointsConfig, createOrder, navigateTo, openAuthModal, showToast } = useStore();
  const { currentUser } = useAuth();

  // If user is not logged in, prompt sign in
  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="w-14 h-14 bg-[#EAF3FF] rounded-full flex items-center justify-center mx-auto text-[#142B4A] mb-4">
          <Lock className="w-6 h-6 text-[#F47B44]" />
        </div>
        <h2 className="text-xl font-bold text-[#142B4A]">Sign In to Complete Checkout</h2>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Sign in or create an account to earn REFERO Points on this order and apply your existing loyalty points.
        </p>
        <button
          onClick={() => openAuthModal('login')}
          className="mt-6 px-6 py-2.5 bg-[#142B4A] hover:bg-[#1E3A5F] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
        >
          Sign In / Register
        </button>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <h2 className="text-lg font-bold text-[#142B4A]">Your shopping cart is empty</h2>
        <button
          onClick={() => navigateTo('products')}
          className="mt-4 px-5 py-2 bg-[#142B4A] text-white text-xs font-semibold rounded-lg"
        >
          Explore Marketplace
        </button>
      </div>
    );
  }

  // Address state
  const [address, setAddress] = useState<OrderAddress>({
    fullName: currentUser.fullName || '',
    phone: currentUser.phone || '+880 1913 555666',
    district: 'Dhaka',
    address: 'House 22, Road 4, Sector 7, Uttara',
    notes: '',
  });

  // Points redemption state
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const deliveryFee = subtotal >= 999 ? 0 : address.district === 'Dhaka' ? 60 : 120;

  // Max points discount allowed by system configuration (e.g. 30% of subtotal)
  const maxAllowedDiscountBdt = Math.round((subtotal * pointsConfig.maxCheckoutDiscountPercent) / 100);
  const maxAllowedPoints = Math.min(
    currentUser.pointsBalance,
    bdtToPoints(maxAllowedDiscountBdt, pointsConfig.pointsToBdtRate)
  );

  const [pointsToUse, setPointsToUse] = useState<number>(0);
  const discountFromPoints = pointsToBdt(pointsToUse, pointsConfig.pointsToBdtRate);
  const finalPayable = Math.max(0, subtotal + deliveryFee - discountFromPoints);

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [mobileTrxId, setMobileTrxId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Points that will be earned on this order
  const orderItemsForCalc = cart.map((ci) => ({
    productId: ci.product.id,
    title: ci.product.title,
    price: ci.product.price,
    quantity: ci.quantity,
    image: resolveProductImage(ci.product.images?.[0]),
    shopId: ci.product.shopId,
    shopName: ci.product.shopName,
    unit: ci.product.unit,
    pointsEarnedPerUnit: ci.product.pointsEarned,
  }));
  const pointsToEarn = calculateEarnedPoints(orderItemsForCalc, pointsConfig, discountFromPoints);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.fullName || !address.phone || !address.address) {
      showToast('Please fill in complete delivery address details.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const order = await createOrder({
        address,
        paymentMethod,
        pointsToUse,
        paymentReference: mobileTrxId || undefined,
      });
      setIsSubmitting(false);
      navigateTo('order_tracking', { orderId: order.id });
    } catch (err: any) {
      setIsSubmitting(false);
      showToast(err.message || 'Error placing order.', 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="pb-4 mb-6 border-b border-slate-200">
        <h1 className="text-2xl font-extrabold text-[#142B4A]">Complete Your Order</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Review your items, apply REFERO Points for instant savings, and choose payment.
        </p>
      </div>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Delivery, Points, Payment */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Delivery Address Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Truck className="w-4 h-4 text-[#F47B44]" />
              <h3 className="text-sm font-bold text-[#142B4A]">1. Delivery Details (Bangladesh)</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Full Name *</label>
                <input
                  type="text"
                  value={address.fullName}
                  onChange={(e) => setAddress({ ...address, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#142B4A]"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Contact Phone *</label>
                <input
                  type="text"
                  value={address.phone}
                  onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                  placeholder="+880 1..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#142B4A]"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">District / City *</label>
                <select
                  value={address.district}
                  onChange={(e) => setAddress({ ...address, district: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#142B4A] bg-white"
                >
                  <option value="Dhaka">Dhaka (24h Express - ৳60)</option>
                  <option value="Chittagong">Chittagong (48h - ৳120)</option>
                  <option value="Sylhet">Sylhet (48h - ৳120)</option>
                  <option value="Rajshahi">Rajshahi (48h - ৳120)</option>
                  <option value="Khulna">Khulna (48h - ৳120)</option>
                  <option value="Barisal">Barisal (72h - ৳120)</option>
                  <option value="Rangpur">Rangpur (72h - ৳120)</option>
                  <option value="Mymensingh">Mymensingh (48h - ৳120)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Postal Code (Optional)</label>
                <input
                  type="text"
                  value={address.postalCode || ''}
                  onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
                  placeholder="e.g. 1230"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-semibold text-slate-700 block mb-1">Street Address, House & Road *</label>
                <textarea
                  value={address.address}
                  onChange={(e) => setAddress({ ...address, address: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#142B4A]"
                  required
                />
              </div>
            </div>
          </div>

          {/* 2. REFERO Points Redemption Card */}
          <div className="bg-[#EAF3FF] rounded-xl border border-blue-200/80 p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-blue-200/60">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#F47B44]" />
                <h3 className="text-sm font-bold text-[#142B4A]">2. Apply REFERO Points Discount</h3>
              </div>
              <span className="text-xs font-semibold text-[#142B4A]">
                Available: <strong className="font-mono">{formatPoints(currentUser.pointsBalance)} pts</strong>
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Conversion rate: <strong>1 Point = ৳{pointsConfig.pointsToBdtRate} BDT</strong>. You may apply up to {pointsConfig.maxCheckoutDiscountPercent}% of order subtotal ({formatBDT(maxAllowedDiscountBdt)} max discount).
            </p>

            {currentUser.pointsBalance >= pointsConfig.minPointsToRedeem ? (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span>Points to redeem: <strong className="font-mono text-[#F47B44] text-sm">{pointsToUse} pts</strong></span>
                  <span className="font-bold text-emerald-700 font-mono text-sm">
                    -{formatBDT(discountFromPoints)} Discount
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max={maxAllowedPoints}
                  step="10"
                  value={pointsToUse}
                  onChange={(e) => setPointsToUse(Number(e.target.value))}
                  className="w-full accent-[#F47B44] cursor-pointer"
                />

                <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                  <span>0 pts (৳0)</span>
                  <button
                    type="button"
                    onClick={() => setPointsToUse(maxAllowedPoints)}
                    className="text-[#142B4A] underline font-semibold cursor-pointer"
                  >
                    Max ({maxAllowedPoints} pts)
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic pt-1">
                Minimum {pointsConfig.minPointsToRedeem} points required to redeem at checkout. You will earn <strong>+{pointsToEarn} points</strong> on this order!
              </p>
            )}
          </div>

          {/* 3. Payment Method Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Banknote className="w-4 h-4 text-[#F47B44]" />
              <h3 className="text-sm font-bold text-[#142B4A]">3. Payment Method</h3>
            </div>

            <div className="space-y-2.5">
              {/* Option A: Cash on Delivery */}
              <label
                className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${
                  paymentMethod === 'cod'
                    ? 'border-[#142B4A] bg-slate-50/70 ring-1 ring-[#142B4A]'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cod"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                  className="mt-0.5 text-[#142B4A]"
                />
                <div className="flex-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">Cash on Delivery (COD)</span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold">Recommended</span>
                  </div>
                  <p className="text-slate-500 mt-0.5">Pay in cash to the courier agent when your package arrives at your door.</p>
                </div>
              </label>

              {/* Option B: bKash Mobile Banking */}
              <label
                className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${
                  paymentMethod === 'bkash'
                    ? 'border-[#d82a65] bg-pink-50/40 ring-1 ring-[#d82a65]'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="bkash"
                  checked={paymentMethod === 'bkash'}
                  onChange={() => setPaymentMethod('bkash')}
                  className="mt-0.5"
                />
                <div className="flex-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#d82a65]">bKash Payment</span>
                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500">Merchant / TrxID</span>
                  </div>
                  <p className="text-slate-500 mt-0.5">Instant mobile banking. Send payment to REFERO Merchant 01711-000111.</p>
                  {paymentMethod === 'bkash' && (
                    <div className="mt-2.5 pt-2 border-t border-pink-100">
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Enter bKash Transaction ID (TrxID)
                      </label>
                      <input
                        type="text"
                        value={mobileTrxId}
                        onChange={(e) => setMobileTrxId(e.target.value.toUpperCase())}
                        placeholder="e.g. 9KJ876TRX2"
                        className="w-full px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-md uppercase"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        * In version 1.0 demonstration, entering any mock reference verifies payment.
                      </span>
                    </div>
                  )}
                </div>
              </label>

              {/* Option C: Nagad */}
              <label
                className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${
                  paymentMethod === 'nagad'
                    ? 'border-[#f6921e] bg-amber-50/40 ring-1 ring-[#f6921e]'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="nagad"
                  checked={paymentMethod === 'nagad'}
                  onChange={() => setPaymentMethod('nagad')}
                  className="mt-0.5"
                />
                <div className="flex-1 text-xs">
                  <span className="font-bold text-[#f6921e]">Nagad Mobile Banking</span>
                  <p className="text-slate-500 mt-0.5">Send payment to REFERO Merchant 01913-555666.</p>
                </div>
              </label>

              {/* Option D: Card / Bank */}
              <label
                className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${
                  paymentMethod === 'bank'
                    ? 'border-[#142B4A] bg-slate-50/70 ring-1 ring-[#142B4A]'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="bank"
                  checked={paymentMethod === 'bank'}
                  onChange={() => setPaymentMethod('bank')}
                  className="mt-0.5"
                />
                <div className="flex-1 text-xs">
                  <span className="font-bold text-slate-800">Visa / Mastercard / Bangladeshi Bank</span>
                  <p className="text-slate-500 mt-0.5">Online gateway integration workflow.</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Order Items Summary & Checkout Button */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 sticky top-24 shadow-xs">
            <h3 className="text-sm font-bold text-[#142B4A] pb-3 border-b border-slate-100">
              Order Summary ({cart.length} items)
            </h3>

            {/* Item list */}
            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 pr-1">
              {cart.map((item) => (
                <div key={item.product.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <img
                    src={resolveProductImage(item.product.images?.[0])}
                    alt={item.product.title}
                    className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = IMAGE_ASSETS.defaultProduct;
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-800 truncate">{item.product.title}</h4>
                    <span className="text-[11px] text-slate-500">
                      Qty: {item.quantity} · {formatBDT(item.product.price)} each
                    </span>
                  </div>
                  <span className="font-bold font-mono text-slate-800">
                    {formatBDT(item.product.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Calculations breakdown */}
            <div className="space-y-2 pt-3 border-t border-slate-100 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <span className="font-semibold text-slate-900 font-mono">{formatBDT(subtotal)}</span>
              </div>

              <div className="flex justify-between">
                <span>Delivery Fee ({address.district})</span>
                <span className="font-semibold text-slate-900 font-mono">
                  {deliveryFee === 0 ? <span className="text-emerald-700">FREE</span> : formatBDT(deliveryFee)}
                </span>
              </div>

              {discountFromPoints > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>REFERO Points Discount</span>
                  <span className="font-mono">-{formatBDT(discountFromPoints)}</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                <span className="text-sm font-bold text-[#142B4A]">Payable Amount</span>
                <span className="text-xl font-extrabold text-[#142B4A] font-mono tabular-nums">
                  {formatBDT(finalPayable)}
                </span>
              </div>
            </div>

            {/* Points to earn badge */}
            <div className="p-3 bg-[#EAF3FF] rounded-lg border border-blue-200 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-[#142B4A]">
                <Sparkles className="w-4 h-4 text-[#F47B44]" />
                <span>Points you will earn:</span>
              </span>
              <span className="font-bold text-[#F47B44] font-mono">
                +{formatPoints(pointsToEarn)} pts
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-[#142B4A] hover:bg-[#1E3A5F] active:scale-98 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Confirming Order...' : 'Place Order Now'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Encrypted checkout · Guaranteed genuine products</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
