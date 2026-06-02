import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useNotifications(shopId, { enabled = true } = {}) {
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!enabled || !shopId) {
      setItems([]);
      setUnreadCount(0);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      setItems(data || []);
      setUnreadCount((data || []).filter((row) => !row.is_read).length);
    } catch {
      setItems([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [enabled, shopId]);

  const markRead = useCallback(async (id) => {
    try {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      if (error) throw error;
      await fetchNotifications();
    } catch (err) {
      console.error('[useNotifications] markRead error:', err);
    }
  }, [fetchNotifications]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!enabled || !shopId) return undefined;
    let channel;
    try {
      channel = supabase
        .channel(`notifications-${shopId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `shop_id=eq.${shopId}` }, () => {
          fetchNotifications();
        })
        .subscribe((status, err) => {
          if (err) console.error('[useNotifications] realtime subscribe error:', err);
        });
    } catch (err) {
      console.error('[useNotifications] realtime channel setup error:', err);
    }
    return () => {
      if (channel) supabase.removeChannel(channel).catch(() => {});
    };
  }, [enabled, fetchNotifications, shopId]);

  return { items, unreadCount, loading, refetch: fetchNotifications, markRead };
}

export function useAdminPendingCount({ enabled = true } = {}) {
  const [pendingPayments, setPendingPayments] = useState(0);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    const { count, error } = await supabase
      .from('payment_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    if (!error) setPendingPayments(count || 0);
  }, [enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { pendingPayments, refresh };
}
