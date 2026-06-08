import { Search, Filter, SlidersHorizontal, CheckCircle, Star, X, ShoppingBag } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import MarketplaceLayout from '../components/marketplace/MarketplaceLayout';
import ProductCard from '../components/marketplace/ProductCard';
import StoreCard from '../components/marketplace/StoreCard';
import SEO from '../components/marketplace/SEO';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import { useMarketplace } from '../hooks/useMarketplace';
import { supabase } from '../lib/supabase';

const POPULAR_CATEGORIES = [
  { key: 'all', label: 'All Categories' },
  { key: 'food', label: 'Food & Dining' },
  { key: 'fashion', label: 'Fashion & Apparel' },
  { key: 'electronics', label: 'Electronics' },
  { key: 'beauty', label: 'Beauty & Cosmetics' },
  { key: 'furniture', label: 'Home & Living' },
  { key: 'pharmacy', label: 'Health & Pharmacy' },
  { key: 'other', label: 'Others' }
];

export default function MarketplaceSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { searchProducts, loading, error } = useMarketplace();

  // Search Type
  const [searchTab, setSearchTab] = useState('products'); // 'products' | 'stores'

  // Filters State
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'all');
  const [minPrice, setMinPrice] = useState(searchParams.get('min_price') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max_price') || '');
  const [minRating, setMinRating] = useState(searchParams.get('rating') || '');
  const [verifiedOnly, setVerifiedOnly] = useState(searchParams.get('verified') === 'true');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'popular');

  // Mobile Filters Modal State
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Results State
  const [products, setProducts] = useState([]);
  const [stores, setStores] = useState([]);

  // Sync state from query parameters on mount/change
  useEffect(() => {
    setQuery(searchParams.get('q') || '');
    setCategory(searchParams.get('category') || 'all');
    setMinPrice(searchParams.get('min_price') || '');
    setMaxPrice(searchParams.get('max_price') || '');
    setMinRating(searchParams.get('rating') || '');
    setVerifiedOnly(searchParams.get('verified') === 'true');
    setSortBy(searchParams.get('sort') || 'popular');
  }, [searchParams]);

  // Execute Search
  const executeSearch = async () => {
    if (searchTab === 'products') {
      const results = await searchProducts({
        query,
        category,
        minPrice,
        maxPrice,
        minRating,
        verifiedOnly,
        sortBy
      });
      setProducts(results);
    } else {
      // Search shops directly
      let q = supabase
        .from('shops')
        .select('*')
        .eq('marketplace_visible', true);

      if (query) {
        q = q.ilike('shop_name', `%${query}%`);
      }
      if (category && category !== 'all') {
        q = q.eq('category', category);
      }
      if (verifiedOnly) {
        q = q.eq('is_verified', true);
      }
      if (minRating) {
        q = q.gte('average_rating', Number(minRating));
      }

      // Sort
      if (sortBy === 'rating') {
        q = q.order('average_rating', { ascending: false });
      } else {
        q = q.order('shop_name');
      }

      const { data, error: err } = await q;
      if (!err) {
        setStores(data || []);
      }
    }
  };

  useEffect(() => {
    executeSearch();
  }, [searchTab, category, minRating, verifiedOnly, sortBy, searchParams]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const params = {};
    if (query) params.q = query;
    if (category && category !== 'all') params.category = category;
    if (minPrice) params.min_price = minPrice;
    if (maxPrice) params.max_price = maxPrice;
    if (minRating) params.rating = minRating;
    if (verifiedOnly) params.verified = 'true';
    if (sortBy) params.sort = sortBy;

    setSearchParams(params);
  };

  const handleClearFilters = () => {
    setQuery('');
    setCategory('all');
    setMinPrice('');
    setMaxPrice('');
    setMinRating('');
    setVerifiedOnly(false);
    setSortBy('popular');
    setSearchParams({});
    setMobileFiltersOpen(false);
  };

  return (
    <MarketplaceLayout>
      <SEO
        title="Search Products & Stores | AnythingLK"
        description="Search for clothing, dining, electronics, health products, and verified local storefronts across Sri Lanka."
      />

      <div className="space-y-6">
        
        {/* Search header with bar */}
        <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-2.5 flex items-center gap-2">
              <Search className="h-5 w-5 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search products or shops..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent outline-none border-0 text-sm py-1"
              />
            </div>
            <button
              type="submit"
              className="bg-rose-500 hover:bg-rose-600 transition-colors text-white font-bold px-6 rounded-2xl text-sm"
            >
              Search
            </button>
          </form>

          {/* Toggle Tabs */}
          <div className="flex gap-4 border-b border-slate-100 dark:border-slate-800 pb-2">
            <button
              onClick={() => setSearchTab('products')}
              className={`pb-2 text-sm font-bold border-b-2 transition-all ${
                searchTab === 'products' ? 'border-rose-500 text-rose-500' : 'border-transparent text-slate-450'
              }`}
            >
              Products ({searchTab === 'products' ? products.length : '...'})
            </button>
            <button
              onClick={() => setSearchTab('stores')}
              className={`pb-2 text-sm font-bold border-b-2 transition-all ${
                searchTab === 'stores' ? 'border-rose-500 text-rose-500' : 'border-transparent text-slate-450'
              }`}
            >
              Stores ({searchTab === 'stores' ? stores.length : '...'})
            </button>
          </div>
        </section>

        {/* Results Info and Filters Actions */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Showing {searchTab === 'products' ? products.length : stores.length} results
          </p>
          <button
            onClick={() => setMobileFiltersOpen(true)}
            className="md:hidden flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-full text-xs font-bold shadow-sm"
          >
            <Filter className="h-4 w-4" /> Filters
          </button>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-8 items-start">
          
          {/* Desktop Filters Sidebar */}
          <aside className="hidden md:block bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6 sticky top-20">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-3">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-rose-500" />
                Refine Search
              </h3>
              <button onClick={handleClearFilters} className="text-[10px] font-bold text-slate-400 hover:text-rose-500 uppercase">
                Clear All
              </button>
            </div>

            {/* Category Filter */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Category</p>
              <div className="flex flex-col gap-1.5">
                {POPULAR_CATEGORIES.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => setCategory(cat.key)}
                    className={`text-left text-xs py-1.5 px-2.5 rounded-lg transition-colors font-medium ${
                      category === cat.key
                        ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-500'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-950 text-slate-600 dark:text-slate-355'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Filter (Only for Products) */}
            {searchTab === 'products' && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Price Range (LKR)</p>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="input py-1.5 px-3 text-xs rounded-xl"
                  />
                  <span className="text-slate-300">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="input py-1.5 px-3 text-xs rounded-xl"
                  />
                </div>
                <button
                  onClick={handleSearchSubmit}
                  className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold py-1.5 rounded-xl text-2xs transition-colors"
                >
                  Apply Price
                </button>
              </div>
            )}

            {/* Rating Filter */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Minimum Rating</p>
              <div className="flex flex-col gap-1">
                {['4', '3', '2'].map((star) => (
                  <label key={star} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-355 cursor-pointer">
                    <input
                      type="radio"
                      name="min_rating"
                      checked={minRating === star}
                      onChange={() => setMinRating(star)}
                    />
                    <span className="flex items-center gap-1">
                      {star}+ Stars <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Verified Seller Toggle */}
            <label className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-355 border-t border-slate-100 dark:border-slate-850 pt-4 cursor-pointer">
              <span className="flex items-center gap-1.5 font-semibold">
                <CheckCircle className="h-4 w-4 text-emerald-500 fill-emerald-100 dark:fill-transparent" />
                Verified Stores Only
              </span>
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
              />
            </label>

            {/* Sort Filter */}
            <div className="space-y-2 border-t border-slate-100 dark:border-slate-850 pt-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Sort By</p>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="input py-1.5 text-xs rounded-xl"
              >
                <option value="popular">Popularity (Sales)</option>
                <option value="newest">Newest Arrivals</option>
                {searchTab === 'products' && <option value="price_low">Price: Low to High</option>}
                {searchTab === 'products' && <option value="price_high">Price: High to Low</option>}
                <option value="rating">Top Rated</option>
              </select>
            </div>
          </aside>

          {/* Results Grid */}
          <div className="flex-grow">
            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl h-80">
                    <LoadingSkeleton rows={5} />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="bg-rose-50 dark:bg-rose-950/20 text-rose-500 p-6 rounded-3xl text-center font-bold text-sm">
                Error searching marketplace: {error.message}
              </div>
            ) : searchTab === 'products' && products.length === 0 ? (
              <EmptyState
                title="No products found"
                message="Try adjusting your keywords, category settings, or clear active filters to discover products."
              />
            ) : searchTab === 'stores' && stores.length === 0 ? (
              <EmptyState
                title="No shops found"
                message="Try adjusting your store category settings or clear active filters to discover shops."
              />
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                {searchTab === 'products'
                  ? products.map((prod) => <ProductCard key={prod.id} product={prod} />)
                  : stores.map((store) => <StoreCard key={store.id} store={store} />)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Sheet Filters Drawer */}
      {mobileFiltersOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end" onClick={() => setMobileFiltersOpen(false)}>
          <div
            className="w-full bg-white dark:bg-slate-900 rounded-t-3xl p-6 border-t border-slate-200 dark:border-slate-800 space-y-6 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-250"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm">Refine Search</h3>
              <div className="flex gap-4 items-center">
                <button onClick={handleClearFilters} className="text-2xs font-bold text-slate-400 hover:text-rose-500 uppercase">
                  Clear All
                </button>
                <button onClick={() => setMobileFiltersOpen(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-950">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Mobile Categories selection */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Category</p>
              <div className="flex flex-wrap gap-2">
                {POPULAR_CATEGORIES.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => setCategory(cat.key)}
                    className={`text-xs py-1.5 px-3 rounded-full transition-colors font-medium border ${
                      category === cat.key
                        ? 'bg-rose-500 text-white border-rose-500'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-150 dark:border-slate-800 text-slate-600 dark:text-slate-355'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile Price filters */}
            {searchTab === 'products' && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Price Range (LKR)</p>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    placeholder="Min Price"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="input py-2 px-3 text-sm rounded-xl"
                  />
                  <span className="text-slate-300">-</span>
                  <input
                    type="number"
                    placeholder="Max Price"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="input py-2 px-3 text-sm rounded-xl"
                  />
                </div>
              </div>
            )}

            {/* Mobile Rating check */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Minimum Rating</p>
              <div className="flex gap-4">
                {['4', '3', '2'].map((star) => (
                  <label key={star} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-355 cursor-pointer">
                    <input
                      type="radio"
                      name="mobile_min_rating"
                      checked={minRating === star}
                      onChange={() => setMinRating(star)}
                    />
                    <span className="flex items-center gap-0.5">
                      {star}+ <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Mobile Verified Seller Checkbox */}
            <label className="flex items-center justify-between text-xs text-slate-650 dark:text-slate-355 border-t border-slate-100 dark:border-slate-800 pt-4 cursor-pointer">
              <span className="flex items-center gap-1.5 font-bold">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                Verified Stores Only
              </span>
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
              />
            </label>

            {/* Mobile Sort options */}
            <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Sort By</p>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="input py-2 text-sm rounded-xl"
              >
                <option value="popular">Popularity (Sales)</option>
                <option value="newest">Newest Arrivals</option>
                {searchTab === 'products' && <option value="price_low">Price: Low to High</option>}
                {searchTab === 'products' && <option value="price_high">Price: High to Low</option>}
                <option value="rating">Top Rated</option>
              </select>
            </div>

            {/* Submit button for Mobile filter */}
            <button
              onClick={() => {
                handleSearchSubmit({ preventDefault: () => {} });
                setMobileFiltersOpen(false);
              }}
              className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 rounded-2xl text-sm transition-colors"
            >
              Apply Filter Selection
            </button>
          </div>
        </div>
      )}
    </MarketplaceLayout>
  );
}
