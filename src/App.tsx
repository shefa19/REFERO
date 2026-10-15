import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { StoreProvider, useStore } from './context/StoreContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { CartDrawer } from './components/cart/CartDrawer';
import { AuthModal } from './components/auth/AuthModal';
import { SellerApplicationModal } from './components/auth/SellerApplicationModal';
import { FirebaseSetupModal } from './components/common/FirebaseSetupModal';
import { ProductDetailModal } from './components/products/ProductDetailModal';
import { HomePage } from './pages/HomePage';
import { ProductsPage } from './pages/ProductsPage';
import { ShopProfilePage } from './pages/ShopProfilePage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderTrackingPage } from './pages/OrderTrackingPage';
import { CustomerDashboard } from './pages/customer/CustomerDashboard';
import { ShopkeeperDashboard } from './pages/shopkeeper/ShopkeeperDashboard';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { PolicyPages } from './pages/PolicyPages';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { currentView, toast } = useStore();

  const renderCurrentView = () => {
    switch (currentView) {
      case 'home':
        return <HomePage />;
      case 'products':
        return <ProductsPage />;
      case 'shop_profile':
        return <ShopProfilePage />;
      case 'checkout':
        return <CheckoutPage />;
      case 'order_tracking':
        return <OrderTrackingPage />;
      case 'customer_dashboard':
        return <CustomerDashboard />;
      case 'shopkeeper_dashboard':
        return <ShopkeeperDashboard />;
      case 'admin_dashboard':
        return <AdminDashboard />;
      case 'policy_points':
      case 'policy_shipping':
      case 'policy_returns':
      case 'policy_terms':
      case 'help_center':
        return <PolicyPages />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F8FA]">
      <Navbar />

      <main className="flex-1">
        {renderCurrentView()}
      </main>

      <Footer />

      {/* Global Overlays & Modals */}
      <CartDrawer />
      <AuthModal />
      <SellerApplicationModal />
      <FirebaseSetupModal />
      <ProductDetailModal />

      {/* Global Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 bg-[#142B4A] text-white rounded-xl shadow-2xl text-xs border border-white/10 animate-fade-in max-w-sm">
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
          {toast.type === 'info' && <Info className="w-4 h-4 text-[#F47B44] shrink-0" />}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <MainAppContent />
      </StoreProvider>
    </AuthProvider>
  );
}

export default App;
