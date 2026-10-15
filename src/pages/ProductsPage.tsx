import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/products/ProductCard';
import { formatBDT } from '../utils/formatters';
import {
  SlidersHorizontal,
  X,
  RotateCcw,
  Search,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

export const ProductsPage: React.FC = () => {
  const { products, shops, filters, setFilter, resetFilters, navigateTo, dataSources } = useStore();
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const categories = [
    'All',
    'Groceries & Organics',
    'Kitchenware & Spices',
    'Beverages & Snacks',
    'Household & Personal Care',
  ];

  // Filtering Logic
  const filteredProducts = products.filter((product) => {
    // 1. Search Query
    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase();
      const matchTitle = product.title.toLowerCase().includes(q);
      const matchDesc = product.description.toLowerCase().includes(q);
      const matchCategory = product.category.toLowerCase().includes(q);
      const matchBrand = product.brand.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchCategory && !matchBrand) return false;
    }

    // 2. Category
    if (filters.category !== 'All' && product.category !== filters.category) {
      return false;
    }

    // 3. Shop
    if (filters.selectedShop !== 'All' && product.shopId !== filters.selectedShop) {
      return false;
    }

    // 4. Price range
    if (product.price < filters.minPrice || product.price > filters.maxPrice) {
      return false;
    }

    // 5. In Stock
    if (filters.inStockOnly && product.stock <= 0) {
      return false;
    }

    // 6. Points Earning
    if (filters.pointsEarningOnly && product.pointsEarned <= 0) {
      return false;
    }

    // 7. Redeem with Points
    if (filters.redeemWithPointsOnly && !product.canRedeemWithPoints) {
      return false;
    }

    return true;
  });

  // Sorting Logic
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (filters.sortBy === 'price_asc') return a.price - b.price;
    if (filters.sortBy === 'price_desc') return b.price - a.price;
    if (filters.sortBy === 'rating') return b.rating - a.rating;
    if (filters.sortBy === 'points') return b.pointsEarned - a.pointsEarned;
    if (filters.sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return 0; // relevance
  });

  const hasActiveFilters =
    filters.category !== 'All' ||
    filters.searchQuery !== '' ||
    filters.selectedShop !== 'All' ||
    filters.minPrice > 0 ||
    filters.maxPrice < 3000 ||
    filters.inStockOnly ||
    filters.pointsEarningOnly ||
    filters.redeemWithPointsOnly;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
            <button
              onClick={() => navigateTo('home')}
              className="hover:text-[#142B4A] transition-colors"
            >
              Home
            </button>
            <ChevronRight className="w-3 h-3" />
            <span className="font-semibold text-slate-800">Catalogue</span>
            {filters.category !== 'All' && (
              <>
                <ChevronRight className="w-3 h-3" />
                <span className="text-[#F47B44] font-semibold">{filters.category}</span>
              </>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#142B4A]">
            {filters.category === 'All' ? 'Marketplace Products' : filters.category}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-slate-500">
              Showing <strong className="text-slate-800 font-mono">{sortedProducts.length}</strong> items
            </p>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                dataSources.products === 'live'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {dataSources.products === 'live' ? '● Live Firestore Data' : '○ Demo Showcase Mode'}
            </span>
          </div>
        </div>

        {/* Sort & Mobile Filter Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileFilterOpen(true)}
            className="md:hidden px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-[#F47B44]" />
            )}
          </button>

          <div className="flex items-center gap-2 text-xs">
            <label className="text-slate-500 hidden sm:inline">Sort by:</label>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilter({ sortBy: e.target.value as any })}
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:outline-hidden focus:border-[#142B4A]"
            >
              <option value="relevance">Relevance</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
              <option value="points">Most REFERO Points</option>
              <option value="newest">New Arrivals</option>
            </select>
          </div>
        </div>
      </div>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-slate-500 font-medium">Active filters:</span>
          {filters.category !== 'All' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-md text-xs text-slate-700 font-medium">
              Category: {filters.category}
              <button onClick={() => setFilter({ category: 'All' })}>
                <X className="w-3 h-3 text-slate-400 hover:text-slate-600" />
              </button>
            </span>
          )}
          {filters.searchQuery && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-md text-xs text-slate-700 font-medium">
              Search: "{filters.searchQuery}"
              <button onClick={() => setFilter({ searchQuery: '' })}>
                <X className="w-3 h-3 text-slate-400 hover:text-slate-600" />
              </button>
            </span>
          )}
          {filters.pointsEarningOnly && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#EAF3FF] border border-blue-200 rounded-md text-xs text-[#142B4A] font-semibold">
              <Sparkles className="w-3 h-3 text-[#F47B44]" />
              Bonus Points Only
              <button onClick={() => setFilter({ pointsEarningOnly: false })}>
                <X className="w-3 h-3 text-slate-400 hover:text-slate-600" />
              </button>
            </span>
          )}
          {filters.redeemWithPointsOnly && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#142B4A] text-white rounded-md text-xs font-semibold">
              Point Redemptions
              <button onClick={() => setFilter({ redeemWithPointsOnly: false })}>
                <X className="w-3 h-3 text-slate-300 hover:text-white" />
              </button>
            </span>
          )}
          {filters.inStockOnly && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-md text-xs text-slate-700 font-medium">
              In Stock
              <button onClick={() => setFilter({ inStockOnly: false })}>
                <X className="w-3 h-3 text-slate-400 hover:text-slate-600" />
              </button>
            </span>
          )}
          <button
            onClick={resetFilters}
            className="text-xs text-[#F47B44] hover:underline font-semibold flex items-center gap-1 ml-2 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Clear all</span>
          </button>
        </div>
      )}

      {/* Main Grid + Desktop Sidebar Split */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Desktop Filter Sidebar */}
        <aside className="hidden md:block space-y-6 bg-white p-5 rounded-xl border border-slate-200 h-fit">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Filter Products
            </h3>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-[11px] text-[#F47B44] hover:underline font-medium"
              >
                Reset
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">Category</label>
            <div className="space-y-1">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setFilter({ category: c })}
                  className={`w-full text-left px-2 py-1.5 rounded-md text-xs transition-colors flex items-center justify-between ${
                    filters.category === c
                      ? 'bg-[#142B4A] text-white font-semibold'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>{c}</span>
                  {c !== 'All' && (
                    <span className="text-[10px] opacity-70">
                      {products.filter((p) => p.category === c).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div className="space-y-2 pt-3 border-t border-slate-100">
            <div className="flex justify-between items-center text-xs">
              <label className="font-bold text-slate-700">Max Price</label>
              <span className="font-mono font-bold text-[#142B4A]">
                {formatBDT(filters.maxPrice)}
              </span>
            </div>
            <input
              type="range"
              min="100"
              max="3000"
              step="50"
              value={filters.maxPrice}
              onChange={(e) => setFilter({ maxPrice: Number(e.target.value) })}
              className="w-full accent-[#142B4A] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>৳100</span>
              <span>৳3,000+</span>
            </div>
          </div>

          {/* Shopkeeper / Vendor Filter */}
          <div className="space-y-2 pt-3 border-t border-slate-100">
            <label className="text-xs font-bold text-slate-700 block">Vendor / Shop</label>
            <select
              value={filters.selectedShop}
              onChange={(e) => setFilter({ selectedShop: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700 focus:outline-hidden"
            >
              <option value="All">All Verified Shops</option>
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Checkbox Toggles */}
          <div className="space-y-2.5 pt-3 border-t border-slate-100 text-xs">
            <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.inStockOnly}
                onChange={(e) => setFilter({ inStockOnly: e.target.checked })}
                className="rounded text-[#142B4A] focus:ring-0"
              />
              <span>In Stock Only</span>
            </label>

            <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.pointsEarningOnly}
                onChange={(e) => setFilter({ pointsEarningOnly: e.target.checked })}
                className="rounded text-[#142B4A] focus:ring-0"
              />
              <span className="flex items-center gap-1 text-[#F47B44] font-semibold">
                <Sparkles className="w-3 h-3" /> Bonus Points Only
              </span>
            </label>

            <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.redeemWithPointsOnly}
                onChange={(e) => setFilter({ redeemWithPointsOnly: e.target.checked })}
                className="rounded text-[#142B4A] focus:ring-0"
              />
              <span>Redeem with Points Only</span>
            </label>
          </div>
        </aside>

        {/* Product Grid Area */}
        <div className="md:col-span-3">
          {sortedProducts.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400 mb-3">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#142B4A]">No products found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No items match your active filters or search terms. Try clearing filters or searching for different ingredients.
              </p>
              <button
                onClick={resetFilters}
                className="mt-4 px-4 py-2 bg-[#142B4A] text-white text-xs font-semibold rounded-lg hover:bg-[#1E3A5F] transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setIsMobileFilterOpen(false)}
          />
          <div className="relative w-80 bg-white h-full p-5 shadow-2xl flex flex-col justify-between overflow-y-auto z-10">
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-[#142B4A]">Filter Products</h3>
                <button onClick={() => setIsMobileFilterOpen(false)}>
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* Mobile Category */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Category</label>
                <div className="space-y-1">
                  {categories.map((c) => (
                    <button
                      key={c}
                      onClick={() => setFilter({ category: c })}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs ${
                        filters.category === c ? 'bg-[#142B4A] text-white font-bold' : 'text-slate-600'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mobile Price */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-slate-700">Max Price</span>
                  <span className="font-mono font-bold text-[#142B4A]">{formatBDT(filters.maxPrice)}</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="3000"
                  step="50"
                  value={filters.maxPrice}
                  onChange={(e) => setFilter({ maxPrice: Number(e.target.value) })}
                  className="w-full accent-[#142B4A]"
                />
              </div>

              {/* Mobile Toggles */}
              <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filters.inStockOnly}
                    onChange={(e) => setFilter({ inStockOnly: e.target.checked })}
                  />
                  <span>In Stock Only</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filters.pointsEarningOnly}
                    onChange={(e) => setFilter({ pointsEarningOnly: e.target.checked })}
                  />
                  <span className="text-[#F47B44] font-semibold">Bonus Points Only</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filters.redeemWithPointsOnly}
                    onChange={(e) => setFilter({ redeemWithPointsOnly: e.target.checked })}
                  />
                  <span>Redeem with Points Only</span>
                </label>
              </div>
            </div>

            <button
              onClick={() => setIsMobileFilterOpen(false)}
              className="w-full py-2.5 bg-[#142B4A] text-white text-xs font-bold rounded-lg mt-6"
            >
              Apply Filters ({sortedProducts.length})
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
