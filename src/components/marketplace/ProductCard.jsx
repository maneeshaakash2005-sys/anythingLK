import { Star, CheckCircle, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/format';

export default function ProductCard({ product }) {
  const shop = product.shops || {};
  const averageRating = Number(product.average_rating || 0);
  const reviewCount = Number(product.review_count || 0);

  // Fallback product image if not set
  const imageUrl = product.image_url || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600&auto=format&fit=crop';

  return (
    <div className="group relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/60 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full transform hover:-translate-y-1">
      {/* Product Image */}
      <div className="relative aspect-square overflow-hidden bg-slate-100 dark:bg-slate-800">
        <Link to={`/marketplace/product/${product.id}`} className="block w-full h-full">
          <img
            src={imageUrl}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          />
        </Link>

        {/* Category Badge */}
        {product.marketplace_category && (
          <span className="absolute top-3 left-3 bg-slate-900/75 dark:bg-slate-950/75 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
            {product.marketplace_category}
          </span>
        )}

        {/* Quick View Trigger on Hover (Desktop only) */}
        <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none md:pointer-events-auto">
          <Link
            to={`/marketplace/product/${product.id}`}
            className="bg-white text-slate-900 text-xs font-semibold px-4 py-2 rounded-full shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all pointer-events-auto hover:bg-slate-50"
          >
            View Details
          </Link>
        </div>
      </div>

      {/* Info Content */}
      <div className="p-4 flex flex-col flex-1">
        {/* Shop Line */}
        <div className="flex items-center gap-1.5 mb-1.5">
          <Link
            to={`/marketplace/store/${shop.slug}`}
            className="text-xs text-slate-500 dark:text-slate-400 font-medium hover:text-rose-500 transition-colors truncate max-w-[85%]"
          >
            {shop.shop_name || 'Store'}
          </Link>
          {shop.is_verified && (
            <CheckCircle className="h-3 w-3 text-emerald-500 fill-emerald-100 dark:fill-transparent shrink-0" title="Verified Store" />
          )}
        </div>

        {/* Product Name */}
        <h3 className="font-semibold text-slate-850 dark:text-slate-100 text-sm leading-snug hover:text-rose-500 transition-colors line-clamp-2 mb-2 min-h-10">
          <Link to={`/marketplace/product/${product.id}`}>
            {product.name}
          </Link>
        </h3>

        {/* Rating Line */}
        <div className="flex items-center gap-1 mb-3 text-xs">
          {reviewCount > 0 ? (
            <>
              <div className="flex items-center text-amber-500">
                <Star className="h-3.5 w-3.5 fill-current" />
              </div>
              <span className="font-bold text-slate-800 dark:text-slate-200">{averageRating.toFixed(1)}</span>
              <span className="text-slate-400">({reviewCount})</span>
            </>
          ) : (
            <span className="text-slate-400 text-[11px] italic">No reviews yet</span>
          )}
        </div>

        {/* Price & Action Footer */}
        <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block uppercase">Price</span>
            <span className="text-base font-extrabold text-slate-900 dark:text-white">
              {formatCurrency ? formatCurrency(product.price) : `Rs. ${Number(product.price).toLocaleString('en-US')}`}
            </span>
          </div>

          <Link
            to={`/marketplace/product/${product.id}`}
            className="bg-rose-50 dark:bg-rose-950/30 text-rose-500 dark:text-rose-450 hover:bg-rose-500 hover:text-white dark:hover:bg-rose-500 dark:hover:text-white p-2 rounded-full transition-colors flex items-center justify-center shadow-sm"
            aria-label="Order Product"
          >
            <ShoppingCart className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
