import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import { formatBDT, formatPoints } from '../../utils/formatters';
import {
  X,
  Star,
  ShieldCheck,
  Truck,
  RotateCcw,
  Sparkles,
  Plus,
  Minus,
  ShoppingBag,
  Heart,
  Store,
  Check,
} from 'lucide-react';

export const ProductDetailModal: React.FC = () => {
  const {
    currentView,
    selectedProductId,
    products,
    navigateTo,
    addToCart,
    openCartDrawer,
    toggleWishlist,
    isInWishlist,
    showToast,
  } = useStore();
  const { currentUser } = useAuth();

  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'details' | 'reviews' | 'delivery'>('details');

  if (currentView !== 'product_detail' || !selectedProductId) return null;

  const product = products.find((p) => p.id === selectedProductId);
  if (!product) return null;

  const isWishlisted = isInWishlist(product.id);
  const canUserRedeemWithPoints =
    product.canRedeemWithPoints &&
    product.pointPrice &&
    currentUser &&
    currentUser.pointsBalance >= product.pointPrice;

  const handleAddToCart = () => {
    addToCart(product, quantity);
  };

  const handleBuyNow = () => {
    addToCart(product, quantity);
    navigateTo('checkout');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        onClick={() => navigateTo('home')}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full z-10 border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Top Bar with Close button */}
        <div className="p-3.5 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span
              onClick={() => navigateTo('home')}
              className="hover:underline cursor-pointer"
            >
              Marketplace
            </span>
            <span>/</span>
            <span
              onClick={() => navigateTo('products')}
              className="hover:underline cursor-pointer"
            >
              {product.category}
            </span>
            <span>/</span>
            <span className="font-medium text-slate-800 truncate max-w-[200px]">
              {product.title}
            </span>
          </div>

          <button
            onClick={() => navigateTo('home')}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto p-4 sm:p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Gallery Column */}
            <div className="space-y-3">
              <div className="relative aspect-4/3 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                <img
                  src={product.images[0]}
                  alt={product.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                {product.discountPercent && product.discountPercent > 0 && (
                  <span className="absolute top-3 left-3 px-2 py-0.5 bg-[#F47B44] text-white text-xs font-bold rounded">
                    Save {product.discountPercent}%
                  </span>
                )}
                <button
                  onClick={() => toggleWishlist(product.id)}
                  className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-xs text-slate-700 hover:text-red-500 rounded-full transition-colors shadow-xs"
                >
                  <Heart
                    className={`w-5 h-5 ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`}
                  />
                </button>
              </div>

              {/* Trust Callouts */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center gap-2 text-xs">
                  <ShieldCheck className="w-4 h-4 text-[#F47B44] shrink-0" />
                  <span className="text-slate-700 font-medium">100% Genuine & Certified</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center gap-2 text-xs">
                  <RotateCcw className="w-4 h-4 text-[#F47B44] shrink-0" />
                  <span className="text-slate-700 font-medium">7-Day Easy Return</span>
                </div>
              </div>
            </div>

            {/* Product Details & Purchase Module */}
            <div className="space-y-5">
              {/* Shop Badge */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => navigateTo('shop_profile', { shopId: product.shopId })}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-[#142B4A] transition-colors"
                >
                  <Store className="w-3.5 h-3.5 text-[#F47B44]" />
                  <span>Sold by: <strong className="text-[#142B4A]">{product.shopName}</strong></span>
                </button>
                <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-semibold">
                  Verified Vendor
                </span>
              </div>

              {/* Title & Reviews */}
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-[#142B4A] leading-snug">
                  {product.title}
                </h1>
                <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                  <div className="flex items-center text-amber-500">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="ml-1 font-bold text-slate-800 font-mono">
                      {product.rating.toFixed(1)}
                    </span>
                  </div>
                  <span>·</span>
                  <span>{product.reviewCount} verified reviews</span>
                  <span>·</span>
                  <span className="text-slate-700 font-medium">Pack size: {product.unit}</span>
                </div>
              </div>

              {/* Pricing Box */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-baseline gap-3">
                  <span className="text-2xl font-extrabold text-[#142B4A] font-mono tabular-nums">
                    {formatBDT(product.price)}
                  </span>
                  {product.originalPrice && (
                    <span className="text-sm text-slate-400 line-through font-mono">
                      {formatBDT(product.originalPrice)}
                    </span>
                  )}
                  <span className="text-xs text-slate-500 ml-auto font-medium">
                    Inclusive of all local taxes
                  </span>
                </div>

                {/* REFERO Points Reward Info Box */}
                <div className="mt-3 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-[#142B4A]">
                    <Sparkles className="w-4 h-4 text-[#F47B44]" />
                    <span>
                      Earn up to <strong className="text-[#F47B44]">+{product.pointsEarned > 0 ? product.pointsEarned * quantity : Math.round((product.price * quantity * 5) / 100)} REFERO Points</strong>
                    </span>
                  </div>
                  <button
                    onClick={() => navigateTo('policy_points')}
                    className="text-[11px] text-[#142B4A] hover:underline font-semibold"
                  >
                    Points Policy
                  </button>
                </div>

                {/* Point-Only Redemption Option */}
                {product.canRedeemWithPoints && product.pointPrice && (
                  <div className="mt-2 text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
                    <span>
                      Redeem 100% with Points: <strong>{formatPoints(product.pointPrice)} pts</strong>
                    </span>
                    {canUserRedeemWithPoints ? (
                      <span className="text-emerald-700 font-semibold text-[11px] flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Eligible
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">
                        Need {formatPoints(product.pointPrice - (currentUser?.pointsBalance || 0))} more pts
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Quantity Stepper & Stock */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Quantity</span>
                  <span className="text-slate-500 font-normal">
                    {product.stock > 0 ? (
                      <span className="text-emerald-600 font-medium">
                        ✓ In Stock ({product.stock} units available)
                      </span>
                    ) : (
                      <span className="text-red-500 font-medium">Out of stock</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center border border-slate-300 rounded-lg bg-white">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="px-3 py-2 text-slate-500 hover:text-slate-800 transition-colors"
                      aria-label="Decrease"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-4 py-1 text-sm font-bold font-mono tabular-nums text-slate-800">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                      className="px-3 py-2 text-slate-500 hover:text-slate-800 transition-colors"
                      aria-label="Increase"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-xs text-slate-500">
                    Total: <strong className="font-mono text-[#142B4A] text-sm">{formatBDT(product.price * quantity)}</strong>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => toggleWishlist(product.id)}
                  className={`p-3 border rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center shrink-0 ${
                    isWishlisted
                      ? 'border-red-200 bg-red-50 text-red-600'
                      : 'border-slate-200 bg-white text-slate-600 hover:text-red-500 hover:border-red-200'
                  }`}
                  title={isWishlisted ? 'Remove from Wishlist' : 'Save to Wishlist'}
                  aria-label={isWishlisted ? 'Remove from Wishlist' : 'Save to Wishlist'}
                >
                  <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`} />
                </button>
                <button
                  onClick={handleAddToCart}
                  disabled={product.stock === 0}
                  className="flex-1 py-3 px-4 bg-[#142B4A] hover:bg-[#1E3A5F] active:scale-98 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-40"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Add to Cart</span>
                </button>
                <button
                  onClick={handleBuyNow}
                  disabled={product.stock === 0}
                  className="py-3 px-6 bg-[#F47B44] hover:bg-[#e06830] active:scale-98 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm disabled:opacity-40"
                >
                  Buy Now
                </button>
              </div>

              {/* Product Tabs: Details, Delivery, Reviews */}
              <div className="pt-4 border-t border-slate-200">
                <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold mb-3">
                  <button
                    onClick={() => setActiveTab('details')}
                    className={`pb-2 transition-colors cursor-pointer ${
                      activeTab === 'details'
                        ? 'text-[#142B4A] border-b-2 border-[#142B4A]'
                        : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    Product Description
                  </button>
                  <button
                    onClick={() => setActiveTab('delivery')}
                    className={`pb-2 transition-colors cursor-pointer ${
                      activeTab === 'delivery'
                        ? 'text-[#142B4A] border-b-2 border-[#142B4A]'
                        : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    Shipping & Delivery
                  </button>
                  <button
                    onClick={() => setActiveTab('reviews')}
                    className={`pb-2 transition-colors cursor-pointer ${
                      activeTab === 'reviews'
                        ? 'text-[#142B4A] border-b-2 border-[#142B4A]'
                        : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    Customer Reviews ({product.reviewCount})
                  </button>
                </div>

                <div className="text-xs text-slate-600 leading-relaxed">
                  {activeTab === 'details' && (
                    <p>{product.description}</p>
                  )}
                  {activeTab === 'delivery' && (
                    <div className="space-y-2">
                      <p>
                        <strong>Dhaka Metropolitan:</strong> Same-day or 24-hour delivery via express dispatch. Delivery fee ৳60 (Free on orders over ৳999).
                      </p>
                      <p>
                        <strong>All Other Districts:</strong> 48 to 72 hours via courier tracking. Delivery fee ৳120.
                      </p>
                    </div>
                  )}
                  {activeTab === 'reviews' && (
                    <div className="space-y-3">
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <strong className="text-slate-800">Mustafizur Rahman</strong>
                          <span className="text-amber-500">★★★★★</span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          "Outstanding aroma and genuine taste. The packaging was immaculate with cold seal protection. Earned 55 points right away!"
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
