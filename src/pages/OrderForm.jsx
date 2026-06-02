import { Minus, Plus, Save, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/DashboardLayout';
import LoadingButton from '../components/LoadingButton';
import LoadingSkeleton from '../components/LoadingSkeleton';
import RetryState from '../components/RetryState';
import { useAppSettings } from '../hooks/useAppSettings';
import { useShop } from '../hooks/useShop';
import { useCustomers } from '../hooks/useCustomers';
import { useOrders } from '../hooks/useOrders';
import { useProducts } from '../hooks/useProducts';
import { formatCurrency } from '../utils/format';

export default function OrderForm() {
  const navigate = useNavigate();
  const { settings } = useAppSettings();
  const { shop, loading: shopLoading } = useShop();
  const { customers, loading: customersLoading, error: customersError, refetch: refetchCustomers } = useCustomers(shop?.id);
  const { products, loading: productsLoading, error: productsError, refetch: refetchProducts } = useProducts(shop?.id);
  const { createOrder } = useOrders({ shopId: shop?.id });
  const [customerId, setCustomerId] = useState('');
  const [status, setStatus] = useState('Pending');
  const [items, setItems] = useState([{ product_id: '', quantity: 1 }]);
  const [saving, setSaving] = useState(false);

  const productMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const total = items.reduce((sum, item) => {
    const product = productMap.get(item.product_id);
    return sum + Number(product?.price || 0) * Number(item.quantity || 0);
  }, 0);

  function updateItem(index, patch) {
    setItems((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  function validate() {
    if (!customerId) return 'Select a customer.';
    for (const item of items) {
      const product = productMap.get(item.product_id);
      if (!product) return 'Select a product for every line item.';
      if (Number(item.quantity) < 1) return 'Quantity must be at least 1.';
      if (Number(item.quantity) > Number(product.stock_quantity)) return `${product.name} only has ${product.stock_quantity} in stock.`;
    }
    return null;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;
    const validationError = validate();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSaving(true);
    try {
      await createOrder({ customerId, status, items });
      toast.success('Order created');
      navigate('/dashboard/orders');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  const loading = shopLoading || customersLoading || productsLoading;
  const error = customersError || productsError;

  return (
    <DashboardLayout title="New order">
      {error ? <RetryState message={error.message} onRetry={() => { refetchCustomers(); refetchProducts(); }} /> : null}
      {loading ? (
        <LoadingSkeleton rows={8} />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="card grid gap-4 p-5 md:grid-cols-2">
            <label className="block">
              <span className="label">Customer</span>
              <select className="input mt-1" required value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
                <option value="">Select customer</option>
                {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="label">Status</span>
              <select className="input mt-1" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option>Pending</option>
                <option>Paid</option>
                <option>Failed</option>
              </select>
            </label>
          </section>

          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Line items</h2>
              <button type="button" className="btn-secondary" onClick={() => setItems([...items, { product_id: '', quantity: 1 }])}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add item
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {items.map((item, index) => {
                const product = productMap.get(item.product_id);
                const lineTotal = Number(product?.price || 0) * Number(item.quantity || 0);
                const overStock = product && Number(item.quantity) > Number(product.stock_quantity);
                return (
                  <div key={`${item.product_id}-${index}`} className="grid gap-3 rounded-md border border-slate-200 p-3 dark:border-slate-800 md:grid-cols-[1fr_150px_120px_auto]">
                    <select className="input" value={item.product_id} onChange={(event) => updateItem(index, { product_id: event.target.value })}>
                      <option value="">Select product</option>
                      {products.map((productOption) => (
                        <option key={productOption.id} value={productOption.id}>{productOption.name} ({productOption.stock_quantity} left)</option>
                      ))}
                    </select>
                    <div className="flex items-center">
                      <button type="button" className="btn-secondary rounded-r-none px-2" onClick={() => updateItem(index, { quantity: Math.max(1, Number(item.quantity) - 1) })}>
                        <Minus className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <input className={`input rounded-none text-center ${overStock ? 'border-rose-500' : ''}`} type="number" min="1" value={item.quantity} onChange={(event) => updateItem(index, { quantity: event.target.value })} />
                      <button type="button" className="btn-secondary rounded-l-none px-2" onClick={() => updateItem(index, { quantity: Number(item.quantity) + 1 })}>
                        <Plus className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                    <div className="flex items-center text-sm font-medium">{formatCurrency(lineTotal, settings?.currency || 'LKR')}</div>
                    <button type="button" className="rounded-md p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10" onClick={() => setItems(items.filter((_, itemIndex) => itemIndex !== index))} aria-label="Remove item" disabled={items.length === 1}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-800">
              <span className="text-sm text-slate-500 dark:text-slate-400">Order total</span>
              <strong className="text-xl">{formatCurrency(total, settings?.currency || 'LKR')}</strong>
            </div>
          </section>

          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => navigate('/dashboard/orders')}>Cancel</button>
            <LoadingButton type="submit" className="btn-primary" loading={saving} loadingText="Saving..." icon={Save}>
              Create order
            </LoadingButton>
          </div>
        </form>
      )}
    </DashboardLayout>
  );
}
