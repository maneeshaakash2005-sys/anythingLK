import { Star, CheckCircle, ThumbsUp, Plus } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useMarketplace } from '../../hooks/useMarketplace';

export default function ReviewSection({ shopId, productId }) {
  const { fetchReviews, submitReview, upvoteReview, loading } = useMarketplace();
  const [reviews, setReviews] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [orderId, setOrderId] = useState('');

  // Load reviews on mount or when IDs change
  const loadReviews = async () => {
    const list = await fetchReviews({ shopId, productId });
    setReviews(list);
  };

  useEffect(() => {
    if (shopId || productId) {
      loadReviews();
    }
  }, [shopId, productId]);

  // Aggregate stats
  const stats = useMemo(() => {
    if (reviews.length === 0) {
      return {
        average: 0,
        total: 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      };
    }
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      dist[r.rating] = (dist[r.rating] || 0) + 1;
    });

    return {
      average: sum / reviews.length,
      total: reviews.length,
      distribution: dist
    };
  }, [reviews]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter your name.');
      return;
    }
    if (!comment.trim()) {
      toast.error('Please enter a comment.');
      return;
    }

    setFormSubmitting(true);
    try {
      await submitReview({
        shop_id: shopId,
        product_id: productId || null,
        order_id: orderId.trim() || null,
        customer_name: name,
        customer_email: email || null,
        rating,
        comment
      });
      
      toast.success('Thank you! Your review has been submitted.');
      setName('');
      setEmail('');
      setComment('');
      setOrderId('');
      setRating(5);
      setShowForm(false);
      
      // Reload reviews to show the new one
      loadReviews();
    } catch (err) {
      toast.error(err.message || 'Failed to submit review.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleUpvote = async (reviewId, currentVotes) => {
    const res = await upvoteReview(reviewId, currentVotes);
    if (res) {
      setReviews((curr) =>
        curr.map((r) => (r.id === reviewId ? { ...r, helpful_votes: r.helpful_votes + 1 } : r))
      );
      toast.success('Helpful vote recorded');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row gap-8 items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-8">
        
        {/* Rating Breakdown Summary */}
        <div className="flex items-center gap-6">
          <div className="text-center">
            <span className="text-5xl font-black text-slate-900 dark:text-white block">
              {stats.average > 0 ? stats.average.toFixed(1) : '0.0'}
            </span>
            <div className="flex justify-center text-amber-500 mt-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`h-4.5 w-4.5 ${
                    s <= Math.round(stats.average) ? 'fill-current' : 'text-slate-200 dark:text-slate-800'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-slate-400 mt-1.5 block font-medium">
              Based on {stats.total} reviews
            </span>
          </div>

          <div className="w-52 sm:w-64 space-y-1.5">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = stats.distribution[stars] || 0;
              const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
              return (
                <div key={stars} className="flex items-center gap-2 text-xs">
                  <span className="w-3 font-semibold text-slate-600 dark:text-slate-400">{stars}</span>
                  <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-8 text-right font-medium text-slate-400">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Button */}
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary rounded-full px-5 py-2.5 flex items-center gap-2 text-sm font-semibold shadow-sm hover:shadow"
          >
            <Plus className="h-4 w-4" />
            Write a Review
          </button>
        )}
      </div>

      {/* Review Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-3xl border border-slate-150 dark:border-slate-800/80 space-y-4 max-w-xl animate-in fade-in duration-200">
          <h3 className="font-bold text-slate-900 dark:text-white text-base">Write your review</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Your Name *</span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Akash Perera"
                className="input mt-1.5 rounded-xl text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Your Email (Optional)</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. akash@gmail.com"
                className="input mt-1.5 rounded-xl text-sm"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Star Rating Select */}
            <div className="block">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block">Rating</span>
              <div className="flex gap-1.5 mt-2 text-amber-500 cursor-pointer">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    onClick={() => setRating(s)}
                    className={`h-7 w-7 transition-transform active:scale-90 ${
                      s <= rating ? 'fill-current' : 'text-slate-200 dark:text-slate-800'
                    }`}
                  />
                ))}
              </div>
            </div>

            <label className="block">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Order Number (Optional)</span>
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="e.g. OB-20260605-A1B2C3"
                className="input mt-1.5 rounded-xl text-sm"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Provides a verified purchase badge.</span>
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Your Comment *</span>
            <textarea
              required
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What did you like or dislike about the product/service?"
              className="input mt-1.5 rounded-xl text-sm min-h-20"
            />
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="btn-secondary rounded-full px-4 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="btn-primary rounded-full px-5 text-sm font-semibold bg-gradient-to-r from-rose-500 to-amber-500 border-0"
            >
              {formSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      )}

      {/* Reviews List */}
      <div className="space-y-6">
        <h4 className="font-bold text-slate-900 dark:text-white text-base">Reviews ({reviews.length})</h4>
        
        {reviews.length === 0 ? (
          <p className="text-slate-400 text-sm italic py-4">No reviews have been written yet. Be the first to leave feedback!</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/60 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                      {review.customer_name}
                    </span>
                    {review.order_id && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-450 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Verified Purchase
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(review.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>

                {/* Rating Display */}
                <div className="flex text-amber-500">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`h-3.5 w-3.5 ${
                        s <= review.rating ? 'fill-current' : 'text-slate-100 dark:text-slate-800'
                      }`}
                    />
                  ))}
                </div>

                {/* Comments */}
                <p className="text-sm text-slate-650 dark:text-slate-300 leading-relaxed font-normal">
                  {review.comment}
                </p>

                {/* Upvotes */}
                <div className="pt-2 border-t border-slate-50 dark:border-slate-850 flex items-center justify-between text-xs text-slate-450">
                  <span>Was this review helpful?</span>
                  <button
                    onClick={() => handleUpvote(review.id, review.helpful_votes)}
                    className="flex items-center gap-1.5 text-slate-400 hover:text-rose-500 font-semibold transition-colors"
                  >
                    <ThumbsUp className="h-3.5 w-3.5" />
                    Helpful ({review.helpful_votes || 0})
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
