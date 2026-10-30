import React, { useState } from 'react';
import { ReferoLogo } from '../common/ReferoLogo';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { formatPoints } from '../../utils/formatters';
import {
  Search,
  ShoppingCart,
  Heart,
  User,
  Sparkles,
  ChevronDown,
  Menu,
  X,
  ShieldCheck,
  Store,
  Layers,
  Database,
  LogOut,
  Gift,
  Bell,
  Eye,
  RotateCcw,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    currentUser,
    userRole,
    isRealAdmin,
    isAdminPreviewActive,
    previewRole,
    enterPreview,
    exitAdminPreview,
    logout,
  } = useAuth();
  const {
    currentView,
    navigateTo,
    cart,
    wishlist,
    openCartDrawer,
    openAuthModal,
    openFirebaseModal,
    openSellerModal,
    notifications,
    markNotificationAsRead,
    filters,
    setFilter,
  } = useStore();

  const [searchInput, setSearchInput] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Strictly isolate user notifications - never expose previous account or admin notifications to guests
  const userNotifications = currentUser
    ? notifications.filter((n) => n.userId === currentUser.id || (!n.userId && currentUser.role === 'admin'))
    : [];
  const unreadCount = userNotifications.filter((n) => !n.read).length;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFilter({ searchQuery: searchInput });
    if (currentView !== 'products') {
      navigateTo('products');
    }
  };

  const handleRoleSelect = (role: 'customer' | 'seller' | 'guest' | 'exit') => {
    setIsRoleDropdownOpen(false);
    if (role === 'exit') {
      exitAdminPreview();
      navigateTo('admin_dashboard');
    } else {
      enterPreview(role);
      if (role === 'customer') navigateTo('customer_dashboard');
      else if (role === 'seller') navigateTo('shopkeeper_dashboard');
      else if (role === 'guest') navigateTo('home');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 shadow-xs">
      {/* Admin University Demo Sandbox Active Banner */}
      {isAdminPreviewActive && (
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white text-xs px-4 py-2 border-b border-amber-500/40 shadow-sm">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
              <span className="font-bold">University Demo Preview:</span>
              <span className="bg-white/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[11px]">
                {previewRole === 'customer'
                  ? '🛍️ Demo Customer (Moumita)'
                  : previewRole === 'seller'
                  ? '🏪 Demo Seller (Green Valley Organics)'
                  : '👤 Guest Public Visitor'}
              </span>
              <span className="text-amber-100 hidden md:inline text-[11px]">
                · Real Admin session preserved in background (Production database safe)
              </span>
            </div>
            <button
              onClick={() => {
                exitAdminPreview();
                navigateTo('admin_dashboard');
              }}
              className="bg-white hover:bg-amber-50 text-orange-950 font-bold px-3 py-1 rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0"
              title="Return to real Admin Console"
            >
              <RotateCcw className="w-3.5 h-3.5 text-orange-700" />
              <span>Exit Preview</span>
            </button>
          </div>
        </div>
      )}

      {/* 1. Announcement Bar (Public view with verified hotline) */}
      <div className="bg-[#142B4A] text-white text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#F47B44]">Dhaka Delivery:</span>
            <span>Free shipping on all orders over ৳999 · Earn up to 10% back in REFERO Points</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-300">
            <span>Customer Hotline: +880 1717 026630</span>
          </div>
        </div>
      </div>

      {/* 2. Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Brand Zone */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setFilter({ category: 'All', searchQuery: '' });
                navigateTo('home');
              }}
              className="cursor-pointer text-left focus-visible:outline-hidden"
              aria-label="REFERO Home"
            >
              <ReferoLogo variant="full" size="md" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-xl hidden md:block">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search organic ghee, tea, spices, honey, pantry essentials..."
                className="w-full pl-10 pr-24 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:border-[#142B4A] focus:ring-1 focus:ring-[#142B4A] transition-colors"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <button
                type="submit"
                className="absolute right-1 px-4 py-1.5 text-xs font-semibold text-white bg-[#142B4A] hover:bg-[#1E3A5F] rounded-md transition-colors cursor-pointer"
              >
                Search
              </button>
            </form>
          </div>

          {/* Action Zone: Points Badge, Role Switcher, Wishlist, Cart, Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* University Class Role Switcher (Strictly accessible to verified Admins) */}
            {isRealAdmin && (
              <div className="relative">
                <button
                  onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                  className={`hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                    isAdminPreviewActive
                      ? 'bg-amber-50 border-amber-300 text-amber-900 font-semibold shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                  title="Switch role for University demonstration"
                >
                  <Layers className={`w-3.5 h-3.5 ${isAdminPreviewActive ? 'text-amber-600' : 'text-[#F47B44]'}`} />
                  <span className="capitalize font-semibold text-[#142B4A]">
                    {isAdminPreviewActive
                      ? previewRole === 'customer'
                        ? 'Preview: Customer'
                        : previewRole === 'seller'
                        ? 'Preview: Seller'
                        : 'Preview: Guest'
                      : 'Demo Role'}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {isRoleDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50 text-xs">
                    <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
                      <span>University Role Preview</span>
                      <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-mono">Admin Only</span>
                    </div>
                    <button
                      onClick={() => handleRoleSelect('customer')}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 ${previewRole === 'customer' ? 'bg-[#EAF3FF] font-semibold text-[#142B4A]' : 'text-slate-700'}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">🛍️</span>
                        <div>
                          <p className="font-semibold text-xs text-slate-800">Demo Customer</p>
                          <p className="text-[10px] text-slate-400">Moumita Pramanik (840 pts)</p>
                        </div>
                      </div>
                      {previewRole === 'customer' && <span className="text-[10px] text-[#F47B44] font-bold">Active</span>}
                    </button>
                    <button
                      onClick={() => handleRoleSelect('seller')}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 ${previewRole === 'seller' ? 'bg-[#EAF3FF] font-semibold text-[#142B4A]' : 'text-slate-700'}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">🏪</span>
                        <div>
                          <p className="font-semibold text-xs text-slate-800">Demo Seller / Shopkeeper</p>
                          <p className="text-[10px] text-slate-400">Green Valley Organics</p>
                        </div>
                      </div>
                      {previewRole === 'seller' && <span className="text-[10px] text-[#F47B44] font-bold">Active</span>}
                    </button>
                    <button
                      onClick={() => handleRoleSelect('guest')}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 ${previewRole === 'guest' ? 'bg-[#EAF3FF] font-semibold text-[#142B4A]' : 'text-slate-700'}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">👤</span>
                        <div>
                          <p className="font-semibold text-xs text-slate-800">Guest Preview</p>
                          <p className="text-[10px] text-slate-400">Unauthenticated visitor</p>
                        </div>
                      </div>
                      {previewRole === 'guest' && <span className="text-[10px] text-[#F47B44] font-bold">Active</span>}
                    </button>

                    {isAdminPreviewActive && (
                      <div className="border-t border-slate-100 mt-1 pt-1">
                        <button
                          onClick={() => handleRoleSelect('exit')}
                          className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-amber-50 text-amber-800 font-bold"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-orange-700" />
                          <span>Exit Preview (Back to Admin Console)</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* REFERO Points Balance Badge */}
            {currentUser && (
              <button
                onClick={() => navigateTo('customer_dashboard')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#EAF3FF] hover:bg-[#d9eaff] border border-blue-200/80 rounded-lg text-xs font-semibold text-[#142B4A] transition-colors cursor-pointer"
                title="Your REFERO Points Balance"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#F47B44]" />
                <span className="font-mono tabular-nums">{formatPoints(currentUser.pointsBalance)}</span>
                <span className="text-[10px] text-slate-500 font-normal hidden sm:inline">PTS</span>
              </button>
            )}

            {/* Wishlist */}
            <button
              onClick={() => navigateTo('wishlist')}
              className="relative p-2 text-slate-600 hover:text-[#142B4A] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              aria-label="Wishlist"
              title="Saved items"
            >
              <Heart className="w-5 h-5" />
              {wishlist.length > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-[#F47B44] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* Cart Trigger */}
            <button
              onClick={openCartDrawer}
              className="relative p-2 text-slate-600 hover:text-[#142B4A] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              aria-label="Shopping Cart"
              title="View Cart"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartItemCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-[#142B4A] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative p-2 text-slate-600 hover:text-[#142B4A] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-[#F47B44] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50 text-xs">
                  <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                    <span className="font-bold text-[#142B4A]">Notifications</span>
                    <span className="text-[10px] text-slate-500">{userNotifications.length} items</span>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {userNotifications.length === 0 ? (
                      <p className="p-4 text-center text-slate-400">No notifications yet.</p>
                    ) : (
                      userNotifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => {
                            markNotificationAsRead(notif.id);
                            if (notif.link === 'transfers' || notif.type === 'transfer') {
                              navigateTo('customer_dashboard', { customerTab: 'transfers' });
                              setIsNotificationsOpen(false);
                            } else if (notif.link === 'referrals') {
                              navigateTo('customer_dashboard', { customerTab: 'referrals' });
                              setIsNotificationsOpen(false);
                            } else if (notif.link === 'orders' || notif.type === 'order') {
                              navigateTo('customer_dashboard', { customerTab: 'orders' });
                              setIsNotificationsOpen(false);
                            } else if (notif.link === 'points') {
                              navigateTo('customer_dashboard', { customerTab: 'points' });
                              setIsNotificationsOpen(false);
                            }
                          }}
                          className={`p-3 hover:bg-slate-50 transition-colors cursor-pointer group ${
                            !notif.read ? 'bg-blue-50/40' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-800 text-[11px] flex items-center gap-1.5">
                              {notif.type === 'transfer' && (
                                <span className="px-1.5 py-0.2 bg-[#F47B44]/10 text-[#F47B44] text-[9px] rounded font-bold uppercase">
                                  Transfer
                                </span>
                              )}
                              {notif.type === 'points' && (
                                <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 text-[9px] rounded font-bold uppercase">
                                  Points
                                </span>
                              )}
                              {notif.type === 'order' && (
                                <span className="px-1.5 py-0.2 bg-blue-50 text-blue-700 text-[9px] rounded font-bold uppercase">
                                  Order
                                </span>
                              )}
                              {notif.title}
                            </span>
                            {!notif.read && (
                              <span className="w-2 h-2 rounded-full bg-[#F47B44] shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{notif.message}</p>
                          <div className="flex items-center justify-between mt-1.5 text-[9px] text-slate-400">
                            <span>{new Date(notif.createdAt).toLocaleDateString()}</span>
                            {(notif.link || notif.type === 'transfer') && (
                              <span className="text-[#142B4A] font-semibold group-hover:text-[#F47B44] transition-colors">
                                View details &rarr;
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile / Dashboard Access */}
            <div className="relative">
              {currentUser ? (
                <div>
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-1.5 p-1.5 pl-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-full bg-[#142B4A] text-white text-xs font-semibold flex items-center justify-center">
                      {currentUser.fullName.charAt(0)}
                    </div>
                    <span className="text-xs font-medium text-slate-800 hidden md:inline max-w-[80px] truncate">
                      {currentUser.fullName.split(' ')[0]}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50 text-xs">
                      <div className="px-3 py-2 border-b border-slate-100">
                        <p className="font-semibold text-slate-900 truncate">{currentUser.fullName}</p>
                        <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                        <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] font-semibold uppercase bg-slate-100 text-slate-600 rounded">
                          {currentUser.role}
                        </span>
                      </div>

                      {currentUser.role === 'admin' && (
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            navigateTo('admin_dashboard');
                          }}
                          className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-slate-50 text-slate-700"
                        >
                          <ShieldCheck className="w-4 h-4 text-[#142B4A]" />
                          <span>Admin Console</span>
                        </button>
                      )}

                      {currentUser.role === 'shopkeeper' && (
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            navigateTo('shopkeeper_dashboard');
                          }}
                          className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-slate-50 text-slate-700"
                        >
                          <Store className="w-4 h-4 text-[#142B4A]" />
                          <span>Shopkeeper Portal</span>
                        </button>
                      )}

                      {currentUser.role !== 'shopkeeper' && (
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            openSellerModal();
                          }}
                          className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-slate-50 text-slate-700"
                        >
                          <Store className="w-4 h-4 text-[#F47B44]" />
                          <span>Apply as Seller</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          navigateTo('customer_dashboard');
                        }}
                        className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-slate-50 text-slate-700"
                      >
                        <User className="w-4 h-4 text-slate-500" />
                        <span>Customer Dashboard</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          navigateTo('customer_dashboard');
                        }}
                        className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-slate-50 text-slate-700"
                      >
                        <Gift className="w-4 h-4 text-[#F47B44]" />
                        <span>Points & Referrals</span>
                      </button>

                      <div className="border-t border-slate-100 my-1"></div>

                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          logout();
                        }}
                        className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-red-50 text-red-600"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => openAuthModal('login')}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#142B4A] hover:bg-[#1E3A5F] rounded-lg transition-colors cursor-pointer"
                >
                  Sign In
                </button>
              )}
            </div>

            {/* Mobile menu trigger */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="mt-2.5 md:hidden">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search groceries & products..."
              className="w-full pl-9 pr-20 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
            <button
              type="submit"
              className="absolute right-1 px-3 py-1 text-xs font-semibold text-white bg-[#142B4A] rounded-md"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      {/* 3. Secondary Category & Discovery Sub-Navigation */}
      <div className="border-t border-slate-100 bg-white hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <nav className="flex items-center gap-6 py-2 text-xs font-medium text-slate-600 overflow-x-auto">
            <button
              onClick={() => {
                setFilter({ category: 'All', searchQuery: '' });
                navigateTo('products');
              }}
              className={`hover:text-[#142B4A] transition-colors whitespace-nowrap cursor-pointer ${
                filters.category === 'All' && currentView === 'products' ? 'text-[#142B4A] font-bold' : ''
              }`}
            >
              All Products
            </button>
            <button
              onClick={() => {
                setFilter({ category: 'Groceries & Organics', searchQuery: '' });
                navigateTo('products');
              }}
              className="hover:text-[#142B4A] transition-colors whitespace-nowrap cursor-pointer"
            >
              Groceries & Organics
            </button>
            <button
              onClick={() => {
                setFilter({ category: 'Kitchenware & Spices', searchQuery: '' });
                navigateTo('products');
              }}
              className="hover:text-[#142B4A] transition-colors whitespace-nowrap cursor-pointer"
            >
              Kitchen & Spices
            </button>
            <button
              onClick={() => {
                setFilter({ category: 'Beverages & Snacks', searchQuery: '' });
                navigateTo('products');
              }}
              className="hover:text-[#142B4A] transition-colors whitespace-nowrap cursor-pointer"
            >
              Tea & Beverages
            </button>
            <button
              onClick={() => {
                setFilter({ inStockOnly: false, pointsEarningOnly: true });
                navigateTo('products');
              }}
              className="hover:text-[#F47B44] transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1 text-[#F47B44] font-semibold"
            >
              <Sparkles className="w-3 h-3" />
              <span>Lovoniyo Offers</span>
            </button>
            <button
              onClick={() => {
                setFilter({ redeemWithPointsOnly: true });
                navigateTo('products');
              }}
              className="hover:text-[#142B4A] transition-colors whitespace-nowrap cursor-pointer"
            >
              Redeem with Points
            </button>
            <button
              onClick={() => navigateTo('policy_points')}
              className="hover:text-[#142B4A] transition-colors whitespace-nowrap cursor-pointer"
            >
              How Points Work
            </button>
          </nav>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-2 text-xs">
          {isRealAdmin && (
            <>
              <div className="font-semibold text-slate-400 uppercase text-[10px] tracking-wider mb-1 flex items-center justify-between">
                <span>University Demo Preview</span>
                {isAdminPreviewActive && (
                  <button
                    onClick={() => {
                      exitAdminPreview();
                      navigateTo('admin_dashboard');
                      setIsMobileMenuOpen(false);
                    }}
                    className="text-orange-600 font-bold hover:underline cursor-pointer"
                  >
                    Exit Preview
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-1.5 pb-2 border-b border-slate-100">
                <button
                  onClick={() => {
                    enterPreview('customer');
                    navigateTo('customer_dashboard');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`py-1.5 rounded-md border text-center text-[11px] cursor-pointer ${previewRole === 'customer' ? 'bg-[#142B4A] text-white font-bold' : 'border-slate-200'}`}
                >
                  Customer
                </button>
                <button
                  onClick={() => {
                    enterPreview('seller');
                    navigateTo('shopkeeper_dashboard');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`py-1.5 rounded-md border text-center text-[11px] cursor-pointer ${previewRole === 'seller' ? 'bg-[#142B4A] text-white font-bold' : 'border-slate-200'}`}
                >
                  Seller
                </button>
                <button
                  onClick={() => {
                    enterPreview('guest');
                    navigateTo('home');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`py-1.5 rounded-md border text-center text-[11px] cursor-pointer ${previewRole === 'guest' ? 'bg-[#142B4A] text-white font-bold' : 'border-slate-200'}`}
                >
                  Guest
                </button>
              </div>
            </>
          )}

          <div className="font-semibold text-slate-400 uppercase text-[10px] tracking-wider mt-2 mb-1">
            Navigation
          </div>
          <button
            onClick={() => {
              setFilter({ category: 'All', searchQuery: '' });
              navigateTo('home');
              setIsMobileMenuOpen(false);
            }}
            className="w-full text-left py-1.5 text-slate-700 font-medium cursor-pointer"
          >
            Home
          </button>
          <button
            onClick={() => {
              setFilter({ category: 'All', searchQuery: '' });
              navigateTo('products');
              setIsMobileMenuOpen(false);
            }}
            className="w-full text-left py-1.5 text-slate-700 font-medium cursor-pointer"
          >
            All Products
          </button>
          <button
            onClick={() => {
              setFilter({ category: 'Groceries & Organics', searchQuery: '' });
              navigateTo('products');
              setIsMobileMenuOpen(false);
            }}
            className="w-full text-left py-1.5 text-slate-700 font-medium cursor-pointer"
          >
            Groceries & Organics
          </button>
          <button
            onClick={() => {
              navigateTo('wishlist');
              setIsMobileMenuOpen(false);
            }}
            className="w-full text-left py-1.5 text-slate-700 font-medium cursor-pointer flex items-center justify-between"
          >
            <span>My Saved Wishlist</span>
            {wishlist.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-[#F47B44] text-white text-[10px] font-bold">
                {wishlist.length}
              </span>
            )}
          </button>
          {currentUser && (
            <button
              onClick={() => {
                navigateTo('customer_dashboard');
                setIsMobileMenuOpen(false);
              }}
              className="w-full text-left py-1.5 text-slate-700 font-medium cursor-pointer"
            >
              Customer Dashboard & Points
            </button>
          )}
          {isRealAdmin && (
            <button
              onClick={() => {
                navigateTo('admin_dashboard');
                setIsMobileMenuOpen(false);
              }}
              className="w-full text-left py-1.5 text-[#142B4A] font-bold cursor-pointer"
            >
              Admin Dashboard
            </button>
          )}
        </div>
      )}
    </header>
  );
};
