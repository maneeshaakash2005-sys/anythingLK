import { Check, Eye, Lock, Monitor, Smartphone } from 'lucide-react';
import { getTemplateScreenshotUrl } from '../../lib/templateScreenshots';
import LoadingButton from '../LoadingButton';

const TEMPLATE_META = {
  classic: {
    category: 'Basic',
    features: ['Traditional storefront layout', 'Image rows with quick add', 'Order summary and checkout'],
  },
  modern: {
    category: 'Basic',
    features: ['Bold visual product grid', 'Responsive checkout panel', 'Modern color treatment'],
  },
  minimal: {
    category: 'Basic',
    features: ['Low-distraction layout', 'Clean product cards', 'Fast mobile checkout'],
  },
  'mobile-commerce': {
    category: 'Basic',
    features: ['Thumb-friendly mobile design', 'Compact cards', 'Sticky-style checkout flow'],
  },
  luxury: {
    category: 'Pro',
    features: ['Premium dark layout', 'Editorial product cards', 'High-end checkout styling'],
  },
  beauty: {
    category: 'Pro',
    features: ['Soft cosmetic palette', 'Image-first product grid', 'Elegant checkout section'],
  },
  electronics: {
    category: 'Pro',
    features: ['Dark tech storefront', 'Spec-friendly cards', 'High-contrast order summary'],
  },
  furniture: {
    category: 'Pro',
    features: ['Warm showroom layout', 'Large product imagery', 'Room-focused checkout flow'],
  },
  food: {
    category: 'Pro',
    features: ['Fast menu ordering', 'Quick add product cards', 'Delivery-ready summary'],
  },
  fashion: {
    category: 'Pro',
    features: ['Boutique visual grid', 'Editorial product cards', 'Polished checkout styling'],
  },
  pharmacy: {
    category: 'Pro',
    features: ['Clear health-store layout', 'Readable product rows', 'Trust-focused checkout'],
  },
  digital: {
    category: 'Pro',
    features: ['Instant-delivery feel', 'Download-focused cards', 'Compact digital checkout'],
  },
  restaurant: {
    category: 'Pro',
    features: ['Menu-style grid', 'Warm restaurant colors', 'Order-ahead checkout'],
  },
  'premium-business': {
    category: 'Pro',
    features: ['Professional B2B layout', 'Structured product rows', 'Business checkout section'],
  },
};

function getMeta(template) {
  return TEMPLATE_META[template.template_key] || {
    category: template.is_premade ? 'Premade' : 'Custom',
    features: ['Reusable layout', 'Saved configuration', 'Shop-specific styling'],
  };
}

function WireframePreview({ mode, templateKey }) {
  const isCatalog = templateKey?.includes('catalog');
  const isCompact = templateKey?.includes('compact');
  return (
    <div className="space-y-1">
      <div className="h-2 w-2/3 rounded bg-slate-300 dark:bg-slate-700" />
      <div className={`grid gap-1 ${isCatalog && mode === 'desktop' ? 'grid-cols-3' : isCompact ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {Array.from({ length: isCatalog ? 6 : 3 }).map((_, index) => (
          <div key={index} className="rounded bg-white p-1 dark:bg-slate-900">
            <div className="h-7 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="mt-1 h-1.5 w-3/4 rounded bg-slate-300 dark:bg-slate-700" />
          </div>
        ))}
      </div>
      <div className="h-5 rounded bg-brand-600/80" />
    </div>
  );
}

function Preview({ mode, templateKey, templateName }) {
  const screenshotUrl = getTemplateScreenshotUrl(templateKey, mode);
  const label = `${templateName} ${mode} preview`;

  return (
    <div className={`overflow-hidden rounded-md border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950 ${mode === 'mobile' ? 'w-[120px] shrink-0' : 'min-w-0 flex-1'}`}>
      <div className="flex items-center gap-1 border-b border-slate-200 bg-white px-2 py-1.5 text-[10px] font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900">
        {mode === 'mobile' ? <Smartphone className="h-3 w-3" aria-hidden="true" /> : <Monitor className="h-3 w-3" aria-hidden="true" />}
        {mode}
      </div>
      {screenshotUrl ? (
        <img
          src={screenshotUrl}
          alt={label}
          className={`block w-full object-cover object-top ${mode === 'mobile' ? 'h-[140px]' : 'h-[120px]'}`}
          loading="lazy"
        />
      ) : (
        <div className="p-2">
          <WireframePreview mode={mode} templateKey={templateKey} />
        </div>
      )}
    </div>
  );
}

export default function TemplateCard({ template, selected, locked, selecting, onSelect, onPreview, onDemo }) {
  const meta = getMeta(template);

  return (
    <article className={`group rounded-xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${selected ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/20 dark:bg-brand-500/10' : 'border-slate-200 bg-white hover:border-brand-300 dark:border-slate-800 dark:bg-slate-900'} ${locked ? 'opacity-75' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{template.name}</h3>
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">{meta.category}</span>
            <span className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${template.plan === 'pro' ? 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-100' : 'bg-brand-100 text-brand-800 dark:bg-brand-500/20 dark:text-brand-100'}`}>
              {template.plan === 'pro' ? 'PRO' : template.plan}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Includes responsive order form sections and payment controls.</p>
        </div>
        {locked ? <Lock className="h-4 w-4 text-slate-400" aria-hidden="true" /> : selected ? <Check className="h-4 w-4 text-brand-600" aria-hidden="true" /> : null}
      </div>

      <div id={`template-preview-${template.template_key}`} className="mt-4 flex flex-col gap-3 scroll-mt-4 sm:flex-row">
        <Preview mode="mobile" templateKey={template.template_key} templateName={template.name} />
        <Preview mode="desktop" templateKey={template.template_key} templateName={template.name} />
      </div>

      <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
        {meta.features.map((feature) => (
          <li key={feature} className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            {feature}
          </li>
        ))}
      </ul>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <button type="button" className="btn-secondary px-3" onClick={onDemo}>
          <Monitor className="h-4 w-4" aria-hidden="true" />
          Demo
        </button>
        <button type="button" className="btn-secondary px-3" onClick={onPreview}>
          <Eye className="h-4 w-4" aria-hidden="true" />
          Preview
        </button>
        <LoadingButton className="btn-primary px-3" disabled={locked || selected} loading={selecting} loadingText="Applying..." onClick={onSelect}>
          {selected ? 'In use' : 'Use template'}
        </LoadingButton>
      </div>
    </article>
  );
}
