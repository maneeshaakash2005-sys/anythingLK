import { Search, MapPin, Sparkles, Star, Award, ShieldCheck, Zap, Utensils, Shirt, Cpu, Palette, Chair, Pill } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MarketplaceLayout from '../components/marketplace/MarketplaceLayout';
import ProductCard from '../components/marketplace/ProductCard';
import StoreCard from '../components/marketplace/StoreCard';
import SEO from '../components/marketplace/SEO';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { useMarketplace } from '../hooks/useMarketplace';

const POPULAR_CATEGORIES = [
  { key: 'food', label: 'Food & Dining', icon: <Utensils className="h-6 w-6" />, desc: 'Local cafes & restaurants' },
  { key: 'fashion', label: 'Fashion & Apparel', icon: <Shirt className="h-6 w-6" />, desc: 'Trendy clothes & footwear' },
  { key: 'electronics', label: 'Electronics', icon: <Cpu className="h-6 w-6" />, desc: 'Phones, gadgets & accessories' },
  { key: 'beauty', label: 'Beauty & Cosmetics', icon: <Palette className="h-6 w-6" />, desc: 'Skincare & makeup items' },
  { key: 'furniture', label: 'Home & Living', icon: <Chair className="h-6 w-6" />, desc: 'Decor & furniture pieces' },
  { key: 'pharmacy', label: 'Health & Pharmacy', icon: <Pill className="h-6 w-6" />, desc: 'Medicines & wellness' }
];
  { key: 'food', label: 'Food & Dining', icon: <Utensils className="h-6 w-6" />, desc: 'Local cafes & restaurants' },
  { key: 'fashion', label: 'Fashion & Apparel', icon: <Shirt className="h-6 w-6" />, desc: 'Trendy clothes & footwear' },
  { key: 'electronics', label: 'Electronics', icon: <Cpu className="h-6 w-6" />, desc: 'Phones, gadgets & accessories' },
  { key: 'beauty', label: 'Beauty & Cosmetics', icon: <Palette className="h-6 w-6" />, desc: 'Skincare & makeup items' },
  { key: 'furniture', label: 'Home & Living', icon: <Chair className="h-6 w-6" />, desc: 'Decor & furniture pieces' },
  { key: 'pharmacy', label: 'Health & Pharmacy', icon: <Pill className="h-6 w-6" />, desc: 'Medicines & wellness' }
];

const TRENDING_TAGS = ['Burger', 'Frock', 'iPhone', 'Sri Lankan Spices', 'Gift Box', 'Headphones'];

export default function MarketplaceHome() {
  const navigate = useNavigate();
  const { fetchHomeData, loading, error } = useMarketplace();
  const [searchQuery, setSearchQuery] = useState('');
  const [data, setData] = useState({
    featuredStores: [],
    trendingProducts: [],
    newArrivals: [],
    topRatedStores: [],
    bestReviewedProducts: []
  });

  useEffect(() => {
    async function loadData() {
      const res = await fetchHomeData();
      if (res) {
        setData(res);
      }
    }
    loadData();
  }, [fetchHomeData]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/marketplace/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <MarketplaceLayout>
      <SEO
        title="AnythingLK | Discover Sri Lankan Products & Stores"
        description="Search and browse thousands of local products and stores in Sri Lanka. Fast delivery, secure bank transfer and cash on delivery payments."
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          'name': 'AnythingLK Marketplace',
          'url': window.location.origin,
          'potentialAction': {
            '@type': 'SearchAction',
            'target': `${window.location.origin}/marketplace/search?q={search_term_string}`,
            'query-input': 'required name=search_term_string'
          }
        }}
      />

      <div className="space-y-12">
        {/* 1. Hero Search Section */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-tr from-slate-900 via-rose-950 to-slate-900 text-white px-6 py-12 sm:px-12 sm:py-20 text-center shadow-xl">
          <div className="absolute top-0 right-0 h-40 w-40 bg-amber-500/10 blur-3xl rounded-full" />
          <div className="absolute bottom-0 left-0 h-40 w-40 bg-rose-500/10 blur-3xl rounded-full" />
          
          <div className="relative max-w-2xl mx-auto space-y-6">
            <span className="inline-flex items-center gap-1.5 bg-rose-500/20 border border-rose-500/30 text-rose-350 text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full">
              <Sparkles className="h-3.5 w-3.5" />
              Direct Storefront Marketplace
            </span>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
              Find anything you want in Sri Lanka
            </h1>
            <p className="text-sm sm:text-base text-slate-300 max-w-lg mx-auto">
              Shop directly from local Sri Lankan merchants with bank transfers or Cash on Delivery.
            </p>

            {/* Main Search Input */}
            <form onSubmit={handleSearchSubmit} className="bg-white p-2 rounded-2xl sm:rounded-full shadow-lg flex flex-col sm:flex-row gap-2 max-w-xl mx-auto">
              <div className="flex-1 flex items-center px-3 gap-2 text-slate-400">
                <Search className="h-4.5 w-4.5 shrink-0" />
                <input
                  type="text"
                  placeholder="What product or store are you searching for?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-0 outline-none text-slate-800 text-sm py-2"
                />
              </div>
              <div className="h-full hidden sm:block w-[1px] bg-slate-100 self-center" />
              <div className="flex items-center px-3 gap-2 text-slate-400">
                <MapPin className="h-4.5 w-4.5 text-rose-500 shrink-0" />
                <span className="text-sm font-semibold text-slate-650">Sri Lanka</span>
              </div>
              <button
                type="submit"
                className="bg-rose-500 hover:bg-rose-600 active:scale-95 transition-all text-white font-bold text-sm px-6 py-3 rounded-xl sm:rounded-full"
              >
                Search
              </button>
            </form>

            {/* Trending Tags */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs text-slate-400">
              <span className="font-semibold text-slate-300">Trending searches:</span>
              {TRENDING_TAGS.map((tag) => (
                <Link
                  key={tag}
                  to={`/marketplace/search?q=${encodeURIComponent(tag)}`}
                  className="bg-white/10 hover:bg-white/20 hover:text-white px-3 py-1 rounded-full transition-colors"
                >
                  {tag}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* 2. Featured Categories */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">Explore Categories</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {POPULAR_CATEGORIES.map((cat) => (
              <Link
                key={cat.key}
                to={`/marketplace/search?category=${cat.key}`}
                className="group p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl text-center hover:border-rose-500/20 hover:shadow-xl transition-all"
              >
                <div className="flex flex-col items-center mb-3">
                  <span className="text-4xl block transform group-hover:scale-110 transition-transform duration-300 text-rose-500">
                    {cat.icon}
                  </span>
                </div>
                <p className="font-bold text-sm text-slate-800 dark:text-slate-200 text-center">{cat.label}</p>
                <p className="text-[10px] text-slate-400 mt-1 text-center truncate">{cat.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        {loading ? (
          <div className="py-10"><LoadingSkeleton rows={10} /></div>
        ) : error ? (
          <div className="p-6 text-center border border-rose-100 dark:border-rose-950/20 bg-rose-50/50 dark:bg-rose-950/5 rounded-3xl text-rose-500 font-semibold text-sm">
            Failed to load marketplace content. Please refresh.
          </div>
        ) : (
          <>
            {/* 3. Featured Stores */}
            {data.featuredStores.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                    <Award className="h-5 w-5 text-rose-500" />
                    Featured Stores
                  </h2>
                  <Link to="/marketplace/search" className="text-xs font-bold text-rose-500 hover:underline">
                    View All
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {data.featuredStores.slice(0, 3).map((store) => (
                    <StoreCard key={store.id} store={store} />
                  ))}
                </div>
              </section>
            )}

            {/* 4. Trending Products */}
            {data.trendingProducts.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                    <Zap className="h-5 w-5 text-amber-500" />
                    Trending Products
                  </h2>
                  <Link to="/marketplace/search?sort=popular" className="text-xs font-bold text-rose-500 hover:underline">
                    View All
                  </Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                  {data.trendingProducts.map((prod) => (
                    <ProductCard key={prod.id} product={prod} />
                  ))}
                </div>
              </section>
            )}

            {/* 5. New Arrivals */}
            {data.newArrivals.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight">New Arrivals</h2>
                  <Link to="/marketplace/search?sort=newest" className="text-xs font-bold text-rose-500 hover:underline">
                    View All
                  </Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                  {data.newArrivals.map((prod) => (
                    <ProductCard key={prod.id} product={prod} />
                  ))}
                </div>
              </section>
            )}

            {/* 6. Top Rated Stores */}
            {data.topRatedStores.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                    <Star className="h-5 w-5 text-amber-500" />
                    Top Rated Stores
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {data.topRatedStores.slice(0, 3).map((store) => (
                    <StoreCard key={store.id} store={store} />
                  ))}
                </div>
              </section>
            )}

            {/* 7. Best Reviewed Products */}
            {data.bestReviewedProducts.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight">Best Reviewed Products</h2>
                  <Link to="/marketplace/search?sort=rating" className="text-xs font-bold text-rose-500 hover:underline">
                    View All
                  </Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                  {data.bestReviewedProducts.map((prod) => (
                    <ProductCard key={prod.id} product={prod} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* 8. Marketplace Benefits */}
        <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-sm flex flex-col lg:flex-row gap-8 items-center justify-between">
          <div className="space-y-4 max-w-xl text-center lg:text-left">
            <span className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 text-xs font-extrabold px-3 py-1.5 rounded-full inline-flex items-center gap-1">
              <ShieldCheck className="h-4 w-4" />
              Trusted Sri Lankan Merchants
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
              Buy directly, support local businesses safely
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
              Every merchant on AnythingLK represents an independent shop operating through OrderBase. Talk directly to sellers, complete payment securely via bank transfer with verified payment slips, or choose Cash on Delivery.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 shrink-0 w-full lg:w-auto">
            <div className="p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl flex items-start gap-4">
              <div className="bg-rose-500 text-white p-2 rounded-xl">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-sm">Verified Sellers</p>
                <p className="text-xs text-slate-400 mt-1">Look for the verified blue badge.</p>
              </div>
            </div>
            <div className="p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl flex items-start gap-4">
              <div className="bg-rose-500 text-white p-2 rounded-xl">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-sm">Instant Checkout</p>
                <p className="text-xs text-slate-400 mt-1">Directly order with merchant checkout forms.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </MarketplaceLayout>
  );
}
