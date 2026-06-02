drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists app_settings_updated_at on public.app_settings;

drop function if exists public.create_order_with_items(uuid, varchar, jsonb) cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.touch_updated_at() cascade;
drop function if exists public.is_admin() cascade;

drop table if exists public.order_items cascade;
drop table if exists public.orders cascade;
drop table if exists public.products cascade;
drop table if exists public.customers cascade;
drop table if exists public.app_settings cascade;
