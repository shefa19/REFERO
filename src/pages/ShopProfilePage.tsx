import React from 'react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/products/ProductCard';
import {
  Store,
  MapPin,
  Phone,
  Star,
  ShieldCheck,
  Truck,
  RotateCcw,
  ArrowLeft,
  AlertTriangle,
} from 'lucide-react';

export const ShopProfilePage: React.FC = () => {
  const { selectedShopId, shops, products, navigateTo } = useStore();

  const shop = shops.find((s) => s.id === selectedShopId) || shops[0];
  const shopProducts = products.filter((p) => p.shopId === shop.id);

  if (shop.status !== 'approved') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-600 mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-[#142B4A]">Shop Not Available</h2>
        <p className="text-xs text-slate-500 mt-2">
          This shop application is currently <strong>{shop.status}</strong> and has not been approved for public catalogue browsing by marketplace administrators.
        </p>
        <button
          onClick={() => navigateTo('home')}
          className="mt-6 px-5 py-2.5 bg-[#142B4A] text-white text-xs font-semibold rounded-lg"
        >
          Return to Marketplace
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      {/* Back button */}
      <button
        onClick={() => navigateTo('home')}
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#142B4A] transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Marketplace</span>
      </button>

      {/* Shop Banner & Header */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-xs">
        {/* Banner Image */}
        <div className="h-44 sm:h-56 relative bg-slate-800">
          <img
            src={shop.banner}
            alt={shop.name}
            className="w-full h-full object-cover opacity-80"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        </div>

        {/* Shop Info Overlay */}
        <div className="px-6 pb-6 pt-3 relative flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-14">
          <div className="flex items-end gap-4">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white border-2 border-white shadow-md flex items-center justify-center text-2xl font-extrabold text-[#142B4A] shrink-0 bg-gradient-to-br from-slate-100 to-slate-200">
              {shop.name.charAt(0)}
            </div>
            <div className="pb-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#142B4A]">{shop.name}</h1>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verified</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{shop.category}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-600 sm:pb-2">
            <div className="flex items-center gap-1 text-amber-500 font-bold">
              <Star className="w-4 h-4 fill-amber-400" />
              <span className="font-mono text-slate-800">{shop.rating.toFixed(1)}</span>
              <span className="text-slate-400 font-normal">({shop.reviewCount} reviews)</span>
            </div>
            <span>·</span>
            <div className="flex items-center gap-1">
              <Store className="w-3.5 h-3.5 text-slate-400" />
              <span>{shopProducts.length} Products</span>
            </div>
          </div>
        </div>

        {/* Description & Policies */}
        <div className="px-6 pb-6 pt-2 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
          <div>
            <span className="font-bold text-slate-800 block mb-1">About the Shop</span>
            <p className="leading-relaxed text-slate-500">{shop.description}</p>
            <div className="mt-2 flex items-center gap-1.5 text-slate-500">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>{shop.address}</span>
            </div>
          </div>

          <div>
            <span className="font-bold text-slate-800 flex items-center gap-1 mb-1">
              <Truck className="w-3.5 h-3.5 text-[#F47B44]" />
              <span>Fulfillment & Delivery</span>
            </span>
            <p className="leading-relaxed text-slate-500">{shop.deliveryPolicy}</p>
          </div>

          <div>
            <span className="font-bold text-slate-800 flex items-center gap-1 mb-1">
              <RotateCcw className="w-3.5 h-3.5 text-[#F47B44]" />
              <span>Return Policy</span>
            </span>
            <p className="leading-relaxed text-slate-500">{shop.returnPolicy}</p>
          </div>
        </div>
      </div>

      {/* Shop Products Catalogue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#142B4A]">
            Product Catalogue ({shopProducts.length})
          </h2>
          <span className="text-xs text-slate-500">All items covered by REFERO Points</span>
        </div>

        {shopProducts.length === 0 ? (
          <div className="p-8 bg-white rounded-xl border border-slate-200 text-center text-xs text-slate-500">
            This seller has not listed any products yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {shopProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
