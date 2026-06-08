import toast from 'react-hot-toast';
import DashboardLayout from '../components/DashboardLayout';
import LoadingButton from '../components/LoadingButton';
import LoadingSkeleton from '../components/LoadingSkeleton';
import RetryState from '../components/RetryState';
import FeatureGate from '../components/templates/FeatureGate';
import TemplateCard from '../components/templates/TemplateCard';
import { useShop } from '../hooks/useShop';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const PREMADE_TEMPLATES = [
  { id: 'premade-classic', name: 'Classic Store', template_key: 'classic', plan: 'free', is_premade: true, config: { layout: 'list', radius: 'sm', showImages: true } },
  { id: 'premade-modern', name: 'Modern Store', template_key: 'modern', plan: 'free', is_premade: true, config: { layout: 'grid', radius: 'lg', showImages: true } },
  { id: 'premade-minimal-store', name: 'Minimal Store', template_key: 'minimal', plan: 'free', is_premade: true, config: { layout: 'single_column', showLogo: false, showImages: true } },
  { id: 'premade-mobile-commerce', name: 'Mobile Commerce', template_key: 'mobile-commerce', plan: 'free', is_premade: true, config: { layout: 'mobile', density: 'high', showImages: true } },
  { id: 'premade-luxury', name: 'Luxury Brand', template_key: 'luxury', plan: 'pro', is_premade: true, config: { layout: 'grid', premium: true, showImages: true } },
  { id: 'premade-beauty', name: 'Beauty & Cosmetics', template_key: 'beauty', plan: 'pro', is_premade: true, config: { layout: 'grid', soft: true, showImages: true } },
  { id: 'premade-electronics', name: 'Electronics Store', template_key: 'electronics', plan: 'pro', is_premade: true, config: { layout: 'grid', specs: true, showImages: true } },
  { id: 'premade-furniture', name: 'Furniture Store', template_key: 'furniture', plan: 'pro', is_premade: true, config: { layout: 'list', showImages: true } },
  { id: 'premade-food', name: 'Food Ordering', template_key: 'food', plan: 'pro', is_premade: true, config: { layout: 'grid', quickAdd: true, showImages: true } },
  { id: 'premade-fashion', name: 'Fashion Boutique', template_key: 'fashion', plan: 'pro', is_premade: true, config: { layout: 'grid', editorial: true, showImages: true } },
  { id: 'premade-pharmacy', name: 'Pharmacy Store', template_key: 'pharmacy', plan: 'pro', is_premade: true, config: { layout: 'list', showImages: true } },
  { id: 'premade-digital', name: 'Digital Products', template_key: 'digital', plan: 'pro', is_premade: true, config: { layout: 'grid', instantDelivery: true, showImages: true } },
  { id: 'premade-restaurant', name: 'Restaurant Ordering', template_key: 'restaurant', plan: 'pro', is_premade: true, config: { layout: 'grid', menu: true, showImages: true } },
  { id: 'premade-premium-business', name: 'Premium Business', template_key: 'premium-business', plan: 'pro', is_premade: true, config: { layout: 'list', b2b: true, showImages: true } },
  { id: 'premade-compact', name: 'Compact Store', template_key: 'compact', plan: 'free', is_premade: true, config: { layout: 'grid', density: 'compact', showImages: true } },
];

// Development helper: verify that PREMADE_TEMPLATES matches the records in Supabase (only runs in dev mode)
function syncPremadeTemplates() {
  if (process.env.NODE_ENV !== 'development') return;
  // Fetch premade templates from Supabase and compare keys
  supabase
    .from('order_form_templates')
    .select('template_key, plan, is_premade')
    .eq('is_premade', true)
    .then(({ data, error }) => {
      if (error) {
        console.error('Template sync error:', error);
        return;
      }
      const dbKeys = data.map((t) => t.template_key);
      const localKeys = PREMADE_TEMPLATES.map((t) => t.template_key);
      const missing = localKeys.filter((k) => !dbKeys.includes(k));
      const extra = dbKeys.filter((k) => !localKeys.includes(k));
      if (missing.length || extra.length) {
        console.warn('Template mismatches detected', { missing, extra });
      }
    });
}

// Call sync on module load (dev only)
if (process.env.NODE_ENV === 'development') {
  syncPremadeTemplates();
}

export default function Templates() {
  const { shop, settings, features, loading: shopLoading, updateFormSettings } = useShop();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [newTemplate, setNewTemplate] = useState({ name: '', config: '{}' });
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [selectingTemplateKey, setSelectingTemplateKey] = useState('');

  function toTemplateKey(name) {
    return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  useEffect(() => {
    if (shopLoading) return;

    async function fetchTemplates() {
      setLoading(true);
      setError(null);
      try {
        // Fetch templates
        const baseQuery = supabase
          .from('order_form_templates')
          .select('*')
          .order('created_at', { ascending: true });
        const query = shop?.id
          ? baseQuery.or(`is_premade.eq.true,shop_id.eq.${shop.id}`)
          : baseQuery.eq('is_premade', true);
        const { data, error: templateError } = await query;

        if (templateError) throw templateError;

        let filtered = (data || []).filter((template) => template?.is_premade === true || template?.shop_id === shop?.id);

        if (filtered.length === 0) {
          filtered = PREMADE_TEMPLATES;
        }

        // Remove duplicate template_key entries while preserving order
const uniqueTemplates = Array.from(new Map(filtered.map((t) => [t.template_key, t])).values());
setTemplates(uniqueTemplates);

      } catch (caughtError) {
        setError(caughtError);
      } finally {
        setLoading(false);
      }
    }

    fetchTemplates();
  }, [shop?.id, shopLoading, retryCount]);

  async function selectTemplate(template) {
    if (selectingTemplateKey) return;
    if (template.plan === 'pro' && !features?.custom_templates) {
      toast.error('Upgrade to PRO to use custom templates.');
      return;
    }
    setSelectingTemplateKey(template.template_key);
    try {
      await updateFormSettings({ ...settings, template_key: template.template_key });
      toast.success('Template selected');
    } catch (caughtError) {
      toast.error(caughtError.message);
    } finally {
      setSelectingTemplateKey('');
    }
  }

  async function createTemplate(event) {
    event.preventDefault();
    if (!shop?.id) {
      toast.error('Shop is still loading. Try again in a moment.');
      return;
    }
    if (!features?.custom_templates) {
      toast.error('Upgrade to PRO to create custom templates.');
      return;
    }

    const trimmedName = newTemplate.name.trim();
    if (!trimmedName) {
      toast.error('Template name is required.');
      return;
    }

    let parsedConfig = {};
    if (newTemplate.config.trim()) {
      try {
        parsedConfig = JSON.parse(newTemplate.config);
      } catch {
        toast.error('Template config must be valid JSON.');
        return;
      }
    }

    setSavingTemplate(true);
    try {
      const templateKey = `${toTemplateKey(trimmedName) || 'custom-template'}-${Date.now().toString(36)}`;
      const { data, error: insertError } = await supabase
        .from('order_form_templates')
        .insert({
          shop_id: shop.id,
          name: trimmedName,
          template_key: templateKey,
          plan: 'pro',
          is_premade: false,
          config: parsedConfig,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      setTemplates((current) => [...current, data]);
      setNewTemplate({ name: '', config: '{}' });
      toast.success('Template created');
    } catch (caughtError) {
      toast.error(caughtError.message);
    } finally {
      setSavingTemplate(false);
    }
  }

  const isLoading = shopLoading || loading;

  return (
    <DashboardLayout title="Templates">
      {error ? (
        <RetryState message={error.message} onRetry={() => setRetryCount((c) => c + 1)} />
      ) : isLoading ? (
        <LoadingSkeleton rows={8} />
      ) : (
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="text-base font-semibold">Order form templates</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              FREE plans can use the 5 premade templates. PRO unlocks custom builder controls.
            </p>

            {templates.length === 0 ? (
              <p className="mt-6 text-sm text-slate-400 dark:text-slate-500">
                No templates found.
              </p>
            ) : (
              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {templates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    selected={settings?.template_key === template.template_key}
                    locked={template.plan === 'pro' && !features?.custom_templates}
                    selecting={selectingTemplateKey === template.template_key}
                    onSelect={() => selectTemplate(template)}
                    onDemo={() => {
                      window.open(`${window.location.origin}/template-preview/${template.template_key}`, '_blank', 'noopener,noreferrer');
                    }}
                    onPreview={() => {
                      document.getElementById(`template-preview-${template.template_key}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }}
                  />
                ))}
              </div>
            )}
          </section>

          <FeatureGate allowed={features?.drag_drop_builder} featureName="Drag-and-drop template builder">
            <section className="card p-5">
              <h2 className="text-base font-semibold">Custom builder</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {['Product grid', 'Customer details', 'Payment details', 'Delivery date', 'Notes', 'Thank you message'].map((section) => (
                  <div
                    key={section}
                    className="rounded-md border border-dashed border-slate-300 p-4 text-sm dark:border-slate-700"
                  >
                    {section}
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                Builder metadata is stored in <code>order_form_settings.custom_schema</code> for future drag-and-drop editing.
              </p>
            </section>
          </FeatureGate>

          <FeatureGate allowed={features?.custom_templates} featureName="Custom templates">
            <section className="card p-5">
              <h2 className="text-base font-semibold">Create custom template</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Save reusable templates for your own shop only.
              </p>
              <form className="mt-4 space-y-4" onSubmit={createTemplate}>
                <label className="block">
                  <span className="label">Template name</span>
                  <input
                    className="input mt-1"
                    value={newTemplate.name}
                    onChange={(event) => setNewTemplate((current) => ({ ...current, name: event.target.value }))}
                    placeholder="My custom layout"
                  />
                </label>
                <label className="block">
                  <span className="label">Config (JSON)</span>
                  <textarea
                    className="input mt-1 min-h-24 font-mono text-xs"
                    value={newTemplate.config}
                    onChange={(event) => setNewTemplate((current) => ({ ...current, config: event.target.value }))}
                  />
                </label>
                <LoadingButton className="btn-primary" type="submit" loading={savingTemplate} loadingText="Saving...">
                  Save template
                </LoadingButton>
              </form>
            </section>
          </FeatureGate>
        </div>
      )}
    </DashboardLayout>
  );
}
