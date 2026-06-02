/**
 * Explicit, human-readable feature lists for each plan.
 * These are the labels shown on the Billing and Pricing pages.
 *
 * Order matters — features are displayed in the order they appear here.
 */
const PLAN_FEATURE_LABELS = {
  /** Basic plan — shown on billing/pricing pages */
  basic: [
    'Public Order Form',
    'Product Management',
    'Product Limit: 100',
    'Basic Reports',
    'Revenue Comparison',
  ],

  /** Alias for "basic" — the DB plan_id may be "normal" for legacy rows */
  normal: [
    'Public Order Form',
    'Product Management',
    'Product Limit: 100',
    'Basic Reports',
    'Revenue Comparison',
  ],

  /** Free plan (same as basic for display purposes) */
  free: [
    'Public Order Form',
    'Product Management',
    'Product Limit: 100',
    'Basic Reports',
    'Revenue Comparison',
  ],

  /** Pro plan */
  pro: [
    'Automation',
    'Product Limit Unlimited',
    'Custom Branding',
    'Advanced Reports',
    'Priority Support',
    'Order Form Customization',
  ],
};

/**
 * Returns the explicit list of human-readable feature labels for a given plan.
 *
 * @param {string} planId  - The plan identifier (e.g. "basic", "pro", "normal", "free").
 * @param {object} _features - Ignored; kept for backward-compat with call sites that
 *                             pass plan.features from the DB. The DB features object is
 *                             no longer used to derive display labels — labels are
 *                             defined explicitly above.
 * @returns {string[]} Array of human-readable feature label strings.
 */
export function getPlanFeatureLabels(planId, _features = {}) {
  const key = String(planId || 'basic').toLowerCase();
  return PLAN_FEATURE_LABELS[key] || PLAN_FEATURE_LABELS.basic;
}
