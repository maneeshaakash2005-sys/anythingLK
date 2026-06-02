import { BarChart3, Boxes, CreditCard, Home, LayoutTemplate, LogOut, Menu, Moon, Settings, Shield, ShoppingCart, Store, Sun, Users, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useShop } from '../hooks/useShop';
import { useAdminPendingCount } from '../hooks/useNotifications';
import LoadingButton from './LoadingButton';
import NotificationBell from './NotificationBell';
import SilentErrorBoundary from './SilentErrorBoundary';
import SubscriptionBanner from './SubscriptionBanner';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: Home, end: true },
  { to: '/dashboard/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/dashboard/products', label: 'Products', icon: Boxes },
  { to: '/dashboard/customers', label: 'Customers', icon: Users },
  { to: '/dashboard/reports', label: 'Reports', icon: BarChart3 },
  { to: '/dashboard/templates', label: 'Templates', icon: LayoutTemplate },
  { to: '/dashboard/billing', label: 'Billing', icon: CreditCard },
  { to: '/dashboard/shop-settings', label: 'Shop Settings', icon: Store },
  { to: '/dashboard/settings', label: 'Profile Settings', icon: Settings },
];

export default function DashboardLayout({ title, actions, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { signOut, profile, user, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const showClientSubscription = location.pathname.startsWith('/dashboard');
  const { shop } = useShop({ enabled: showClientSubscription });
  const isPro = shop?.subscription_plan === 'pro';
  const [notifUnreadCount, setNotifUnreadCount] = useState(0);
  const { pendingPayments, refresh: refreshAdminPending } = useAdminPendingCount({ enabled: isAdmin });

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      toast.success('Signed out');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSigningOut(false);
      navigate('/login', { replace: true });
    }
  }

  const sidebar = (
    <aside className="flex h-full w-72 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex h-16 items-center justify-between px-5">
        <NavLink to="/dashboard" className="text-lg font-semibold text-slate-900 dark:text-slate-100">OrderBase</NavLink>
        <button className="rounded-md p-2 text-slate-500 lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close navigation">
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {[...links, ...(isAdmin ? [{ to: '/admin', label: 'Admin', icon: Shield }] : [])].map(({ to, label, icon: Icon, end }) => {
          const badge = to === '/admin' && pendingPayments > 0
            ? pendingPayments
            : to === '/dashboard/orders' && notifUnreadCount > 0
              ? notifUnreadCount
              : 0;
          return (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
              isActive
                ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-100'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
            onClick={() => {
              setSidebarOpen(false);
              if (to === '/admin') refreshAdminPending();
            }}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span className="flex-1">{label}</span>
            {badge > 0 ? (
              <span className="rounded-full bg-rose-600 px-2 py-0.5 text-xs font-semibold text-white">{badge > 9 ? '9+' : badge}</span>
            ) : null}
          </NavLink>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 p-4 dark:border-slate-800">
        <p className="text-xs text-slate-500 dark:text-slate-400">Signed in as</p>
        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{user?.email || profile?.email || 'Account'}</p>
        {profile?.name ? <p className="truncate text-xs text-slate-500 dark:text-slate-400">{profile.name}</p> : null}
        <LoadingButton type="button" className="btn-secondary mt-3 w-full" onClick={handleSignOut} loading={signingOut} loadingText="Signing out..." icon={LogOut}>
          Sign out
        </LoadingButton>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex">{sidebar}</div>
      {sidebarOpen ? <div className="fixed inset-0 z-40 lg:hidden">{sidebar}</div> : null}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 sm:px-6">
          <div className="flex items-center gap-3">
            <button className="rounded-md p-2 text-slate-500 lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open navigation">
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <h1 className="text-lg font-semibold sm:text-xl">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            {actions}
            <SilentErrorBoundary>
              <NotificationBell shopId={shop?.id} enabled={showClientSubscription && isPro} onUnreadCount={setNotifUnreadCount} />
            </SilentErrorBoundary>
            <button className="rounded-md border border-slate-300 p-2 text-slate-600 dark:border-slate-700 dark:text-slate-200" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'dark' ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
        </header>
        <main className="p-4 sm:p-6">
          {showClientSubscription ? <SubscriptionBanner shop={shop} /> : null}
          {children}
        </main>
      </div>
    </div>
  );
}
