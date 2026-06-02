import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

function normalizeSlug(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getSlugVariants(shopSlug) {
  const raw = String(shopSlug || '').trim();
  const compact = normalizeSlug(raw);
  if (!compact) return [];
  return Array.from(
    new Set([
      raw,
      raw.toLowerCase(),
      raw.replace(/[^a-z0-9]+/gi, '-').toLowerCase().replace(/^-+|-+$/g, ''),
      compact,
    ].filter(Boolean)),
  );
}

async function resolvePublicShop(shopSlug) {
  const variants = getSlugVariants(shopSlug);
  if (variants.length === 0) return null;

  const { data: rpcShop, error: rpcError } = await supabase.rpc('resolve_shop_by_slug', {
    p_shop_slug: variants[0],
  });

  if (rpcError && rpcError.code !== 'PGRST202') {
    throw rpcError;
  }
  if (rpcShop?.id) {
    return rpcShop;
  }

  for (const variant of variants) {
    const { data, error } = await supabase
      .from('shops')
      .select('*')
      .eq('slug', variant)
      .maybeSingle();
    if (error) throw error;
    if (data?.id) return data;
  }

  return null;
}

export function usePublicShop(shopSlug) {
  const [shop, setShop] = useState(null);
  const [settings, setSettings] = useState(null);
  const [products, setProducts] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPublicShop = useCallback(async () => {
    if (!shopSlug) return;
    setLoading(true);
    setError(null);

    try {
      const shopData = await resolvePublicShop(shopSlug);
      if (!shopData) {
        throw new Error(`Shop not found for link "${shopSlug}". Check Shop Settings slug and public URL.`);
      }

      const [settingsResult, productsResult, bankResult] = await Promise.all([
        supabase.from('order_form_settings').select('*').eq('shop_id', shopData.id).maybeSingle(),
        supabase.from('products').select('*').eq('shop_id', shopData.id).eq('is_active', true).eq('public_visible', true).order('name'),
        supabase.from('bank_accounts').select('*').eq('shop_id', shopData.id).eq('is_active', true).order('created_at', { ascending: false }),
      ]);

      if (settingsResult.error) throw settingsResult.error;
      if (productsResult.error) throw productsResult.error;
      if (bankResult.error) throw bankResult.error;

      setShop(shopData);
      setSettings(settingsResult.data);
      setProducts(productsResult.data || []);
      setBankAccounts(bankResult.data || []);
    } catch (caughtError) {
      setError(caughtError);
    } finally {
      setLoading(false);
    }
  }, [shopSlug]);

  useEffect(() => {
    fetchPublicShop();
  }, [fetchPublicShop]);

  return { shop, settings, products, bankAccounts, loading, error, refetch: fetchPublicShop };
}

export function usePublicOrders(shopSlug) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const uploadPaymentSlip = useCallback(async (file) => {
    if (!file) return null;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Unsupported payment slip format. Use JPG, PNG, WEBP, or PDF.');
    }
    if (file.size > 8 * 1024 * 1024) {
      throw new Error('Payment slip must be 8MB or smaller.');
    }
    const fileExt = file.name.split('.').pop();
    const filePath = `${shopSlug}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('payment-slips').upload(filePath, file, { cacheControl: '3600', upsert: false });
    if (uploadError) throw uploadError;
    const { data: signed, error: signError } = await supabase.storage.from('payment-slips').createSignedUrl(filePath, 60 * 60 * 24 * 7);
    if (!signError && signed?.signedUrl) {
      return signed.signedUrl;
    }
    const { data: publicData } = supabase.storage.from('payment-slips').getPublicUrl(filePath);
    return publicData?.publicUrl || filePath;
  }, [shopSlug]);

  const submitOrder = useCallback(async ({ customer, items, paymentMethod, paymentSlip }) => {
    setSubmitting(true);
    setError(null);
    try {
      const slugVariants = getSlugVariants(shopSlug);
      if (slugVariants.length === 0) {
        throw new Error('Invalid shop link. Please use the full public order URL from Shop Settings.');
      }
      const paymentSlipUrl = await uploadPaymentSlip(paymentSlip);
      let lastError = null;

      for (const slugVariant of slugVariants) {
        const { data, error: orderError } = await supabase.rpc('create_public_order', {
          p_shop_slug: slugVariant,
          p_customer: customer,
          p_items: items,
          p_payment_method: paymentMethod,
          p_payment_slip_url: paymentSlipUrl,
        });

        if (!orderError) {
          return data;
        }
        lastError = orderError;
      }

      throw lastError || new Error('Order submission failed unexpectedly.');
    } catch (caughtError) {
      setError(caughtError);
      throw caughtError;
    } finally {
      setSubmitting(false);
    }
  }, [shopSlug, uploadPaymentSlip]);

  return { submitOrder, submitting, error };
}

export function useCartTotals(products, cartItems) {
  const productMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  return useMemo(() => {
    const lines = cartItems
      .map((item) => {
        const product = productMap.get(item.product_id);
        return {
          ...item,
          product,
          lineTotal: Number(product?.price || 0) * Number(item.quantity || 0),
        };
      })
      .filter((item) => item.product);

    return {
      lines,
      total: lines.reduce((sum, item) => sum + item.lineTotal, 0),
    };
  }, [cartItems, productMap]);
}
