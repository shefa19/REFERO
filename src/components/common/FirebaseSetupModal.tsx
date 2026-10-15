import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { isFirebaseConfigured, firebaseConfig } from '../../services/firebase/config';
import { X, Database, CheckCircle2, AlertTriangle, Copy, Terminal, Shield, Sparkles } from 'lucide-react';

export const FirebaseSetupModal: React.FC = () => {
  const { isFirebaseModalOpen, closeFirebaseModal, showToast, dataSources } = useStore();
  const [copied, setCopied] = useState(false);

  if (!isFirebaseModalOpen) return null;

  const isConfigured = isFirebaseConfigured();

  const envSnippet = `# Copy to .env.local in root directory:
VITE_FIREBASE_API_KEY="${firebaseConfig.apiKey || 'YOUR_FIREBASE_API_KEY'}"
VITE_FIREBASE_AUTH_DOMAIN="${firebaseConfig.authDomain || 'your-project-id.firebaseapp.com'}"
VITE_FIREBASE_PROJECT_ID="${firebaseConfig.projectId || 'your-project-id'}"
VITE_FIREBASE_STORAGE_BUCKET="${firebaseConfig.storageBucket || 'your-project-id.appspot.com'}"
VITE_FIREBASE_MESSAGING_SENDER_ID="${firebaseConfig.messagingSenderId || '123456789012'}"
VITE_FIREBASE_APP_ID="${firebaseConfig.appId || '1:123456789012:web:abcdef'}"`;

  const handleCopy = () => {
    navigator.clipboard.writeText(envSnippet);
    setCopied(true);
    showToast('Configuration snippet copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={closeFirebaseModal} />

      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 z-10 border border-slate-200">
        <button
          onClick={closeFirebaseModal}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#EAF3FF] text-[#142B4A] flex items-center justify-center">
            <Database className="w-5 h-5 text-[#F47B44]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#142B4A]">Firebase Backend Integration Status</h3>
            <p className="text-xs text-slate-500">
              Zero-friction architecture supporting both live Firebase and University Showcase Mode
            </p>
          </div>
        </div>

        {/* Current Connection Status Box */}
        <div
          className={`p-4 rounded-xl border mb-6 ${
            isConfigured
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-start gap-3">
            {isConfigured ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="w-full">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold">
                  {isConfigured
                    ? 'Connected to Live Firebase Project'
                    : 'Currently in Interactive University Showcase Mode'}
                </h4>
                <span
                  className={`text-[10px] px-2 py-0.5 font-bold rounded-full uppercase ${
                    isConfigured ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-200 text-amber-800'
                  }`}
                >
                  {isConfigured ? 'Live Backend' : 'Demo Ready'}
                </span>
              </div>
              <p className="text-xs mt-1 leading-relaxed opacity-90">
                {isConfigured
                  ? `Active Firebase Project ID: "${firebaseConfig.projectId}". Real-time Firestore synchronization and authentication active.`
                  : 'All features (Role-based access, products, cart, checkout, immutable point ledger, point transfers, and admin controls) are 100% interactive using our pre-seeded memory store. You can demonstrate everything immediately in class!'}
              </p>

              {/* Collection-Level Source Transparency */}
              <div className="mt-3 pt-3 border-t border-emerald-200/80 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                <div className="bg-white/90 p-2 rounded-lg border border-emerald-200/60 shadow-2xs">
                  <span className="font-bold text-slate-700 block text-[10px] uppercase tracking-wider">/products</span>
                  <span className={dataSources.products === 'live' ? 'text-emerald-700 font-bold' : 'text-amber-700 font-semibold'}>
                    {dataSources.products === 'live' ? '● Live Firestore Data' : '○ Demo Fallback (0 in DB)'}
                  </span>
                </div>
                <div className="bg-white/90 p-2 rounded-lg border border-emerald-200/60 shadow-2xs">
                  <span className="font-bold text-slate-700 block text-[10px] uppercase tracking-wider">/shops</span>
                  <span className={dataSources.shops === 'live' ? 'text-emerald-700 font-bold' : 'text-amber-700 font-semibold'}>
                    {dataSources.shops === 'live' ? '● Live Firestore Data' : '○ Demo Fallback (0 in DB)'}
                  </span>
                </div>
                <div className="bg-white/90 p-2 rounded-lg border border-emerald-200/60 shadow-2xs">
                  <span className="font-bold text-slate-700 block text-[10px] uppercase tracking-wider">/orders</span>
                  <span className={dataSources.orders === 'live' ? 'text-emerald-700 font-bold' : 'text-amber-700 font-semibold'}>
                    {dataSources.orders === 'live' ? '● Live Firestore Data' : '○ Demo Fallback (0 in DB)'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* How to Connect Real Firebase Project */}
        <div className="space-y-4 text-xs">
          <div>
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#F47B44]" />
              <span>Step 1: Add Your Firebase Web Credentials</span>
            </h4>
            <p className="text-slate-600 mb-2">
              Create an `.env.local` file or configure your cloud environment with these keys from the Firebase Console (Project Settings &gt; General &gt; Web Apps):
            </p>
            <div className="relative bg-slate-900 text-slate-200 p-3 rounded-lg font-mono text-[11px] leading-relaxed">
              <pre className="overflow-x-auto">{envSnippet}</pre>
              <button
                onClick={handleCopy}
                className="absolute top-2.5 right-2.5 px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Copy className="w-3 h-3" />
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
              <Shield className="w-3.5 h-3.5 text-[#142B4A]" />
              <span>Step 2: Deploy Production Security Rules</span>
            </h4>
            <p className="text-slate-600 mb-1.5">
              We have generated complete, hardened `firestore.rules` and `firestore.indexes.json` in the project root enforcing role-based permissions and ledger immutability:
            </p>
            <div className="bg-slate-100 text-slate-800 p-2.5 rounded-lg font-mono text-[11px] flex items-center gap-2">
              <Terminal className="w-4 h-4 text-slate-500" />
              <span>firebase deploy --only firestore:rules,firestore:indexes</span>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Step 3: Enable Firebase Authentication</span>
            </h4>
            <p className="text-slate-600">
              In Firebase Console &gt; Authentication, enable <strong>Email/Password</strong> provider. The application will immediately switch to live authentication without touching any frontend UI code!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Source files: `src/services/firebase/config.ts`, `firestore.rules`, `functions/src/index.ts`
          </span>
          <button
            onClick={closeFirebaseModal}
            className="px-4 py-1.5 bg-[#142B4A] text-white text-xs font-semibold rounded-lg hover:bg-[#1E3A5F] transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
