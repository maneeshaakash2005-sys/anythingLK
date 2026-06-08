import { Home, Search, ShoppingBag, Store, User, Menu, PackageCheck, LogIn, LayoutDashboard } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function MarketplaceLayout({ children }) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/marketplace/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const isActive = (path) => location.pathname === path;
  const isSearchActive = location.pathname.startsWith('/marketplace/search');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col font-sans">
      
      {/* Top Desktop Navigation */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/85 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/85">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0 group">
            <div className="bg-gradient-to-tr from-rose-500 to-amber-500 p-2 rounded-xl text-white shadow-sm transition-transform group-hover:scale-105">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent dark:from-white dark:to-slate-300">
              anything<span className="text-rose-500 font-extrabold">.lk</span>
            </span>
          </Link>

          {/* Search bar (Desktop & Tablet) */}
          <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center flex-1 max-w-lg relative">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="What are you looking for today?..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-800/60 border border-transparent focus:border-rose-500/30 focus:bg-white dark:focus:bg-slate-900 rounded-full py-2 pl-4 pr-10 outline-none text-sm transition-all shadow-inner"
              />
              <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 transition-colors">
                <Search className="h-4 w-4" />
              </button>
            </div>
          </form>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link to="/" className={`transition-colors hover:text-rose-500 ${isActive('/') ? 'text-rose-500' : 'text-slate-600 dark:text-slate-300'}`}>
              Home
            </Link>
            <Link to="/marketplace/search" className={`transition-colors hover:text-rose-500 ${isSearchActive ? 'text-rose-500' : 'text-slate-600 dark:text-slate-300'}`}>
              Browse Stores
            </Link>
            
            <span className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800" />
            
            {session ? (
              <Link to="/dashboard" className="btn-primary py-1.5 px-4 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm hover:shadow transition-all">
                <LayoutDashboard className="h-3.5 w-3.5" />
                Seller Dashboard
              </Link>
            ) : (
              <Link to="/login" className="btn-secondary py-1.5 px-4 rounded-full text-xs font-semibold flex items-center gap-1.5 border border-slate-200 dark:border-slate-800">
                <LogIn className="h-3.5 w-3.5" />
                Login to Sell
              </Link>
            )}
          </nav>

          {/* Mobile Search Toggle & Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <Link to="/marketplace/search" className="p-2 text-slate-600 dark:text-slate-400 hover:text-rose-500 rounded-lg">
              <Search className="h-5 w-5" />
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 dark:text-slate-400 hover:text-rose-500 rounded-lg focus:outline-none"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
          <div
            className="absolute top-16 right-0 w-64 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 h-[calc(100vh-4rem)] p-5 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-6">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Navigation</p>
              <nav className="flex flex-col gap-4 text-base font-semibold">
                <Link to="/" onClick={() => setMobileMenuOpen(false)} className={`flex items-center gap-3 py-2 ${isActive('/') ? 'text-rose-500' : ''}`}>
                  <Home className="h-5 w-5" /> Home
                </Link>
                <Link to="/marketplace/search" onClick={() => setMobileMenuOpen(false)} className={`flex items-center gap-3 py-2 ${isSearchActive ? 'text-rose-500' : ''}`}>
                  <Store className="h-5 w-5" /> Browse Stores
                </Link>
              </nav>
            </div>
            
            <div className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-3">
              {session ? (
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full btn-primary py-2.5 rounded-xl text-center font-medium flex items-center justify-center gap-2"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Seller Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full btn-secondary py-2.5 rounded-xl text-center font-medium block border border-slate-200 dark:border-slate-800"
                  >
                    Login to Sell
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full btn-primary py-2.5 rounded-xl text-center font-medium block bg-gradient-to-r from-rose-500 to-amber-500 border-0"
                  >
                    Register Store
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 mb-20 md:mb-0">
        {children}
      </main>

      {/* Shared Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800/80 py-10 mt-auto hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-tr from-rose-500 to-amber-500 p-1.5 rounded-lg text-white">
                <ShoppingBag className="h-4 w-4" />
              </div>
              <span className="text-lg font-bold tracking-tight">anything.lk</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
              Sri Lanka's premium decentralized storefront marketplace, powered by OrderBase SaaS infrastructure. Buy directly from trusted local shops.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-4 text-slate-800 dark:text-slate-200">For Buyers</h4>
            <ul className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
              <li><Link to="/marketplace/search" className="hover:text-rose-500 transition-colors">Find Local Shops</Link></li>
              <li><Link to="/marketplace/search?category=food" className="hover:text-rose-500 transition-colors">Food Delivery</Link></li>
              <li><Link to="/marketplace/search?verified=true" className="hover:text-rose-500 transition-colors">Verified Merchants</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-4 text-slate-800 dark:text-slate-200">For Merchants</h4>
            <ul className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
              <li><Link to="/register" className="hover:text-rose-500 transition-colors">Create OrderBase Store</Link></li>
              <li><Link to="/pricing" className="hover:text-rose-500 transition-colors">Pricing Plans</Link></li>
              <li><Link to="/login" className="hover:text-rose-500 transition-colors">Merchant Dashboard</Link></li>
            </ul>
          </div>
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Sri Lankan Built</h4>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-3 border border-slate-100 dark:border-slate-800 text-xs">
              <p className="font-semibold text-rose-500 flex items-center gap-1.5">
                <PackageCheck className="h-4 w-4" />
                100% Secure Checkout
              </p>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                Direct-to-bank payments and cash-on-delivery verified by local merchants.
              </p>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-100 dark:border-slate-800/40 mt-8 pt-6 flex items-center justify-between text-xs text-slate-400">
          <p>© 2026 AnythingLK. All rights reserved. Powered by OrderBase.lk</p>
          <div className="flex gap-4">
            <Link to="/pricing" className="hover:text-rose-500">Terms of Service</Link>
            <Link to="/pricing" className="hover:text-rose-500">Privacy Policy</Link>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar (App Experience) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800/80 backdrop-blur-md px-6 py-2.5 flex items-center justify-around shadow-lg">
        <Link to="/" className={`flex flex-col items-center gap-1.5 transition-colors ${isActive('/') ? 'text-rose-500' : 'text-slate-400 dark:text-slate-500'}`}>
          <Home className="h-5 w-5" />
          <span className="text-[10px] font-medium">Home</span>
        </Link>
        <Link to="/marketplace/search" className={`flex flex-col items-center gap-1.5 transition-colors ${isSearchActive ? 'text-rose-500' : 'text-slate-400 dark:text-slate-500'}`}>
          <Search className="h-5 w-5" />
          <span className="text-[10px] font-medium">Search</span>
        </Link>
        <Link to={session ? "/dashboard" : "/login"} className={`flex flex-col items-center gap-1.5 transition-colors ${location.pathname.startsWith('/dashboard') ? 'text-rose-500' : 'text-slate-400 dark:text-slate-500'}`}>
          <User className="h-5 w-5" />
          <span className="text-[10px] font-medium">{session ? "Dashboard" : "Login"}</span>
        </Link>
      </div>
    </div>
  );
}
