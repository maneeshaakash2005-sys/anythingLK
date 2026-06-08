import { Star, CheckCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function StoreCard({ store }) {
  const averageRating = Number(store.average_rating || 0);
  const reviewCount = Number(store.review_count || 0);

  // Fallbacks
  const coverUrl = store.cover_image_url || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=800&auto=format&fit=crop';
  const logoUrl = store.logo_url || 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?q=80&w=200&auto=format&fit=crop';

  return (
    <div className="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/60 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full transform hover:-translate-y-1">
      {/* Cover Background */}
      <div className="h-28 w-full overflow-hidden bg-slate-100 dark:bg-slate-800 relative">
        <img
          src={coverUrl}
          alt={store.shop_name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        
        {/* Category Tag */}
        {store.category && (
          <span className="absolute top-3 right-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-slate-800 dark:text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            {store.category}
          </span>
        )}
      </div>

      {/* Profile Info Area */}
      <div className="px-5 pb-5 pt-0 flex-1 flex flex-col relative">
        {/* Avatar Overlay */}
        <div className="h-14 w-14 rounded-2xl border-2 border-white dark:border-slate-900 bg-white dark:bg-slate-800 overflow-hidden shadow-md -mt-7 mb-3 shrink-0 relative z-10">
          <img src={logoUrl} alt="" className="h-full w-full object-cover" />
        </div>

        {/* Store Title */}
        <div className="flex items-center gap-1.5 mb-1">
          <h3 className="font-bold text-slate-900 dark:text-white text-base leading-tight group-hover:text-rose-500 transition-colors">
            <Link to={`/marketplace/store/${store.slug}`}>
              {store.shop_name}
            </Link>
          </h3>
          {store.is_verified && (
            <CheckCircle className="h-4 w-4 text-emerald-500 fill-emerald-100 dark:fill-transparent shrink-0" title="Verified Seller" />
          )}
        </div>

        {/* Rating Row */}
        <div className="flex items-center gap-1 mb-2 text-xs">
          {reviewCount > 0 ? (
            <>
              <div className="flex items-center text-amber-500">
                <Star className="h-3.5 w-3.5 fill-current" />
              </div>
              <span className="font-bold text-slate-800 dark:text-slate-200">{averageRating.toFixed(1)}</span>
              <span className="text-slate-400">({reviewCount} reviews)</span>
            </>
          ) : (
            <span className="text-slate-400 text-[11px] italic">No reviews yet</span>
          )}
        </div>

        {/* Bio / Description */}
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 leading-relaxed flex-1">
          {store.description || 'Welcome to our store! Explore our premium selection of products.'}
        </p>

        {/* Call to Action Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-850 mt-auto flex items-center justify-between">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
            {store.phone ? 'Colombo, LK' : 'Sri Lanka'}
          </span>
          <Link
            to={`/marketplace/store/${store.slug}`}
            className="text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 group/btn"
          >
            Visit Store
            <ArrowRight className="h-3.5 w-3.5 transform group-hover/btn:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
