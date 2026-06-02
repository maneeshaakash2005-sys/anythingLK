import { Download } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import LoadingButton from '../components/LoadingButton';
import { Bar, Line } from 'react-chartjs-2';
import DashboardLayout from '../components/DashboardLayout';
import LoadingSkeleton from '../components/LoadingSkeleton';
import RetryState from '../components/RetryState';
import StatCard from '../components/StatCard';
import { useAppSettings } from '../hooks/useAppSettings';
import { useShop } from '../hooks/useShop';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { chartOptions } from '../lib/chart';
import { formatCurrency } from '../utils/format';

const REVENUE_STATUSES = new Set(['paid', 'confirmed', 'preparing', 'out for delivery', 'delivered', 'completed']);

function isRevenueOrder(order) {
  return REVENUE_STATUSES.has(String(order?.status || '').toLowerCase());
}

export default function DashboardReports() {
  const { settings } = useAppSettings();
  const { shop, loading: shopLoading } = useShop();
  const { totalCustomers, topProducts, orders, loading: statsLoading, error, refetch } = useDashboardStats(shop?.id);
  const loading = shopLoading || statsLoading;
  const [dateRange, setDateRange] = useState('30');
  const [exporting, setExporting] = useState(false);
  const currency = settings?.currency || 'LKR';

  const rangeDays = Number(dateRange);
  const filteredOrders = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (rangeDays - 1));
    return (orders || []).filter((order) => {
      const orderDate = new Date(order.order_date || order.created_at);
      return orderDate >= start;
    });
  }, [dateRange, orders, rangeDays]);

  const totalOrders = filteredOrders.length;
  const revenueOrders = filteredOrders.filter(isRevenueOrder);
  const totalRevenue = revenueOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);

  const revenueData = useMemo(() => {
    const buckets = Array.from({ length: rangeDays }).map((_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (rangeDays - 1 - index));
      return {
        key: date.toISOString().slice(0, 10),
        label: date.toLocaleDateString('en-LK', { month: 'short', day: 'numeric' }),
        value: 0,
      };
    });
    const map = new Map(buckets.map((bucket) => [bucket.key, bucket]));
    filteredOrders.forEach((order) => {
      if (!isRevenueOrder(order)) return;
      const key = new Date(order.order_date || order.created_at).toISOString().slice(0, 10);
      const bucket = map.get(key);
      if (bucket) bucket.value += Number(order.total_amount || 0);
    });
    return {
      labels: buckets.map((item) => item.label),
      datasets: [{ data: buckets.map((item) => item.value), borderColor: '#0d9488', backgroundColor: 'rgba(13,148,136,0.15)', tension: 0.35, fill: true }],
    };
  }, [filteredOrders, rangeDays]);

  const productData = {
    labels: topProducts.slice(0, 10).map((product) => product.name),
    datasets: [{ data: topProducts.slice(0, 10).map((product) => product.sales_volume), backgroundColor: '#2563eb', borderRadius: 4 }],
  };

  const orderStatusData = useMemo(() => {
    const buckets = ['Paid', 'Pending', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled', 'Failed'];
    const counts = new Map(buckets.map((statusName) => [statusName, 0]));
    filteredOrders.forEach((order) => {
      const statusName = buckets.find((item) => item.toLowerCase() === String(order.status || '').toLowerCase()) || order.status || 'Unknown';
      counts.set(statusName, (counts.get(statusName) || 0) + 1);
    });
    const visible = Array.from(counts.entries()).filter(([, count]) => count > 0);
    return {
      labels: visible.map(([label]) => label),
      datasets: [{ data: visible.map(([, count]) => count), backgroundColor: '#0d9488', borderRadius: 4 }],
    };
  }, [filteredOrders]);

  const averageOrderValue = useMemo(() => revenueOrders.length ? totalRevenue / revenueOrders.length : 0, [revenueOrders.length, totalRevenue]);
  const conversionRate = useMemo(() => totalOrders ? Math.round((revenueOrders.length / totalOrders) * 100) : 0, [revenueOrders.length, totalOrders]);

  async function exportCsv() {
    if (exporting) return;
    setExporting(true);
    try {
      const rows = [
        ['Product', 'Category', 'Sales Volume', 'Stock'],
        ...topProducts.slice(0, 10).map((product) => [product.name, product.category, product.sales_volume, product.stock_quantity]),
      ];
      const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'orderbase-report.csv';
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Report exported');
    } catch (caughtError) {
      toast.error(caughtError.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  }

  return (
    <DashboardLayout
      title="Reports"
      actions={(
        <LoadingButton className="btn-primary" onClick={exportCsv} loading={exporting} loadingText="Exporting..." icon={Download}>
          Export CSV
        </LoadingButton>
      )}
    >
      <div className="space-y-6">
        <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-medium">Date range</span>
          <select className="input sm:w-48" value={dateRange} onChange={(event) => setDateRange(event.target.value)}>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>

        {error ? <RetryState message={error.message} onRetry={refetch} /> : null}
        {loading ? (
          <LoadingSkeleton rows={8} />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard title="Revenue" value={formatCurrency(totalRevenue, currency)} />
              <StatCard title="Orders" value={totalOrders} />
              <StatCard title="Customers" value={totalCustomers} />
              <StatCard title="Avg. order value" value={formatCurrency(averageOrderValue, currency)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard title="Revenue orders" value={revenueOrders.length} />
              <StatCard title="Conversion" value={`${conversionRate}%`} />
              <StatCard title="Pending orders" value={filteredOrders.filter((order) => String(order.status || '').toLowerCase() === 'pending').length} />
              <StatCard title="Cancelled orders" value={filteredOrders.filter((order) => String(order.status || '').toLowerCase() === 'cancelled').length} />
            </div>
            <div className="grid gap-6 xl:grid-cols-2">
              <section className="card p-5">
                <h2 className="text-base font-semibold">Revenue comparison</h2>
                <div className="mt-4 h-72">
                  <Line data={revenueData} options={chartOptions} />
                </div>
              </section>
              <section className="card p-5">
                <h2 className="text-base font-semibold">Top 10 products</h2>
                <div className="mt-4 h-72">
                  <Bar data={productData} options={{ ...chartOptions, indexAxis: 'y' }} />
                </div>
              </section>
              <section className="card p-5">
                <h2 className="text-base font-semibold">Orders by status</h2>
                <div className="mt-4 h-72">
                  <Bar data={orderStatusData} options={chartOptions} />
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
