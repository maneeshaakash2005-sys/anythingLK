import { Link, useLocation, useParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { getRuleBasedAutoReply } from '../lib/features';
import { formatCurrency } from '../utils/format';

export default function OrderSuccess() {
  const { id } = useParams();
  const { state } = useLocation();
  const shop = state?.shop;
  const settings = state?.settings;
  const order = state?.order;
  const message = order && shop
    ? getRuleBasedAutoReply({ shopName: shop.shop_name, orderNumber: order.order_number, deliveryDate: order.delivery_date })
    : settings?.thank_you_message || 'Your order has been submitted successfully.';

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
      <section className="card w-full max-w-lg p-6 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-brand-600" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-semibold text-slate-900 dark:text-slate-100">Order received</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{message}</p>
        <div className="mt-5 rounded-md bg-slate-50 p-4 text-left text-sm dark:bg-slate-800">
          <p><span className="font-medium">Order ID:</span> {order?.order_number || id}</p>
          {order?.total_amount ? <p><span className="font-medium">Total:</span> {formatCurrency(order.total_amount)}</p> : null}
          {order?.payment_status ? <p><span className="font-medium">Payment:</span> {order.payment_status}</p> : null}
        </div>
        {shop?.slug ? (
          <Link className="btn-primary mt-6" to={`/shop/${shop.slug}`}>Place another order</Link>
        ) : (
          <Link className="btn-primary mt-6" to="/">Back home</Link>
        )}
      </section>
    </div>
  );
}
