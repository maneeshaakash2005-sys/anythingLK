import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useAdminBilling() {
  const [shops, setShops] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [plans, setPlans] = useState([]);
  const [orderRows, setOrderRows] = useState([]);
  const [productRows, setProductRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [shopsResult, subscriptionsResult, paymentsResult, plansResult, ordersResult, productsResult] = await Promise.all([
        supabase.from('shops').select('*').order('created_at', { ascending: false }),
        supabase.from('shop_subscriptions').select('*'),
        supabase.from('payment_submissions').select('*').order('created_at', { ascending: false }),
        supabase.from('subscription_plans').select('*').order('monthly_price_lkr'),
        supabase.from('orders').select('shop_id, total_amount, status'),
        supabase.from('products').select('shop_id'),
      ]);

      if (shopsResult.error) throw shopsResult.error;
      if (subscriptionsResult.error) throw subscriptionsResult.error;
      if (paymentsResult.error) throw paymentsResult.error;
      if (plansResult.error) throw plansResult.error;
      if (ordersResult.error) throw ordersResult.error;
      if (productsResult.error) throw productsResult.error;

      setShops(shopsResult.data || []);
      setSubscriptions(subscriptionsResult.data || []);
      setPayments(paymentsResult.data || []);
      setPlans(plansResult.data || []);
      setOrderRows(ordersResult.data || []);
      setProductRows(productsResult.data || []);
    } catch (caughtError) {
      setError(caughtError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  const approvePayment = useCallback(async (submissionId, note) => {
    const { data, error: approveError } = await supabase.rpc('approve_payment_submission', {
      p_submission_id: submissionId,
      p_admin_note: note || null,
    });
    if (approveError) throw approveError;
    await fetchAdminData();
    return data;
  }, [fetchAdminData]);

  const rejectPayment = useCallback(async (submissionId, reason) => {
    const { data, error: rejectError } = await supabase.rpc('reject_payment_submission', {
      p_submission_id: submissionId,
      p_reason: reason,
    });
    if (rejectError) throw rejectError;
    await fetchAdminData();
    return data;
  }, [fetchAdminData]);

  const setShopSubscriptionOverride = useCallback(async ({ shopId, planId, status, extendDays = 0, lock = false, note = null }) => {
    const { data, error: overrideError } = await supabase.rpc('admin_override_shop_subscription', {
      p_shop_id: shopId,
      p_plan_id: planId,
      p_status: status,
      p_extend_days: extendDays,
      p_lock: lock,
      p_note: note,
    });
    if (overrideError) throw overrideError;
    await fetchAdminData();
    return data;
  }, [fetchAdminData]);

  const grantAdminByEmail = useCallback(async (email, role) => {
    const { data, error: grantError } = await supabase.rpc('grant_admin_role_by_email', {
      p_email: email,
      p_role: role,
    });
    if (grantError) throw grantError;
    await fetchAdminData();
    return data;
  }, [fetchAdminData]);

  const updatePlan = useCallback(async (planId, updates) => {
    const { data, error: updateError } = await supabase
      .from('subscription_plans')
      .update(updates)
      .eq('id', planId)
      .select()
      .single();
    if (updateError) throw updateError;
    await fetchAdminData();
    return data;
  }, [fetchAdminData]);

  const revokeAdminByEmail = useCallback(async (email) => {
    const { data, error: revokeError } = await supabase.rpc('revoke_admin_role_by_email', {
      p_email: email,
    });
    if (revokeError) throw revokeError;
    await fetchAdminData();
    return data;
  }, [fetchAdminData]);

  const metrics = useMemo(() => {
    const subByShop = new Map(subscriptions.map((row) => [row.shop_id, row]));
    const shopStats = new Map();

    orderRows.forEach((row) => {
      const current = shopStats.get(row.shop_id) || { orderCount: 0, orderRevenue: 0, productCount: 0 };
      current.orderCount += 1;
      if (row.status === 'Paid' || row.status === 'Delivered') {
        current.orderRevenue += Number(row.total_amount || 0);
      }
      shopStats.set(row.shop_id, current);
    });

    productRows.forEach((row) => {
      const current = shopStats.get(row.shop_id) || { orderCount: 0, orderRevenue: 0, productCount: 0 };
      current.productCount += 1;
      shopStats.set(row.shop_id, current);
    });

    const activeSubscriptions = subscriptions.filter((row) => row.status === 'active').length;
    const trialUsers = subscriptions.filter((row) => row.status === 'trialing').length;
    const expiredUsers = subscriptions.filter((row) => row.status === 'locked' || row.status === 'past_due').length;
    const pendingPayments = payments.filter((row) => row.status === 'pending').length;
    const monthlyRevenue = payments
      .filter((row) => row.status === 'approved')
      .filter((row) => {
        const created = new Date(row.approved_at || row.created_at);
        const now = new Date();
        return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
      })
      .reduce((sum, row) => sum + Number(row.amount_lkr || 0), 0);
    const totalRevenue = payments
      .filter((row) => row.status === 'approved')
      .reduce((sum, row) => sum + Number(row.amount_lkr || 0), 0);
    const totalOrderRevenue = [...shopStats.values()].reduce((sum, row) => sum + row.orderRevenue, 0);

    return {
      totalShops: shops.length,
      activeSubscriptions,
      trialUsers,
      expiredUsers,
      pendingPayments,
      monthlyRevenue,
      totalRevenue,
      totalOrderRevenue,
      subByShop,
      shopStats,
    };
  }, [orderRows, payments, productRows, shops.length, subscriptions]);

  return {
    shops,
    subscriptions,
    payments,
    plans,
    metrics,
    loading,
    error,
    refetch: fetchAdminData,
    approvePayment,
    rejectPayment,
    setShopSubscriptionOverride,
    grantAdminByEmail,
    revokeAdminByEmail,
    updatePlan,
  };
}
