import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useAppSettings } from '../hooks/useAppSettings';
import { useShop } from '../hooks/useShop';

export default function RealtimeToasts() {
  const { session, isAdmin } = useAuth();
  const { settings } = useAppSettings({ enabled: Boolean(session) });
  const { shop } = useShop({ enabled: Boolean(session) });
  const shopId = shop?.id;
  const isPro = shop?.subscription_plan === 'pro';

  useEffect(() => {
    if (!session || !shopId || !isPro) return undefined;

    let orderChannel;
    let stockChannel;
    let notificationChannel;

    try {
      orderChannel = supabase
        .channel(`orderbase-new-orders-${shopId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `shop_id=eq.${shopId}` }, (payload) => {
          toast.success(`New order ${payload.new.order_number} received`, { duration: 5000 });
          try {
            if (typeof window !== 'undefined' && window.Notification?.permission === 'granted') {
              new window.Notification('New order', { body: `Order ${payload.new.order_number} received` });
            }
          } catch {
            // ignore notification API errors
          }
          if (payload.new.payment_status === 'submitted') {
            toast.success(`Payment submitted for ${payload.new.order_number}`);
          }
        })
        .subscribe((status, err) => {
          if (err) console.error('[RealtimeToasts] orders channel error:', err);
        });
    } catch (err) {
      console.error('[RealtimeToasts] failed to create orders channel:', err);
    }

    try {
      stockChannel = supabase
        .channel(`orderbase-low-stock-${shopId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'products', filter: `shop_id=eq.${shopId}` }, (payload) => {
          const threshold = settings?.low_stock_threshold ?? 10;
          if (payload.new.stock_quantity <= threshold && payload.old.stock_quantity > threshold) {
            toast.error(`${payload.new.name} is low on stock`);
          }
        })
        .subscribe((status, err) => {
          if (err) console.error('[RealtimeToasts] stock channel error:', err);
        });
    } catch (err) {
      console.error('[RealtimeToasts] failed to create stock channel:', err);
    }

    try {
      notificationChannel = supabase
        .channel(`orderbase-notifications-${shopId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `shop_id=eq.${shopId}` }, (payload) => {
          toast(payload.new.message || payload.new.title);
        })
        .subscribe((status, err) => {
          if (err) console.error('[RealtimeToasts] notifications channel error:', err);
        });
    } catch (err) {
      console.error('[RealtimeToasts] failed to create notifications channel:', err);
    }

    return () => {
      if (orderChannel) supabase.removeChannel(orderChannel).catch(() => {});
      if (stockChannel) supabase.removeChannel(stockChannel).catch(() => {});
      if (notificationChannel) supabase.removeChannel(notificationChannel).catch(() => {});
    };
  }, [isPro, session, settings?.low_stock_threshold, shopId]);

  useEffect(() => {
    if (!session || !isAdmin) return undefined;

    let adminChannel;
    try {
      adminChannel = supabase
        .channel('orderbase-admin-payments')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'payment_submissions' }, (payload) => {
          if (payload.new.status === 'pending') {
            toast('New subscription activation request pending approval.', { icon: '🔔', duration: 6000 });
          }
        })
        .subscribe((status, err) => {
          if (err) console.error('[RealtimeToasts] admin channel error:', err);
        });
    } catch (err) {
      console.error('[RealtimeToasts] failed to create admin channel:', err);
    }

    return () => {
      if (adminChannel) supabase.removeChannel(adminChannel).catch(() => {});
    };
  }, [isAdmin, session]);

  return null;
}
