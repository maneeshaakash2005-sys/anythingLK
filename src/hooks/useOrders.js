import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useOrders({ shopId, pageSize = 10 } = {}) {
  const [orders, setOrders] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrders = useCallback(async () => {
    if (!shopId) {
      setOrders([]);
      setCount(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      let query = supabase
        .from('orders')
        .select('*, customer:customers(id,name,email,phone,address), order_items(id,quantity,price_at_time, product:products(id,name,price,image_url))', { count: 'exact' })
        .eq('shop_id', shopId)
        .order('order_date', { ascending: false })
        .range(from, to);

      if (status !== 'All') {
        query = query.eq('status', status);
      }

      if (search.trim()) {
        query = query.ilike('order_number', `%${search.trim()}%`);
      }

      const { data, error: ordersError, count: totalCount } = await query;
      if (ordersError) throw ordersError;

      setOrders(data || []);
      setCount(totalCount || 0);
    } catch (caughtError) {
      setError(caughtError);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, status, shopId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const createOrder = useCallback(async ({ customerId, items, status: orderStatus = 'Pending' }) => {
    if (!shopId) throw new Error('No shop loaded');
    const { data, error: createError } = await supabase.rpc('create_order_with_items', {
      p_customer_id: customerId,
      p_status: orderStatus,
      p_items: items.map((item) => ({
        product_id: item.product_id,
        quantity: Number(item.quantity),
      })),
    });

    if (createError) throw createError;

    // Fallback: If the database function did not set shop_id (due to old schema), update it from frontend.
    if (data && data.id) {
      try {
        await supabase.from('orders').update({ shop_id: shopId }).eq('id', data.id);
        await supabase.from('order_items').update({ shop_id: shopId }).eq('order_id', data.id);
      } catch {
        // Ignore compatibility backfill failures; the order itself was created successfully.
      }
    }

    await fetchOrders();
    return data;
  }, [fetchOrders, shopId]);

  const updateStatus = useCallback(async (id, nextStatus) => {
    if (!shopId) throw new Error('No shop loaded');
    const { data, error: updateError } = await supabase
      .from('orders')
      .update({ status: nextStatus })
      .eq('id', id)
      .eq('shop_id', shopId)
      .select('*, customer:customers(id,name,email,phone,address), order_items(id,quantity,price_at_time, product:products(id,name,price,image_url))')
      .single();

    if (updateError) throw updateError;
    setOrders((current) => current.map((order) => (order.id === id ? { ...order, ...data } : order)));
    return data;
  }, [shopId]);

  const deleteOrder = useCallback(async (id) => {
    if (!shopId) throw new Error('No shop loaded');
    const { error: deleteError } = await supabase
      .from('orders')
      .delete()
      .eq('id', id)
      .eq('shop_id', shopId);
    if (deleteError) throw deleteError;
    setOrders((current) => current.filter((order) => order.id !== id));
    setCount((current) => Math.max(current - 1, 0));
  }, [shopId]);

  const totalPages = useMemo(() => Math.max(Math.ceil(count / pageSize), 1), [count, pageSize]);

  return {
    orders,
    count,
    page,
    pageSize,
    totalPages,
    status,
    search,
    loading,
    error,
    setPage,
    setStatus: (nextStatus) => {
      setPage(1);
      setStatus(nextStatus);
    },
    setSearch: (nextSearch) => {
      setPage(1);
      setSearch(nextSearch);
    },
    refetch: fetchOrders,
    createOrder,
    updateStatus,
    deleteOrder,
  };
}
