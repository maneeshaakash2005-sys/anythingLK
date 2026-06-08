import { ArrowLeft, CheckCircle, Phone, MapPin, Star, ShoppingBag, Sparkles } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import MarketplaceLayout from '../components/marketplace/MarketplaceLayout';
import ProductCard from '../components/marketplace/ProductCard';
import ReviewSection from '../components/marketplace/ReviewSection';
import SEO from '../components/marketplace/SEO';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import { useMarketplace } from '../hooks/useMarketplace';

export default function MarketplaceStore() {
  const { shopSlug } = useParams();
  const navigate = useNavigate();
  const { fetchShopDetails, loading, error } = useMarketplace();

  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [activeTab, setActiveTab] = useState('products');
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    async function loadData() {
      if (!shopSlug) return;
      const res = await fetchShopDetails(shopSlug);
      if (res) {
        setShop(res.shop);
        setProducts(res.products || []);
      }
    }
    loadData();
  }, [shopSlug, fetchShopDetails]);

  // Compute unique categories from store's products
  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.marketplace_category).filter(Boolean));
    return ['all', ...Array.from(cats)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (activeCategory === 'all') return products;
    return products.filter((p) => p.marketplace_category === activeCategory);
  }, [products, activeCategory]);

  if (loading) {
    return (
      <MarketplaceLayout>
        <div className="py-6"><LoadingSkeleton rows={10} /></div>
      </MarketplaceLayout>
    );
  }

  if (error || !shop) {
    return (
      <MarketplaceLayout>
        <EmptyState
          title="Store not found"
          message="This store may be inactive or unavailable on the AnythingLK marketplace."
        />
      </MarketplaceLayout>
    );
  }

  const averageRating = Number(shop.average_rating || 0);
  const reviewCount = Number(shop.review_count || 0);
  const coverUrl = shop.cover_image_url || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1200&auto=format&fit=crop';
  const logoUrl = shop.logo_url || null;

  const storeJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    'name': shop.shop_name,
    'description': shop.description || `Shop at ${shop.shop_name} on AnythingLK – Sri Lanka's marketplace.`,
    'image': coverUrl,
    'telephone': shop.phone || undefined,
    'address': {
      '@type': 'PostalAddress',
      'addressCountry': 'LK'
    }
  };

  if (reviewCount > 0) {
    storeJsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      'ratingValue': averageRating.toFixed(1),
      'reviewCount': reviewCount
    };
  }

  return (
    <MarketplaceLayout>
      <SEO
        title={shop.shop_name}
        description={shop.description || `Shop at ${shop.shop_name} on AnythingLK Marketplace. ${reviewCount} customer reviews.`}
        image={coverUrl}
        jsonLd={storeJsonLd}
      />

      <div className="space-y-8">
        {/* Back navigation */}
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-rose-500 transition-colors uppercase tracking-wider"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        </div>

        {/* Store Hero Card */}
        <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          {/* Cover Image */}
          <div className="h-48 sm:h-64 w-full relative">
            <img
              src={coverUrl}
              alt={shop.shop_name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </div>

          {/* Profile Info */}
          <div className="px-6 pb-6 pt-0 -mt-10 relative flex flex-col sm:flex-row sm:items-end gap-5">
            {/* Logo Avatar */}
            <div className="h-20 w-20 rounded-2xl border-4 border-white dark:border-slate-900 bg-white dark:bg-slate-800 overflow-hidden shadow-xl shrink-0 relative z-10">
              {logoUrl ? (
                <img src={logoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-gradient-to-tr from-rose-500 to-amber-500 text-white">
                  <ShoppingBag className="h-8 w-8" />
                </div>
              )}
            </div>

            {/* Heading & Badges */}
            <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  {shop.shop_name}
                  {shop.is_verified && (
                    <CheckCircle className="h-5 w-5 text-emerald-500 fill-emerald-100 dark:fill-transparent" title="Verified Seller" />
                  )}
                </h1>
                <div className="flex flex-wrap items-center gap-3 mt-1.5">
                  {shop.category && (
                    <span className="text-xs bg-rose-50 dark:bg-rose-950/20 text-rose-500 font-bold uppercase px-2.5 py-0.5 rounded-full">
                      {shop.category}
                    </span>
                  )}
                  <div className="flex items-center gap-1 text-xs text-amber-500">
                    {reviewCount > 0 ? (
                      <>
                        <Star className="h-3.5 w-3.5 fill-current" />
                        <span className="font-bold text-slate-800 dark:text-slate-200">{averageRating.toFixed(1)}</span>
                        <span className="text-slate-400">({reviewCount} reviews)</span>
                      </>
                    ) : (
                      <span className="text-slate-400 text-[11px] italic">No reviews yet</span>
                    )}
                  </div>
                  {shop.phone && (
                    <a href={`tel:${shop.phone}`} className="text-xs font-semibold text-slate-500 hover:text-rose-500 transition-colors flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {shop.phone}
                    </a>
                  )}
                  {shop.address && (
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {shop.address}
                    </span>
                  )}
                </div>
              </div>

              {/* Direct Order CTA */}
              <Link
                to={`/shop/${shop.slug}`}
                className="btn-primary py-2.5 px-6 rounded-2xl font-bold text-sm flex items-center gap-2 bg-gradient-to-r from-rose-500 to-amber-500 border-0 shadow-md hover:shadow-lg transition-all shrink-0"
              >
                <ShoppingBag className="h-4 w-4" />
                Order from this Store
              </Link>
            </div>
          </div>

          {/* Description */}
          {shop.description && (
            <div className="px-6 pb-5 border-t border-slate-100 dark:border-slate-800 pt-5">
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{shop.description}</p>
            </div>
          )}
        </section>

        {/* Tabs: Products / Reviews */}
        <div className="flex gap-6 border-b border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('products')}
            className={`pb-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'products' ? 'border-rose-500 text-rose-500' : 'border-transparent text-slate-450'
            }`}
          >
            Products ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'reviews' ? 'border-rose-500 text-rose-500' : 'border-transparent text-slate-450'
            }`}
          >
            Reviews ({reviewCount})
          </button>
        </div>

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            {/* Category Sub-filter Pills */}
            {categories.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`text-xs py-1.5 px-4 rounded-full transition-colors font-semibold border capitalize ${
                      activeCategory === cat
                        ? 'bg-rose-500 text-white border-rose-500'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-rose-300'
                    }`}
                  >
                    {cat === 'all' ? 'All Products' : cat}
                  </button>
                ))}
              </div>
            )}

            {filteredProducts.length === 0 ? (
              <EmptyState
                title="No products available"
                message="This store hasn't published any products in this category yet."
              />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredProducts.map((prod) => (
                  <ProductCard key={prod.id} product={{ ...prod, shops: shop }} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === 'reviews' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
              <Sparkles className="h-4.5 w-4.5 text-rose-500" />
              Customer Reviews for {shop.shop_name}
            </h2>
            <ReviewSection shopId={shop.id} />
          </div>
        )}
      </div>
    </MarketplaceLayout>
  );
}
