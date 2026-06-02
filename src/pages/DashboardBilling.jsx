import { CheckCircle2, Clock3, Copy, CreditCard, UploadCloud } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/DashboardLayout';
import ImageUploadField from '../components/ImageUploadField';
import LoadingButton from '../components/LoadingButton';
import LoadingSkeleton from '../components/LoadingSkeleton';
import RetryState from '../components/RetryState';
import { useAppSettings } from '../hooks/useAppSettings';
import { useBilling } from '../hooks/useBilling';
import { useShop } from '../hooks/useShop';
import { supabase } from '../lib/supabase';
import { getPlanFeatureLabels } from '../lib/planFeatures';
import { formatCurrency, formatDate } from '../utils/format';

const PROOF_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const PROOF_MAX_SIZE = 8 * 1024 * 1024;

export default function DashboardBilling() {
  const { settings: appSettings } = useAppSettings();
  const { shop } = useShop();
  const { plans, subscription, payments, invoices, trialDaysRemaining, loading, error, submitPaymentProof, refetch } = useBilling(shop?.id);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState('');
  const [proofError, setProofError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState('');

  const selectedPlan = useMemo(() => plans.find((plan) => plan.id === selectedPlanId) || null, [plans, selectedPlanId]);
  const currentPlanLabel = subscription?.plan_id || 'normal';
  const paymentInstructions = appSettings?.payment_instructions || {};
  const isExpired = shop?.service_locked || ['locked', 'past_due'].includes(subscription?.status || shop?.subscription_status);

  async function copyValue(label, value) {
    await navigator.clipboard.writeText(value || '');
    toast.success(`${label} copied`);
  }

  async function uploadProof(file) {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${shop.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    setUploadProgress(15);
    const { error: uploadError } = await supabase.storage.from('payment-proofs').upload(path, file, { cacheControl: '3600', upsert: false });
    if (uploadError) throw uploadError;
    setUploadProgress(85);
    const { data } = supabase.storage.from('payment-proofs').getPublicUrl(path);
    setUploadProgress(100);
    return data?.publicUrl || null;
  }

  async function handleSubmitPayment() {
    if (submitting) return;
    if (!selectedPlan) {
      toast.error('Select a plan first.');
      return;
    }
    if (!proofFile) {
      toast.error('Upload payment proof.');
      return;
    }
    if (proofError) {
      toast.error(proofError);
      return;
    }
    setSubmitting(true);
    setUploadProgress(0);
    try {
      const proofUrl = await uploadProof(proofFile);
      await submitPaymentProof({
        planId: selectedPlan.id,
        amountLkr: selectedPlan.monthly_price_lkr,
        proofUrl,
        note,
      });
      setProofFile(null);
      setProofPreview('');
      setSelectedPlanId('');
      setNote('');
      toast.success('Payment proof submitted for admin verification.');
    } catch (caughtError) {
      toast.error(caughtError.message);
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  }

  return (
    <DashboardLayout title="Billing & Subscription">
      {error ? (
        <RetryState message={error.message} onRetry={refetch} />
      ) : loading ? (
        <LoadingSkeleton rows={8} />
      ) : (
        <div className="space-y-6">
          {isExpired ? (
            <section className="rounded-md border border-rose-200 bg-rose-50 p-4 text-rose-950 dark:border-rose-900 dark:bg-rose-500/10 dark:text-rose-100">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">Your subscription has expired. Renew now to continue using premium features.</p>
                  <p className="mt-1 text-sm">Expiry date: {formatDate(subscription?.current_period_end || subscription?.trial_ends_at || shop?.trial_ends_at)}</p>
                  {shop?.service_locked ? <p className="mt-1 text-sm">Premium features are currently locked.</p> : null}
                </div>
                <Link className="btn-primary w-full sm:w-auto" to="#choose-plan" onClick={() => document.getElementById('choose-plan')?.scrollIntoView({ behavior: 'smooth' })}>
                  <CreditCard className="h-4 w-4" aria-hidden="true" />
                  Renew now
                </Link>
              </div>
            </section>
          ) : null}

          <section className="grid gap-4 md:grid-cols-3">
            <div className="card p-5">
              <p className="text-sm text-slate-500">Current status</p>
              <p className="mt-2 text-xl font-semibold capitalize">{subscription?.status || shop?.subscription_status || 'trialing'}</p>
              <p className="mt-2 text-sm text-slate-500">Plan: {currentPlanLabel}</p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-slate-500">Trial remaining</p>
              <p className="mt-2 flex items-center gap-2 text-xl font-semibold"><Clock3 className="h-5 w-5 text-brand-600" />{trialDaysRemaining} days</p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-slate-500">Service lock</p>
              <p className={`mt-2 text-xl font-semibold ${shop?.service_locked ? 'text-rose-600' : 'text-emerald-600'}`}>
                {shop?.service_locked ? 'Locked' : 'Active'}
              </p>
            </div>
          </section>

          <section id="choose-plan" className="card scroll-mt-6 p-5">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-brand-600" aria-hidden="true" />
              <h2 className="text-base font-semibold">Step 1: Choose a plan</h2>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {plans.map((plan) => {
                const selected = selectedPlanId === plan.id;
                const features = getPlanFeatureLabels(plan.id, plan.features);
                return (
                  <button
                    key={plan.id}
                    type="button"
                    className={`rounded-md border p-4 text-left transition ${selected ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-slate-200 bg-white hover:border-brand-300 dark:border-slate-800 dark:bg-slate-900'}`}
                    onClick={() => setSelectedPlanId(plan.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{plan.name}</span>
                          {plan.id === 'pro' ? <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Recommended</span> : null}
                        </div>
                        <p className="mt-1 text-sm text-slate-500">Monthly · 30-day billing cycle</p>
                      </div>
                      <span className="text-lg font-semibold">{formatCurrency(plan.monthly_price_lkr, 'LKR')}</span>
                    </div>
                    <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                      {features.slice(0, 6).map((feature) => (
                        <li key={feature} className="flex items-center gap-2 capitalize">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
          </section>

          {selectedPlan ? (
            <section className="grid gap-6 xl:grid-cols-2">
              <div className="card p-5">
                <h2 className="text-base font-semibold">Step 2: Manual payment instructions</h2>
                <div className="mt-4 rounded-md border border-slate-200 p-4 text-sm dark:border-slate-800">
                  {[
                    ['Bank', paymentInstructions.bank],
                    ['Account holder', paymentInstructions.account_holder],
                    ['Account number', paymentInstructions.account_number],
                    ['Branch', paymentInstructions.branch],
                    ['Support WhatsApp', paymentInstructions.support_whatsapp],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0 dark:border-slate-800">
                      <span><span className="font-medium">{label}:</span> {value}</span>
                      <button type="button" className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => copyValue(label, value)} aria-label={`Copy ${label}`}>
                        <Copy className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card p-5">
                <h2 className="text-base font-semibold">Step 3: Upload payment slip</h2>
                <div className="mt-4 rounded-md bg-slate-50 p-4 text-sm dark:bg-slate-800">
                  <p className="font-medium">{selectedPlan.name}</p>
                  <p className="text-slate-500 dark:text-slate-400">{formatCurrency(selectedPlan.monthly_price_lkr, 'LKR')} monthly</p>
                </div>
                <div className="mt-4 space-y-4">
                  <ImageUploadField
                    value={proofFile?.name || ''}
                    previewUrl={proofPreview}
                    uploading={submitting}
                    progress={uploadProgress}
                    acceptedTypes={PROOF_TYPES}
                    maxFileSize={PROOF_MAX_SIZE}
                    helperText="JPG, PNG, WEBP, PDF up to 8MB"
                    error={proofError}
                    onFileSelect={(file, errorMessage) => {
                      setProofError(errorMessage || '');
                      setProofFile(file);
                      setProofPreview(file && file.type !== 'application/pdf' ? URL.createObjectURL(file) : file?.name || '');
                    }}
                    onRemove={() => {
                      setProofFile(null);
                      setProofPreview('');
                      setProofError('');
                    }}
                  />
                  <label className="block">
                    <span className="label">Notes (optional)</span>
                    <textarea className="input mt-1 min-h-20" value={note} onChange={(event) => setNote(event.target.value)} />
                  </label>
                  <LoadingButton className="btn-primary w-full justify-center" type="button" disabled={!proofFile || Boolean(proofError)} loading={submitting} loadingText="Submitting..." icon={UploadCloud} onClick={handleSubmitPayment}>
                    Submit payment
                  </LoadingButton>
                </div>
              </div>
            </section>
          ) : null}

          <section className="card p-5">
            <h2 className="text-base font-semibold">Payment submissions</h2>
            <div className="mt-4 space-y-2 text-sm">
              {payments.length === 0 ? <p className="text-slate-500">No submissions yet.</p> : payments.map((row) => (
                <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 px-3 py-2 dark:border-slate-800">
                  <span>{row.plan_id} - LKR {Number(row.amount_lkr).toLocaleString()}</span>
                  <span className="rounded bg-slate-100 px-2 py-1 text-xs uppercase dark:bg-slate-800">{row.status}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="card p-5">
            <h2 className="text-base font-semibold">Billing history</h2>
            <div className="mt-4 space-y-2 text-sm">
              {invoices.length === 0 ? <p className="text-slate-500">No invoices yet.</p> : invoices.map((invoice) => (
                <div key={invoice.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 px-3 py-2 dark:border-slate-800">
                  <span>{invoice.plan_id} - LKR {Number(invoice.amount_lkr).toLocaleString()}</span>
                  <span className="rounded bg-slate-100 px-2 py-1 text-xs uppercase dark:bg-slate-800">{invoice.status}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </DashboardLayout>
  );
}
