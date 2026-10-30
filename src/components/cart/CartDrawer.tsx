import React from 'react';
import { useStore } from '../../context/StoreContext';
import { formatBDT, formatPoints, calculateEarnedPoints } from '../../utils/formatters';
import { resolveProductImage, IMAGE_ASSETS } from '../../utils/imageAssets';
import { X, Trash2, Plus, Minus, ArrowRight, ShoppingBag, Sparkles } from 'lucide-react';

export const CartDrawer: React.FC = () => {
  const {
    isCartDrawerOpen,
    closeCartDrawer,
    cart,
    removeFromCart,
    updateCartQuantity,
    navigateTo,
    pointsConfig,
  } = useStore();

  if (!isCartDrawerOpen) return null;

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const freeShippingThreshold = 999;
  const amountToFreeShipping = Math.max(0, freeShippingThreshold - subtotal);
  const progressPercent = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));

  // Points to earn
  const orderItems = cart.map((ci) => ({
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
  const estimatedPoints = calculateEarnedPoints(orderItems, pointsConfig, 0);

  const handleCheckoutClick = () => {
    closeCartDrawer();
    navigateTo('checkout');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={closeCartDrawer}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#142B4A]" />
              <h3 className="text-base font-bold text-[#142B4A]">
                Shopping Cart ({cart.reduce((s, i) => s + i.quantity, 0)})
              </h3>
            </div>
            <button
              onClick={closeCartDrawer}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free shipping banner */}
          <div className="bg-[#EAF3FF] px-4 py-2.5 border-b border-blue-100">
            <div className="flex items-center justify-between text-xs text-[#142B4A] mb-1">
              {amountToFreeShipping > 0 ? (
                <span>
                  Add <strong className="text-[#F47B44]">{formatBDT(amountToFreeShipping)}</strong> more for free delivery
                </span>
              ) : (
                <span className="font-semibold text-emerald-700">✓ You have qualified for Free Delivery!</span>
              )}
              <span className="font-mono text-[11px] font-semibold">{progressPercent}%</span>
            </div>
            <div className="w-full bg-blue-200/60 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#F47B44] h-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100">
            {cart.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-[#142B4A]">Your cart is empty</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Browse our organic groceries, artisanal spices, and pantry essentials.
                </p>
                <button
                  onClick={() => {
                    closeCartDrawer();
                    navigateTo('products');
                  }}
                  className="mt-5 px-5 py-2 text-xs font-semibold text-white bg-[#142B4A] hover:bg-[#1E3A5F] rounded-lg transition-colors cursor-pointer"
                >
                  Explore Products
                </button>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.product.id} className="py-3.5 flex gap-3">
                  <img
                    src={resolveProductImage(item.product.images?.[0])}
                    alt={item.product.title}
                    className="w-18 h-18 object-cover rounded-lg border border-slate-200 bg-slate-50 shrink-0"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = IMAGE_ASSETS.defaultProduct;
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-slate-500 block truncate">{item.product.shopName}</span>
                        <h4 className="text-xs font-semibold text-[#142B4A] line-clamp-2 leading-snug">
                          {item.product.title}
                        </h4>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center border border-slate-200 rounded-md bg-white">
                        <button
                          onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                          className="px-2 py-1 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 py-0.5 text-xs font-semibold font-mono tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                          className="px-2 py-1 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-[#142B4A] font-mono tabular-nums">
                          {formatBDT(item.product.price * item.quantity)}
                        </span>
                        {item.product.pointsEarned > 0 && (
                          <span className="text-[10px] text-[#F47B44] block font-medium">
                            +{item.product.pointsEarned * item.quantity} pts
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Checkout Summary */}
          {cart.length > 0 && (
            <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 space-y-3">
              {/* Points estimate callout */}
              <div className="flex items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="flex items-center gap-1.5 text-slate-700">
                  <Sparkles className="w-3.5 h-3.5 text-[#F47B44]" />
                  <span>Estimated REFERO Points:</span>
                </span>
                <span className="font-bold text-[#F47B44] font-mono">
                  +{formatPoints(estimatedPoints)} pts
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-900 font-mono tabular-nums">
                    {formatBDT(subtotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Delivery</span>
                  <span className="font-semibold text-slate-900 font-mono tabular-nums">
                    {subtotal >= 999 ? 'Free' : 'Calculated at checkout'}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                <span className="text-sm font-bold text-[#142B4A]">Total</span>
                <span className="text-lg font-extrabold text-[#142B4A] font-mono tabular-nums">
                  {formatBDT(subtotal)}
                </span>
              </div>

              <button
                onClick={handleCheckoutClick}
                className="w-full py-2.5 px-4 bg-[#142B4A] hover:bg-[#1E3A5F] text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
