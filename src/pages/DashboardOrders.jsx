import { ChevronLeft, ChevronRight, Eye, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/ConfirmDialog';
import DashboardLayout from '../components/DashboardLayout';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ImagePreviewModal from '../components/ImagePreviewModal';
import Modal from '../components/Modal';
import RetryState from '../components/RetryState';
import { useAppSettings } from '../hooks/useAppSettings';
import { useShop } from '../hooks/useShop';
import { useOrders } from '../hooks/useOrders';
import { formatCurrency, formatDate } from '../utils/format';

const statuses = ['All', 'Pending', 'Paid', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled', 'Failed'];

export default function DashboardOrders() {
  const { settings } = useAppSettings();
  const { shop, loading: shopLoading } = useShop();
  const {
    orders,
    page,
    totalPages,
    status,
    search,
    loading: ordersLoading,
    error,
    setPage,
    setStatus,
    setSearch,
    refetch,
    updateStatus,
    deleteOrder,
  } = useOrders({ shopId: shop?.id });
  const loading = shopLoading || ordersLoading;
  const [sortKey, setSortKey] = useState('order_date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [processingOrderId, setProcessingOrderId] = useState(null);
  const [pendingDeleteOrder, setPendingDeleteOrder] = useState(null);
  const [slipPreview, setSlipPreview] = useState(null);

  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      const aValue = sortKey === 'customer' ? a.customer?.name || '' : a[sortKey] || '';
      const bValue = sortKey === 'customer' ? b.customer?.name || '' : b[sortKey] || '';
      const modifier = sortDirection === 'asc' ? 1 : -1;
      return String(aValue).localeCompare(String(bValue), undefined, { numeric: true }) * modifier;
    });
  }, [orders, sortDirection, sortKey]);

  function handleSort(nextKey) {
    if (nextKey === sortKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(nextKey);
      setSortDirection('asc');
    }
  }

  async function handleStatusChange(orderId, nextStatus) {
    if (processingOrderId) return;
    setProcessingOrderId(orderId);
    try {
      await updateStatus(orderId, nextStatus);
      toast.success('Order status updated');
    } catch (caughtError) {
      toast.error(caughtError.message);
    } finally {
      setProcessingOrderId(null);
    }
  }

  async function handleDelete() {
    const orderId = pendingDeleteOrder?.id;
    if (!orderId) return;
    if (processingOrderId) return;
    setProcessingOrderId(orderId);
    try {
      await deleteOrder(orderId);
      toast.success('Order deleted');
      setPendingDeleteOrder(null);
    } catch (caughtError) {
      toast.error(caughtError.message);
    } finally {
      setProcessingOrderId(null);
    }
  }

  return (
    <DashboardLayout
      title="Orders"
      actions={(
        <Link className="btn-primary" to="/dashboard/orders/new">
          <Plus className="h-4 w-4" aria-hidden="true" />
          New order
        </Link>
      )}
    >
      <div className="space-y-4">
        <div className="card grid gap-3 p-4 md:grid-cols-[1fr_auto]">
          <input className="input" placeholder="Search order number" value={search} onChange={(event) => setSearch(event.target.value)} />
          <div className="flex flex-wrap gap-2">
            {statuses.map((item) => (
              <button
                key={item}
                type="button"
                className={item === status ? 'btn-primary' : 'btn-secondary'}
                onClick={() => setStatus(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {error ? <RetryState message={error.message} onRetry={refetch} /> : null}
        {loading ? (
          <LoadingSkeleton rows={8} />
        ) : sortedOrders.length === 0 ? (
          <EmptyState title="No orders found" message="Create a new order or adjust your filters." />
        ) : (
          <section className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                <thead>
                  <tr>
                    <th className="table-th"><button onClick={() => handleSort('order_number')}>Order</button></th>
                    <th className="table-th"><button onClick={() => handleSort('customer')}>Customer</button></th>
                    <th className="table-th"><button onClick={() => handleSort('order_date')}>Date</button></th>
                    <th className="table-th">Status</th>
                    <th className="table-th"><button onClick={() => handleSort('total_amount')}>Total</button></th>
                    <th className="table-th">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {sortedOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="table-td font-medium">{order.order_number}</td>
                      <td className="table-td">{order.customer?.name || 'Unknown'}</td>
                      <td className="table-td">{formatDate(order.order_date)}</td>
                      <td className="table-td">
                        <select className="input w-44" value={order.status} disabled={processingOrderId === order.id} onChange={(event) => handleStatusChange(order.id, event.target.value)}>
                          <option>Pending</option>
                          <option>Paid</option>
                          <option>Confirmed</option>
                          <option>Preparing</option>
                          <option>Out for Delivery</option>
                          <option>Delivered</option>
                          <option>Cancelled</option>
                          <option>Failed</option>
                        </select>
                      </td>
                      <td className="table-td">{formatCurrency(order.total_amount, settings?.currency || 'LKR')}</td>
                      <td className="table-td">
                        <div className="flex gap-2">
                        <button className="rounded-md p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800" onClick={() => setSelectedOrder(order)} aria-label="View order">
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button className="rounded-md p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:hover:bg-rose-500/10" disabled={processingOrderId === order.id} onClick={() => setPendingDeleteOrder(order)} aria-label="Delete order">
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 dark:border-slate-800">
              <p className="text-sm text-slate-500 dark:text-slate-400">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <button className="btn-secondary" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </section>
        )}
      </div>

      <Modal title="Order details" open={Boolean(selectedOrder)} onClose={() => setSelectedOrder(null)}>
        {selectedOrder ? <OrderDetails order={selectedOrder} currency={settings?.currency || 'LKR'} onViewSlip={setSlipPreview} /> : null}
      </Modal>

      <ImagePreviewModal
        title="Payment slip"
        open={Boolean(slipPreview)}
        onClose={() => setSlipPreview(null)}
        src={slipPreview}
        bucket="payment-slips"
      />

      <ConfirmDialog
        open={Boolean(pendingDeleteOrder)}
        title="Delete order"
        message={`Delete order "${pendingDeleteOrder?.order_number}"? This action cannot be undone.`}
        confirmText="Delete order"
        loading={Boolean(processingOrderId)}
        onCancel={() => setPendingDeleteOrder(null)}
        onConfirm={handleDelete}
      />
    </DashboardLayout>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-100">{value || '-'}</p>
    </div>
  );
}

function OrderDetails({ order, currency, onViewSlip }) {
  const items = order.order_items || [];
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Detail label="Order number" value={order.order_number} />
        <Detail label="Status" value={order.status} />
        <Detail label="Customer name" value={order.customer_name || order.customer?.name} />
        <Detail label="Contact number" value={order.customer_phone || order.customer?.phone} />
        <Detail label="Email" value={order.customer_email || order.customer?.email} />
        <Detail label="Payment method" value={order.payment_method?.replace(/_/g, ' ')} />
        <Detail label="Payment status" value={order.payment_status} />
        <Detail label="Cash on delivery" value={order.payment_method === 'cash_on_delivery' ? 'Yes' : 'No'} />
        <Detail label="Delivery date" value={order.delivery_date ? formatDate(order.delivery_date) : '-'} />
        <Detail label="Order total" value={formatCurrency(order.total_amount, currency)} />
        <Detail label="Transaction ID" value={order.transaction_id || order.payment_reference || '-'} />
        <Detail label="Created" value={formatDate(order.created_at || order.order_date)} />
        <Detail label="Last updated" value={order.updated_at ? formatDate(order.updated_at) : '-'} />
      </div>

      <div>
        <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Delivery address</p>
        <p className="mt-1 rounded-md bg-slate-50 p-3 text-sm dark:bg-slate-800">{order.delivery_address || order.customer?.address || '-'}</p>
      </div>

      <div>
        <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Order notes</p>
        <p className="mt-1 rounded-md bg-slate-50 p-3 text-sm dark:bg-slate-800">{order.notes || '-'}</p>
      </div>

      {order.payment_slip_url ? (
        <div>
          <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Payment slip</p>
          <button type="button" className="btn-secondary mt-2" onClick={() => onViewSlip(order.payment_slip_url)}>
            View bank slip
          </button>
        </div>
      ) : null}

      <div>
        <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Ordered items</p>
        <div className="mt-2 space-y-2">
          {items.length === 0 ? <p className="text-sm text-slate-500">No item rows found.</p> : items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-md border border-slate-200 p-3 dark:border-slate-800">
              {item.product?.image_url ? <img src={item.product.image_url} alt="" className="h-12 w-12 rounded object-cover" /> : <div className="h-12 w-12 rounded bg-slate-100 dark:bg-slate-800" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.product?.name || 'Deleted product'}</p>
                <p className="text-xs text-slate-500">Qty {item.quantity} x {formatCurrency(item.price_at_time || item.product?.price || 0, currency)}</p>
              </div>
              <p className="text-sm font-semibold">{formatCurrency(Number(item.quantity || 0) * Number(item.price_at_time || item.product?.price || 0), currency)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
