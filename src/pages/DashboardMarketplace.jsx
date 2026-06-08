import { Save, Eye, EyeOff, Star, CheckCircle, Trash2, ShoppingBag, Globe } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/DashboardLayout';
import LoadingButton from '../components/LoadingButton';
import LoadingSkeleton from '../components/LoadingSkeleton';
import RetryState from '../components/RetryState';
import ImageUploadField from '../components/ImageUploadField';
import { useShop } from '../hooks/useShop';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

const STORE_CATEGORIES = [
  { value: 'food', label: 'Food & Dining' },
  { value: 'fashion', label: 'Fashion & Apparel' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'beauty', label: 'Beauty & Cosmetics' },
  { value: 'furniture', label: 'Home & Living' },
  { value: 'pharmacy', label: 'Health & Pharmacy' },
  { value: 'other', label: 'Other' },
];

export default function DashboardMarketplace() {
  const { shop, loading, error, refetch } = useShop();

  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Initialize form from shop data
  useEffect(() => {
    if (shop) {
      setForm({
        marketplace_visible: shop.marketplace_visible ?? true,
        description: shop.description || '',
        category: shop.category || 'other',
        cover_image_url: shop.cover_image_url || '',
      });
    }
  }, [shop]);

  // Load reviews for this shop
  useEffect(() => {
    if (!shop?.id) return;
    setReviewsLoading(true);
    supabase
      .from('reviews')
      .select('*')
      .eq('shop_id', shop.id)
      .order('created_at', { ascending: false })
      .then(({ data, error: err }) => {
        if (!err) setReviews(data || []);
        setReviewsLoading(false);
      });
  }, [shop?.id]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (saving || !shop) return;
    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('shops')
        .update({
          marketplace_visible: form.marketplace_visible,
          description: form.description,
          category: form.category,
          cover_image_url: form.cover_image_url,
        })
        .eq('id', shop.id);

      if (updateError) throw updateError;
      toast.success('Marketplace settings saved!');
      refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const uploadCoverImage = async (file, validationError) => {
    if (validationError) {
      toast.error(validationError);
      return;
    }
    if (!file || !shop?.id) return;
    setUploadingCover(true);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${shop.id}/marketplace/cover-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('product-images').getPublicUrl(path);
      setForm((prev) => ({ ...prev, cover_image_url: data?.publicUrl || '' }));
      toast.success('Cover image uploaded. Save settings to apply.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploadingCover(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Delete this review?')) return;
    const { error: delError } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId)
      .eq('shop_id', shop.id);
    if (!delError) {
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      toast.success('Review deleted.');
    } else {
      toast.error(delError.message);
    }
  };

  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  return (
    <DashboardLayout title="Marketplace Settings">
      {error ? (
        <RetryState message={error.message} onRetry={refetch} />
      ) : loading || !form ? (
        <LoadingSkeleton rows={8} />
      ) : (
        <div className="space-y-6">
          {/* Status Banner */}
          <div
            className={`rounded-2xl p-4 flex items-center justify-between gap-4 text-sm font-semibold ${
              form.marketplace_visible
                ? 'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400'
                : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            <div className="flex items-center gap-2">
              {form.marketplace_visible ? (
                <>
                  <Globe className="h-4 w-4" />
                  Your store is <strong>LIVE</strong> on AnythingLK Marketplace.
                </>
              ) : (
                <>
                  <EyeOff className="h-4 w-4" />
                  Your store is <strong>HIDDEN</strong> from the marketplace.
                </>
              )}
            </div>
            {form.marketplace_visible && shop?.slug && (
              <Link
                to={`/marketplace/store/${shop.slug}`}
                className="text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:underline flex items-center gap-1 shrink-0"
                target="_blank"
              >
                <Eye className="h-3.5 w-3.5" />
                Preview public store →
              </Link>
            )}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            {/* Left: Profile & Visibility Form */}
            <form onSubmit={handleSave} className="space-y-6">

              {/* Marketplace Visibility Toggle */}
              <section className="card p-5 space-y-4">
                <h2 className="text-base font-semibold">Marketplace Visibility</h2>
                <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3 cursor-pointer">
                  <div>
                    <p className="font-semibold text-sm">Show store on AnythingLK</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Allow customers to discover your shop on the marketplace homepage and search.
                    </p>
                  </div>
                  <div className="relative shrink-0">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={!!form.marketplace_visible}
                      onChange={(e) => setForm({ ...form, marketplace_visible: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-checked:bg-emerald-500 dark:bg-slate-700 rounded-full transition-colors peer-focus:ring-2 peer-focus:ring-emerald-400" />
                    <div className="absolute top-0.5 left-0.5 bg-white rounded-full h-5 w-5 transition-transform peer-checked:translate-x-5 shadow" />
                  </div>
                </label>
              </section>

              {/* Store Profile Details */}
              <section className="card p-5 space-y-4">
                <h2 className="text-base font-semibold">Store Profile</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  This info appears on your public marketplace store page, visible to all shoppers.
                </p>

                {/* Category Select */}
                <label className="block">
                  <span className="label">Store Category</span>
                  <select
                    className="input mt-1"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    {STORE_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </label>

                {/* Description */}
                <label className="block">
                  <span className="label">Store Description</span>
                  <textarea
                    className="input mt-1 min-h-24"
                    placeholder="Describe what your store sells and what makes it unique..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </label>

                {/* Cover Image */}
                <div>
                  <span className="label">Store Cover Image</span>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 mb-2">
                    Recommended: 1200×400px landscape image. Used as your marketplace store banner.
                  </p>
                  <ImageUploadField
                    value={form.cover_image_url}
                    previewUrl={form.cover_image_url}
                    uploading={uploadingCover}
                    onFileSelect={(file, err) => uploadCoverImage(file, err)}
                    onRemove={() => setForm({ ...form, cover_image_url: '' })}
                  />
                </div>
              </section>

              <LoadingButton
                className="btn-primary w-full"
                type="submit"
                loading={saving}
                loadingText="Saving..."
                icon={Save}
              >
                Save Marketplace Settings
              </LoadingButton>
            </form>

            {/* Right: Review Stats & Moderation */}
            <section className="card p-5 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">Customer Reviews</h2>
                {averageRating && (
                  <div className="flex items-center gap-1.5 text-amber-500">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="font-bold text-slate-900 dark:text-white">{averageRating}</span>
                    <span className="text-xs text-slate-400">({reviews.length})</span>
                  </div>
                )}
              </div>

              {reviewsLoading ? (
                <LoadingSkeleton rows={4} />
              ) : reviews.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Star className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-semibold">No reviews yet</p>
                  <p className="text-xs mt-1">Reviews will appear here once customers leave feedback on your store or products.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {reviews.map((review) => (
                    <div
                      key={review.id}
                      className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                              {review.customer_name}
                            </p>
                            {review.order_id && (
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Verified
                              </span>
                            )}
                          </div>
                          <div className="flex text-amber-500 mt-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star key={s} className={`h-3 w-3 ${s <= review.rating ? 'fill-current' : 'text-slate-200 dark:text-slate-800'}`} />
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-2xs text-slate-400">
                            {new Date(review.created_at).toLocaleDateString()}
                          </span>
                          <button
                            onClick={() => handleDeleteReview(review.id)}
                            className="p-1 text-slate-300 hover:text-rose-500 rounded-lg transition-colors"
                            title="Delete review"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {review.product_id && (
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          Product Review
                        </p>
                      )}

                      {review.comment && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          {review.comment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
