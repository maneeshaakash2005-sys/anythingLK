create extension if not exists "pgcrypto";

create table if not exists public.products (
  id uuid default gen_random_uuid() primary key,
  name varchar(255) not null,
  category varchar(100) not null,
  price decimal(10,2) not null check (price >= 0),
  stock_quantity int default 0 check (stock_quantity >= 0),
  sales_volume int default 0 check (sales_volume >= 0),
  image_url text,
  created_at timestamp default now()
);

alter table public.products
  add column if not exists name varchar(255),
  add column if not exists category varchar(100),
  add column if not exists price decimal(10,2) default 0,
  add column if not exists stock_quantity int default 0,
  add column if not exists sales_volume int default 0,
  add column if not exists image_url text,
  add column if not exists created_at timestamp default now();

create table if not exists public.customers (
  id uuid default gen_random_uuid() primary key,
  name varchar(255) not null,
  email varchar(255) unique not null,
  total_spent decimal(10,2) default 0 check (total_spent >= 0),
  join_date timestamp default now(),
  status varchar(50) default 'active',
  user_id uuid references auth.users(id) on delete set null
);

alter table public.customers
  add column if not exists name varchar(255),
  add column if not exists email varchar(255),
  add column if not exists total_spent decimal(10,2) default 0,
  add column if not exists join_date timestamp default now(),
  add column if not exists status varchar(50) default 'active',
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create table if not exists public.orders (
  id uuid default gen_random_uuid() primary key,
  order_number varchar(50) unique not null,
  customer_id uuid references public.customers(id),
  order_date timestamp default now(),
  total_amount decimal(10,2) not null check (total_amount >= 0),
  status varchar(50) check (status in ('Paid', 'Pending', 'Failed')) default 'Pending',
  created_at timestamp default now()
);

alter table public.orders
  add column if not exists order_number varchar(50),
  add column if not exists customer_id uuid references public.customers(id),
  add column if not exists order_date timestamp default now(),
  add column if not exists total_amount decimal(10,2) default 0,
  add column if not exists status varchar(50) default 'Pending',
  add column if not exists created_at timestamp default now();

create table if not exists public.order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders(id) on delete cascade,
  product_id uuid references public.products(id),
  quantity int not null check (quantity > 0),
  price_at_time decimal(10,2) not null check (price_at_time >= 0)
);

alter table public.order_items
  add column if not exists order_id uuid references public.orders(id) on delete cascade,
  add column if not exists product_id uuid references public.products(id),
  add column if not exists quantity int default 1,
  add column if not exists price_at_time decimal(10,2) default 0;

create table if not exists public.app_settings (
  id uuid default gen_random_uuid() primary key,
  site_name varchar(255) default 'OrderBase',
  currency varchar(3) default 'LKR',
  low_stock_threshold int default 10 check (low_stock_threshold >= 0),
  updated_at timestamp default now()
);

alter table public.app_settings
  add column if not exists site_name varchar(255) default 'OrderBase',
  add column if not exists currency varchar(3) default 'LKR',
  add column if not exists low_stock_threshold int default 10,
  add column if not exists updated_at timestamp default now();

create unique index if not exists customers_email_unique_idx on public.customers(email);
create unique index if not exists orders_order_number_unique_idx on public.orders(order_number);

insert into public.app_settings (site_name, currency, low_stock_threshold)
select 'OrderBase', 'LKR', 10
where not exists (select 1 from public.app_settings);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.customers (name, email, user_id)
  values (
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    new.id
  )
  on conflict (email) do update
    set user_id = excluded.user_id,
        name = coalesce(public.customers.name, excluded.name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_settings_updated_at on public.app_settings;
create trigger app_settings_updated_at
before update on public.app_settings
for each row execute function public.touch_updated_at();

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
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one order item is required';
  end if;

  select user_id into v_customer_user from public.customers where id = p_customer_id;

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

  insert into public.orders (order_number, customer_id, total_amount, status)
  values (
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

    insert into public.order_items (order_id, product_id, quantity, price_at_time)
    values (v_order.id, v_product.id, v_quantity, v_product.price);
  end loop;

  if v_order.status = 'Paid' then
    update public.customers
    set total_spent = total_spent + v_order.total_amount
    where id = p_customer_id;
  end if;

  return v_order;
end;
$$;

alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.app_settings enable row level security;

drop policy if exists "Authenticated can read products" on public.products;
create policy "Authenticated can read products"
on public.products for select
to authenticated
using (true);

drop policy if exists "Admins can manage products" on public.products;
create policy "Admins can manage products"
on public.products for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Users can read own customer record" on public.customers;
create policy "Users can read own customer record"
on public.customers for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users can create own customer record" on public.customers;
create policy "Users can create own customer record"
on public.customers for insert
to authenticated
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users can update own customer record" on public.customers;
create policy "Users can update own customer record"
on public.customers for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "Admins can delete customers" on public.customers;
create policy "Admins can delete customers"
on public.customers for delete
to authenticated
using (public.is_admin());

drop policy if exists "Users can read own orders" on public.orders;
create policy "Users can read own orders"
on public.orders for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.customers
    where customers.id = orders.customer_id
      and customers.user_id = auth.uid()
  )
);

drop policy if exists "Admins can manage orders" on public.orders;
create policy "Admins can manage orders"
on public.orders for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Users can read own order items" on public.order_items;
create policy "Users can read own order items"
on public.order_items for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.orders
    join public.customers on customers.id = orders.customer_id
    where orders.id = order_items.order_id
      and customers.user_id = auth.uid()
  )
);

drop policy if exists "Admins can manage order items" on public.order_items;
create policy "Admins can manage order items"
on public.order_items for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Authenticated can read app settings" on public.app_settings;
create policy "Authenticated can read app settings"
on public.app_settings for select
to authenticated
using (true);

drop policy if exists "Admins can manage app settings" on public.app_settings;
create policy "Admins can manage app settings"
on public.app_settings for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create index if not exists idx_customers_user_id on public.customers(user_id);
create index if not exists idx_orders_customer_id on public.orders(customer_id);
create index if not exists idx_orders_order_date on public.orders(order_date);
create index if not exists idx_order_items_order_id on public.order_items(order_id);
create index if not exists idx_order_items_product_id on public.order_items(product_id);

alter table public.orders replica identity full;
alter table public.products replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.orders;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.products;
exception
  when duplicate_object then null;
end $$;
