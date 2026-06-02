import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getPlanFeatures } from '../lib/features';
import { slugifyShopName } from '../lib/shopUrl';
import { useAuth } from '../context/AuthContext';

const DEV_SHOP_DEBUG = import.meta.env.DEV;
const DEFAULT_FORM_SETTINGS = {
  form_title: 'Place your order',
  welcome_message: 'Choose your products and submit your order.',
  thank_you_message: 'Thank you. Your order has been received.',
  primary_color: '#0d9488',
  accent_color: '#2563eb',
  template_key: 'clean',
  custom_schema: {},
  enabled_fields: { notes: true, delivery_date: true, address: true },
  delivery_date_enabled: false,
  cash_on_delivery_enabled: true,
  bank_transfer_enabled: true,
  payment_slip_required: false,
  reminder_enabled: false,
  reminder_channel: 'browser',
};

function slugify(value) {
  return slugifyShopName(value);
}

const listeners = new Set();
let sharedUserId = null;
let sharedInFlight = null;
let sharedState = {
  shop: null,
  settings: null,
  bankAccounts: [],
  loading: false,
  error: null,
};

function emitSharedState() {
  listeners.forEach((listener) => listener(sharedState));
}

function setSharedState(patch) {
  sharedState = { ...sharedState, ...patch };
  emitSharedState();
}

function resetSharedState(nextUserId, loading = false) {
  sharedUserId = nextUserId || null;
  sharedInFlight = null;
  sharedState = {
    shop: null,
    settings: null,
    bankAccounts: [],
    loading,
    error: null,
  };
  emitSharedState();
}

function debugShop(event, details = {}) {
  if (!DEV_SHOP_DEBUG) return;
  const mode = typeof window !== 'undefined' ? window.__orderbaseDebug : undefined;
  const cacheOnly = mode === 'cache';
  const allDebug = mode === 'all' || mode === true;
  const enabled = cacheOnly || allDebug;
  if (!enabled) return;
  const payload = {
    at: new Date().toISOString(),
    ...details,
  };
  console.info(`[useShop] ${event}`, payload);
}

function isRlsDenied(error) {
  if (!error) return false;
  return error.code === '42501' || String(error.message || '').toLowerCase().includes('row-level security');
}

async function ensureOrderFormSettingsRow(shopId) {
  const { data, error } = await supabase.rpc('ensure_order_form_settings', {
    p_shop_id: shopId,
  });

  if (!error && data) {
    return data;
  }

  // RPC not deployed yet — fall back to direct select (row may exist after SQL backfill)
  if (error?.code === 'PGRST202' || String(error?.message || '').includes('ensure_order_form_settings')) {
    const { data: existing, error: selectError } = await supabase
      .from('order_form_settings')
      .select('*')
      .eq('shop_id', shopId)
      .maybeSingle();
    if (selectError) throw selectError;
    return existing;
  }

  if (error) throw error;
  return data;
}

export function useShop({ enabled = true } = {}) {
  const { user, profile } = useAuth();
  const userId = user?.id ?? null;
  const userEmail = user?.email ?? null;
  const [state, setState] = useState(() => ({
    ...sharedState,
    loading: sharedUserId === userId ? sharedState.loading : Boolean(enabled && userId),
  }));

  const fetchShop = useCallback(async ({ force = false } = {}) => {
    const startedAt = performance.now();
    debugShop('fetch:start', {
      userId,
      force,
      enabled,
      hasCachedShop: Boolean(sharedState.shop),
      hasCachedSettings: Boolean(sharedState.settings),
      hasInFlight: Boolean(sharedInFlight),
    });

    if (!enabled || !userId) {
      if (sharedUserId !== null || sharedState.loading || sharedState.shop || sharedState.settings || sharedState.bankAccounts.length) {
        resetSharedState(null, false);
      }
      return null;
    }

    if (sharedUserId !== userId) {
      resetSharedState(userId, true);
    } else if (!force && sharedState.shop && sharedState.settings) {
      if (sharedState.loading) {
        setSharedState({ loading: false, error: null });
      }
      return sharedState.shop;
    } else {
      setSharedState({ loading: true, error: null });
    }

    if (!force && sharedInFlight) {
      debugShop('fetch:deduped_inflight', { userId, force });
      return sharedInFlight;
    }

    sharedInFlight = (async () => {
      try {
        let { data: shopData, error: shopError } = await supabase
          .from('shops')
          .select('*')
          .eq('owner_id', userId)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (shopError) throw shopError;

        if (!shopData) {
          const shopName = profile?.name || userEmail?.split('@')[0] || 'My Shop';
          const { data: createdShop, error: createError } = await supabase
            .from('shops')
            .insert({
              owner_id: userId,
              shop_name: shopName,
              slug: slugify(shopName),
              email: userEmail,
            })
            .select()
            .single();

          if (createError) throw createError;
          shopData = createdShop;

          const { error: memberUpsertError } = await supabase.from('shop_members').upsert({
            shop_id: shopData.id,
            user_id: userId,
            role: 'admin',
          });
          if (memberUpsertError) {
            debugShop('fetch:member_upsert_error', {
              userId,
              shopId: shopData.id,
              message: memberUpsertError.message,
              code: memberUpsertError.code,
            });
          }
        }

        const [settingsResult, bankResult] = await Promise.all([
          supabase.from('order_form_settings').select('*').eq('shop_id', shopData.id).maybeSingle(),
          supabase.from('bank_accounts').select('*').eq('shop_id', shopData.id).order('created_at', { ascending: false }),
        ]);

        if (settingsResult.error) throw settingsResult.error;
        if (bankResult.error) throw bankResult.error;

        let settingsData = settingsResult.data;
        if (!settingsData?.id) {
          settingsData = await ensureOrderFormSettingsRow(shopData.id);
        }
        if (!settingsData?.id) {
          settingsData = { ...DEFAULT_FORM_SETTINGS, shop_id: shopData.id };
        }
        settingsData = {
          ...DEFAULT_FORM_SETTINGS,
          ...settingsData,
          enabled_fields: {
            ...DEFAULT_FORM_SETTINGS.enabled_fields,
            ...(settingsData?.enabled_fields || {}),
            delivery_date: settingsData?.delivery_date_enabled === true,
          },
        };

        // Ensure billing/trial row exists for shops created before billing migration.
        try {
          await supabase.rpc('ensure_shop_subscription', { p_shop_id: shopData.id });
        } catch {
          // Billing migration may not be deployed yet; continue without blocking core shop load.
        }

        if (sharedUserId === userId) {
          setSharedState({
            shop: shopData,
            settings: settingsData,
            bankAccounts: bankResult.data || [],
            loading: false,
            error: null,
          });
        }
        debugShop('fetch:success', {
          userId,
          shopId: shopData?.id,
          shopSlug: shopData?.slug,
          settingsId: settingsData?.id,
          bankAccountCount: (bankResult.data || []).length,
          elapsedMs: Math.round(performance.now() - startedAt),
        });
        return shopData;
      } catch (caughtError) {
        if (sharedUserId === userId) {
          setSharedState({ loading: false, error: caughtError });
        }
        debugShop('fetch:error', {
          userId,
          elapsedMs: Math.round(performance.now() - startedAt),
          message: caughtError?.message,
          code: caughtError?.code,
        });
        throw caughtError;
      } finally {
        if (sharedUserId === userId) {
          sharedInFlight = null;
        }
        debugShop('fetch:done', {
          userId,
          elapsedMs: Math.round(performance.now() - startedAt),
        });
      }
    })();

    return sharedInFlight;
  }, [enabled, profile?.name, userEmail, userId]);

  useEffect(() => {
    const listener = (nextState) => setState(nextState);
    listeners.add(listener);
    setState(sharedState);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (enabled && userId && sharedUserId !== userId) {
      resetSharedState(userId, true);
    }

    if (enabled && userId) {
      fetchShop().catch(() => {});
    } else {
      resetSharedState(null, false);
    }
  }, [enabled, userId, fetchShop]);

  const updateShop = useCallback(async (updates) => {
    if (!state.shop?.id) throw new Error('No shop loaded');
    const payload = { ...updates };
    if ('slug' in payload) {
      payload.slug = slugify(payload.slug);
    }
    const { data, error: updateError } = await supabase
      .from('shops')
      .update(payload)
      .eq('id', state.shop.id)
      .select()
      .single();

    if (updateError) {
      if (updateError.code === '23505') {
        throw new Error('This slug is already in use. Try a different slug.');
      }
      throw updateError;
    }
    setSharedState({ shop: data });
    return data;
  }, [state.shop?.id]);

  const updateFormSettings = useCallback(async (updates) => {
    if (!state.shop?.id) throw new Error('No shop loaded');

    let settingsRow = state.settings?.id
      ? state.settings
      : await ensureOrderFormSettingsRow(state.shop.id);

    if (!settingsRow?.id) {
      throw new Error(
        'Could not create shop settings. Run supabase/migrations/03_order_form_settings_fix.sql in your Supabase SQL Editor, then refresh.',
      );
    }

    const { id: _settingsId, shop_id: _shopId, ...rest } = updates;
    const deliveryDateEnabled = rest.delivery_date_enabled === true;
    const enabledFields = {
      ...DEFAULT_FORM_SETTINGS.enabled_fields,
      ...(rest.enabled_fields || {}),
      delivery_date: deliveryDateEnabled,
    };
    const { data, error: updateError } = await supabase
      .from('order_form_settings')
      .update({
        ...rest,
        enabled_fields: enabledFields,
        delivery_date_enabled: deliveryDateEnabled,
        shop_id: state.shop.id,
      })
      .eq('id', settingsRow.id)
      .select()
      .single();

    if (updateError) {
      if (isRlsDenied(updateError)) {
        throw new Error(
          'Could not save shop settings (RLS). Run supabase/migrations/03_order_form_settings_fix.sql in Supabase, then try again.',
        );
      }
      throw updateError;
    }

    setSharedState({ settings: data });
    return data;
  }, [state.shop?.id, state.settings]);

  const saveBankAccount = useCallback(async (payload) => {
    if (!state.shop?.id) throw new Error('No shop loaded');
    const row = { ...payload, shop_id: state.shop.id };
    const request = payload.id
      ? supabase.from('bank_accounts').update(row).eq('id', payload.id).select().single()
      : supabase.from('bank_accounts').insert(row).select().single();

    const { data, error: bankError } = await request;
    if (bankError) {
      if (isRlsDenied(bankError)) {
        throw new Error(
          'Could not save bank account (RLS). Run supabase/migrations/04_bank_accounts_rls_fix.sql in Supabase, then refresh.',
        );
      }
      throw bankError;
    }
    await fetchShop({ force: true });
    return data;
  }, [fetchShop, state.shop?.id]);

  const deleteBankAccount = useCallback(async (id) => {
    const { error: deleteError } = await supabase.from('bank_accounts').delete().eq('id', id);
    if (deleteError) throw deleteError;
    setSharedState({
      bankAccounts: (state.bankAccounts || []).filter((account) => account.id !== id),
    });
  }, [state.bankAccounts]);

  const features = useMemo(() => getPlanFeatures(state.shop?.subscription_plan), [state.shop?.subscription_plan]);

  const refetch = useCallback(() => fetchShop({ force: true }), [fetchShop]);

  return {
    shop: state.shop,
    settings: state.settings,
    bankAccounts: state.bankAccounts,
    features,
    loading: state.loading,
    error: state.error,
    refetch,
    updateShop,
    updateFormSettings,
    saveBankAccount,
    deleteBankAccount,
  };
}

export function useFeatureGate(feature) {
  const { shop, features, loading } = useShop();
  return {
    allowed: Boolean(features?.[feature]),
    plan: shop?.subscription_plan || 'free',
    loading,
  };
}
