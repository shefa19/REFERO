import React from 'react';
import { ReferoLogo } from '../common/ReferoLogo';
import { useStore } from '../../context/StoreContext';
import { ShieldCheck, Truck, RotateCcw, Award } from 'lucide-react';

export const Footer: React.FC = () => {
  const { navigateTo, setFilter, openFirebaseModal } = useStore();

  return (
    <footer className="bg-[#142B4A] text-white pt-14 pb-8 border-t border-slate-800">
      {/* Trust & Guarantee Strip */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-12 border-b border-slate-700/60">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0 text-[#F47B44]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">100% Verified Sellers</h4>
              <p className="text-xs text-slate-300 mt-0.5">Strict quality control on all marketplace vendors</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0 text-[#F47B44]">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">REFERO Points Program</h4>
              <p className="text-xs text-slate-300 mt-0.5">Earn points on every order. Points never expire.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0 text-[#F47B44]">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Fast Nationwide Delivery</h4>
              <p className="text-xs text-slate-300 mt-0.5">24h inside Dhaka, standard express all 64 districts</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0 text-[#F47B44]">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">7-Day Easy Returns</h4>
              <p className="text-xs text-slate-300 mt-0.5">Hassle-free refunds with automatic point adjustments</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Brand Column */}
          <div className="md:col-span-2 space-y-4">
            <ReferoLogo variant="full" theme="dark" size="lg" />
            <p className="text-xs text-slate-300 leading-relaxed max-w-sm">
              REFERO is Bangladesh's premier community-driven multi-vendor marketplace.
              Empowering local farmers, artisanal producers, and household retailers while rewarding
              every customer through loyalty points and referral bonuses.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <span className="text-xs text-slate-400 font-medium">Supported Payment Options:</span>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <span className="px-2 py-0.5 bg-white/10 rounded">COD</span>
                <span className="px-2 py-0.5 bg-[#d82a65]/80 text-white rounded">bKash</span>
                <span className="px-2 py-0.5 bg-[#f6921e]/80 text-white rounded">Nagad</span>
                <span className="px-2 py-0.5 bg-[#8b1874]/80 text-white rounded">Rocket</span>
              </div>
            </div>
          </div>

          {/* Column 2: Marketplace */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold tracking-wider uppercase text-slate-200">Marketplace</h5>
            <ul className="space-y-2 text-xs text-slate-300">
              <li>
                <button
                  onClick={() => {
                    setFilter({ category: 'Groceries & Organics' });
                    navigateTo('products');
                  }}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Groceries & Organics
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setFilter({ category: 'Kitchenware & Spices' });
                    navigateTo('products');
                  }}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Kitchen & Spices
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setFilter({ category: 'Beverages & Snacks' });
                    navigateTo('products');
                  }}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Tea & Beverages
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setFilter({ redeemWithPointsOnly: true });
                    navigateTo('products');
                  }}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Redeem with Points
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('shop_profile', { shopId: 'shop_green_valley' })}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Green Valley Organics
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Customer Care & Policies */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold tracking-wider uppercase text-slate-200">Policies & Help</h5>
            <ul className="space-y-2 text-xs text-slate-300">
              <li>
                <button
                  onClick={() => navigateTo('policy_points')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  REFERO Points Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('policy_shipping')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Shipping & Delivery
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('policy_returns')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Returns & Refunds
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('policy_terms')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Terms & Conditions
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('help_center')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Help Centre & FAQs
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Platform Portals */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold tracking-wider uppercase text-slate-200">Portals & Config</h5>
            <ul className="space-y-2 text-xs text-slate-300">
              <li>
                <button
                  onClick={() => navigateTo('customer_dashboard')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Customer Account & Points
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('shopkeeper_dashboard')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Shopkeeper Portal
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('admin_dashboard')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Admin Console
                </button>
              </li>
              <li>
                <button
                  onClick={openFirebaseModal}
                  className="text-[#F47B44] hover:text-white transition-colors cursor-pointer font-medium"
                >
                  Firebase Connection Guide
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Copyright & Meta */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
        <div>
          © {new Date().getFullYear()} REFERO Marketplace Ltd. All rights reserved. Version 1.0 (University Evaluation Release).
        </div>
        <div className="flex items-center gap-4">
          <span>Dhaka, Bangladesh</span>
          <span>·</span>
          <span>Currency: BDT (৳)</span>
          <span>·</span>
          <span>Security Hardened</span>
        </div>
      </div>
    </footer>
  );
};
