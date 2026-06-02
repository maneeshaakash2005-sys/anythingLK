import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

const DASHBOARD_TIMEOUT_MS = 10000;

function withTimeout(promise, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), DASHBOARD_TIMEOUT_MS);
    }),
  ]);
}

function buildWeeklyRevenue(orders) {
  const days = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    date.setHours(0, 0, 0, 0);
    return {
      label: date.toLocaleDateString('en-LK', { weekday: 'short' }),
      value: 0,
      key: date.toISOString().slice(0, 10),
    };
  });

  const dayMap = new Map(days.map((day) => [day.key, day]));
  orders.forEach((order) => {
    if (order.status !== 'Paid') return;
    const key = new Date(order.order_date).toISOString().slice(0, 10);
    const bucket = dayMap.get(key);
    if (bucket) {
      bucket.value += Number(order.total_amount || 0);
    }
  });

  return days;
}

export function useDashboardStats(shopId) {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    if (!shopId) {
      setOrders([]);
      setProducts([]);
      setCustomers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const [ordersResult, productsResult, customersResult] = await Promise.all([
        withTimeout(
          supabase
            .from('orders')
            .select('*, customer:customers(name,email)')
            .eq('shop_id', shopId)
            .order('order_date', { ascending: false }),
          'Orders are taking too long to load. Check the orders table, customers relationship, and RLS policies.',
        ),
        withTimeout(
          supabase
            .from('products')
            .select('*')
            .eq('shop_id', shopId)
            .order('sales_volume', { ascending: false }),
          'Products are taking too long to load. Check the products table and RLS policies.',
        ),
        withTimeout(
          supabase
            .from('customers')
            .select('*')
            .eq('shop_id', shopId)
            .order('join_date', { ascending: false }),
          'Customers are taking too long to load. Check the customers table and RLS policies.',
        ),
      ]);

      if (ordersResult.error) throw ordersResult.error;
      if (productsResult.error) throw productsResult.error;
      if (customersResult.error) throw customersResult.error;

      setOrders(ordersResult.data || []);
      setProducts(productsResult.data || []);
      setCustomers(customersResult.data || []);
    } catch (caughtError) {
      setError(caughtError);
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const stats = useMemo(() => {
    const paidOrders = orders.filter((order) => order.status === 'Paid');
    return {
      totalRevenue: paidOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
      totalOrders: orders.length,
      totalProducts: products.length,
      totalCustomers: customers.length,
      recentOrders: orders.slice(0, 6),
      topProducts: products.slice(0, 6),
      weeklyRevenue: buildWeeklyRevenue(orders),
      orders,
    };
  }, [customers.length, orders, products]);

  return { ...stats, loading, error, refetch: fetchStats };
}
