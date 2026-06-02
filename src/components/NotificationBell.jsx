import { Bell } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';

export default function NotificationBell({ shopId, enabled = true, onUnreadCount }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const { items, unreadCount, markRead, refetch } = useNotifications(shopId, { enabled });

  // Report unread count changes to parent without creating a second subscription
  useEffect(() => {
    if (onUnreadCount) onUnreadCount(unreadCount);
  }, [unreadCount, onUnreadCount]);

  useEffect(() => {
    if (!open) return undefined;
    function handlePointerDown(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!enabled) return undefined;
    const interval = window.setInterval(() => {
      refetch();
    }, 30000);
    return () => window.clearInterval(interval);
  }, [enabled, refetch]);

  if (!enabled) return null;

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        className="relative rounded-md border border-slate-300 p-2 text-slate-600 dark:border-slate-700 dark:text-slate-200"
        onClick={() => setOpen((current) => !current)}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <p className="text-sm font-semibold">Notifications</p>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-500">No notifications yet.</p>
            ) : items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`block w-full border-b border-slate-100 px-4 py-3 text-left text-sm hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 ${item.is_read ? 'opacity-70' : ''}`}
                onClick={async () => {
                  if (!item.is_read) await markRead(item.id);
                  setOpen(false);
                }}
              >
                <p className="font-medium">{item.title || 'Notification'}</p>
                <p className="mt-1 text-slate-500 dark:text-slate-400">{item.message}</p>
              </button>
            ))}
          </div>
          <div className="border-t border-slate-200 px-4 py-2 dark:border-slate-800">
            <Link className="text-sm font-medium text-brand-700 dark:text-brand-100" to="/dashboard/orders" onClick={() => setOpen(false)}>
              View orders
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
