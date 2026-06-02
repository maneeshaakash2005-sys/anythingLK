-- UI/UX support hardening: editable payment instructions, admin plan edits,
-- richer order detail metadata, and platform-admin policy compatibility.

alter table public.app_settings
  add column if not exists payment_instructions jsonb default '{
    "bank": "BOC",
    "account_holder": "OrderBase Pvt Ltd",
    "account_number": "1298 2343 7890",
    "branch": "Malabe",
    "support_whatsapp": "0728472539"
  }'::jsonb;

update public.app_settings
set payment_instructions = coalesce(payment_instructions, '{}'::jsonb) || '{
  "bank": "BOC",
  "account_holder": "OrderBase Pvt Ltd",
  "account_number": "1298 2343 7890",
  "branch": "Malabe",
  "support_whatsapp": "0728472539"
}'::jsonb
where payment_instructions is null
   or payment_instructions = '{}'::jsonb;

alter table public.orders
  add column if not exists transaction_id text,
  add column if not exists payment_reference text;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.is_platform_admin(), false)
    or coalesce((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'super_admin'), false);
$$;

drop policy if exists "Admins manage app settings" on public.app_settings;
create policy "Admins manage app settings"
on public.app_settings for all
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists "Admins manage subscription plans" on public.subscription_plans;
create policy "Admins manage subscription plans"
on public.subscription_plans for all
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

create or replace function public.get_payment_instructions()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select payment_instructions from public.app_settings order by updated_at desc nulls last limit 1),
    '{
      "bank": "BOC",
      "account_holder": "OrderBase Pvt Ltd",
      "account_number": "1298 2343 7890",
      "branch": "Malabe",
      "support_whatsapp": "0728472539"
    }'::jsonb
  );
$$;

grant execute on function public.get_payment_instructions() to anon, authenticated;
