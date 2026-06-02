-- Multi-tenant integrity hardening:
-- 1) Make customer email uniqueness scoped per shop.
-- 2) Prevent cross-shop mutations in create_order_with_items.
-- 3) Ensure create_public_order upsert is shop-scoped.

drop index if exists public.customers_email_unique_idx;
alter table if exists public.customers drop constraint if exists customers_email_key;
alter table if exists public.customers drop constraint if exists customers_email_unique_idx;

drop index if exists public.idx_customers_shop_email_unique;
create unique index if not exists idx_customers_shop_email_unique
on public.customers(shop_id, email);

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

  if v_shop_id is null then
    raise exception 'Customer is not linked to a shop';
  end if;

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
      and shop_id = v_shop_id
    for update;

    if not found then
      raise exception 'Product not found in customer shop';
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
      and shop_id = v_shop_id
    for update;

    update public.products
    set stock_quantity = stock_quantity - v_quantity,
        sales_volume = sales_volume + v_quantity
    where id = v_product.id
      and shop_id = v_shop_id
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
  on conflict (shop_id, email) do update
    set name = excluded.name,
        phone = excluded.phone,
        address = excluded.address,
        last_order_at = now()
  returning * into v_customer;

  if v_customer.shop_id <> v_shop.id then
    raise exception 'Resolved customer does not belong to this shop';
  end if;

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

  begin
    insert into public.notifications (
      shop_id,
      user_id,
      type,
      subject,
      title,
      message,
      metadata,
      is_read,
      recipient_email
    )
    values (
      v_shop.id,
      v_shop.owner_id,
      'new_order',
      'New Order',
      'New order received',
      'Order ' || v_order.order_number || ' was submitted from the public order form.',
      jsonb_build_object('order_id', v_order.id, 'payment_status', v_order.payment_status),
      false,
      coalesce(nullif(v_shop.email, ''), nullif(p_customer ->> 'email', ''), 'notification@orderbase.local')
    );
  exception
    when others then
      -- Notification failures should never block order submission.
      raise notice 'Notification insert failed for order %: %', v_order.order_number, sqlerrm;
  end;

  return v_order;
end;
$$;

grant execute on function public.create_order_with_items(uuid, varchar, jsonb) to authenticated;
grant execute on function public.create_public_order(text, jsonb, jsonb, text, text) to anon, authenticated;
