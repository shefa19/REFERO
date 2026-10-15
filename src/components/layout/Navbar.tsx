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
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { currentUser, userRole, switchDemoRole, logout } = useAuth();
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

  const userNotifications = notifications.filter(
    (n) => !currentUser || n.userId === currentUser.id || currentUser.role === 'admin'
  );
  const unreadCount = userNotifications.filter((n) => !n.read).length;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFilter({ searchQuery: searchInput });
    if (currentView !== 'products') {
      navigateTo('products');
    }
  };

  const handleRoleSelect = (role: 'admin' | 'shopkeeper' | 'customer' | 'guest') => {
    switchDemoRole(role);
    setIsRoleDropdownOpen(false);
    // Redirect to respective dashboard when switched
    if (role === 'admin') navigateTo('admin_dashboard');
    else if (role === 'shopkeeper') navigateTo('shopkeeper_dashboard');
    else if (role === 'customer') navigateTo('customer_dashboard');
    else navigateTo('home');
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 shadow-xs">
      {/* 1. Announcement Bar */}
      <div className="bg-[#142B4A] text-white text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#F47B44]">Dhaka Delivery:</span>
            <span>Free shipping on all orders over ৳999 · Earn up to 10% back in REFERO Points</span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-[11px] text-slate-300">
            <button
              onClick={() => navigateTo('policy_points')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Points Policy
            </button>
            <span>·</span>
            <button
              onClick={() => navigateTo('help_center')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Help & Support
            </button>
            <span>·</span>
            <button
              onClick={openSellerModal}
              className="inline-flex items-center gap-1 text-[#F47B44] hover:text-white font-medium transition-colors cursor-pointer"
            >
              <Store className="w-3 h-3" />
              <span>Become a Seller</span>
            </button>
            <span>·</span>
            <button
              onClick={openFirebaseModal}
              className="inline-flex items-center gap-1 text-[#F47B44] hover:text-white font-medium transition-colors cursor-pointer"
            >
              <Database className="w-3 h-3" />
              <span>Firebase Status</span>
            </button>
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
            {/* University Class Role Switcher (Crucial for live presentation) */}
            <div className="relative">
              <button
                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
                title="Switch role for University demonstration"
              >
                <Layers className="w-3.5 h-3.5 text-[#F47B44]" />
                <span className="capitalize font-semibold text-[#142B4A]">{userRole}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {isRoleDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50 text-xs">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    Switch Role for Demo
                  </div>
                  <button
                    onClick={() => handleRoleSelect('admin')}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 ${userRole === 'admin' ? 'bg-[#EAF3FF] font-semibold text-[#142B4A]' : 'text-slate-700'}`}
                  >
                    <span>🛡️ Shefaul Islam (Admin)</span>
                    {userRole === 'admin' && <span className="text-[10px] text-[#F47B44]">Active</span>}
                  </button>
                  <button
                    onClick={() => handleRoleSelect('shopkeeper')}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 ${userRole === 'shopkeeper' ? 'bg-[#EAF3FF] font-semibold text-[#142B4A]' : 'text-slate-700'}`}
                  >
                    <span>🏪 Mahinur (Green Valley Shop)</span>
                    {userRole === 'shopkeeper' && <span className="text-[10px] text-[#F47B44]">Active</span>}
                  </button>
                  <button
                    onClick={() => handleRoleSelect('customer')}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 ${userRole === 'customer' ? 'bg-[#EAF3FF] font-semibold text-[#142B4A]' : 'text-slate-700'}`}
                  >
                    <span>🛍️ Moumita (Customer)</span>
                    {userRole === 'customer' && <span className="text-[10px] text-[#F47B44]">Active</span>}
                  </button>
                  <button
                    onClick={() => handleRoleSelect('guest')}
                    className="w-full text-left px-3 py-2 text-slate-500 hover:bg-slate-50"
                  >
                    <span>👤 Guest Mode</span>
                  </button>
                </div>
              )}
            </div>

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
              onClick={() => {
                if (currentUser) navigateTo('customer_dashboard');
                else openAuthModal('login');
              }}
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
                          onClick={() => markNotificationAsRead(notif.id)}
                          className={`p-3 hover:bg-slate-50 transition-colors cursor-pointer ${
                            !notif.read ? 'bg-blue-50/40' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <h5 className="font-semibold text-slate-800 text-[11px]">{notif.title}</h5>
                            {!notif.read && (
                              <span className="w-2 h-2 rounded-full bg-[#F47B44] shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5">{notif.message}</p>
                          <span className="text-[9px] text-slate-400 mt-1 block">
                            {new Date(notif.createdAt).toLocaleDateString()}
                          </span>
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
            <button
              onClick={() => {
                if (currentUser?.role === 'shopkeeper') {
                  navigateTo('shopkeeper_dashboard');
                } else {
                  navigateTo('shopkeeper_dashboard');
                }
              }}
              className="ml-auto text-slate-500 hover:text-[#142B4A] transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1"
            >
              <Store className="w-3.5 h-3.5 text-slate-400" />
              <span>Seller Portal</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-2 text-xs">
          <div className="font-semibold text-slate-400 uppercase text-[10px] tracking-wider mb-1">
            Demo Role Switch
          </div>
          <div className="grid grid-cols-3 gap-1.5 pb-2 border-b border-slate-100">
            <button
              onClick={() => {
                handleRoleSelect('customer');
                setIsMobileMenuOpen(false);
              }}
              className={`py-1.5 rounded-md border text-center ${userRole === 'customer' ? 'bg-[#142B4A] text-white' : 'border-slate-200'}`}
            >
              Customer
            </button>
            <button
              onClick={() => {
                handleRoleSelect('shopkeeper');
                setIsMobileMenuOpen(false);
              }}
              className={`py-1.5 rounded-md border text-center ${userRole === 'shopkeeper' ? 'bg-[#142B4A] text-white' : 'border-slate-200'}`}
            >
              Shopkeeper
            </button>
            <button
              onClick={() => {
                handleRoleSelect('admin');
                setIsMobileMenuOpen(false);
              }}
              className={`py-1.5 rounded-md border text-center ${userRole === 'admin' ? 'bg-[#142B4A] text-white' : 'border-slate-200'}`}
            >
              Admin
            </button>
          </div>

          <div className="font-semibold text-slate-400 uppercase text-[10px] tracking-wider mt-2 mb-1">
            Navigation
          </div>
          <button
            onClick={() => {
              setFilter({ category: 'All', searchQuery: '' });
              navigateTo('home');
              setIsMobileMenuOpen(false);
            }}
            className="w-full text-left py-1.5 text-slate-700 font-medium"
          >
            Home
          </button>
          <button
            onClick={() => {
              setFilter({ category: 'All', searchQuery: '' });
              navigateTo('products');
              setIsMobileMenuOpen(false);
            }}
            className="w-full text-left py-1.5 text-slate-700 font-medium"
          >
            All Products
          </button>
          <button
            onClick={() => {
              setFilter({ category: 'Groceries & Organics', searchQuery: '' });
              navigateTo('products');
              setIsMobileMenuOpen(false);
            }}
            className="w-full text-left py-1.5 text-slate-700 font-medium"
          >
            Groceries & Organics
          </button>
          <button
            onClick={() => {
              navigateTo('customer_dashboard');
              setIsMobileMenuOpen(false);
            }}
            className="w-full text-left py-1.5 text-slate-700 font-medium"
          >
            Customer Dashboard & Points
          </button>
          <button
            onClick={() => {
              navigateTo('shopkeeper_dashboard');
              setIsMobileMenuOpen(false);
            }}
            className="w-full text-left py-1.5 text-slate-700 font-medium"
          >
            Shopkeeper Dashboard
          </button>
          <button
            onClick={() => {
              navigateTo('admin_dashboard');
              setIsMobileMenuOpen(false);
            }}
            className="w-full text-left py-1.5 text-slate-700 font-medium"
          >
            Admin Dashboard
          </button>
          <button
            onClick={() => {
              openFirebaseModal();
              setIsMobileMenuOpen(false);
            }}
            className="w-full text-left py-1.5 text-[#F47B44] font-semibold"
          >
            Firebase Config & Status
          </button>
        </div>
      )}
    </header>
  );
};
