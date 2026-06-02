alter table public.products add column if not exists shop_id uuid;
alter table public.customers add column if not exists shop_id uuid;
alter table public.orders add column if not exists shop_id uuid;
alter table public.order_items add column if not exists shop_id uuid;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'shops') then
    alter table public.products
      add constraint products_shop_id_fkey
      foreign key (shop_id) references public.shops(id) on delete cascade;
  end if;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'shops') then
    alter table public.customers
      add constraint customers_shop_id_fkey
      foreign key (shop_id) references public.shops(id) on delete cascade;
  end if;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'shops') then
    alter table public.orders
      add constraint orders_shop_id_fkey
      foreign key (shop_id) references public.shops(id) on delete cascade;
  end if;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'shops') then
    alter table public.order_items
      add constraint order_items_shop_id_fkey
      foreign key (shop_id) references public.shops(id) on delete cascade;
  end if;
exception
  when duplicate_object then null;
end $$;
