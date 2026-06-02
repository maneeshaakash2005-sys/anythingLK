-- Fix public slug resolution and make public order creation slug-safe.
-- Run via `supabase db push` (or in SQL Editor) after existing migrations.

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
  v_shop := public.resolve_shop_by_slug(p_shop_slug);
  if v_shop.id is null then
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
