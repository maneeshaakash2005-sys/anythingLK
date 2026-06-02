select 'products' as table_name, count(*) as row_count from public.products
union all
select 'customers' as table_name, count(*) as row_count from public.customers
union all
select 'orders' as table_name, count(*) as row_count from public.orders
union all
select 'order_items' as table_name, count(*) as row_count from public.order_items
union all
select 'app_settings' as table_name, count(*) as row_count from public.app_settings;

select
  email,
  raw_app_meta_data ->> 'role' as role,
  created_at
from auth.users
order by created_at desc
limit 10;
