import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import CustomerDetailsForm from '../components/order-form/CustomerDetailsForm';
import OrderSummary from '../components/order-form/OrderSummary';
import PaymentPanel from '../components/order-form/PaymentPanel';
import ProductPicker from '../components/order-form/ProductPicker';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import LoadingButton from '../components/LoadingButton';
import RetryState from '../components/RetryState';
import { useCartTotals, usePublicOrders, usePublicShop } from '../hooks/usePublicOrders';

const initialCustomer = {
  name: '',
  phone: '',
  address: '',
  notes: '',
  delivery_date: '',
};

export default function PublicOrderForm() {
  const { shopSlug } = useParams();
  const navigate = useNavigate();
  const { shop, settings, products, bankAccounts, loading, error, refetch } = usePublicShop(shopSlug);
  const { submitOrder, submitting } = usePublicOrders(shopSlug);
  const [cartItems, setCartItems] = useState([]);
  const [customer, setCustomer] = useState(initialCustomer);
  const [paymentMethod, setPaymentMethod] = useState('cash_on_delivery');
  const [paymentSlip, setPaymentSlip] = useState(null);
  const [paymentSlipError, setPaymentSlipError] = useState('');
  const { lines, total } = useCartTotals(products, cartItems);
  const deliveryDateEnabled = settings?.delivery_date_enabled === true;
  const enabledFields = useMemo(() => ({
    ...(settings?.enabled_fields || {}),
    delivery_date: deliveryDateEnabled,
  }), [deliveryDateEnabled, settings?.enabled_fields]);

  const appearance = settings?.custom_schema || {};
  const themeVars = useMemo(() => ({
    '--order-primary': appearance.buttonColor || settings?.primary_color || shop?.primary_color || '#0d9488',
    '--order-accent': settings?.accent_color || shop?.accent_color || '#2563eb',
  }), [appearance.buttonColor, settings?.accent_color, settings?.primary_color, shop?.accent_color, shop?.primary_color]);
  const titleClass = appearance.titleStyle === 'large-bold' ? 'text-3xl font-bold tracking-tight' : 'text-2xl font-semibold';
  const welcomeText = appearance.customMessage || settings?.welcome_message;
  const bannerText = appearance.bannerText;

  useEffect(() => {
    if (settings?.cash_on_delivery_enabled === false && settings?.bank_transfer_enabled !== false) {
      setPaymentMethod('bank_transfer');
    }
  }, [settings?.bank_transfer_enabled, settings?.cash_on_delivery_enabled]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    if (cartItems.length === 0) {
      toast.error('Select at least one product.');
      return;
    }
    if (paymentSlipError) {
      toast.error(paymentSlipError);
      return;
    }
    if (paymentMethod === 'bank_transfer' && settings?.payment_slip_required && !paymentSlip) {
      toast.error('Upload payment slip.');
      return;
    }

    try {
      const customerPayload = { ...customer };
      if (deliveryDateEnabled) {
        if (customerPayload.delivery_date) {
          const selectedDate = new Date(`${customerPayload.delivery_date}T00:00:00`);
          const tomorrow = new Date();
          tomorrow.setHours(0, 0, 0, 0);
          tomorrow.setDate(tomorrow.getDate() + 1);
          if (selectedDate < tomorrow) {
            throw new Error('Delivery date must be a future date.');
          }
        }
      } else {
        delete customerPayload.delivery_date;
      }

      const order = await submitOrder({
        customer: customerPayload,
        items: cartItems,
        paymentMethod,
        paymentSlip,
      });
      toast.success('Order submitted');
      navigate(`/order-success/${order.id}`, { replace: true, state: { shop, settings, order } });
    } catch (caughtError) {
      toast.error(caughtError.message);
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-slate-50 p-6 dark:bg-slate-950"><LoadingSkeleton rows={8} /></div>;
  }

  if (error) {
    return <div className="min-h-screen bg-slate-50 p-6 dark:bg-slate-950"><RetryState message={error.message} onRetry={refetch} /></div>;
  }

  if (!shop) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 dark:bg-slate-950">
        <EmptyState
          title="Shop not found"
          message={`We could not resolve "${shopSlug}". Verify your slug in Shop Settings and regenerate the public link.`}
        />
      </div>
    );
  }
  if (shop.service_locked || shop.subscription_status === 'locked') {
    return (
      <div className="min-h-screen bg-slate-50 p-6 dark:bg-slate-950">
        <EmptyState
          title="Subscription expired"
          message="This shop is currently unavailable because the subscription has expired. Please contact the shop owner."
        />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100"
      style={{
        ...themeVars,
        backgroundImage: appearance.backgroundImageUrl ? `url(${appearance.backgroundImageUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <main className="mx-auto max-w-5xl">
        {appearance.heroBannerUrl ? (
          <div className="relative mb-4 overflow-hidden rounded-lg">
            <img src={appearance.heroBannerUrl} alt="" className="h-40 w-full object-cover" />
            {appearance.heroOverlay !== false ? <div className="absolute inset-0 bg-slate-950/40" /> : null}
            {bannerText ? <p className="absolute inset-x-0 bottom-4 px-4 text-center text-lg font-semibold text-white">{bannerText}</p> : null}
          </div>
        ) : null}
        <header className="rounded-lg bg-white p-5 shadow-sm dark:bg-slate-900">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              {shop.logo_url ? <img src={shop.logo_url} alt="" className="h-14 w-14 rounded-md object-cover" /> : null}
              <div>
                <p className={`text-slate-500 dark:text-slate-400 ${appearance.titleStyle === 'large-bold' ? 'text-base font-medium' : 'text-sm'}`}>{shop.shop_name}</p>
                <h1 className={titleClass}>{settings?.form_title || 'Place your order'}</h1>
              </div>
            </div>
            <span className="rounded-md px-3 py-1 text-sm font-medium text-white" style={{ background: 'var(--order-primary)' }}>
              Public order form
            </span>
          </div>
          {bannerText && !appearance.heroBannerUrl ? <p className="mt-3 text-sm font-medium text-brand-700 dark:text-brand-100">{bannerText}</p> : null}
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">{welcomeText}</p>
        </header>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <section className="card p-5">
              <h2 className="mb-4 text-base font-semibold">Products</h2>
              {products.length === 0 ? (
                <EmptyState title="No products available" message="This shop has not published products yet." />
              ) : (
                <ProductPicker products={products} cartItems={cartItems} onChange={setCartItems} />
              )}
            </section>

            <section className="card p-5">
              <h2 className="mb-4 text-base font-semibold">Customer details</h2>
              <CustomerDetailsForm value={customer} onChange={setCustomer} enabledFields={enabledFields} />
            </section>

            <section className="card p-5">
              <h2 className="mb-4 text-base font-semibold">Payment</h2>
              <PaymentPanel
                settings={settings}
                bankAccounts={bankAccounts}
                paymentMethod={paymentMethod}
                onPaymentMethodChange={setPaymentMethod}
                paymentSlip={paymentSlip}
                onPaymentSlipChange={(file, errorMessage) => {
                  setPaymentSlip(file);
                  setPaymentSlipError(errorMessage || '');
                  if (errorMessage) {
                    toast.error(errorMessage);
                  }
                }}
                total={total}
              />
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <OrderSummary lines={lines} total={total} />
            <LoadingButton className="btn-primary w-full py-3" type="submit" disabled={products.length === 0} loading={submitting} loadingText="Submitting...">
              Submit order
            </LoadingButton>
          </aside>
        </form>
      </main>
    </div>
  );
}
