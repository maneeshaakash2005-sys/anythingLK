-- Repair schema drift for notifications and add delivery_date_enabled setting.
-- Safe to run multiple times.

create extension if not exists "pgcrypto";

create or replace function public.normalize_shop_slug(value text)
returns text
language sql
immutable
as $$
  select regexp_replace(lower(coalesce(value, '')), '[^a-z0-9]+', '', 'g');
$$;

create or replace function public.resolve_shop_by_slug(p_shop_slug text)
returns public.shops
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop public.shops;
  v_input text := public.normalize_shop_slug(p_shop_slug);
begin
  if v_input = '' then
    return null;
  end if;

  select *
  into v_shop
  from public.shops
  where slug = p_shop_slug
  limit 1;

  if found then
    return v_shop;
  end if;

  select *
  into v_shop
  from public.shops
  where public.normalize_shop_slug(slug) = v_input
  order by created_at asc
  limit 1;

  return v_shop;
end;
$$;

grant execute on function public.resolve_shop_by_slug(text) to anon, authenticated;

alter table if exists public.notifications
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists shop_id uuid,
  add column if not exists user_id uuid,
  add column if not exists subject text default 'New Order',
  add column if not exists type text default 'info',
  add column if not exists title text default 'Notification',
  add column if not exists message text,
  add column if not exists recipient_email text default 'notification@orderbase.local',
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists is_read boolean default false,
  add column if not exists read_at timestamp,
  add column if not exists created_at timestamp default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'notifications'
      and column_name = 'recipient_email'
  ) then
    execute 'alter table public.notifications alter column recipient_email set default ''notification@orderbase.local''';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'notifications'
      and c.contype = 'p'
  ) then
    alter table public.notifications
      add constraint notifications_pkey primary key (id);
  end if;
end $$;

do $$
begin
  alter table public.notifications
    add constraint notifications_shop_id_fkey
    foreign key (shop_id) references public.shops(id) on delete cascade;
exception
  when duplicate_object then null;
end $$;

update public.notifications
set
  subject = coalesce(nullif(subject, ''), 'New Order'),
  title = coalesce(nullif(title, ''), 'Notification'),
  type = coalesce(nullif(type, ''), 'info'),
  recipient_email = coalesce(nullif(recipient_email, ''), 'notification@orderbase.local'),
  created_at = coalesce(created_at, now())
where subject is null
   or title is null
   or type is null
   or recipient_email is null
   or created_at is null;

update public.notifications
set is_read = coalesce(is_read, read_at is not null);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'notifications'
      and column_name = 'subject'
  ) then
    execute 'alter table public.notifications alter column subject set default ''New Order''';
    execute 'alter table public.notifications alter column subject set not null';
  end if;
end $$;

create index if not exists idx_notifications_shop_id on public.notifications(shop_id);
create index if not exists idx_notifications_created_at on public.notifications(created_at desc);
create index if not exists idx_notifications_is_read on public.notifications(is_read);

alter table if exists public.order_form_settings
  add column if not exists delivery_date_enabled boolean default false;

update public.order_form_settings
set delivery_date_enabled = coalesce((enabled_fields ->> 'delivery_date')::boolean, false)
where delivery_date_enabled is null;

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
  v_delivery_date_enabled boolean := false;
  v_delivery_date date;
  v_has_recipient_email boolean := false;
begin
  v_shop := public.resolve_shop_by_slug(p_shop_slug);
  if v_shop.id is null then
    raise exception 'Shop not found';
  end if;

  select * into v_settings from public.order_form_settings where shop_id = v_shop.id;
  v_delivery_date_enabled := coalesce(v_settings.delivery_date_enabled, false);

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

  if v_delivery_date_enabled then
    v_delivery_date := nullif(p_customer ->> 'delivery_date', '')::date;
    if v_delivery_date is not null and v_delivery_date <= current_date then
      raise exception 'Delivery date must be in the future';
    end if;
  else
    v_delivery_date := null;
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
    v_delivery_date,
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

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'notifications'
      and column_name = 'recipient_email'
  ) into v_has_recipient_email;

  if v_has_recipient_email then
    insert into public.notifications (shop_id, type, title, message, metadata, is_read, recipient_email)
    values (
      v_shop.id,
      'new_order',
      'New order received',
      'Order ' || v_order.order_number || ' was submitted from the public order form.',
      jsonb_build_object('order_id', v_order.id, 'payment_status', v_order.payment_status),
      false,
      coalesce(nullif(v_shop.email, ''), nullif(p_customer ->> 'email', ''), 'notification@orderbase.local')
    );
  else
    insert into public.notifications (shop_id, type, title, message, metadata, is_read)
    values (
      v_shop.id,
      'new_order',
      'New order received',
      'Order ' || v_order.order_number || ' was submitted from the public order form.',
      jsonb_build_object('order_id', v_order.id, 'payment_status', v_order.payment_status),
      false
    );
  end if;

  return v_order;
end;
$$;

grant execute on function public.create_public_order(text, jsonb, jsonb, text, text) to anon, authenticated;
