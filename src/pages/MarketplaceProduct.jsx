import { ArrowLeft, CheckCircle, Store, ShieldCheck, ShoppingCart, Star, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import MarketplaceLayout from '../components/marketplace/MarketplaceLayout';
import ProductCard from '../components/marketplace/ProductCard';
import ReviewSection from '../components/marketplace/ReviewSection';
import SEO from '../components/marketplace/SEO';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import { useMarketplace } from '../hooks/useMarketplace';
import { formatCurrency } from '../utils/format';

export default function MarketplaceProduct() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { fetchProductDetails, loading, error } = useMarketplace();
  
  const [product, setProduct] = useState(null);
  const [shop, setShop] = useState(null);
  const [similarProducts, setSimilarProducts] = useState([]);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    async function loadData() {
      if (!productId) return;
      const res = await fetchProductDetails(productId);
      if (res) {
        setProduct(res.product);
        setShop(res.product.shops || null);
        setSimilarProducts(res.similarProducts || []);
      }
    }
    loadData();
    // Reset quantity when changing product
    setQuantity(1);
  }, [productId, fetchProductDetails]);

  if (loading) {
    return (
      <MarketplaceLayout>
        <div className="py-6"><LoadingSkeleton rows={10} /></div>
      </MarketplaceLayout>
    );
  }

  if (error || !product) {
    return (
      <MarketplaceLayout>
        <EmptyState
          title="Product not found"
          message="We could not retrieve this product. It may have been deleted, unpublished, or set to private."
          action={
            <Link to="/marketplace/search" className="btn-primary">
              Back to Search
            </Link>
          }
        />
      </MarketplaceLayout>
    );
  }

  const imageUrl = product.image_url || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=800&auto=format&fit=crop';
  const averageRating = Number(product.average_rating || 0);
  const reviewCount = Number(product.review_count || 0);

  const handleCheckoutRedirect = () => {
    if (!shop || !shop.slug) return;
    // Redirect to the public order form for the shop, passing the product_id and quantity as query params
    navigate(`/shop/${shop.slug}?product_id=${product.id}&quantity=${quantity}`);
  };

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    'name': product.name,
    'image': imageUrl,
    'description': product.description || `Buy ${product.name} directly from ${shop?.shop_name || 'merchant'} on AnythingLK.`,
    'offers': {
      '@type': 'Offer',
      'price': product.price,
      'priceCurrency': 'LKR',
      'availability': product.stock_quantity > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
    }
  };

  if (reviewCount > 0) {
    productJsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      'ratingValue': averageRating.toFixed(1),
      'reviewCount': reviewCount
    };
  }

  return (
    <MarketplaceLayout>
      <SEO
        title={product.name}
        description={product.description || `Buy ${product.name} on AnythingLK. direct storefront payments available.`}
        image={imageUrl}
        jsonLd={productJsonLd}
      />

      <div className="space-y-10 pb-24 md:pb-0">
        
        {/* Back navigation */}
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-rose-500 transition-colors uppercase tracking-wider"
          >
            <ArrowLeft className="h-4 w-4" /> Back to listings
          </button>
        </div>

        {/* Product Details Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          
          {/* Gallery View */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-4 shadow-sm">
            <div className="aspect-square w-full rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-950">
              <img
                src={imageUrl}
                alt={product.name}
                className="w-full h-full object-cover object-center"
              />
            </div>
          </div>

          {/* Details & Buy Card */}
          <div className="space-y-6">
            
            {/* Header info */}
            <div className="space-y-3">
              {product.marketplace_category && (
                <span className="bg-rose-500/10 text-rose-500 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full tracking-wider">
                  {product.marketplace_category}
                </span>
              )}
              
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">
                {product.name}
              </h1>

              {/* Rating summary */}
              <div className="flex items-center gap-2 text-xs">
                {reviewCount > 0 ? (
                  <>
                    <div className="flex items-center text-amber-500">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`h-4 w-4 ${s <= Math.round(averageRating) ? 'fill-current' : 'text-slate-200'}`} />
                      ))}
                    </div>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{averageRating.toFixed(1)}</span>
                    <span className="text-slate-400">({reviewCount} reviews)</span>
                  </>
                ) : (
                  <span className="text-slate-400 italic">No reviews yet</span>
                )}
              </div>
            </div>

            {/* Price section */}
            <div className="bg-slate-100/50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-100/20">
              <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider block">Price</span>
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                {formatCurrency ? formatCurrency(product.price) : `Rs. ${Number(product.price).toLocaleString('en-US')}`}
              </span>
              <div className="mt-2 text-xs text-slate-450 flex items-center gap-1">
                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                Direct payments to merchant. Cash on Delivery supported.
              </div>
            </div>

            {/* Stock status & quantity */}
            <div className="flex items-center gap-6">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Availability</span>
                <span className={`text-sm font-bold ${product.stock_quantity > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {product.stock_quantity > 0 ? `In Stock (${product.stock_quantity})` : 'Out of Stock'}
                </span>
              </div>

              {product.stock_quantity > 0 && (
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Quantity</span>
                  <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 px-2 py-1">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="px-2 py-0.5 text-slate-500 hover:text-slate-800 font-bold"
                    >
                      -
                    </button>
                    <span className="px-3 font-semibold text-sm">{quantity}</span>
                    <button
                      onClick={() => setQuantity((q) => Math.min(product.stock_quantity, q + 1))}
                      className="px-2 py-0.5 text-slate-500 hover:text-slate-800 font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h3 className="font-bold text-sm text-slate-850 dark:text-slate-250 uppercase tracking-wider">Product Description</h3>
              <p className="text-sm text-slate-600 dark:text-slate-350 leading-relaxed font-normal">
                {product.description || 'No description provided by the merchant for this product.'}
              </p>
            </div>

            {/* Desktop Action Button */}
            {product.stock_quantity > 0 ? (
              <button
                onClick={handleCheckoutRedirect}
                className="hidden md:flex w-full btn-primary py-3 rounded-2xl font-bold items-center justify-center gap-2 shadow-lg bg-gradient-to-r from-rose-500 to-amber-500 border-0"
              >
                <ShoppingCart className="h-5 w-5" />
                Order Now directly from Storefront
              </button>
            ) : (
              <button
                disabled
                className="hidden md:block w-full bg-slate-200 dark:bg-slate-800 text-slate-400 py-3 rounded-2xl font-bold text-center cursor-not-allowed"
              >
                Sold Out
              </button>
            )}

            {/* Merchant overview snippet */}
            {shop && (
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {shop.logo_url ? (
                    <img src={shop.logo_url} alt="" className="h-12 w-12 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="h-12 w-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 shrink-0">
                      <Store className="h-6 w-6" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1">
                      {shop.shop_name}
                      {shop.is_verified && <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />}
                    </h3>
                    <p className="text-2xs text-slate-400 font-medium">Independent Merchant Storefront</p>
                  </div>
                </div>
                <Link
                  to={`/marketplace/store/${shop.slug}`}
                  className="btn-secondary py-1.5 px-4 rounded-xl text-2xs font-semibold border border-slate-200 dark:border-slate-800 shrink-0"
                >
                  Visit Store
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Reviews Section */}
        {shop && (
          <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <h2 className="text-lg sm:text-xl font-black tracking-tight flex items-center gap-2">
              <Sparkles className="h-4.5 w-4.5 text-rose-500" />
              Customer Reviews & Feedback
            </h2>
            <ReviewSection shopId={shop.id} productId={product.id} />
          </section>
        )}

        {/* Similar Products Grid */}
        {similarProducts.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg sm:text-xl font-black tracking-tight">Similar Products</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {similarProducts.map((prod) => (
                <ProductCard key={prod.id} product={prod} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Mobile bottom sticky Buy Bar (high conversion mobile requirement) */}
      {product.stock_quantity > 0 && (
        <div className="md:hidden fixed bottom-14 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 border-t border-slate-100 dark:border-slate-800/80 backdrop-blur-md px-4 py-3 flex items-center justify-between gap-4 shadow-2xl">
          <div className="flex-1 min-w-0">
            <p className="text-2xs text-slate-400 font-bold uppercase truncate">{product.name}</p>
            <p className="text-lg font-black text-rose-500">
              {formatCurrency ? formatCurrency(product.price) : `Rs. ${Number(product.price).toLocaleString('en-US')}`}
            </p>
          </div>
          <button
            onClick={handleCheckoutRedirect}
            className="btn-primary py-2.5 px-6 rounded-xl text-sm font-bold flex items-center gap-1.5 shrink-0 bg-gradient-to-r from-rose-500 to-amber-500 border-0"
          >
            <ShoppingCart className="h-4 w-4" />
            Order Now
          </button>
        </div>
      )}
    </MarketplaceLayout>
  );
}
