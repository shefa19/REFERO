import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { formatBDT } from '../utils/formatters';
import {
  ShieldCheck,
  Sparkles,
  Truck,
  RotateCcw,
  HelpCircle,
  ChevronDown,
  ArrowRight,
  Gift,
  Coins,
  CheckCircle2,
} from 'lucide-react';

export const PolicyPages: React.FC = () => {
  const { currentView, pointsConfig, navigateTo } = useStore();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Do REFERO Points expire?',
      a: 'No. REFERO Points do not expire. Your accumulated points remain valid in your account ledger indefinitely until you choose to redeem them for checkout discounts, spend them on point-only products, or transfer them to another user.',
    },
    {
      q: 'When do I receive points earned on an order?',
      a: 'Points are calculated immediately at checkout, but are officially credited to your active available balance once the courier partner confirms that your package has reached "Delivered" status. This protects the marketplace against cancellations and delivery failures.',
    },
    {
      q: 'How does the Referral Reward work?',
      a: 'When a new friend registers using your referral code, they receive a 50-point welcome bonus. You will receive your 150-point referral reward once your referred friend completes their first qualifying delivered order.',
    },
    {
      q: 'Can I transfer points to friends or family members?',
      a: 'Yes. In your Customer Dashboard > Point Transfers, you can create a transfer request to another verified customer using their registered email. For safety, the recipient must click "Accept" in their dashboard before points are transferred atomically between balances.',
    },
    {
      q: 'What happens to earned points if I request a refund?',
      a: 'If an order is cancelled or returned for a refund, the points earned from that order are authoritatively reversed from your ledger balance. If you spent points to receive a discount on that order, those spent points are restored to your balance.',
    },
    {
      q: 'What are the delivery charges across Bangladesh?',
      a: 'Orders with a subtotal of ৳999 or more enjoy 100% Free Delivery. For orders below ৳999, express delivery inside Dhaka city is ৳60 (dispatched in 24 hours), and courier delivery to all other 63 districts is ৳120 (48–72 hours).',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* 1. REFERO POINTS POLICY */}
      {currentView === 'policy_points' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-12 h-12 rounded-xl bg-[#EAF3FF] flex items-center justify-center text-[#142B4A]">
              <Sparkles className="w-6 h-6 text-[#F47B44]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#142B4A]">
                Official REFERO Points & Rewards Policy
              </h1>
              <p className="text-xs text-slate-500">Effective Date: Version 1.0 (2026)</p>
            </div>
          </div>

          <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 font-medium flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Points Never Expire:</strong> In accordance with REFERO platform guidelines, customer loyalty points never expire. Your balance remains available at all times.
              </span>
            </div>

            <h3 className="text-sm font-bold text-[#142B4A] pt-2">1. Point Valuation and Conversion</h3>
            <p>
              The current platform conversion rate is <strong>1 REFERO Point = ৳{pointsConfig.pointsToBdtRate} BDT</strong>. This conversion rate is managed centrally by authorized marketplace administrators and applied dynamically at checkout. Point values are never converted directly into cash withdrawals.
            </p>

            <h3 className="text-sm font-bold text-[#142B4A] pt-2">2. Earning Rules & Precedence</h3>
            <p>
              Points are calculated on qualifying consumer goods according to the following precedence hierarchy:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Product-Specific Rule (Priority 1):</strong> Products featuring a custom point badge award the exact listed point amount per unit upon delivery.
              </li>
              <li>
                <strong>Amount-Based Fallback (Priority 2):</strong> For all other grocery and pantry items, customers earn <strong>{pointsConfig.defaultEarnPercent}%</strong> of the eligible cash subtotal.
              </li>
              <li>
                <strong>Exclusions:</strong> Delivery fees and amounts discounted using points are excluded from earning calculations.
              </li>
            </ul>

            <h3 className="text-sm font-bold text-[#142B4A] pt-2">3. Referral Incentives</h3>
            <p>
              Customers receive a unique referral code. Referral bonuses ({pointsConfig.referralBonusPoints} points) are credited to the referrer only after the referred user successfully receives their first delivered order. Self-referrals and duplicate accounts are strictly prohibited and audited by the backend.
            </p>

            <h3 className="text-sm font-bold text-[#142B4A] pt-2">4. Peer-to-Peer Point Transfers</h3>
            <p>
              Customers may transfer points to other verified account holders. A transfer creates a pending request which must be actively accepted by the recipient, ensuring mutual consent before atomic balance adjustments take place.
            </p>

            <h3 className="text-sm font-bold text-[#142B4A] pt-2">5. Returns, Cancellations & Reversals</h3>
            <p>
              In the event of an order return or cancellation, any points that were granted upon fulfillment are reversed in the immutable ledger. Points that the customer spent to discount the order are restored to their available balance.
            </p>
          </div>
        </div>
      )}

      {/* 2. SHIPPING & DELIVERY POLICY */}
      {currentView === 'policy_shipping' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-12 h-12 rounded-xl bg-[#EAF3FF] flex items-center justify-center text-[#142B4A]">
              <Truck className="w-6 h-6 text-[#F47B44]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#142B4A]">
                Shipping & Delivery Policy
              </h1>
              <p className="text-xs text-slate-500">Dhaka & Nationwide Coverage across 64 Districts</p>
            </div>
          </div>

          <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="font-bold text-slate-800 text-sm mb-1">Inside Dhaka City</h4>
                <p className="text-slate-600">Standard delivery fee: <strong>৳60</strong></p>
                <p className="text-slate-500 mt-1">Delivery timeframe: 24 to 48 hours via express courier.</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="font-bold text-slate-800 text-sm mb-1">Outside Dhaka (All 63 Districts)</h4>
                <p className="text-slate-600">Standard delivery fee: <strong>৳120</strong></p>
                <p className="text-slate-500 mt-1">Delivery timeframe: 48 to 72 hours via parcel logistics.</p>
              </div>
            </div>

            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 font-medium">
              Free Delivery is automatically applied to any order exceeding <strong>৳999</strong> regardless of destination!
            </div>

            <h3 className="text-sm font-bold text-[#142B4A] pt-2">Cold-Pack Shipping for Perishables</h3>
            <p>
              All dairy products (such as artisanal Bilona Desi Ghee) and fresh cold-pressed oils are packed with insulated wraps and tamper-evident security tape to ensure maximum purity upon arrival.
            </p>
          </div>
        </div>
      )}

      {/* 3. RETURN & REFUND POLICY */}
      {currentView === 'policy_returns' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-12 h-12 rounded-xl bg-[#EAF3FF] flex items-center justify-center text-[#142B4A]">
              <RotateCcw className="w-6 h-6 text-[#F47B44]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#142B4A]">
                7-Day Easy Return & Refund Policy
              </h1>
              <p className="text-xs text-slate-500">Hassle-free customer protection for all marketplace orders</p>
            </div>
          </div>

          <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
            <p>
              We want you to be completely delighted with your groceries and essentials. If you receive an item that is damaged, defective, or significantly different from its description, you may submit a return request within <strong>7 days</strong> of delivery.
            </p>

            <h3 className="text-sm font-bold text-[#142B4A] pt-2">Refund Processing Workflow</h3>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Submit a cancellation or refund request directly from your Order Tracking page or Customer Dashboard.</li>
              <li>The seller or administrator reviews the request within 24 hours.</li>
              <li>Upon approval, your payment is refunded through your original payment method (or cash on delivery agent pickup).</li>
              <li>Points that were earned on the returned items are automatically reversed from your account ledger.</li>
            </ol>
          </div>
        </div>
      )}

      {/* 4. TERMS OF SERVICE & PRIVACY */}
      {currentView === 'policy_terms' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-12 h-12 rounded-xl bg-[#EAF3FF] flex items-center justify-center text-[#142B4A]">
              <ShieldCheck className="w-6 h-6 text-[#F47B44]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#142B4A]">
                Terms of Service & Privacy
              </h1>
              <p className="text-xs text-slate-500">Legal Agreement for REFERO Multi-Vendor Marketplace</p>
            </div>
          </div>

          <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
            <h3 className="text-sm font-bold text-[#142B4A]">1. Multi-Vendor Marketplace Model</h3>
            <p>
              REFERO acts as a digital marketplace enabling verified vendors, shopkeepers, and farmers to list consumer products. Each seller is responsible for item authenticity and compliance with Bangladesh food standards.
            </p>

            <h3 className="text-sm font-bold text-[#142B4A]">2. Privacy and Data Security</h3>
            <p>
              We take customer privacy seriously. Your delivery addresses, contact numbers, and transaction records are encrypted. We do not store mobile banking PINs or OTPs under any circumstances.
            </p>
          </div>
        </div>
      )}

      {/* 5. HELP CENTER & FAQS */}
      {currentView === 'help_center' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-12 h-12 rounded-xl bg-[#EAF3FF] flex items-center justify-center text-[#142B4A]">
              <HelpCircle className="w-6 h-6 text-[#F47B44]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#142B4A]">
                Help Centre & Frequently Asked Questions
              </h1>
              <p className="text-xs text-slate-500">Answers to common customer and vendor questions</p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {faqs.map((faq, idx) => (
              <div key={idx} className="py-4">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full text-left flex items-center justify-between text-xs font-bold text-[#142B4A] hover:text-[#F47B44] transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${
                      openFaq === idx ? 'rotate-180 text-[#F47B44]' : ''
                    }`}
                  />
                </button>
                {openFaq === idx && (
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed pl-2 border-l-2 border-[#F47B44]">
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Contact Support Box */}
          <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-[#142B4A]">Need personalized assistance?</h4>
              <p className="text-slate-500 mt-0.5">
                Our Dhaka customer support desk is available 9 AM – 10 PM daily.
              </p>
              <p className="text-slate-700 font-semibold mt-1">support@refero.com.bd · +880 9612 000111</p>
            </div>
            <button
              onClick={() => navigateTo('home')}
              className="px-4 py-2 bg-[#142B4A] text-white font-semibold rounded-lg hover:bg-[#1E3A5F] transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
