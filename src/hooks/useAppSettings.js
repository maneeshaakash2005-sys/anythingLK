import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export const DEFAULT_PAYMENT_INSTRUCTIONS = {
  bank: 'BOC',
  account_holder: 'OrderBase Pvt Ltd',
  account_number: '1298 2343 7890',
  branch: 'Malabe',
  support_whatsapp: '0728472539',
};

const DEFAULT_APP_SETTINGS = {
  id: null,
  site_name: 'OrderBase',
  currency: 'LKR',
  low_stock_threshold: 10,
  payment_instructions: DEFAULT_PAYMENT_INSTRUCTIONS,
};

function normalizeSettings(data) {
  if (!data) return DEFAULT_APP_SETTINGS;
  return {
    ...DEFAULT_APP_SETTINGS,
    ...data,
    payment_instructions: {
      ...DEFAULT_PAYMENT_INSTRUCTIONS,
      ...(data.payment_instructions || {}),
    },
  };
}

export function useAppSettings({ enabled = true } = {}) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);

  const fetchSettings = useCallback(async () => {
    if (!enabled) return null;

    setLoading(true);
    setError(null);
    try {
      const { data, error: settingsError } = await supabase
        .from('app_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (settingsError) throw settingsError;
      const normalized = normalizeSettings(data);
      setSettings(normalized);
      return normalized;
    } catch (caughtError) {
      setError(caughtError);
      throw caughtError;
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  const updateSettings = useCallback(async (updates) => {
    const targetId = settings?.id;
    if (!targetId) {
      const { id: _id, ...insertDefaults } = DEFAULT_APP_SETTINGS;
      const { data, error: insertError } = await supabase
        .from('app_settings')
        .insert({ ...insertDefaults, ...updates })
        .select()
        .single();
      if (insertError) throw insertError;
      const normalized = normalizeSettings(data);
      setSettings(normalized);
      return normalized;
    }

    const { data, error: updateError } = await supabase
      .from('app_settings')
      .update(updates)
      .eq('id', targetId)
      .select()
      .single();

    if (updateError) throw updateError;
    const normalized = normalizeSettings(data);
    setSettings(normalized);
    return normalized;
  }, [settings?.id]);

  useEffect(() => {
    if (enabled) {
      fetchSettings().catch(() => {});
    }
  }, [enabled, fetchSettings]);

  return { settings, loading, error, refetch: fetchSettings, updateSettings };
}
