import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/DashboardLayout';
import ImagePreviewModal from '../components/ImagePreviewModal';
import LoadingButton from '../components/LoadingButton';
import LoadingSkeleton from '../components/LoadingSkeleton';
import RetryState from '../components/RetryState';
import { useAdminBilling } from '../hooks/useAdminBilling';
import { useAppSettings } from '../hooks/useAppSettings';
import { formatDate } from '../utils/format';

export default function AdminPanel() {
  const { shops, payments, plans, metrics, loading, error, refetch, approvePayment, rejectPayment, setShopSubscriptionOverride, grantAdminByEmail, revokeAdminByEmail, updatePlan } = useAdminBilling();
  const { settings: appSettings, updateSettings } = useAppSettings();
  const [processingId, setProcessingId] = useState(null);
  const [noteMap, setNoteMap] = useState({});
  const [adminEmail, setAdminEmail] = useState('');
  const [adminRole, setAdminRole] = useState('admin');
  const [adminProcessing, setAdminProcessing] = useState('');
  const [paymentForm, setPaymentForm] = useState(null);
  const [planForms, setPlanForms] = useState({});
  const [shopSearch, setShopSearch] = useState('');
  const [shopFilter, setShopFilter] = useState('All');
  const [proofPreview, setProofPreview] = useState(null);

  useEffect(() => {
    if (appSettings?.payment_instructions) {
      setPaymentForm(appSettings.payment_instructions);
    }
  }, [appSettings?.payment_instructions]);

  useEffect(() => {
    if (plans.length) {
      setPlanForms(Object.fromEntries(plans.map((plan) => [plan.id, {
        name: plan.name,
        monthly_price_lkr: plan.monthly_price_lkr,
        is_active: plan.is_active,
      }])));
    }
  }, [plans]);

  async function handleApprove(id) {
    setProcessingId(id);
    try {
      await approvePayment(id, noteMap[id] || null);
      toast.success('Payment approved');
    } catch (caughtError) {
      toast.error(caughtError.message);
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(id) {
    const reason = noteMap[id] || '';
    if (!reason.trim()) {
      toast.error('Add rejection reason in notes field.');
      return;
    }
    setProcessingId(id);
    try {
      await rejectPayment(id, reason);
      toast.success('Payment rejected');
    } catch (caughtError) {
      toast.error(caughtError.message);
    } finally {
      setProcessingId(null);
    }
  }

  async function handleOverride(shopId, status, lock) {
    if (processingId) return;
    setProcessingId(shopId);
    try {
      await setShopSubscriptionOverride({
        shopId,
        planId: status === 'active' ? 'pro' : 'normal',
        status,
        lock,
        note: lock ? 'Locked from admin panel' : null,
      });
      toast.success('Shop subscription updated');
    } catch (caughtError) {
      toast.error(caughtError.message);
    } finally {
      setProcessingId(null);
    }
  }

  async function handleGrantAdmin() {
    if (!adminEmail) {
      toast.error('Enter user email');
      return;
    }
    if (adminProcessing) return;
    setAdminProcessing('grant');
    try {
      await grantAdminByEmail(adminEmail, adminRole);
      toast.success('Admin role granted');
      setAdminEmail('');
    } catch (caughtError) {
      toast.error(caughtError.message);
    } finally {
      setAdminProcessing('');
    }
  }

  async function handleSavePaymentInstructions(event) {
    event.preventDefault();
    if (adminProcessing) return;
    setAdminProcessing('payment');
    try {
      await updateSettings({ payment_instructions: paymentForm });
      toast.success('Payment instructions saved');
    } catch (caughtError) {
      toast.error(caughtError.message);
    } finally {
      setAdminProcessing('');
    }
  }

  async function handleRevokeAdmin() {
    if (!adminEmail) {
      toast.error('Enter user email');
      return;
    }
    if (adminProcessing) return;
    setAdminProcessing('revoke');
    try {
      await revokeAdminByEmail(adminEmail);
      toast.success('Admin role revoked');
      setAdminEmail('');
    } catch (caughtError) {
      toast.error(caughtError.message);
    } finally {
      setAdminProcessing('');
    }
  }

  const filteredShops = useMemo(() => {
    const term = shopSearch.trim().toLowerCase();
    return shops.filter((shop) => {
      const sub = metrics.subByShop.get(shop.id);
      const expiry = sub?.current_period_end || sub?.trial_ends_at || shop.trial_ends_at;
      const days = expiry ? Math.ceil((new Date(expiry).getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : null;
      const plan = (shop.subscription_plan || sub?.plan_id || 'normal').toLowerCase();
      const status = shop.subscription_status || sub?.status || '';
      const matchesSearch = !term || [shop.shop_name, shop.slug, shop.email].some((v) => String(v || '').toLowerCase().includes(term));
      if (!matchesSearch) return false;
      if (shopFilter === 'All') return true;
      if (shopFilter === 'Basic') return plan === 'normal' || plan === 'free';
      if (shopFilter === 'Pro') return plan === 'pro';
      if (shopFilter === 'Expired') return shop.service_locked || status === 'locked' || status === 'past_due';
      if (shopFilter === 'Expiring Soon') return days !== null && days >= 0 && days <= 3 && !shop.service_locked;
      if (shopFilter === 'Unpaid') return status === 'pending_payment';
      return true;
    });
  }, [metrics.subByShop, shopFilter, shopSearch, shops]);

  function shopRowTone(shop) {
    const sub = metrics.subByShop.get(shop.id);
    const expiry = sub?.current_period_end || sub?.trial_ends_at || shop.trial_ends_at;
    const days = expiry ? Math.ceil((new Date(expiry).getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : null;
    if (shop.service_locked || shop.subscription_status === 'locked') return 'bg-rose-50/80 dark:bg-rose-500/10';
    if (days !== null && days <= 1) return 'bg-rose-50/60 dark:bg-rose-500/5';
    if (days !== null && days <= 3) return 'bg-amber-50/80 dark:bg-amber-500/10';
    if (shop.subscription_status === 'pending_payment') return 'bg-amber-50/50';
    return '';
  }

  async function handleSavePlan(planId) {
    if (adminProcessing) return;
    setAdminProcessing(planId);
    try {
      await updatePlan(planId, {
        ...planForms[planId],
        monthly_price_lkr: Number(planForms[planId].monthly_price_lkr),
      });
      toast.success('Plan updated');
    } catch (caughtError) {
      toast.error(caughtError.message);
    } finally {
      setAdminProcessing('');
    }
  }

  return (
    <DashboardLayout title="Admin Panel">
      {error ? (
        <RetryState message={error.message} onRetry={refetch} />
      ) : loading ? (
        <LoadingSkeleton rows={10} />
      ) : (
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Stat label="Total shops" value={metrics.totalShops} />
            <Stat label="Active subscriptions" value={metrics.activeSubscriptions} />
            <Stat label="Trial users" value={metrics.trialUsers} />
            <Stat label="Expired users" value={metrics.expiredUsers} />
            <Stat label="Pending payments" value={metrics.pendingPayments} />
            <Stat label="Subscription revenue (month)" value={`LKR ${Number(metrics.monthlyRevenue).toLocaleString()}`} />
            <Stat label="Subscription revenue (total)" value={`LKR ${Number(metrics.totalRevenue).toLocaleString()}`} />
            <Stat label="Shop order revenue (total)" value={`LKR ${Number(metrics.totalOrderRevenue || 0).toLocaleString()}`} />
          </section>

          <section className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold">Pending payments</h2>
              {metrics.pendingPayments > 0 ? (
                <span className="rounded-full bg-rose-600 px-3 py-1 text-xs font-semibold text-white">{metrics.pendingPayments} pending</span>
              ) : null}
            </div>
            <div className="mt-4 space-y-3">
              {payments.filter((row) => row.status === 'pending').length === 0 ? (
                <p className="text-sm text-slate-500">No pending submissions.</p>
              ) : payments.filter((row) => row.status === 'pending').map((row) => (
                <div key={row.id} className="rounded-md border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">Shop: {row.shop_id}</p>
                    <p className="text-sm">{row.plan_id} - LKR {Number(row.amount_lkr).toLocaleString()}</p>
                  </div>
                  {row.payment_proof_url ? (
                    <button type="button" className="btn-secondary mt-2" onClick={() => setProofPreview(row.payment_proof_url)}>
                      View bank slip
                    </button>
                  ) : null}
                  <label className="mt-3 block">
                    <span className="label">Admin notes / rejection reason</span>
                    <textarea className="input mt-1 min-h-20" value={noteMap[row.id] || ''} onChange={(event) => setNoteMap((current) => ({ ...current, [row.id]: event.target.value }))} />
                  </label>
                  <div className="mt-3 flex gap-2">
                    <LoadingButton className="btn-primary" loading={processingId === row.id} loadingText="Approving..." onClick={() => handleApprove(row.id)}>Approve</LoadingButton>
                    <LoadingButton className="btn-secondary" loading={processingId === row.id} loadingText="Rejecting..." onClick={() => handleReject(row.id)}>Reject</LoadingButton>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="card p-5">
            <h2 className="text-base font-semibold">Admin role management</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_auto_auto]">
              <input className="input" placeholder="user@example.com" value={adminEmail} onChange={(event) => setAdminEmail(event.target.value)} />
              <select className="input" value={adminRole} onChange={(event) => setAdminRole(event.target.value)}>
                <option value="admin">admin</option>
                <option value="super_admin">super_admin</option>
              </select>
              <LoadingButton className="btn-primary" onClick={handleGrantAdmin} loading={adminProcessing === 'grant'} loadingText="Granting...">Grant role</LoadingButton>
              <LoadingButton className="btn-secondary" onClick={handleRevokeAdmin} loading={adminProcessing === 'revoke'} loadingText="Revoking...">Revoke role</LoadingButton>
            </div>
          </section>

          {paymentForm ? (
            <section className="card p-5">
              <h2 className="text-base font-semibold">Manual payment instructions</h2>
              <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleSavePaymentInstructions}>
                {[
                  ['bank', 'Bank'],
                  ['account_holder', 'Account holder'],
                  ['account_number', 'Account number'],
                  ['branch', 'Branch'],
                  ['support_whatsapp', 'Support WhatsApp'],
                ].map(([key, label]) => (
                  <label key={key} className="block">
                    <span className="label">{label}</span>
                    <input className="input mt-1" value={paymentForm[key] || ''} onChange={(event) => setPaymentForm((current) => ({ ...current, [key]: event.target.value }))} />
                  </label>
                ))}
                <div className="md:col-span-2">
                  <LoadingButton className="btn-primary" type="submit" loading={adminProcessing === 'payment'} loadingText="Saving...">Save payment instructions</LoadingButton>
                </div>
              </form>
            </section>
          ) : null}

          <section className="card p-5">
            <h2 className="text-base font-semibold">Subscription plans</h2>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {plans.map((plan) => (
                <div key={plan.id} className="rounded-md border border-slate-200 p-4 dark:border-slate-800">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="label">Name</span>
                      <input className="input mt-1" value={planForms[plan.id]?.name || ''} onChange={(event) => setPlanForms((current) => ({ ...current, [plan.id]: { ...current[plan.id], name: event.target.value } }))} />
                    </label>
                    <label className="block">
                      <span className="label">Price LKR</span>
                      <input className="input mt-1" type="number" min="1" value={planForms[plan.id]?.monthly_price_lkr || ''} onChange={(event) => setPlanForms((current) => ({ ...current, [plan.id]: { ...current[plan.id], monthly_price_lkr: event.target.value } }))} />
                    </label>
                  </div>
                  <label className="mt-3 flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={Boolean(planForms[plan.id]?.is_active)} onChange={(event) => setPlanForms((current) => ({ ...current, [plan.id]: { ...current[plan.id], is_active: event.target.checked } }))} />
                    Active
                  </label>
                  <LoadingButton className="btn-secondary mt-3" loading={adminProcessing === plan.id} loadingText="Saving..." onClick={() => handleSavePlan(plan.id)}>Save plan</LoadingButton>
                </div>
              ))}
            </div>
          </section>

          <section className="card p-5">
            <h2 className="text-base font-semibold">Shops overview</h2>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input className="input flex-1" placeholder="Search shop name, slug, email" value={shopSearch} onChange={(event) => setShopSearch(event.target.value)} />
              <select className="input sm:w-48" value={shopFilter} onChange={(event) => setShopFilter(event.target.value)}>
                <option>All</option>
                <option>Basic</option>
                <option>Pro</option>
                <option>Expired</option>
                <option>Expiring Soon</option>
                <option>Unpaid</option>
              </select>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                <thead>
                  <tr>
                    <th className="table-th">Shop</th>
                    <th className="table-th">Plan</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Expires</th>
                    <th className="table-th">Orders</th>
                    <th className="table-th">Products</th>
                    <th className="table-th">Revenue</th>
                    <th className="table-th">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredShops.map((shop) => {
                    const sub = metrics.subByShop.get(shop.id);
                    const stats = metrics.shopStats.get(shop.id) || { orderCount: 0, orderRevenue: 0, productCount: 0 };
                    const expiry = sub?.current_period_end || sub?.trial_ends_at || shop.trial_ends_at;
                    return (
                    <tr key={shop.id} className={shopRowTone(shop)}>
                      <td className="table-td">
                        <p className="font-medium">{shop.shop_name}</p>
                        <p className="text-xs text-slate-500">{shop.slug}</p>
                      </td>
                      <td className="table-td capitalize">{shop.subscription_plan || sub?.plan_id || '-'}</td>
                      <td className="table-td">
                        <span className="capitalize">{shop.subscription_status || sub?.status || '-'}</span>
                        {shop.service_locked ? <span className="ml-2 rounded bg-rose-100 px-2 py-0.5 text-xs text-rose-800">Locked</span> : null}
                      </td>
                      <td className="table-td">{expiry ? formatDate(expiry) : '-'}</td>
                      <td className="table-td">{stats.orderCount}</td>
                      <td className="table-td">{stats.productCount}</td>
                      <td className="table-td">LKR {Number(stats.orderRevenue).toLocaleString()}</td>
                      <td className="table-td">
                        <div className="flex flex-wrap gap-2">
                          <LoadingButton className="btn-secondary px-3" loading={processingId === shop.id} loadingText="Saving..." onClick={() => handleOverride(shop.id, 'active', false)}>Activate</LoadingButton>
                          <LoadingButton className="btn-secondary px-3" loading={processingId === shop.id} loadingText="Saving..." onClick={() => handleOverride(shop.id, 'trialing', false)}>Extend trial</LoadingButton>
                          <LoadingButton className="btn-secondary px-3" loading={processingId === shop.id} loadingText="Saving..." onClick={() => handleOverride(shop.id, 'locked', true)}>Lock</LoadingButton>
                          <LoadingButton className="btn-secondary px-3" loading={processingId === shop.id} loadingText="Saving..." onClick={() => handleOverride(shop.id, 'active', false)}>Unlock</LoadingButton>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      <ImagePreviewModal
        title="Payment proof"
        open={Boolean(proofPreview)}
        onClose={() => setProofPreview(null)}
        src={proofPreview}
        bucket="payment-proofs"
      />
    </DashboardLayout>
  );
}

function Stat({ label, value }) {
  return (
    <div className="card p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
