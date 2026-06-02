-- Fix bank_accounts RLS and provide owner-safe write access.
-- Run in Supabase SQL Editor if you are not using supabase db push.

-- Ensure owner membership rows exist (idempotent).
insert into public.shop_members (shop_id, user_id, role)
select s.id, s.owner_id, 'admin'
from public.shops s
where s.owner_id is not null
on conflict (shop_id, user_id) do nothing;

alter table public.bank_accounts enable row level security;

drop policy if exists "Public can read active bank accounts" on public.bank_accounts;
create policy "Public can read active bank accounts"
on public.bank_accounts for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Shop members manage bank accounts" on public.bank_accounts;
drop policy if exists "Shop owners insert bank accounts" on public.bank_accounts;
drop policy if exists "Shop members update bank accounts" on public.bank_accounts;
drop policy if exists "Shop members delete bank accounts" on public.bank_accounts;

create policy "Shop owners insert bank accounts"
on public.bank_accounts for insert
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

create policy "Shop members update bank accounts"
on public.bank_accounts for update
to authenticated
using (public.user_has_shop_access(shop_id))
with check (public.user_has_shop_access(shop_id));

create policy "Shop members delete bank accounts"
on public.bank_accounts for delete
to authenticated
using (public.user_has_shop_access(shop_id));
