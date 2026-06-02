import { AlertTriangle, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/DashboardLayout';
import ImageUploadField from '../components/ImageUploadField';
import LoadingButton from '../components/LoadingButton';
import LoadingSkeleton from '../components/LoadingSkeleton';
import Modal from '../components/Modal';
import RetryState from '../components/RetryState';
import { useAuth } from '../context/AuthContext';
import { useAppSettings } from '../hooks/useAppSettings';
import { useShop } from '../hooks/useShop';
import { getShopPublicUrl, slugifyShopName } from '../lib/shopUrl';
import { supabase } from '../lib/supabase';

export default function DashboardSettings() {
  const { isAdmin, user, profile, profileLoading, loading: authLoading, updateProfile, updatePassword, deleteAccount } = useAuth();
  const { settings, loading: appLoading, error, refetch, updateSettings } = useAppSettings({ enabled: isAdmin });
  const { shop, loading: shopLoading, error: shopError, updateShop, refetch: refetchShop } = useShop();
  const [settingsForm, setSettingsForm] = useState(null);
  const [profileForm, setProfileForm] = useState(null);
  const [shopForm, setShopForm] = useState(null);
  const [password, setPassword] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState('');

  const pageLoading = authLoading || shopLoading || (profileLoading && !user);
  const canRender = Boolean(user) && !shopLoading;
  const shopFormData = shopForm ?? shop;
  const profileFormData = profileForm ?? {
    name: user?.user_metadata?.name || '',
    email: user?.email || '',
    status: 'active',
  };

  useEffect(() => {
    if (settings) setSettingsForm(settings);
  }, [settings]);

  useEffect(() => {
    if (profile) {
      setProfileForm({ name: profile.name || '', email: profile.email || user?.email || '', status: profile.status || 'active' });
    } else if (user && !profileLoading) {
      setProfileForm({ name: user.user_metadata?.name || '', email: user.email || '', status: 'active' });
    }
  }, [profile, profileLoading, user]);

  useEffect(() => {
    if (shop) {
      setShopForm(shop);
      setLogoPreview(shop.logo_url || '');
    }
  }, [shop]);

  async function handleSettingsSubmit(event) {
    event.preventDefault();
    if (!isAdmin || saving) return;
    setSaving('settings');
    try {
      await updateSettings({
        site_name: settingsForm.site_name,
        currency: settingsForm.currency,
        low_stock_threshold: Number(settingsForm.low_stock_threshold),
      });
      toast.success('System settings updated');
    } catch (caughtError) {
      toast.error(caughtError.message);
    } finally {
      setSaving('');
    }
  }

  async function handleShopSubmit(event) {
    event.preventDefault();
    if (saving || !shop) return;
    setSaving('shop');
    try {
      const payload = { ...shopFormData };
      if (!payload.slug?.trim() && payload.shop_name) {
        payload.slug = slugifyShopName(payload.shop_name);
      }
      await updateShop(payload);
      toast.success('Shop profile updated');
    } catch (caughtError) {
      toast.error(caughtError.message);
    } finally {
      setSaving('');
    }
  }

  async function handleLogoUpload(file, validationError) {
    if (validationError) {
      toast.error(validationError);
      return;
    }
    if (!file || !shop?.id) return;
    setUploadingLogo(true);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${shop.id}/logo-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('product-images').upload(path, file, { cacheControl: '3600', upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('product-images').getPublicUrl(path);
      const logoUrl = data?.publicUrl || '';
      setShopForm((current) => ({ ...current, logo_url: logoUrl }));
      setLogoPreview(logoUrl);
      toast.success('Logo uploaded. Save shop profile to apply.');
    } catch (caughtError) {
      toast.error(caughtError.message);
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();
    if (saving) return;
    setSaving('profile');
    try {
      await updateProfile(profileFormData);
      toast.success('Profile updated');
    } catch (caughtError) {
      toast.error(caughtError.message);
    } finally {
      setSaving('');
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    if (saving) return;
    setSaving('password');
    try {
      await updatePassword(password);
      setPassword('');
      toast.success('Password updated');
    } catch (caughtError) {
      toast.error(caughtError.message);
    } finally {
      setSaving('');
    }
  }

  async function handleDeleteAccount() {
    if (saving) return;
    setSaving('delete');
    try {
      await deleteAccount();
      toast.success('Account deleted');
    } catch (caughtError) {
      toast.error(caughtError.message);
    } finally {
      setSaving('');
    }
  }

  return (
    <DashboardLayout title="Profile Settings">
      {error || shopError ? <RetryState message={(error || shopError)?.message} onRetry={() => { refetch(); refetchShop(); }} /> : null}
      {pageLoading ? (
        <LoadingSkeleton rows={8} />
      ) : !canRender ? (
        <RetryState message="Could not load your profile. Please retry." onRetry={refetchShop} />
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          {shop ? (
          <section className="card p-5">
            <h2 className="text-base font-semibold">Shop profile</h2>
            {shop?.slug ? (
              <p className="mt-2 text-sm text-brand-700 dark:text-brand-100">Public shop URL: {getShopPublicUrl(shop.slug)}</p>
            ) : null}
            <form className="mt-5 space-y-4" onSubmit={handleShopSubmit}>
              <label className="block">
                <span className="label">Shop name</span>
                <input
                  className="input mt-1"
                  value={shopFormData.shop_name || ''}
                  onChange={(event) => setShopForm({ ...shopFormData, shop_name: event.target.value })}
                  onBlur={(event) => {
                    if (!shopFormData.slug?.trim()) {
                      setShopForm({ ...shopFormData, slug: slugifyShopName(event.target.value) });
                    }
                  }}
                />
              </label>
              <label className="block">
                <span className="label">Shop URL slug</span>
                <input
                  className="input mt-1"
                  value={shopFormData.slug || ''}
                  onChange={(event) => setShopForm({ ...shopFormData, slug: event.target.value })}
                  onBlur={(event) => setShopForm({ ...shopFormData, slug: slugifyShopName(event.target.value) })}
                />
              </label>
              <label className="block">
                <span className="label">Email</span>
                <input className="input mt-1" type="email" value={shopFormData.email || ''} onChange={(event) => setShopForm({ ...shopFormData, email: event.target.value })} />
              </label>
              <label className="block">
                <span className="label">Phone</span>
                <input className="input mt-1" value={shopFormData.phone || ''} onChange={(event) => setShopForm({ ...shopFormData, phone: event.target.value })} />
              </label>
              <label className="block">
                <span className="label">Address</span>
                <textarea className="input mt-1 min-h-20" value={shopFormData.address || ''} onChange={(event) => setShopForm({ ...shopFormData, address: event.target.value })} />
              </label>
              <div className="block">
                <span className="label">Shop logo</span>
                <div className="mt-1">
                  <ImageUploadField
                    value={shopFormData.logo_url || ''}
                    previewUrl={logoPreview}
                    uploading={uploadingLogo}
                    onFileSelect={handleLogoUpload}
                    onRemove={() => {
                      setShopForm({ ...shopFormData, logo_url: '' });
                      setLogoPreview('');
                    }}
                  />
                </div>
                <label className="mt-2 block">
                  <span className="text-xs text-slate-500">Or paste logo URL</span>
                  <input className="input mt-1" value={shopFormData.logo_url || ''} onChange={(event) => { setShopForm({ ...shopFormData, logo_url: event.target.value }); setLogoPreview(event.target.value); }} />
                </label>
              </div>
              <LoadingButton className="btn-primary" type="submit" loading={saving === 'shop'} loadingText="Saving..." icon={Save} disabled={uploadingLogo}>
                Save shop profile
              </LoadingButton>
            </form>
          </section>
          ) : (
            <section className="card p-5">
              <h2 className="text-base font-semibold">Shop profile</h2>
              <p className="mt-2 text-sm text-slate-500">Your shop is still loading or could not be found. Try refreshing.</p>
              <button className="btn-secondary mt-4" type="button" onClick={refetchShop}>Refresh shop</button>
            </section>
          )}

          <section className="card p-5">
            <h2 className="text-base font-semibold">Account</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Signed in as <a className="font-medium text-brand-700 hover:underline dark:text-brand-100" href={`mailto:${user?.email}`}>{user?.email}</a>
            </p>
            <form className="mt-5 space-y-4" onSubmit={handleProfileSubmit}>
              <label className="block">
                <span className="label">Your name</span>
                <input className="input mt-1" value={profileFormData.name} onChange={(event) => setProfileForm({ ...profileFormData, name: event.target.value })} />
              </label>
              <label className="block">
                <span className="label">Login email</span>
                <input className="input mt-1" type="email" value={profileFormData.email} onChange={(event) => setProfileForm({ ...profileFormData, email: event.target.value })} />
              </label>
              <LoadingButton className="btn-primary" type="submit" loading={saving === 'profile'} loadingText="Updating...">Update account</LoadingButton>
            </form>

            <form className="mt-8 space-y-4 border-t border-slate-200 pt-5 dark:border-slate-800" onSubmit={handlePasswordSubmit}>
              <label className="block">
                <span className="label">New password</span>
                <input className="input mt-1" type="password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} />
              </label>
              <LoadingButton className="btn-secondary" type="submit" disabled={!password} loading={saving === 'password'} loadingText="Updating...">Change password</LoadingButton>
            </form>

            <div className="mt-8 border-t border-slate-200 pt-5 dark:border-slate-800">
              <button className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700" type="button" onClick={() => setDeleteOpen(true)}>
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                Delete account
              </button>
            </div>
          </section>

          {isAdmin && settingsForm ? (
            <section className="card p-5 xl:col-span-2">
              <h2 className="text-base font-semibold">System settings (admin only)</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Global app configuration — not visible to shop clients.</p>
              <form className="mt-5 grid gap-4 md:grid-cols-3" onSubmit={handleSettingsSubmit}>
                <label className="block">
                  <span className="label">Site name</span>
                  <input className="input mt-1" value={settingsForm.site_name} onChange={(event) => setSettingsForm({ ...settingsForm, site_name: event.target.value })} />
                </label>
                <label className="block">
                  <span className="label">Currency</span>
                  <input className="input mt-1" maxLength={3} value={settingsForm.currency} onChange={(event) => setSettingsForm({ ...settingsForm, currency: event.target.value.toUpperCase() })} />
                </label>
                <label className="block">
                  <span className="label">Low stock threshold</span>
                  <input className="input mt-1" type="number" min="0" value={settingsForm.low_stock_threshold} onChange={(event) => setSettingsForm({ ...settingsForm, low_stock_threshold: event.target.value })} />
                </label>
                <div className="md:col-span-3">
                  <LoadingButton className="btn-primary" type="submit" loading={saving === 'settings'} loadingText="Saving..." icon={Save}>
                    Save system settings
                  </LoadingButton>
                </div>
              </form>
            </section>
          ) : null}
        </div>
      )}

      <Modal title="Delete account" open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">This removes your customer profile and signs you out.</p>
          <div className="flex justify-end gap-3">
            <button className="btn-secondary" type="button" onClick={() => setDeleteOpen(false)}>Cancel</button>
            <LoadingButton className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60" onClick={handleDeleteAccount} loading={saving === 'delete'} loadingText="Deleting...">Delete account</LoadingButton>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
