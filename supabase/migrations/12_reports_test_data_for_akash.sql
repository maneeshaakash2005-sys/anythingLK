do $$
declare
  v_shop_id uuid;
  v_product_ids uuid[];
  v_customer_ids uuid[];
  v_order_id uuid;
  v_index int;
  v_amount numeric;
begin
  select id into v_shop_id
  from public.shops
  where lower(email) = 'akashsadamina508@gmail.com'
  order by created_at
  limit 1;

  if v_shop_id is null then
    raise notice 'Reports test data skipped: shop akashsadamina508@gmail.com not found.';
    return;
  end if;

  if exists (select 1 from public.orders where shop_id = v_shop_id limit 1) then
    raise notice 'Reports test data skipped: existing report orders found for shop %. No data changed.', v_shop_id;
    return;
  end if;

  insert into public.products (shop_id, name, category, price, stock_quantity, sales_volume, image_url, public_visible, is_active, created_at)
  values
    (v_shop_id, 'Ceylon Gift Box', 'Gift', 4250, 40, 18, null, true, true, now() - interval '24 days'),
    (v_shop_id, 'Premium Tea Pack', 'Beverage', 1850, 80, 26, null, true, true, now() - interval '22 days'),
    (v_shop_id, 'Organic Spice Set', 'Pantry', 3200, 35, 14, null, true, true, now() - interval '20 days'),
    (v_shop_id, 'Handmade Soap Trio', 'Beauty', 1450, 55, 21, null, true, true, now() - interval '18 days'),
    (v_shop_id, 'Reusable Lunch Box', 'Kitchen', 2750, 28, 11, null, true, true, now() - interval '16 days');

  select array_agg(id order by created_at)
  into v_product_ids
  from public.products
  where shop_id = v_shop_id;

  insert into public.customers (shop_id, name, email, phone, address, total_spent, join_date, status, last_order_at)
  values
    (v_shop_id, 'Sample Customer 01', 'akash.report.customer01@example.com', '0771000001', 'Colombo', 0, now() - interval '25 days', 'active', now() - interval '2 days'),
    (v_shop_id, 'Sample Customer 02', 'akash.report.customer02@example.com', '0771000002', 'Kandy', 0, now() - interval '24 days', 'active', now() - interval '3 days'),
    (v_shop_id, 'Sample Customer 03', 'akash.report.customer03@example.com', '0771000003', 'Galle', 0, now() - interval '23 days', 'active', now() - interval '4 days'),
    (v_shop_id, 'Sample Customer 04', 'akash.report.customer04@example.com', '0771000004', 'Negombo', 0, now() - interval '22 days', 'active', now() - interval '5 days'),
    (v_shop_id, 'Sample Customer 05', 'akash.report.customer05@example.com', '0771000005', 'Matara', 0, now() - interval '21 days', 'active', now() - interval '6 days'),
    (v_shop_id, 'Sample Customer 06', 'akash.report.customer06@example.com', '0771000006', 'Kurunegala', 0, now() - interval '20 days', 'active', now() - interval '7 days'),
    (v_shop_id, 'Sample Customer 07', 'akash.report.customer07@example.com', '0771000007', 'Jaffna', 0, now() - interval '19 days', 'active', now() - interval '8 days'),
    (v_shop_id, 'Sample Customer 08', 'akash.report.customer08@example.com', '0771000008', 'Nugegoda', 0, now() - interval '18 days', 'active', now() - interval '9 days')
  on conflict (email) do nothing;

  select array_agg(id order by join_date)
  into v_customer_ids
  from public.customers
  where shop_id = v_shop_id
    and email like 'akash.report.customer%@example.com';

  for v_index in 1..23 loop
    v_amount := 2500 + (v_index * 475);

    insert into public.orders (
      shop_id,
      customer_id,
      order_number,
      order_date,
      total_amount,
      status,
      customer_name,
      customer_phone,
      delivery_address,
      payment_method,
      payment_status,
      created_at
    )
    values (
      v_shop_id,
      v_customer_ids[((v_index - 1) % array_length(v_customer_ids, 1)) + 1],
      'AKASH-RPT-' || lpad(v_index::text, 3, '0'),
      now() - ((24 - v_index) || ' days')::interval,
      v_amount,
      case
        when v_index <= 15 then 'Paid'
        when v_index <= 20 then 'Pending'
        else 'Cancelled'
      end,
      'Sample Customer ' || lpad((((v_index - 1) % array_length(v_customer_ids, 1)) + 1)::text, 2, '0'),
      '07710000' || lpad((((v_index - 1) % array_length(v_customer_ids, 1)) + 1)::text, 2, '0'),
      'Sample delivery address',
      case when v_index % 3 = 0 then 'bank_transfer' else 'cash_on_delivery' end,
      case when v_index <= 15 then 'verified' when v_index <= 20 then 'pending' else 'failed' end,
      now() - ((24 - v_index) || ' days')::interval
    )
    returning id into v_order_id;

    insert into public.order_items (shop_id, order_id, product_id, quantity, price_at_time)
    values
      (v_shop_id, v_order_id, v_product_ids[((v_index - 1) % array_length(v_product_ids, 1)) + 1], 1 + (v_index % 3), 1200 + (v_index * 120)),
      (v_shop_id, v_order_id, v_product_ids[(v_index % array_length(v_product_ids, 1)) + 1], 1, 900 + (v_index * 80));
  end loop;

  update public.customers
  set total_spent = coalesce(customer_totals.total_spent, 0),
      last_order_at = customer_totals.last_order_at
  from (
    select customer_id, sum(total_amount) filter (where status = 'Paid') as total_spent, max(order_date) as last_order_at
    from public.orders
    where shop_id = v_shop_id
    group by customer_id
  ) customer_totals
  where customers.id = customer_totals.customer_id
    and customers.shop_id = v_shop_id;

  update public.products
  set sales_volume = product_totals.sales_volume
  from (
    select product_id, sum(quantity)::int as sales_volume
    from public.order_items
    where shop_id = v_shop_id
    group by product_id
  ) product_totals
  where products.id = product_totals.product_id
    and products.shop_id = v_shop_id;
end $$;
