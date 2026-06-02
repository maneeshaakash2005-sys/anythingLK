import { BarChart3, Boxes, ReceiptText, Users } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import RetryState from '../components/RetryState';
import StatCard from '../components/StatCard';
import { useAppSettings } from '../hooks/useAppSettings';
import { useShop } from '../hooks/useShop';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { chartOptions } from '../lib/chart';
import { formatCurrency, formatDate } from '../utils/format';

export default function Dashboard() {
  const { settings } = useAppSettings();
  const { shop, loading: shopLoading } = useShop();
  const {
    totalRevenue,
    totalOrders,
    totalProducts,
    totalCustomers,
    recentOrders,
    topProducts,
    weeklyRevenue,
    loading: statsLoading,
    error,
    refetch,
  } = useDashboardStats(shop?.id);

  const loading = shopLoading || statsLoading;

  const currency = settings?.currency || 'LKR';
  const revenueChart = {
    labels: weeklyRevenue.map((day) => day.label),
    datasets: [
      {
        data: weeklyRevenue.map((day) => day.value),
        borderColor: '#0d9488',
        backgroundColor: 'rgba(13, 148, 136, 0.15)',
        tension: 0.35,
        fill: true,
      },
    ],
  };

  return (
    <DashboardLayout title="Dashboard">
      {loading ? (
        <LoadingSkeleton rows={8} />
      ) : error ? (
        <RetryState message={error.message} onRetry={refetch} />
      ) : (
        <div className="space-y-6">
          {totalOrders === 0 && totalProducts === 0 && totalCustomers <= 1 ? (
            <div className="rounded-md border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900 dark:border-teal-800 dark:bg-teal-500/10 dark:text-teal-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="font-semibold text-teal-950 dark:text-teal-50">Welcome to OrderBase!</p>
                <p className="text-slate-600 dark:text-slate-300">Get started by creating your first product so you can start receiving orders.</p>
              </div>
              <Link to="/dashboard/products" className="btn-primary py-1.5 px-3 text-xs w-fit whitespace-nowrap">
                Add your product
              </Link>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Total revenue" value={formatCurrency(totalRevenue, currency)} icon={BarChart3} />
            <StatCard title="Total orders" value={totalOrders} icon={ReceiptText} tone="blue" />
            <StatCard title="Products" value={totalProducts} icon={Boxes} tone="amber" />
            <StatCard title="Customers" value={totalCustomers} icon={Users} tone="rose" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <section className="card p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold">Weekly revenue</h2>
              </div>
              <div className="h-72">
                <Line data={revenueChart} options={chartOptions} />
              </div>
            </section>

            <section className="card overflow-hidden">
              <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                <h2 className="text-base font-semibold">Top products</h2>
              </div>
              {topProducts.length === 0 ? (
                <div className="p-5"><EmptyState title="No products yet" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                    <thead>
                      <tr>
                        <th className="table-th">Product</th>
                        <th className="table-th">Sold</th>
                        <th className="table-th">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {topProducts.map((product) => (
                        <tr key={product.id}>
                          <td className="table-td font-medium">{product.name}</td>
                          <td className="table-td">{product.sales_volume}</td>
                          <td className="table-td">{product.stock_quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          <section className="card overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <h2 className="text-base font-semibold">Recent orders</h2>
            </div>
            {recentOrders.length === 0 ? (
              <div className="p-5"><EmptyState title="No orders yet" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                  <thead>
                    <tr>
                      <th className="table-th">Order</th>
                      <th className="table-th">Customer</th>
                      <th className="table-th">Date</th>
                      <th className="table-th">Status</th>
                      <th className="table-th">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {recentOrders.map((order) => (
                      <tr key={order.id}>
                        <td className="table-td font-medium">{order.order_number}</td>
                        <td className="table-td">{order.customer?.name || 'Unknown'}</td>
                        <td className="table-td">{formatDate(order.order_date)}</td>
                        <td className="table-td">{order.status}</td>
                        <td className="table-td">{formatCurrency(order.total_amount, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </DashboardLayout>
  );
}
