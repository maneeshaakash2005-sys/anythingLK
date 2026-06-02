import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import DashboardLayout from '../components/DashboardLayout';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import RetryState from '../components/RetryState';
import { useAppSettings } from '../hooks/useAppSettings';
import { useShop } from '../hooks/useShop';
import { useCustomer } from '../hooks/useCustomers';
import { chartOptions } from '../lib/chart';
import { formatCurrency, formatDate } from '../utils/format';

export default function CustomerDetail() {
  const { id } = useParams();
  const { settings } = useAppSettings();
  const { shop, loading: shopLoading } = useShop();
  const { customer, spendingByMonth, loading: customerLoading, error, refetch } = useCustomer(id, shop?.id);
  const loading = shopLoading || customerLoading;
  const currency = settings?.currency || 'LKR';

  const chartData = {
    labels: spendingByMonth.map((item) => item.label),
    datasets: [
      {
        data: spendingByMonth.map((item) => item.value),
        backgroundColor: '#0d9488',
        borderRadius: 4,
      },
    ],
  };

  return (
    <DashboardLayout
      title="Customer detail"
      actions={(
        <Link className="btn-secondary" to="/dashboard/customers">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </Link>
      )}
    >
      {error ? <RetryState message={error.message} onRetry={refetch} /> : null}
      {loading ? (
        <LoadingSkeleton rows={8} />
      ) : !customer ? (
        <EmptyState title="Customer not found" />
      ) : (
        <div className="space-y-6">
          <section className="card p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">{customer.name}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{customer.email}</p>
              </div>
              <span className="rounded-md bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-100">{customer.status}</span>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Joined</p>
                <p className="font-semibold">{formatDate(customer.join_date)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Orders</p>
                <p className="font-semibold">{customer.orders?.length || 0}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total spent</p>
                <p className="font-semibold">{formatCurrency(customer.total_spent, currency)}</p>
              </div>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="text-base font-semibold">6-month spending</h2>
            <div className="mt-4 h-72">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </section>

          <section className="card overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <h2 className="text-base font-semibold">Order history</h2>
            </div>
            {customer.orders?.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                  <thead>
                    <tr>
                      <th className="table-th">Order</th>
                      <th className="table-th">Date</th>
                      <th className="table-th">Status</th>
                      <th className="table-th">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {customer.orders.map((order) => (
                      <tr key={order.id}>
                        <td className="table-td font-medium">{order.order_number}</td>
                        <td className="table-td">{formatDate(order.order_date)}</td>
                        <td className="table-td">{order.status}</td>
                        <td className="table-td">{formatCurrency(order.total_amount, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-5"><EmptyState title="No orders for this customer" /></div>
            )}
          </section>
        </div>
      )}
    </DashboardLayout>
  );
}
