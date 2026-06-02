export const PLAN_FEATURES = {
  free: {
    // Core features available on Basic plan
    public_order_form: true,
    product_management: true,
    basic_reports: true,
    revenue_comparison: true,
    product_limit: 100,
    // NOT available on Basic
    shop_customization: false,
    order_form_customization: false,
    custom_templates: false,
    drag_drop_builder: false,
    conditional_fields: false,
    whatsapp_reminders: false,
    ai_auto_replies: false,
    customer_segmentation: false,
    shopify_integration: false,
    google_sheets_integration: false,
    payment_links: false,
    unlimited_reorder_history: false,
    b2b_approval: false,
    order_notifications: false,
    team_members: 1,
    reorder_days: 30,
  },
  pro: {
    // Core features available on Pro plan
    order_form: true,
    revenue_comparison: true,
    shop_customization: true,
    order_form_customization: true,
    custom_templates: true,
    order_notifications: true,
    drag_drop_builder: true,
    conditional_fields: true,
    whatsapp_reminders: true,
    ai_auto_replies: true,
    customer_segmentation: true,
    shopify_integration: true,
    google_sheets_integration: true,
    payment_links: true,
    unlimited_reorder_history: true,
    b2b_approval: true,
    team_members: 5,
    reorder_days: null,
    // NOT listed separately — included in "Order Form"
    public_order_form: false,
  },
};

export function getPlanFeatures(plan = 'free') {
  return PLAN_FEATURES[plan] || PLAN_FEATURES.free;
}

export function canUseFeature(plan, feature) {
  return Boolean(getPlanFeatures(plan)[feature]);
}

export function getRuleBasedAutoReply({ shopName, orderNumber, deliveryDate }) {
  const deliveryText = deliveryDate ? ` Your requested delivery date is ${deliveryDate}.` : '';
  return `Thank you for ordering from ${shopName}. We received order ${orderNumber}.${deliveryText} We will contact you when it is confirmed.`;
}
