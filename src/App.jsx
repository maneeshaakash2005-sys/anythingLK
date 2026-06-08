import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import AdminRoute from './components/AdminRoute';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSkeleton from './components/LoadingSkeleton';
import { useDomainDetect } from './hooks/useDomainDetect';
const MarketplaceHome = lazy(() => import('./pages/MarketplaceHome'));
import NotFound from './components/NotFound';
import ProtectedRoute from './components/ProtectedRoute';
import RealtimeToasts from './components/RealtimeToasts';
import SilentErrorBoundary from './components/SilentErrorBoundary';

const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const CustomerDetail = lazy(() => import('./pages/CustomerDetail'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const DashboardBilling = lazy(() => import('./pages/DashboardBilling'));
const DashboardCustomers = lazy(() => import('./pages/DashboardCustomers'));
const DashboardOrders = lazy(() => import('./pages/DashboardOrders'));
const DashboardProducts = lazy(() => import('./pages/DashboardProducts'));
const DashboardReports = lazy(() => import('./pages/DashboardReports'));
const DashboardSettings = lazy(() => import('./pages/DashboardSettings'));
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const OrderForm = lazy(() => import('./pages/OrderForm'));
const OrderSuccess = lazy(() => import('./pages/OrderSuccess'));
const Pricing = lazy(() => import('./pages/Pricing'));
const PublicOrderForm = lazy(() => import('./pages/PublicOrderForm'));
const Register = lazy(() => import('./pages/Register'));
const ShopSettings = lazy(() => import('./pages/ShopSettings'));
const Templates = lazy(() => import('./pages/Templates'));
const TemplatePreview = lazy(() => import('./pages/TemplatePreview'));
const LegacyOrderRedirect = lazy(() => import('./components/LegacyOrderRedirect'));

function RouteFallback() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 dark:bg-slate-950">
      <LoadingSkeleton rows={6} />
    </div>
  );
}

export default function App() {
  const { isMarketplace } = useDomainDetect();
  return (
    <>
      <SilentErrorBoundary>
        <RealtimeToasts />
      </SilentErrorBoundary>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={isMarketplace ? <MarketplaceHome /> : <Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/template-preview/:templateKey" element={<TemplatePreview />} />
          <Route path="/shop/:shopSlug" element={<PublicOrderForm />} />
          <Route path="/order/:shopSlug" element={<LegacyOrderRedirect />} />
          <Route path="/order-success/:id" element={<OrderSuccess />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/orders" element={<DashboardOrders />} />
            <Route path="/dashboard/orders/new" element={<OrderForm />} />
            <Route path="/dashboard/products" element={<DashboardProducts />} />
            <Route path="/dashboard/customers" element={<DashboardCustomers />} />
            <Route path="/dashboard/customers/:id" element={<CustomerDetail />} />
            <Route path="/dashboard/reports" element={<DashboardReports />} />
            <Route path="/dashboard/billing" element={<DashboardBilling />} />
            <Route path="/dashboard/settings" element={<DashboardSettings />} />
            <Route path="/dashboard/shop-settings" element={<ShopSettings />} />
            <Route path="/dashboard/templates" element={<Templates />} />
          </Route>

          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminPanel />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}
