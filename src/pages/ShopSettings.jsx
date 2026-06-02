import { Bell, Copy, Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/DashboardLayout';
import LoadingButton from '../components/LoadingButton';
import LoadingSkeleton from '../components/LoadingSkeleton';
import Modal from '../components/Modal';
import RetryState from '../components/RetryState';
import FeatureGate from '../components/templates/FeatureGate';
import ImageUploadField from '../components/ImageUploadField';
import { useShop } from '../hooks/useShop';
import { getShopPublicUrl } from '../lib/shopUrl';
import { supabase } from '../lib/supabase';

const emptyBank = { bank_name: '', account_name: '', account_number: '', branch: '', is_active: true };
function sanitizeSlug(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function ShopSettings() {
  const { shop, settings, bankAccounts, features, loading, error, refetch, updateShop, updateFormSettings, saveBankAccount, deleteBankAccount } = useShop();
  const [shopForm, setShopForm] = useState(null);
  const [settingsForm, setSettingsForm] = useState(null);
  const shopFormData = shopForm ?? shop;
  const settingsFormData = settingsForm ?? settings;
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [bankForm, setBankForm] = useState(emptyBank);
  const [saving, setSaving] = useState('');
  const [deletingBankId, setDeletingBankId] = useState(null);
  const [uploadingAppearance, setUploadingAppearance] = useState('');

  useEffect(() => {
    if (shop) setShopForm(shop);
  }, [shop]);

  useEffect(() => {
    if (settings) setSettingsForm(settings);
  }, [settings]);

  async function handleShopSave(event) {
    event.preventDefault();
    if (saving) return;
    setSaving('shop');
    try {
      await updateShop(shopFormData);
      toast.success('Shop saved');
    } catch (caughtError) {
      toast.error(caughtError.message);
    } finally {
      setSaving('');
    }
  }

  async function handleSettingsSave(event) {
    event.preventDefault();
    if (saving) return;
    setSaving('settings');
    try {
      await updateFormSettings(settingsFormData);
      toast.success('Order form settings saved');
    } catch (caughtError) {
      toast.error(caughtError.message);
    } finally {
      setSaving('');
    }
  }

  async function handleBankSave(event) {
    event.preventDefault();
    if (saving) return;
    setSaving('bank');
    try {
      await saveBankAccount(bankForm);
      toast.success('Bank account saved');
      setBankModalOpen(false);
      setBankForm(emptyBank);
    } catch (caughtError) {
      toast.error(caughtError.message);
    } finally {
      setSaving('');
    }
  }

  async function handleDeleteBank(id) {
    if (deletingBankId) return;
    setDeletingBankId(id);
    try {
      await deleteBankAccount(id);
      toast.success('Bank account deleted');
    } catch (caughtError) {
      toast.error(caughtError.message);
    } finally {
      setDeletingBankId(null);
    }
  }

  async function uploadAppearanceAsset(file, schemaKey, validationError) {
    if (validationError) {
      toast.error(validationError);
      return;
    }
    if (!file || !shop?.id) return;
    setUploadingAppearance(schemaKey);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${shop.id}/appearance/${schemaKey}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('product-images').upload(path, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('product-images').getPublicUrl(path);
      const imageUrl = data?.publicUrl || '';
      setSettingsForm((current) => ({
        ...(current || settingsFormData),
        custom_schema: { ...(current?.custom_schema || settingsFormData?.custom_schema || {}), [schemaKey]: imageUrl },
      }));
      toast.success('Image uploaded. Save appearance to apply.');
    } catch (caughtError) {
      toast.error(caughtError.message);
    } finally {
      setUploadingAppearance('');
    }
  }

  async function copyOrderLink() {
    if (!shop?.slug) {
      toast.error('Shop link is not ready yet.');
      return;
    }
    const url = getShopPublicUrl(shop.slug);
    await navigator.clipboard.writeText(url);
    toast.success('Order link copied');
  }

  async function enableBrowserNotifications() {
    if (shop?.subscription_plan !== 'pro') {
      toast.error('PRO plan required for order notifications.');
      return;
    }
    if (!('Notification' in window)) {
      toast.error('Browser notifications are not supported by this browser.');
      return;
    }
    const permission = await Notification.requestPermission();
    toast.success(permission === 'granted' ? 'Browser notifications enabled for new orders' : `Permission: ${permission}`);
  }

  return (
    <DashboardLayout
      title="Shop Settings"
      actions={shop ? (
        <button className="btn-secondary" onClick={copyOrderLink}>
          <Copy className="h-4 w-4" aria-hidden="true" />
          Copy order link
        </button>
      ) : null}
    >
      {error ? (
        <RetryState message={error.message} onRetry={refetch} />
      ) : loading ? (
        <LoadingSkeleton rows={8} />
      ) : !shop || !settings ? (
        <RetryState
          message="Could not load shop settings. The shop/profile data is missing or blocked by a policy."
          onRetry={refetch}
        />
      ) : (
        <div className="space-y-6">
          <div className="rounded-md border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-900">
            Public order form: <span className="font-medium">{getShopPublicUrl(shop.slug)}</span>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="card p-5">
              <h2 className="text-base font-semibold">Public URL</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Shop name, logo, phone, and address are in Profile Settings.</p>
              <form className="mt-5 space-y-4" onSubmit={handleShopSave}>
                <label className="block">
                  <span className="label">Slug</span>
                  <input
                    className="input mt-1"
                    value={shopFormData.slug || ''}
                    onChange={(event) => setShopForm({ ...shopFormData, slug: event.target.value })}
                    onBlur={(event) => setShopForm({ ...shopFormData, slug: sanitizeSlug(event.target.value) })}
                  />
                </label>
                <LoadingButton className="btn-primary" type="submit" loading={saving === 'shop'} loadingText="Saving..." icon={Save}>Save slug</LoadingButton>
              </form>
            </section>

            <section className="card p-5">
              <h2 className="text-base font-semibold">Order form settings</h2>
              <form className="mt-5 space-y-4" onSubmit={handleSettingsSave}>
                {/* Payment & delivery toggles — available to all plans */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <Toggle label="Cash on delivery" checked={settingsFormData.cash_on_delivery_enabled} onChange={(checked) => setSettingsForm({ ...settingsFormData, cash_on_delivery_enabled: checked })} />
                  <Toggle label="Bank transfer" checked={settingsFormData.bank_transfer_enabled} onChange={(checked) => setSettingsForm({ ...settingsFormData, bank_transfer_enabled: checked })} />
                  <Toggle label="Payment slip required" checked={settingsFormData.payment_slip_required} onChange={(checked) => setSettingsForm({ ...settingsFormData, payment_slip_required: checked })} />
                  <Toggle label="Enable delivery date selection" checked={settingsFormData.delivery_date_enabled} onChange={(checked) => setSettingsForm({ ...settingsFormData, delivery_date_enabled: checked })} />
                  <Toggle label="Delivery reminders" checked={settingsFormData.reminder_enabled} onChange={(checked) => setSettingsForm({ ...settingsFormData, reminder_enabled: checked })} />
                </div>
                <FeatureGate allowed={features.whatsapp_reminders} featureName="WhatsApp reminders">
                  <label className="block">
                    <span className="label">Reminder channel</span>
                    <select className="input mt-1" value={settingsFormData.reminder_channel || 'browser'} onChange={(event) => setSettingsForm({ ...settingsFormData, reminder_channel: event.target.value })}>
                      <option value="browser">Browser</option>
                      <option value="email">Email via Resend</option>
                      <option value="telegram">Telegram bot</option>
                      <option value="whatsapp">WhatsApp</option>
                    </select>
                  </label>
                </FeatureGate>

                {/* Form content & appearance — PRO only */}
                <FeatureGate allowed={features.order_form_customization} featureName="Order form customization">
                  <div className="space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Form content (PRO)</p>
                    <label className="block">
                      <span className="label">Form title</span>
                      <input className="input mt-1" value={settingsFormData.form_title || ''} onChange={(event) => setSettingsForm({ ...settingsFormData, form_title: event.target.value })} />
                    </label>
                    <label className="block">
                      <span className="label">Welcome message</span>
                      <textarea className="input mt-1 min-h-20" value={settingsFormData.welcome_message || ''} onChange={(event) => setSettingsForm({ ...settingsFormData, welcome_message: event.target.value })} />
                    </label>
                    <label className="block">
                      <span className="label">Thank you message</span>
                      <textarea className="input mt-1 min-h-20" value={settingsFormData.thank_you_message || ''} onChange={(event) => setSettingsForm({ ...settingsFormData, thank_you_message: event.target.value })} />
                    </label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="label">Primary color</span>
                        <input className="input mt-1 h-11" type="color" value={settingsFormData.primary_color || '#0d9488'} onChange={(event) => setSettingsForm({ ...settingsFormData, primary_color: event.target.value })} />
                      </label>
                      <label className="block">
                        <span className="label">Accent color</span>
                        <input className="input mt-1 h-11" type="color" value={settingsFormData.accent_color || '#2563eb'} onChange={(event) => setSettingsForm({ ...settingsFormData, accent_color: event.target.value })} />
                      </label>
                    </div>
                  </div>
                </FeatureGate>

                <div className="flex flex-wrap gap-3">
                  <LoadingButton className="btn-primary" type="submit" loading={saving === 'settings'} loadingText="Saving..." icon={Save}>Save form</LoadingButton>
                  <button className="btn-secondary" type="button" onClick={enableBrowserNotifications}><Bell className="h-4 w-4" aria-hidden="true" />Enable browser alerts</button>
                </div>
              </form>
            </section>
          </div>

          <FeatureGate allowed={shop?.subscription_plan === 'pro'} featureName="Order form appearance customization">
            <section className="card p-5">
              <h2 className="text-base font-semibold">PRO appearance customization</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Customize how your public order form looks to customers.</p>
              <form
                className="mt-5 grid gap-4 md:grid-cols-2"
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (saving) return;
                  setSaving('appearance');
                  try {
                    const schema = settingsFormData.custom_schema || {};
                    await updateFormSettings({ ...settingsFormData, custom_schema: schema });
                    toast.success('Appearance saved');
                  } catch (caughtError) {
                    toast.error(caughtError.message);
                  } finally {
                    setSaving('');
                  }
                }}
              >
                <label className="block md:col-span-2">
                  <span className="label">Shop title style</span>
                  <select
                    className="input mt-1"
                    value={settingsFormData.custom_schema?.titleStyle || 'large-bold'}
                    onChange={(event) => setSettingsForm({
                      ...settingsFormData,
                      custom_schema: { ...(settingsFormData.custom_schema || {}), titleStyle: event.target.value },
                    })}
                  >
                    <option value="large-bold">Large bold heading</option>
                    <option value="normal">Normal heading</option>
                  </select>
                </label>
                <label className="block">
                  <span className="label">Button color</span>
                  <input className="input mt-1 h-11" type="color" value={settingsFormData.custom_schema?.buttonColor || settingsFormData.primary_color || '#0d9488'} onChange={(event) => setSettingsForm({ ...settingsFormData, custom_schema: { ...(settingsFormData.custom_schema || {}), buttonColor: event.target.value } })} />
                </label>
                <label className="block">
                  <span className="label">Border radius</span>
                  <select className="input mt-1" value={settingsFormData.custom_schema?.borderRadius || 'md'} onChange={(event) => setSettingsForm({ ...settingsFormData, custom_schema: { ...(settingsFormData.custom_schema || {}), borderRadius: event.target.value } })}>
                    <option value="sm">Small</option>
                    <option value="md">Medium</option>
                    <option value="lg">Large</option>
                  </select>
                </label>
                <label className="block md:col-span-2">
                  <span className="label">Hero banner text</span>
                  <input className="input mt-1" value={settingsFormData.custom_schema?.bannerText || ''} onChange={(event) => setSettingsForm({ ...settingsFormData, custom_schema: { ...(settingsFormData.custom_schema || {}), bannerText: event.target.value } })} />
                </label>
                <div className="block md:col-span-2">
                  <span className="label">Background image</span>
                  <div className="mt-1">
                    <ImageUploadField
                      value={settingsFormData.custom_schema?.backgroundImageUrl || ''}
                      previewUrl={settingsFormData.custom_schema?.backgroundImageUrl || ''}
                      uploading={uploadingAppearance === 'backgroundImageUrl'}
                      onFileSelect={(file, err) => uploadAppearanceAsset(file, 'backgroundImageUrl', err)}
                      onRemove={() => setSettingsForm({ ...settingsFormData, custom_schema: { ...(settingsFormData.custom_schema || {}), backgroundImageUrl: '' } })}
                    />
                  </div>
                </div>
                <div className="block md:col-span-2">
                  <span className="label">Hero banner image</span>
                  <div className="mt-1">
                    <ImageUploadField
                      value={settingsFormData.custom_schema?.heroBannerUrl || ''}
                      previewUrl={settingsFormData.custom_schema?.heroBannerUrl || ''}
                      uploading={uploadingAppearance === 'heroBannerUrl'}
                      onFileSelect={(file, err) => uploadAppearanceAsset(file, 'heroBannerUrl', err)}
                      onRemove={() => setSettingsForm({ ...settingsFormData, custom_schema: { ...(settingsFormData.custom_schema || {}), heroBannerUrl: '' } })}
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm md:col-span-2">
                  <input type="checkbox" checked={settingsFormData.custom_schema?.heroOverlay !== false} onChange={(event) => setSettingsForm({ ...settingsFormData, custom_schema: { ...(settingsFormData.custom_schema || {}), heroOverlay: event.target.checked } })} />
                  Show dark overlay on hero banner
                </label>
                <label className="block md:col-span-2">
                  <span className="label">Custom welcome override</span>
                  <textarea className="input mt-1 min-h-20" value={settingsFormData.custom_schema?.customMessage || ''} onChange={(event) => setSettingsForm({ ...settingsFormData, custom_schema: { ...(settingsFormData.custom_schema || {}), customMessage: event.target.value } })} />
                </label>
                <div className="md:col-span-2">
                  <LoadingButton className="btn-primary" type="submit" disabled={Boolean(uploadingAppearance)} loading={saving === 'appearance'} loadingText="Saving...">Save appearance</LoadingButton>
                </div>
              </form>
            </section>
          </FeatureGate>

          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Bank accounts</h2>
              <button className="btn-primary" onClick={() => { setBankForm(emptyBank); setBankModalOpen(true); }}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add account
              </button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {bankAccounts.map((account) => (
                <div key={account.id} className="rounded-md border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{account.bank_name}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{account.account_name}</p>
                      <p className="text-sm">{account.account_number}</p>
                    </div>
                    <LoadingButton className="rounded-md p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10" loading={deletingBankId === account.id} loadingText="" onClick={() => handleDeleteBank(account.id)} aria-label="Delete bank account">
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </LoadingButton>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      <Modal title="Bank account" open={bankModalOpen} onClose={() => setBankModalOpen(false)}>
        <form className="space-y-4" onSubmit={handleBankSave}>
          <label className="block"><span className="label">Bank name</span><input className="input mt-1" required value={bankForm.bank_name} onChange={(event) => setBankForm({ ...bankForm, bank_name: event.target.value })} /></label>
          <label className="block"><span className="label">Account name</span><input className="input mt-1" required value={bankForm.account_name} onChange={(event) => setBankForm({ ...bankForm, account_name: event.target.value })} /></label>
          <label className="block"><span className="label">Account number</span><input className="input mt-1" required value={bankForm.account_number} onChange={(event) => setBankForm({ ...bankForm, account_number: event.target.value })} /></label>
          <label className="block"><span className="label">Branch</span><input className="input mt-1" value={bankForm.branch || ''} onChange={(event) => setBankForm({ ...bankForm, branch: event.target.value })} /></label>
          <LoadingButton className="btn-primary" type="submit" loading={saving === 'bank'} loadingText="Saving...">Save account</LoadingButton>
        </form>
      </Modal>
    </DashboardLayout>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
      <span>{label}</span>
      <input type="checkbox" checked={Boolean(checked)} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}
