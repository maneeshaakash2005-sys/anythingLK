import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useBilling(shopId) {
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBilling = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ data: plansData, error: plansError }, subscriptionResult, paymentsResult, invoicesResult] = await Promise.all([
        supabase.from('subscription_plans').select('*').eq('is_active', true).order('monthly_price_lkr'),
        shopId ? supabase.from('shop_subscriptions').select('*').eq('shop_id', shopId).maybeSingle() : Promise.resolve({ data: null, error: null }),
        shopId ? supabase.from('payment_submissions').select('*').eq('shop_id', shopId).order('created_at', { ascending: false }).limit(20) : Promise.resolve({ data: [], error: null }),
        shopId ? supabase.from('billing_invoices').select('*').eq('shop_id', shopId).order('issued_at', { ascending: false }).limit(20) : Promise.resolve({ data: [], error: null }),
      ]);

      if (plansError) throw plansError;
      if (subscriptionResult.error) throw subscriptionResult.error;
      if (paymentsResult.error) throw paymentsResult.error;
      if (invoicesResult.error) throw invoicesResult.error;

      setPlans(plansData || []);
      setSubscription(subscriptionResult.data || null);
      setPayments(paymentsResult.data || []);
      setInvoices(invoicesResult.data || []);
    } catch (caughtError) {
      setError(caughtError);
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    fetchBilling();
  }, [fetchBilling]);

  const trialDaysRemaining = useMemo(() => {
    if (!subscription?.trial_ends_at) return 0;
    const diff = new Date(subscription.trial_ends_at).getTime() - Date.now();
    return Math.max(Math.ceil(diff / (24 * 60 * 60 * 1000)), 0);
  }, [subscription?.trial_ends_at]);

  const submitPaymentProof = useCallback(async ({ planId, amountLkr, proofUrl, note }) => {
    if (!shopId) throw new Error('No shop loaded');
    const { data, error: submitError } = await supabase.rpc('submit_payment_submission', {
      p_shop_id: shopId,
      p_plan_id: planId,
      p_amount_lkr: amountLkr,
      p_payment_proof_url: proofUrl,
      p_note: note || null,
    });
    if (submitError) throw submitError;
    await fetchBilling();
    return data;
  }, [fetchBilling, shopId]);

  return {
    plans,
    subscription,
    payments,
    invoices,
    loading,
    error,
    trialDaysRemaining,
    refetch: fetchBilling,
    submitPaymentProof,
  };
}
