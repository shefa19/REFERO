import React from 'react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { ProductCard } from '../components/products/ProductCard';
import { SEED_ASSETS } from '../data/seedData';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ShoppingBag,
  Store,
  Share2,
  Gift,
  Coins,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { products, shops, navigateTo, setFilter, dataSources } = useStore();
  const { currentUser } = useAuth();

  const trendingProducts = products.filter((p) => p.isTrending);
  const bestSellers = products.filter((p) => p.isBestSeller);
  const pointEarningProducts = products.filter((p) => p.pointsEarned > 20);
  const pointRedeemableProducts = products.filter((p) => p.canRedeemWithPoints);
  const lovoniyoOffers = products.filter((p) => p.isLovoniyoOffer);

  const categories = [
    { name: 'Groceries & Organics', count: '140+ items', icon: '🌾' },
    { name: 'Kitchenware & Spices', count: '85+ items', icon: '🧂' },
    { name: 'Beverages & Snacks', count: '60+ items', icon: '🍵' },
    { name: 'Household & Personal Care', count: '90+ items', icon: '🧴' },
    { name: 'Fresh Produce', count: '45+ items', icon: '🥬' },
  ];

  return (
    <div className="space-y-12 pb-16">
      {/* 1. Hero Campaign Section */}
      <section className="relative bg-[#142B4A] text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-16 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-xs rounded-full text-xs font-semibold text-[#F47B44]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Bangladesh's First Rewarding Marketplace</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight text-white max-w-xl">
                Fresh Groceries & Pure Essentials. <br />
                <span className="text-[#F47B44]">Every Taka Earns Rewards.</span>
              </h1>

              <p className="text-sm sm:text-base text-slate-300 max-w-lg leading-relaxed">
                Connect directly with verified organic growers, traditional millers, and local specialty stores across Bangladesh. Earn REFERO Points automatically on every order to redeem for instant checkout discounts.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => {
                    setFilter({ category: 'All' });
                    navigateTo('products');
                  }}
                  className="px-6 py-3 bg-[#F47B44] hover:bg-[#e06830] active:scale-98 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <span>Explore Marketplace</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => navigateTo('policy_points')}
                  className="px-5 py-3 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold rounded-xl transition-all border border-white/20 cursor-pointer"
                >
                  How Points Work
                </button>
              </div>

              {/* Quick stats / reassurance */}
              <div className="pt-4 grid grid-cols-3 gap-4 border-t border-slate-700/60 max-w-md text-xs text-slate-300">
                <div>
                  <span className="block font-bold text-white text-base font-mono">100%</span>
                  <span className="text-[11px] text-slate-400">Authentic Goods</span>
                </div>
                <div>
                  <span className="block font-bold text-white text-base font-mono">24 Hours</span>
                  <span className="text-[11px] text-slate-400">Dhaka Delivery</span>
                </div>
                <div>
                  <span className="block font-bold text-white text-base font-mono">Zero Expiry</span>
                  <span className="text-[11px] text-slate-400">REFERO Points</span>
                </div>
              </div>
            </div>

            {/* Right Hero Image Card */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/15 bg-slate-800">
                <img
                  src={SEED_ASSETS.hero}
                  alt="REFERO Organic Artisanal Marketplace"
                  className="w-full h-80 sm:h-96 object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-5">
                  <span className="text-xs font-semibold text-[#F47B44] uppercase tracking-wider">
                    Featured Collection
                  </span>
                  <h3 className="text-lg font-bold text-white">
                    Pure Cold-Pressed Oils & Bilona Desi Ghee
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Direct from certified heritage producers in Gazipur and Dinajpur.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Data Source Transparency Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div
          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-xl border text-xs shadow-2xs ${
            dataSources.products === 'live'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-block w-2.5 h-2.5 rounded-full ${
                dataSources.products === 'live' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="font-bold">
              {dataSources.products === 'live'
                ? 'Live Database Mode: Connected to Firebase Firestore (refero-d897d)'
                : 'Interactive University Showcase Mode (Sample Inventory Active)'}
            </span>
            <span className="text-slate-400 hidden sm:inline">·</span>
            <span className="text-slate-600">
              {dataSources.products === 'live'
                ? 'Rendering live catalog records loaded directly from remote Firestore /products collection.'
                : 'Remote /products collection has 0 items; rendering sample demo catalog so you can demonstrate the marketplace immediately.'}
            </span>
          </div>
          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 shrink-0 self-start sm:self-auto">
            {dataSources.products === 'live' ? 'Firestore: /products (Live)' : 'Catalog: Demo Fallback'}
          </span>
        </div>
      </div>

      {/* 2. Category Shortcuts */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[#142B4A]">Browse by Category</h2>
            <p className="text-xs text-slate-500">Explore everyday staples, spices, and organic wellness</p>
          </div>
          <button
            onClick={() => {
              setFilter({ category: 'All' });
              navigateTo('products');
            }}
            className="text-xs font-semibold text-[#142B4A] hover:text-[#F47B44] transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
          {categories.map((cat) => (
            <div
              key={cat.name}
              onClick={() => {
                setFilter({ category: cat.name });
                navigateTo('products');
              }}
              className="p-4 bg-white rounded-xl border border-slate-200/90 hover:border-[#142B4A] hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="text-2xl mb-2">{cat.icon}</div>
              <div>
                <h3 className="text-xs font-bold text-[#142B4A] line-clamp-1">{cat.name}</h3>
                <span className="text-[10px] text-slate-400 font-mono">{cat.count}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. "Lovoniyo Offers" Campaign Section */}
      {lovoniyoOffers.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-transparent p-5 sm:p-6 rounded-2xl border border-orange-200/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#F47B44] uppercase tracking-wider mb-1">
                  <Sparkles className="w-4 h-4" />
                  <span>Lovoniyo Offers · Limited Seasonal Deals</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#142B4A]">
                  Special Discounts + Extra Reward Points
                </h2>
              </div>
              <button
                onClick={() => {
                  setFilter({ pointsEarningOnly: true });
                  navigateTo('products');
                }}
                className="self-start sm:self-auto px-4 py-2 bg-[#F47B44] text-white text-xs font-bold rounded-lg hover:bg-[#e06830] transition-colors cursor-pointer"
              >
                View All Offers
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {lovoniyoOffers.slice(0, 4).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 4. Trending & Best-Selling Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[#142B4A]">Trending Products</h2>
            <p className="text-xs text-slate-500">Popular items loved by shoppers in Dhaka and Chittagong</p>
          </div>
          <button
            onClick={() => {
              setFilter({ sortBy: 'rating' });
              navigateTo('products');
            }}
            className="text-xs font-semibold text-[#142B4A] hover:text-[#F47B44] transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>See more</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {trendingProducts.slice(0, 4).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* 5. Points Redemptions: 100% Redeem with Points */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="p-6 sm:p-8 bg-[#142B4A] rounded-2xl text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <span className="text-xs font-bold text-[#F47B44] uppercase tracking-wider">
                Spend Your Points
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
                Zero Cash · 100% Point Redemptions
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-lg">
                Have points saved up? You can order these featured products completely free using only your accumulated REFERO Points.
              </p>
            </div>
            <button
              onClick={() => {
                setFilter({ redeemWithPointsOnly: true });
                navigateTo('products');
              }}
              className="self-start sm:self-auto px-5 py-2.5 bg-white text-[#142B4A] hover:bg-slate-100 text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              Explore Redemptions
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {pointRedeemableProducts.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* 6. Popular Approved Shops */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[#142B4A]">Approved Marketplace Shops</h2>
            <p className="text-xs text-slate-500">Every shop is vetted for organic authenticity and clean processing</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {shops
            .filter((s) => s.status === 'approved')
            .slice(0, 3)
            .map((shop) => (
              <div
                key={shop.id}
                onClick={() => navigateTo('shop_profile', { shopId: shop.id })}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:border-[#142B4A] hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-lg text-[#142B4A]">
                      {shop.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#142B4A] line-clamp-1">{shop.name}</h3>
                      <span className="text-[11px] text-slate-500 block truncate">{shop.category}</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {shop.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-amber-500 font-semibold">★ {shop.rating.toFixed(1)} ({shop.reviewCount})</span>
                  <span className="text-[#142B4A] font-semibold flex items-center gap-1">
                    <span>Visit Shop</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
        </div>
      </section>

      {/* 7. How REFERO Points & Referrals Work (Educational Section) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="bg-slate-50 rounded-2xl border border-slate-200/90 p-6 sm:p-10">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-xs font-bold text-[#F47B44] uppercase tracking-wider">
              Rewarding Every Household
            </span>
            <h2 className="text-2xl font-extrabold text-[#142B4A] mt-1">
              How REFERO Points Work
            </h2>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Transparent, immutable, and fair. REFERO Points do not expire and can be redeemed for instant BDT discounts or gifted to family.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[#EAF3FF] text-[#142B4A] flex items-center justify-center font-bold">
                <Coins className="w-5 h-5 text-[#F47B44]" />
              </div>
              <h3 className="text-sm font-bold text-[#142B4A]">1. Shop & Earn Points</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Earn product-specific bonus points or a baseline 5% on everyday groceries upon qualifying delivery.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[#EAF3FF] text-[#142B4A] flex items-center justify-center font-bold">
                <Share2 className="w-5 h-5 text-[#F47B44]" />
              </div>
              <h3 className="text-sm font-bold text-[#142B4A]">2. Refer Friends & Family</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Share your personal referral code. When your friend places their first delivered order, receive 150 bonus points immediately.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[#EAF3FF] text-[#142B4A] flex items-center justify-center font-bold">
                <Gift className="w-5 h-5 text-[#F47B44]" />
              </div>
              <h3 className="text-sm font-bold text-[#142B4A]">3. Instant Discounts or Gift</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Apply points at checkout for direct cash savings (1 pt = ৳0.50), or use peer-to-peer point transfer to gift points to friends.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Referral Program Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="bg-gradient-to-r from-[#142B4A] to-[#1E3A5F] rounded-2xl p-6 sm:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-xs font-bold text-[#F47B44] uppercase tracking-wider">
              Referral Program
            </span>
            <h3 className="text-xl sm:text-2xl font-extrabold text-white">
              Give ৳50 Signup Points, Get 150 Points on First Order
            </h3>
            <p className="text-xs text-slate-300 max-w-lg">
              Your personal referral code is ready in your Customer Dashboard. Invite friends and neighbors in your apartment building to join the REFERO community.
            </p>
          </div>

          <button
            onClick={() => navigateTo('customer_dashboard')}
            className="px-6 py-3 bg-[#F47B44] hover:bg-[#e06830] active:scale-98 text-white text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer shadow-md"
          >
            Go to Referral Centre
          </button>
        </div>
      </section>
    </div>
  );
};
