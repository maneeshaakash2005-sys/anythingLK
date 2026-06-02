create extension if not exists "pgcrypto";

create table if not exists public.shops (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references auth.users(id) on delete cascade,
  shop_name text not null,
  slug text unique not null,
  logo_url text,
  primary_color text default '#0d9488',
  accent_color text default '#2563eb',
  phone text,
  email text,
  address text,
  subscription_plan text default 'free' check (subscription_plan in ('free', 'pro')),
  created_at timestamp default now()
);

alter table public.products add column if not exists shop_id uuid;
alter table public.customers add column if not exists shop_id uuid;
alter table public.orders add column if not exists shop_id uuid;
alter table public.order_items add column if not exists shop_id uuid;

do $$
begin
  alter table public.products
    add constraint products_shop_id_fkey
    foreign key (shop_id) references public.shops(id) on delete cascade;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.customers
    add constraint customers_shop_id_fkey
    foreign key (shop_id) references public.shops(id) on delete cascade;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.orders
    add constraint orders_shop_id_fkey
    foreign key (shop_id) references public.shops(id) on delete cascade;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.order_items
    add constraint order_items_shop_id_fkey
    foreign key (shop_id) references public.shops(id) on delete cascade;
exception
  when duplicate_object then null;
end $$;

create table if not exists public.shop_members (
  id uuid default gen_random_uuid() primary key,
  shop_id uuid references public.shops(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text default 'staff' check (role in ('admin', 'manager', 'staff')),
  created_at timestamp default now(),
  unique (shop_id, user_id)
);

create table if not exists public.order_form_settings (
  id uuid default gen_random_uuid() primary key,
  shop_id uuid references public.shops(id) on delete cascade not null unique,
  form_title text default 'Place your order',
  welcome_message text default 'Choose your products and submit your order.',
  thank_you_message text default 'Thank you. Your order has been received.',
  primary_color text default '#0d9488',
  accent_color text default '#2563eb',
  template_key text default 'clean',
  custom_schema jsonb default '{}'::jsonb,
  enabled_fields jsonb default '{"notes":true,"delivery_date":true,"address":true}'::jsonb,
  cash_on_delivery_enabled boolean default true,
  bank_transfer_enabled boolean default true,
  payment_slip_required boolean default false,
  reminder_enabled boolean default false,
  reminder_channel text default 'browser' check (reminder_channel in ('browser', 'email', 'telegram', 'whatsapp')),
  updated_at timestamp default now()
);

create table if not exists public.bank_accounts (
  id uuid default gen_random_uuid() primary key,
  shop_id uuid references public.shops(id) on delete cascade not null,
  bank_name text not null,
  account_name text not null,
  account_number text not null,
  branch text,
  is_active boolean default true,
  created_at timestamp default now()
);

create table if not exists public.order_form_templates (
  id uuid default gen_random_uuid() primary key,
  shop_id uuid references public.shops(id) on delete cascade,
  name text not null,
  template_key text not null,
  plan text default 'free' check (plan in ('free', 'pro')),
  config jsonb default '{}'::jsonb,
  is_premade boolean default false,
  created_at timestamp default now()
);

create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  shop_id uuid references public.shops(id) on delete cascade not null,
  type text not null,
  title text not null,
  message text,
  metadata jsonb default '{}'::jsonb,
  read_at timestamp,
  created_at timestamp default now()
);

create table if not exists public.customer_segments (
  id uuid default gen_random_uuid() primary key,
  shop_id uuid references public.shops(id) on delete cascade not null,
  customer_id uuid references public.customers(id) on delete cascade not null,
  segment text not null check (segment in ('VIP', 'repeat', 'inactive', 'high_spender')),
  calculated_at timestamp default now(),
  unique (shop_id, customer_id, segment)
);

alter table public.products
  add column if not exists is_active boolean default true,
  add column if not exists public_visible boolean default true;

alter table public.customers
  add column if not exists phone text,
  add column if not exists address text,
  add column if not exists last_order_at timestamp;

alter table public.orders
  add column if not exists customer_name text,
  add column if not exists customer_phone text,
  add column if not exists delivery_address text,
  add column if not exists notes text,
  add column if not exists delivery_date date,
  add column if not exists payment_method text default 'cash_on_delivery' check (payment_method in ('cash_on_delivery', 'bank_transfer')),
  add column if not exists payment_status text default 'pending' check (payment_status in ('pending', 'submitted', 'verified', 'failed')),
  add column if not exists payment_slip_url text,
  add column if not exists reminder_status text default 'not_scheduled' check (reminder_status in ('not_scheduled', 'scheduled', 'sent', 'failed')),
  add column if not exists approval_status text default 'not_required' check (approval_status in ('not_required', 'pending', 'approved', 'rejected'));

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders
  add constraint orders_status_check
  check (status in ('Pending', 'Paid', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled', 'Failed'));

create or replace function public.slugify(value text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(coalesce(value, 'shop')), '[^a-z0-9]+', '-', 'g'));
$$;

create or replace function public.user_has_shop_access(target_shop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.shops
    where shops.id = target_shop_id
      and shops.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.shop_members
    where shop_members.shop_id = target_shop_id
      and shop_members.user_id = auth.uid()
  )
  or public.is_admin();
$$;

create or replace function public.user_has_feature(target_shop_id uuid, feature_key text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  plan_name text;
begin
  select subscription_plan into plan_name
  from public.shops
  where id = target_shop_id;

  if plan_name = 'pro' then
    return true;
  end if;

  return feature_key in (
    'fixed_templates',
    'single_admin',
    'reorder_30_days',
    'basic_dashboard',
    'cash_on_delivery',
    'bank_transfer'
  );
end;
$$;

create or replace function public.ensure_default_shop_for_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_slug text;
  final_slug text;
begin
  base_slug := public.slugify(coalesce(new.raw_user_meta_data ->> 'shop_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)));
  final_slug := base_slug;

  while exists (select 1 from public.shops where slug = final_slug) loop
    final_slug := base_slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 5);
  end loop;

  insert into public.shops (owner_id, shop_name, slug, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'shop_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    final_slug,
    new.email
  )
  on conflict do nothing;

  insert into public.shop_members (shop_id, user_id, role)
  select id, new.id, 'admin'
  from public.shops
  where owner_id = new.id
  on conflict do nothing;

  insert into public.order_form_settings (shop_id)
  select id
  from public.shops
  where owner_id = new.id
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_shop_created on auth.users;
create trigger on_auth_user_shop_created
after insert on auth.users
for each row execute function public.ensure_default_shop_for_user();

create or replace function public.create_public_order(
  p_shop_slug text,
  p_customer jsonb,
  p_items jsonb,
  p_payment_method text,
  p_payment_slip_url text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop public.shops;
  v_settings public.order_form_settings;
  v_customer public.customers;
  v_order public.orders;
  v_item jsonb;
  v_product public.products;
  v_quantity int;
  v_total decimal(10,2) := 0;
  v_payment_status text := 'pending';
begin
  select * into v_shop from public.shops where slug = p_shop_slug;
  if not found then
    raise exception 'Shop not found';
  end if;

  select * into v_settings from public.order_form_settings where shop_id = v_shop.id;

  if p_payment_method = 'cash_on_delivery' and coalesce(v_settings.cash_on_delivery_enabled, true) = false then
    raise exception 'Cash on delivery is not available';
  end if;

  if p_payment_method = 'bank_transfer' and coalesce(v_settings.bank_transfer_enabled, true) = false then
    raise exception 'Bank transfer is not available';
  end if;

  if p_payment_method = 'bank_transfer' and coalesce(v_settings.payment_slip_required, false) = true and coalesce(p_payment_slip_url, '') = '' then
    raise exception 'Payment slip is required';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one product is required';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item ->> 'quantity')::int;
    if v_quantity <= 0 then
      raise exception 'Quantity must be greater than zero';
    end if;

    select * into v_product
    from public.products
    where id = (v_item ->> 'product_id')::uuid
      and shop_id = v_shop.id
      and is_active = true
      and public_visible = true
    for update;

    if not found then
      raise exception 'Product not found';
    end if;

    if v_product.stock_quantity < v_quantity then
      raise exception 'Insufficient stock for %', v_product.name;
    end if;

    v_total := v_total + (v_product.price * v_quantity);
  end loop;

  insert into public.customers (shop_id, name, email, phone, address, status, last_order_at)
  values (
    v_shop.id,
    p_customer ->> 'name',
    coalesce(nullif(p_customer ->> 'email', ''), 'guest-' || replace(gen_random_uuid()::text, '-', '') || '@orderbase.local'),
    p_customer ->> 'phone',
    p_customer ->> 'address',
    'active',
    now()
  )
  on conflict (email) do update
    set name = excluded.name,
        phone = excluded.phone,
        address = excluded.address,
        last_order_at = now()
  returning * into v_customer;

  if p_payment_method = 'bank_transfer' and coalesce(p_payment_slip_url, '') <> '' then
    v_payment_status := 'submitted';
  end if;

  insert into public.orders (
    shop_id,
    order_number,
    customer_id,
    customer_name,
    customer_phone,
    delivery_address,
    notes,
    delivery_date,
    total_amount,
    status,
    payment_method,
    payment_status,
    payment_slip_url,
    reminder_status
  )
  values (
    v_shop.id,
    'OB-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
    v_customer.id,
    p_customer ->> 'name',
    p_customer ->> 'phone',
    p_customer ->> 'address',
    p_customer ->> 'notes',
    nullif(p_customer ->> 'delivery_date', '')::date,
    v_total,
    'Pending',
    p_payment_method,
    v_payment_status,
    p_payment_slip_url,
    case when coalesce(v_settings.reminder_enabled, false) then 'scheduled' else 'not_scheduled' end
  )
  returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item ->> 'quantity')::int;

    select * into v_product
    from public.products
    where id = (v_item ->> 'product_id')::uuid
      and shop_id = v_shop.id
    for update;

    update public.products
    set stock_quantity = stock_quantity - v_quantity,
        sales_volume = sales_volume + v_quantity
    where id = v_product.id
      and stock_quantity >= v_quantity;

    insert into public.order_items (shop_id, order_id, product_id, quantity, price_at_time)
    values (v_shop.id, v_order.id, v_product.id, v_quantity, v_product.price);
  end loop;

  insert into public.notifications (shop_id, type, title, message, metadata)
  values (
    v_shop.id,
    'new_order',
    'New order received',
    'Order ' || v_order.order_number || ' was submitted from the public order form.',
    jsonb_build_object('order_id', v_order.id, 'payment_status', v_order.payment_status)
  );

  return v_order;
end;
$$;

grant execute on function public.create_public_order(text, jsonb, jsonb, text, text) to anon, authenticated;
grant execute on function public.user_has_feature(uuid, text) to authenticated;

insert into public.order_form_templates (name, template_key, plan, is_premade, config)
values
  ('Clean', 'clean', 'free', true, '{"layout":"single_column","radius":"md"}'),
  ('Compact', 'compact', 'free', true, '{"layout":"compact","density":"high"}'),
  ('Catalog', 'catalog', 'free', true, '{"layout":"grid","showImages":true}'),
  ('Minimal', 'minimal', 'free', true, '{"layout":"single_column","showLogo":false}'),
  ('Delivery First', 'delivery-first', 'free', true, '{"layout":"delivery","highlightDeliveryDate":true}'),
  ('Custom Builder', 'custom-builder', 'pro', false, '{"dragDrop":true,"conditionalFields":true}')
on conflict do nothing;

insert into storage.buckets (id, name, public)
values
  ('shop-assets', 'shop-assets', true),
  ('payment-slips', 'payment-slips', false),
  ('product-images', 'product-images', true)
on conflict (id) do nothing;

alter table public.shops enable row level security;
alter table public.shop_members enable row level security;
alter table public.order_form_settings enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.order_form_templates enable row level security;
alter table public.notifications enable row level security;
alter table public.customer_segments enable row level security;

drop policy if exists "Public can read shop by slug" on public.shops;
create policy "Public can read shop by slug"
on public.shops for select
to anon, authenticated
using (true);

drop policy if exists "Owners manage shops" on public.shops;
create policy "Owners manage shops"
on public.shops for all
to authenticated
using (owner_id = auth.uid() or public.is_admin())
with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists "Members read shop members" on public.shop_members;
create policy "Members read shop members"
on public.shop_members for select
to authenticated
using (public.user_has_shop_access(shop_id));

drop policy if exists "Owners manage shop members" on public.shop_members;
create policy "Owners manage shop members"
on public.shop_members for all
to authenticated
using (public.user_has_shop_access(shop_id))
with check (public.user_has_shop_access(shop_id));

drop policy if exists "Public can read order form settings" on public.order_form_settings;
create policy "Public can read order form settings"
on public.order_form_settings for select
to anon, authenticated
using (true);

drop policy if exists "Shop members manage form settings" on public.order_form_settings;
create policy "Shop members manage form settings"
on public.order_form_settings for all
to authenticated
using (public.user_has_shop_access(shop_id))
with check (public.user_has_shop_access(shop_id));

drop policy if exists "Public can read active bank accounts" on public.bank_accounts;
create policy "Public can read active bank accounts"
on public.bank_accounts for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Shop members manage bank accounts" on public.bank_accounts;
create policy "Shop members manage bank accounts"
on public.bank_accounts for all
to authenticated
using (public.user_has_shop_access(shop_id))
with check (public.user_has_shop_access(shop_id));

drop policy if exists "Public reads premade templates" on public.order_form_templates;
create policy "Public reads premade templates"
on public.order_form_templates for select
to anon, authenticated
using (is_premade = true or shop_id is null or public.user_has_shop_access(shop_id));

drop policy if exists "Pro shops manage custom templates" on public.order_form_templates;
create policy "Pro shops manage custom templates"
on public.order_form_templates for all
to authenticated
using (shop_id is not null and public.user_has_shop_access(shop_id) and public.user_has_feature(shop_id, 'custom_templates'))
with check (shop_id is not null and public.user_has_shop_access(shop_id) and public.user_has_feature(shop_id, 'custom_templates'));

drop policy if exists "Shop members read notifications" on public.notifications;
create policy "Shop members read notifications"
on public.notifications for select
to authenticated
using (public.user_has_shop_access(shop_id));

drop policy if exists "Shop members update notifications" on public.notifications;
create policy "Shop members update notifications"
on public.notifications for update
to authenticated
using (public.user_has_shop_access(shop_id))
with check (public.user_has_shop_access(shop_id));

drop policy if exists "Shop members read customer segments" on public.customer_segments;
create policy "Shop members read customer segments"
on public.customer_segments for select
to authenticated
using (public.user_has_shop_access(shop_id) and public.user_has_feature(shop_id, 'customer_segmentation'));

drop policy if exists "Public can read shop products" on public.products;
create policy "Public can read shop products"
on public.products for select
to anon, authenticated
using (shop_id is not null and is_active = true and public_visible = true);

drop policy if exists "Shop members manage products" on public.products;
create policy "Shop members manage products"
on public.products for all
to authenticated
using (shop_id is not null and public.user_has_shop_access(shop_id))
with check (shop_id is not null and public.user_has_shop_access(shop_id));

drop policy if exists "Shop members read customers" on public.customers;
create policy "Shop members read customers"
on public.customers for select
to authenticated
using ((shop_id is not null and public.user_has_shop_access(shop_id)) or user_id = auth.uid() or public.is_admin());

drop policy if exists "Shop members manage customers" on public.customers;
create policy "Shop members manage customers"
on public.customers for all
to authenticated
using ((shop_id is not null and public.user_has_shop_access(shop_id)) or user_id = auth.uid() or public.is_admin())
with check ((shop_id is not null and public.user_has_shop_access(shop_id)) or user_id = auth.uid() or public.is_admin());

drop policy if exists "Shop members read orders" on public.orders;
create policy "Shop members read orders"
on public.orders for select
to authenticated
using (shop_id is not null and public.user_has_shop_access(shop_id));

drop policy if exists "Shop members manage orders" on public.orders;
create policy "Shop members manage orders"
on public.orders for all
to authenticated
using (shop_id is not null and public.user_has_shop_access(shop_id))
with check (shop_id is not null and public.user_has_shop_access(shop_id));

drop policy if exists "Shop members read order items" on public.order_items;
create policy "Shop members read order items"
on public.order_items for select
to authenticated
using (shop_id is not null and public.user_has_shop_access(shop_id));

drop policy if exists "Shop members manage order items" on public.order_items;
create policy "Shop members manage order items"
on public.order_items for all
to authenticated
using (shop_id is not null and public.user_has_shop_access(shop_id))
with check (shop_id is not null and public.user_has_shop_access(shop_id));

drop policy if exists "Public uploads payment slips" on storage.objects;
create policy "Public uploads payment slips"
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'payment-slips');

drop policy if exists "Shop assets public read" on storage.objects;
create policy "Shop assets public read"
on storage.objects for select
to anon, authenticated
using (bucket_id in ('shop-assets', 'product-images'));

drop policy if exists "Authenticated uploads shop assets" on storage.objects;
create policy "Authenticated uploads shop assets"
on storage.objects for insert
to authenticated
with check (bucket_id in ('shop-assets', 'product-images'));

create index if not exists idx_shops_owner_id on public.shops(owner_id);
create index if not exists idx_shops_slug on public.shops(slug);
create index if not exists idx_products_shop_id on public.products(shop_id);
create index if not exists idx_customers_shop_id on public.customers(shop_id);
create index if not exists idx_orders_shop_id on public.orders(shop_id);
create index if not exists idx_order_items_shop_id on public.order_items(shop_id);
create index if not exists idx_notifications_shop_id on public.notifications(shop_id);

alter table public.orders replica identity full;
alter table public.notifications replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
end $$;

create or replace function public.create_order_with_items(
  p_customer_id uuid,
  p_status varchar,
  p_items jsonb
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_item jsonb;
  v_product public.products;
  v_quantity int;
  v_total decimal(10,2) := 0;
  v_customer_user uuid;
  v_shop_id uuid;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one order item is required';
  end if;

  select user_id, shop_id into v_customer_user, v_shop_id from public.customers where id = p_customer_id;

  if v_customer_user is null then
    if not public.is_admin() then
      raise exception 'Customer is not linked to the current user';
    end if;
  elsif v_customer_user <> auth.uid() and not public.is_admin() then
    raise exception 'You can only create orders for your customer profile';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item ->> 'quantity')::int;
    if v_quantity <= 0 then
      raise exception 'Quantity must be greater than zero';
    end if;

    select * into v_product
    from public.products
    where id = (v_item ->> 'product_id')::uuid
    for update;

    if not found then
      raise exception 'Product not found';
    end if;

    if v_product.stock_quantity < v_quantity then
      raise exception 'Insufficient stock for %', v_product.name;
    end if;

    v_total := v_total + (v_product.price * v_quantity);
  end loop;

  insert into public.orders (shop_id, order_number, customer_id, total_amount, status)
  values (
    v_shop_id,
    'OB-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
    p_customer_id,
    v_total,
    coalesce(nullif(p_status, ''), 'Pending')
  )
  returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item ->> 'quantity')::int;

    select * into v_product
    from public.products
    where id = (v_item ->> 'product_id')::uuid
    for update;

    update public.products
    set stock_quantity = stock_quantity - v_quantity,
        sales_volume = sales_volume + v_quantity
    where id = v_product.id
      and stock_quantity >= v_quantity;

    if not found then
      raise exception 'Insufficient stock for %', v_product.name;
    end if;

    insert into public.order_items (shop_id, order_id, product_id, quantity, price_at_time)
    values (v_shop_id, v_order.id, v_product.id, v_quantity, v_product.price);
  end loop;

  if v_order.status = 'Paid' then
    update public.customers
    set total_spent = total_spent + v_order.total_amount
    where id = p_customer_id;
  end if;

  return v_order;
end;
$$;
