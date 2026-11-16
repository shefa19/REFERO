import React from 'react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/products/ProductCard';
import { Heart, ArrowLeft, ShoppingBag, Sparkles } from 'lucide-react';

export const WishlistPage: React.FC = () => {
  const { wishlist, products, navigateTo } = useStore();

  const wishlistedProducts = products.filter((p) => wishlist.includes(p.id));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header Breadcrumb & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <button
            onClick={() => navigateTo('products')}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#142B4A] font-medium transition-colors mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Continue Shopping</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <Heart className="w-5 h-5 fill-red-500" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#142B4A]">My Saved Items</h1>
              <p className="text-xs text-slate-500">
                You have {wishlistedProducts.length} {wishlistedProducts.length === 1 ? 'item' : 'items'} saved in your wishlist
              </p>
            </div>
          </div>
        </div>

        {wishlistedProducts.length > 0 && (
          <button
            onClick={() => navigateTo('products')}
            className="px-4 py-2 bg-[#142B4A] hover:bg-[#1E3A5F] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer self-start sm:self-auto flex items-center gap-2"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Explore More Products</span>
          </button>
        )}
      </div>

      {/* Wishlist Grid or Empty State */}
      {wishlistedProducts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs max-w-lg mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-400 flex items-center justify-center mx-auto">
            <Heart className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#142B4A]">Your wishlist is currently empty</h2>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Found something you love? Tap the heart icon on any product card across the marketplace to save it here for easy discovery and purchase.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => navigateTo('products')}
              className="px-5 py-2.5 bg-[#142B4A] hover:bg-[#1E3A5F] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer inline-flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-[#F47B44]" />
              <span>Browse Marketplace</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {wishlistedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
