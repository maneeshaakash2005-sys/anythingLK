-- fix_templates.sql
-- This script ensures all premade Pro templates exist in the order_form_templates table
-- and removes duplicate entries for Basic templates.

-- 1. Insert missing Pro templates (list must match PREMADE_TEMPLATES entries with plan='pro')
INSERT INTO order_form_templates (shop_id, name, template_key, plan, is_premade, config, created_at, updated_at)
SELECT NULL, name, template_key, 'pro', true, config::jsonb, now(), now()
FROM (
  VALUES
    ('Luxury Brand', 'luxury', '{"layout":"grid","premium":true,"showImages":true}'),
    ('Beauty & Cosmetics', 'beauty', '{"layout":"grid","soft":true,"showImages":true}'),
    ('Electronics Store', 'electronics', '{"layout":"grid","specs":true,"showImages":true}'),
    ('Furniture Store', 'furniture', '{"layout":"list","showImages":true}'),
    ('Food Ordering', 'food', '{"layout":"grid","quickAdd":true,"showImages":true}'),
    ('Fashion Boutique', 'fashion', '{"layout":"grid","editorial":true,"showImages":true}'),
    ('Pharmacy Store', 'pharmacy', '{"layout":"list","showImages":true}'),
    ('Digital Products', 'digital', '{"layout":"grid","instantDelivery":true,"showImages":true}'),
    ('Restaurant Ordering', 'restaurant', '{"layout":"grid","menu":true,"showImages":true}'),
    ('Premium Business', 'premium-business', '{"layout":"list","b2b":true,"showImages":true}')
) AS t(name, template_key, config)
WHERE NOT EXISTS (
  SELECT 1 FROM order_form_templates
  WHERE template_key = t.template_key AND is_premade = true
);

-- 2. Delete duplicate Basic templates (keep the earliest created_at)
WITH ranked AS (
  SELECT id,
         template_key,
         ROW_NUMBER() OVER (PARTITION BY template_key ORDER BY created_at ASC) AS rn
  FROM order_form_templates
  WHERE plan = 'free' AND is_premade = true
)
DELETE FROM order_form_templates
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
