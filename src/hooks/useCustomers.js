import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useCustomers(shopId) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCustomers = useCallback(async () => {
    if (!shopId) {
      setCustomers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const { data, error: customersError } = await supabase
        .from('customers')
        .select('*, orders(id,total_amount,status,order_date)')
        .eq('shop_id', shopId)
        .order('join_date', { ascending: false });

      if (customersError) throw customersError;
      setCustomers(data || []);
    } catch (caughtError) {
      setError(caughtError);
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const customersWithTotals = useMemo(() => customers.map((customer) => {
    const orders = customer.orders || [];
    const paidTotal = orders
      .filter((order) => order.status === 'Paid')
      .reduce((sum, order) => sum + Number(order.total_amount || 0), 0);

    return {
      ...customer,
      order_count: orders.length,
      calculated_total_spent: paidTotal,
    };
  }), [customers]);

  const addCustomer = useCallback(async (payload) => {
    if (!shopId) throw new Error('No shop loaded');
    const { data, error: addError } = await supabase
      .from('customers')
      .insert({ ...payload, shop_id: shopId })
      .select()
      .single();
    if (addError) throw addError;
    await fetchCustomers();
    return data;
  }, [fetchCustomers, shopId]);

  const editCustomer = useCallback(async (id, payload) => {
    if (!shopId) throw new Error('No shop loaded');
    const { data, error: editError } = await supabase
      .from('customers')
      .update(payload)
      .eq('id', id)
      .eq('shop_id', shopId)
      .select()
      .single();
    if (editError) throw editError;
    setCustomers((current) => current.map((customer) => (customer.id === id ? { ...customer, ...data } : customer)));
    return data;
  }, [shopId]);

  const deleteCustomer = useCallback(async (id) => {
    if (!shopId) throw new Error('No shop loaded');
    const { error: deleteError } = await supabase
      .from('customers')
      .delete()
      .eq('id', id)
      .eq('shop_id', shopId);
    if (deleteError) throw deleteError;
    setCustomers((current) => current.filter((customer) => customer.id !== id));
  }, [shopId]);

  return {
    customers: customersWithTotals,
    loading,
    error,
    refetch: fetchCustomers,
    addCustomer,
    editCustomer,
    deleteCustomer,
  };
}

export function useCustomer(id, shopId) {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCustomer = useCallback(async () => {
    if (!id || !shopId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: customerError } = await supabase
        .from('customers')
        .select('*, orders(id,order_number,order_date,total_amount,status, order_items(id,quantity,price_at_time, product:products(id,name,category)))')
        .eq('id', id)
        .eq('shop_id', shopId)
        .single();

      if (customerError) throw customerError;
      setCustomer(data);
    } catch (caughtError) {
      setError(caughtError);
    } finally {
      setLoading(false);
    }
  }, [id, shopId]);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  const spendingByMonth = useMemo(() => {
    const buckets = Array.from({ length: 6 }).map((_, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - index));
      return {
        label: date.toLocaleDateString('en-LK', { month: 'short' }),
        value: 0,
        month: date.getMonth(),
        year: date.getFullYear(),
      };
    });

    (customer?.orders || []).forEach((order) => {
      if (order.status !== 'Paid') return;
      const date = new Date(order.order_date);
      const bucket = buckets.find((item) => item.month === date.getMonth() && item.year === date.getFullYear());
      if (bucket) bucket.value += Number(order.total_amount || 0);
    });

    return buckets;
  }, [customer?.orders]);

  return { customer, spendingByMonth, loading, error, refetch: fetchCustomer };
}
