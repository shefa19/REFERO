import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { ReferoLogo } from '../common/ReferoLogo';
import { X, Store, Phone, MapPin, Truck, RotateCcw, AlertCircle, CheckCircle2 } from 'lucide-react';

export const SellerApplicationModal: React.FC = () => {
  const { currentUser } = useAuth();
  const { isSellerModalOpen, closeSellerModal, applyForSellerShop, openAuthModal, showToast } = useStore();

  const [form, setForm] = useState({
    name: '',
    category: 'Groceries & Organics',
    contactPerson: currentUser?.fullName || '',
    businessEmail: currentUser?.email || '',
    phone: currentUser?.phone || '',
    address: '',
    tradeLicenseNumber: '',
    description: '',
    deliveryPolicy: 'Standard 2-4 business days courier delivery across Bangladesh.',
    returnPolicy: '7-day replacement or refund for damaged, broken, or expired items.',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isSellerModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!currentUser) {
      closeSellerModal();
      openAuthModal('login');
      showToast('Please sign in or register an account before applying as a seller.', 'info');
      return;
    }

    if (!form.name || !form.phone || !form.address || !form.description) {
      setErrorMsg('Please complete all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await applyForSellerShop(form);
      if (res.success) {
        closeSellerModal();
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit seller application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={closeSellerModal} />

      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 sm:p-8 z-10 border border-slate-200">
        <button
          onClick={closeSellerModal}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-[#142B4A] mx-auto mb-3 border border-amber-200">
            <Store className="w-6 h-6 text-[#F47B44]" />
          </div>
          <h2 className="text-lg font-extrabold text-[#142B4A]">Become a Verified REFERO Seller</h2>
          <p className="text-xs text-slate-500 mt-1">
            Apply to launch your storefront on REFERO. Applications are reviewed by marketplace administrators.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Store / Brand Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Padma Organic Delights"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#142B4A]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Primary Category *</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
              >
                <option value="Groceries & Organics">Groceries & Organics</option>
                <option value="Kitchenware & Spices">Kitchenware & Spices</option>
                <option value="Beverages & Snacks">Beverages & Snacks</option>
                <option value="Household & Personal Care">Household & Personal Care</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Business Phone *</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+880 1..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Contact Person *</label>
              <input
                type="text"
                value={form.contactPerson}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                placeholder="Owner / Manager name"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden"
                required
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Business Email *</label>
              <input
                type="email"
                value={form.businessEmail}
                onChange={(e) => setForm({ ...form, businessEmail: e.target.value })}
                placeholder="business@example.com"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden"
                required
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Trade License / BIN Number (Verification)</label>
            <input
              type="text"
              value={form.tradeLicenseNumber}
              onChange={(e) => setForm({ ...form, tradeLicenseNumber: e.target.value })}
              placeholder="e.g. TRAD/DNCC/102948/2025"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:outline-hidden"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Physical Store / Warehouse Address *</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="e.g. Shop 14, Level 2, Banani, Dhaka"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden"
              required
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Shop Description & Specialization *</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              placeholder="Tell customers and admins about your artisan heritage or authentic products..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Delivery Policy</label>
              <textarea
                value={form.deliveryPolicy}
                onChange={(e) => setForm({ ...form, deliveryPolicy: e.target.value })}
                rows={2}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-[11px]"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Return & Refund Policy</label>
              <textarea
                value={form.returnPolicy}
                onChange={(e) => setForm({ ...form, returnPolicy: e.target.value })}
                rows={2}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-[11px]"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-[#142B4A] hover:bg-[#1E3A5F] text-white font-bold rounded-xl transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-2"
            >
              <Store className="w-4 h-4 text-[#F47B44]" />
              <span>{isSubmitting ? 'Submitting Application...' : 'Submit Store Application'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
