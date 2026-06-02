-- Fix missing order_form_settings rows and RLS for shop owners/members.
-- Run in Supabase SQL Editor if you are not using supabase db push.

-- 1) Ensure owners are shop members (required for user_has_shop_access fallback paths)
insert into public.shop_members (shop_id, user_id, role)
select s.id, s.owner_id, 'admin'
from public.shops s
where s.owner_id is not null
on conflict (shop_id, user_id) do nothing;

-- 2) Backfill missing settings rows for every shop
insert into public.order_form_settings (shop_id)
select s.id
from public.shops s
left join public.order_form_settings ofs on ofs.shop_id = s.id
where ofs.id is null;

-- 3) RPC: create settings row safely (bypasses client INSERT RLS edge cases)
create or replace function public.ensure_order_form_settings(p_shop_id uuid)
returns public.order_form_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.order_form_settings;
begin
  if p_shop_id is null then
    raise exception 'shop_id is required';
  end if;

  if not public.user_has_shop_access(p_shop_id) then
    raise exception 'You do not have access to this shop';
  end if;

  select * into v_row
  from public.order_form_settings
  where shop_id = p_shop_id;

  if found then
    return v_row;
  end if;

  insert into public.order_form_settings (shop_id)
  values (p_shop_id)
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.ensure_order_form_settings(uuid) to authenticated;

-- 4) Refresh RLS policies (idempotent)
alter table public.order_form_settings enable row level security;

drop policy if exists "Public can read order form settings" on public.order_form_settings;
create policy "Public can read order form settings"
on public.order_form_settings for select
to anon, authenticated
using (true);

drop policy if exists "Shop members manage form settings" on public.order_form_settings;
drop policy if exists "Shop owners insert form settings" on public.order_form_settings;
drop policy if exists "Shop members update form settings" on public.order_form_settings;
drop policy if exists "Shop members delete form settings" on public.order_form_settings;

create policy "Shop owners insert form settings"
on public.order_form_settings for insert
to authenticated
with check (
  public.user_has_shop_access(shop_id)
  or exists (
    select 1
    from public.shops
    where shops.id = shop_id
      and shops.owner_id = auth.uid()
  )
);

create policy "Shop members update form settings"
on public.order_form_settings for update
to authenticated
using (public.user_has_shop_access(shop_id))
with check (public.user_has_shop_access(shop_id));

create policy "Shop members delete form settings"
on public.order_form_settings for delete
to authenticated
using (public.user_has_shop_access(shop_id));
