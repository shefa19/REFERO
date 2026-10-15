import React from 'react';
import { Product } from '../../types';
import { useStore } from '../../context/StoreContext';
import { formatBDT } from '../../utils/formatters';
import { ShoppingBag, Heart, Star, Sparkles } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart, toggleWishlist, isInWishlist, navigateTo } = useStore();
  const isWishlisted = isInWishlist(product.id);

  const handleCardClick = () => {
    navigateTo('product_detail', { productId: product.id });
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product, 1);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  return (
    <div
      onClick={handleCardClick}
      className="group relative bg-white rounded-xl border border-slate-200/90 overflow-hidden hover:shadow-md transition-all duration-200 flex flex-col cursor-pointer"
    >
      {/* Product Image Area */}
      <div className="relative aspect-4/3 bg-slate-100 overflow-hidden">
        <img
          src={product.images[0]}
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
          referrerPolicy="no-referrer"
          loading="lazy"
        />

        {/* Wishlist toggle */}
        <button
          onClick={handleWishlist}
          className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-white/80 backdrop-blur-xs text-slate-600 hover:text-red-500 hover:bg-white transition-colors z-10"
          aria-label="Save to wishlist"
        >
          <Heart
            className={`w-4 h-4 ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`}
          />
        </button>

        {/* Points earning or discount flag */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
          {product.pointsEarned > 0 && (
            <span className="px-2 py-0.5 bg-[#142B4A]/90 backdrop-blur-xs text-white text-[10px] font-semibold rounded flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 text-[#F47B44]" />
              <span>+{product.pointsEarned} pts</span>
            </span>
          )}
          {product.discountPercent && product.discountPercent > 0 && (
            <span className="px-1.5 py-0.5 bg-[#F47B44] text-white text-[10px] font-bold rounded">
              -{product.discountPercent}%
            </span>
          )}
        </div>
      </div>

      {/* Card Details */}
      <div className="p-3.5 flex-1 flex flex-col justify-between">
        <div>
          {/* Unboxed Metadata (Zero-Pill discipline) */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-1">
            <span className="truncate max-w-[120px]">{product.shopName}</span>
            <span aria-hidden="true">·</span>
            <span>{product.unit}</span>
          </div>

          {/* Product Title */}
          <h4 className="text-xs font-semibold text-[#142B4A] line-clamp-2 leading-snug group-hover:text-[#F47B44] transition-colors">
            {product.title}
          </h4>

          {/* Rating */}
          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500">
            <div className="flex items-center text-amber-500">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="ml-1 font-semibold text-slate-700 font-mono text-xs">
                {product.rating.toFixed(1)}
              </span>
            </div>
            <span>({product.reviewCount})</span>
            {product.stock <= 5 && product.stock > 0 && (
              <span className="text-[10px] text-amber-600 font-medium ml-auto">
                Only {product.stock} left
              </span>
            )}
            {product.stock === 0 && (
              <span className="text-[10px] text-red-600 font-medium ml-auto">
                Out of Stock
              </span>
            )}
          </div>
        </div>

        {/* Pricing & Add to Cart */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-bold text-[#142B4A] font-mono tabular-nums">
                {formatBDT(product.price)}
              </span>
              {product.originalPrice && (
                <span className="text-[11px] text-slate-400 line-through font-mono">
                  {formatBDT(product.originalPrice)}
                </span>
              )}
            </div>
            {product.canRedeemWithPoints && product.pointPrice && (
              <span className="text-[10px] text-slate-500 block">
                or {product.pointPrice} points
              </span>
            )}
          </div>

          <button
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            className="p-2 bg-[#142B4A] hover:bg-[#1E3A5F] active:scale-95 text-white rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
            aria-label="Add to cart"
            title="Add to cart"
          >
            <ShoppingBag className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
