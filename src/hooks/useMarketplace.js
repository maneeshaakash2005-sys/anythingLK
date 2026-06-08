import { useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useMarketplace() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 1. Fetch homepage datasets
  const fetchHomeData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        featuredStores,
        trendingProducts,
        newArrivals,
        topRatedStores,
        bestReviewedProducts
      ] = await Promise.all([
        // Featured Stores (verified or high rating)
        supabase
          .from('shops')
          .select('*')
          .eq('marketplace_visible', true)
          .eq('is_verified', true)
          .limit(6),
        // Trending Products (high sales volume)
        supabase
          .from('products')
          .select('*, shops(shop_name, slug, logo_url, is_verified)')
          .eq('is_active', true)
          .eq('public_visible', true)
          .order('sales_volume', { ascending: false })
          .limit(8),
        // New Arrivals
        supabase
          .from('products')
          .select('*, shops(shop_name, slug, logo_url, is_verified)')
          .eq('is_active', true)
          .eq('public_visible', true)
          .order('created_at', { ascending: false })
          .limit(8),
        // Top Rated Stores
        supabase
          .from('shops')
          .select('*')
          .eq('marketplace_visible', true)
          .order('average_rating', { ascending: false })
          .limit(6),
        // Best Reviewed Products
        supabase
          .from('products')
          .select('*, shops(shop_name, slug, logo_url, is_verified)')
          .eq('is_active', true)
          .eq('public_visible', true)
          .order('average_rating', { ascending: false })
          .order('review_count', { ascending: false })
          .limit(8)
      ]);

      if (featuredStores.error) throw featuredStores.error;
      if (trendingProducts.error) throw trendingProducts.error;
      if (newArrivals.error) throw newArrivals.error;
      if (topRatedStores.error) throw topRatedStores.error;
      if (bestReviewedProducts.error) throw bestReviewedProducts.error;

      return {
        featuredStores: featuredStores.data || [],
        trendingProducts: trendingProducts.data || [],
        newArrivals: newArrivals.data || [],
        topRatedStores: topRatedStores.data || [],
        bestReviewedProducts: bestReviewedProducts.data || []
      };
    } catch (caughtError) {
      setError(caughtError);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. Search & filter products
  const searchProducts = useCallback(async ({
    query = '',
    category = '',
    minPrice = null,
    maxPrice = null,
    minRating = null,
    verifiedOnly = false,
    sortBy = 'popular'
  }) => {
    setLoading(true);
    setError(null);
    try {
      // If filtering by verifiedOnly, use an inner join to only fetch products whose shop is verified.
      // Otherwise, standard join.
      const shopSelect = verifiedOnly ? 'shops!inner(shop_name, slug, logo_url, is_verified)' : 'shops(shop_name, slug, logo_url, is_verified)';
      let q = supabase
        .from('products')
        .select(`*, ${shopSelect}`)
        .eq('is_active', true)
        .eq('public_visible', true);

      if (query) {
        q = q.ilike('name', `%${query}%`);
      }

      if (category && category !== 'all') {
        q = q.eq('marketplace_category', category);
      }

      if (minPrice !== null && minPrice !== '') {
        q = q.gte('price', Number(minPrice));
      }

      if (maxPrice !== null && maxPrice !== '') {
        q = q.lte('price', Number(maxPrice));
      }

      if (minRating !== null && minRating !== '') {
        q = q.gte('average_rating', Number(minRating));
      }

      if (verifiedOnly) {
        q = q.eq('shops.is_verified', true);
      }

      // Sort
      if (sortBy === 'newest') {
        q = q.order('created_at', { ascending: false });
      } else if (sortBy === 'price_low') {
        q = q.order('price', { ascending: true });
      } else if (sortBy === 'price_high') {
        q = q.order('price', { ascending: false });
      } else if (sortBy === 'rating') {
        q = q.order('average_rating', { ascending: false });
      } else {
        // default: popular (sales_volume)
        q = q.order('sales_volume', { ascending: false });
      }

      const { data, error: searchError } = await q;
      if (searchError) throw searchError;
      return data || [];
    } catch (caughtError) {
      setError(caughtError);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // 3. Fetch specific product with similar products
  const fetchProductDetails = useCallback(async (productId) => {
    setLoading(true);
    setError(null);
    try {
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('*, shops(*)')
        .eq('id', productId)
        .single();

      if (productError) throw productError;

      // Fetch similar products in same category
      const { data: similar, error: similarError } = await supabase
        .from('products')
        .select('*, shops(shop_name, slug, logo_url, is_verified)')
        .eq('marketplace_category', product.marketplace_category)
        .eq('is_active', true)
        .eq('public_visible', true)
        .neq('id', productId)
        .limit(4);

      if (similarError) throw similarError;

      return {
        product,
        similarProducts: similar || []
      };
    } catch (caughtError) {
      setError(caughtError);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // 4. Fetch specific shop with category filtering
  const fetchShopDetails = useCallback(async (shopSlug) => {
    setLoading(true);
    setError(null);
    try {
      const { data: shop, error: shopError } = await supabase
        .from('shops')
        .select('*')
        .eq('slug', shopSlug)
        .single();

      if (shopError) throw shopError;

      // Fetch products for this shop
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('shop_id', shop.id)
        .eq('is_active', true)
        .eq('public_visible', true)
        .order('name');

      if (productsError) throw productsError;

      return {
        shop,
        products: products || []
      };
    } catch (caughtError) {
      setError(caughtError);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // 5. Reviews APIs
  const fetchReviews = useCallback(async ({ shopId, productId }) => {
    setLoading(true);
    setError(null);
    try {
      let q = supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (productId) {
        q = q.eq('product_id', productId);
      } else if (shopId) {
        // Fetch only shop-level reviews (where product_id is null) or all reviews for the shop?
        // Let's fetch all reviews for the shop.
        q = q.eq('shop_id', shopId);
      }

      const { data, error: reviewsError } = await q;
      if (reviewsError) throw reviewsError;
      return data || [];
    } catch (caughtError) {
      setError(caughtError);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const submitReview = useCallback(async (reviewData) => {
    setLoading(true);
    setError(null);
    try {
      // Validate order_id if present to check if it's verified
      let isVerifiedPurchase = false;
      if (reviewData.order_id) {
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .select('id, customer_name')
          .eq('id', reviewData.order_id)
          .maybeSingle();
        if (order) {
          isVerifiedPurchase = true;
        }
      }

      const { data, error: insertError } = await supabase
        .from('reviews')
        .insert({
          shop_id: reviewData.shop_id,
          product_id: reviewData.product_id || null,
          order_id: reviewData.order_id || null,
          customer_name: reviewData.customer_name,
          customer_email: reviewData.customer_email || null,
          rating: Number(reviewData.rating),
          comment: reviewData.comment || '',
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return data;
    } catch (caughtError) {
      setError(caughtError);
      throw caughtError;
    } finally {
      setLoading(false);
    }
  }, []);

  const upvoteReview = useCallback(async (reviewId, currentVotes) => {
    try {
      const { data, error: upvoteError } = await supabase
        .from('reviews')
        .update({ helpful_votes: (currentVotes || 0) + 1 })
        .eq('id', reviewId)
        .select()
        .single();
      if (upvoteError) throw upvoteError;
      return data;
    } catch (caughtError) {
      console.error('Failed to upvote review:', caughtError.message);
      return null;
    }
  }, []);

  return {
    loading,
    error,
    fetchHomeData,
    searchProducts,
    fetchProductDetails,
    fetchShopDetails,
    fetchReviews,
    submitReview,
    upvoteReview,
  };
}
