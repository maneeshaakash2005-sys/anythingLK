-- Subscription, trial, manual payment verification, and admin controls.

create extension if not exists "pgcrypto";

alter table if exists public.shops
  add column if not exists subscription_status text default 'trialing',
  add column if not exists trial_starts_at timestamp,
  add column if not exists trial_ends_at timestamp,
  add column if not exists service_locked boolean default false,
  add column if not exists lock_reason text;

create table if not exists public.subscription_plans (
  id text primary key,
  name text not null,
  monthly_price_lkr integer not null check (monthly_price_lkr > 0),
  features jsonb default '{}'::jsonb,
  is_active boolean default true,
  created_at timestamp default now()
);

create table if not exists public.shop_subscriptions (
  id uuid default gen_random_uuid() primary key,
  shop_id uuid references public.shops(id) on delete cascade not null unique,
  plan_id text references public.subscription_plans(id) not null,
  status text not null default 'trialing' check (status in ('trialing', 'pending_payment', 'active', 'past_due', 'locked', 'cancelled')),
  trial_starts_at timestamp,
  trial_ends_at timestamp,
  current_period_start timestamp,
  current_period_end timestamp,
  grace_until timestamp,
  locked_at timestamp,
  activated_at timestamp,
  updated_at timestamp default now(),
  created_at timestamp default now()
);

create table if not exists public.payment_submissions (
  id uuid default gen_random_uuid() primary key,
  shop_id uuid references public.shops(id) on delete cascade not null,
  plan_id text references public.subscription_plans(id) not null,
  amount_lkr integer not null check (amount_lkr > 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  payment_proof_url text,
  submitted_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamp,
  rejection_reason text,
  admin_note text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create table if not exists public.billing_invoices (
  id uuid default gen_random_uuid() primary key,
  shop_id uuid references public.shops(id) on delete cascade not null,
  subscription_id uuid references public.shop_subscriptions(id) on delete set null,
  plan_id text references public.subscription_plans(id) not null,
  amount_lkr integer not null check (amount_lkr > 0),
  status text not null default 'issued' check (status in ('issued', 'paid', 'void')),
  issued_at timestamp default now(),
  paid_at timestamp,
  created_at timestamp default now()
);

create table if not exists public.subscription_reminders (
  id uuid default gen_random_uuid() primary key,
  shop_id uuid references public.shops(id) on delete cascade not null,
  reminder_type text not null check (reminder_type in ('trial_expiry', 'renewal_due', 'lock_warning')),
  due_at timestamp not null,
  sent_at timestamp,
  channel text default 'in_app' check (channel in ('in_app', 'email')),
  status text default 'pending' check (status in ('pending', 'sent', 'failed')),
  metadata jsonb default '{}'::jsonb,
  created_at timestamp default now()
);

create index if not exists idx_shop_subscriptions_status on public.shop_subscriptions(status);
create index if not exists idx_payment_submissions_status on public.payment_submissions(status, created_at desc);
create index if not exists idx_payment_submissions_shop on public.payment_submissions(shop_id, created_at desc);
create index if not exists idx_billing_invoices_shop on public.billing_invoices(shop_id, issued_at desc);
create index if not exists idx_subscription_reminders_due on public.subscription_reminders(status, due_at);

insert into public.subscription_plans (id, name, monthly_price_lkr, features, is_active)
values
  ('normal', 'Normal Plan', 3500, '{"public_order_form":true,"product_management":true,"basic_reports":true,"product_limit":100,"basic_notifications":true,"shop_customization":true}', true),
  ('pro', 'Pro Plan', 6000, '{"public_order_form":true,"product_management":true,"basic_reports":true,"advanced_reports":true,"product_limit":"unlimited","priority_support":true,"advanced_analytics":true,"delivery_date_system":true,"custom_branding":true,"automation":true}', true)
on conflict (id) do update
set
  name = excluded.name,
  monthly_price_lkr = excluded.monthly_price_lkr,
  features = excluded.features,
  is_active = excluded.is_active;

create or replace function public.sync_subscription_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists shop_subscriptions_updated_at on public.shop_subscriptions;
create trigger shop_subscriptions_updated_at
before update on public.shop_subscriptions
for each row execute function public.sync_subscription_updated_at();

drop trigger if exists payment_submissions_updated_at on public.payment_submissions;
create trigger payment_submissions_updated_at
before update on public.payment_submissions
for each row execute function public.sync_subscription_updated_at();

create or replace function public.ensure_shop_subscription(p_shop_id uuid)
returns public.shop_subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.shop_subscriptions;
  v_trial_start timestamp := now();
  v_trial_end timestamp := now() + interval '14 days';
begin
  if p_shop_id is null then
    raise exception 'shop_id is required';
  end if;

  select * into v_row from public.shop_subscriptions where shop_id = p_shop_id;
  if found then
    return v_row;
  end if;

  insert into public.shop_subscriptions (
    shop_id, plan_id, status, trial_starts_at, trial_ends_at, grace_until
  )
  values (
    p_shop_id, 'normal', 'trialing', v_trial_start, v_trial_end, v_trial_end + interval '30 days'
  )
  returning * into v_row;

  update public.shops
  set
    subscription_plan = 'free',
    subscription_status = 'trialing',
    trial_starts_at = v_trial_start,
    trial_ends_at = v_trial_end,
    service_locked = false,
    lock_reason = null
  where id = p_shop_id;

  return v_row;
end;
$$;

create or replace function public.on_shop_created_seed_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_shop_subscription(new.id);
  return new;
end;
$$;

drop trigger if exists on_shop_created_seed_subscription on public.shops;
create trigger on_shop_created_seed_subscription
after insert on public.shops
for each row execute function public.on_shop_created_seed_subscription();

create or replace function public.submit_payment_submission(
  p_shop_id uuid,
  p_plan_id text,
  p_amount_lkr integer,
  p_payment_proof_url text,
  p_note text default null
)
returns public.payment_submissions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.payment_submissions;
  v_plan public.subscription_plans;
begin
  if not public.user_has_shop_access(p_shop_id) then
    raise exception 'Access denied';
  end if;

  select * into v_plan from public.subscription_plans where id = p_plan_id and is_active = true;
  if not found then
    raise exception 'Invalid plan';
  end if;

  insert into public.payment_submissions (
    shop_id, plan_id, amount_lkr, status, payment_proof_url, submitted_by, admin_note
  )
  values (
    p_shop_id, p_plan_id, p_amount_lkr, 'pending', p_payment_proof_url, auth.uid(), p_note
  )
  returning * into v_row;

  update public.shop_subscriptions
  set status = 'pending_payment'
  where shop_id = p_shop_id;

  update public.shops
  set subscription_status = 'pending_payment'
  where id = p_shop_id;

  begin
    insert into public.notifications (
      shop_id, user_id, subject, title, message, type, is_read, recipient_email
    )
    values (
      p_shop_id,
      auth.uid(),
      'Payment Submitted',
      'Subscription payment submitted',
      'Your payment proof was submitted and is pending admin verification.',
      'billing',
      false,
      'notification@orderbase.local'
    );
  exception when others then
    raise notice 'Billing notification insert failed: %', sqlerrm;
  end;

  return v_row;
end;
$$;

create or replace function public.approve_payment_submission(
  p_submission_id uuid,
  p_admin_note text default null
)
returns public.payment_submissions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submission public.payment_submissions;
  v_sub public.shop_subscriptions;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  select * into v_submission from public.payment_submissions where id = p_submission_id for update;
  if not found then
    raise exception 'Submission not found';
  end if;

  update public.payment_submissions
  set
    status = 'approved',
    approved_by = auth.uid(),
    approved_at = now(),
    admin_note = coalesce(p_admin_note, admin_note),
    rejection_reason = null
  where id = p_submission_id
  returning * into v_submission;

  update public.shop_subscriptions
  set
    plan_id = v_submission.plan_id,
    status = 'active',
    activated_at = now(),
    current_period_start = now(),
    current_period_end = now() + interval '1 month',
    grace_until = now() + interval '30 days',
    locked_at = null
  where shop_id = v_submission.shop_id
  returning * into v_sub;

  update public.shops
  set
    subscription_plan = case when v_submission.plan_id = 'pro' then 'pro' else 'free' end,
    subscription_status = 'active',
    service_locked = false,
    lock_reason = null
  where id = v_submission.shop_id;

  insert into public.billing_invoices (shop_id, subscription_id, plan_id, amount_lkr, status, issued_at, paid_at)
  values (v_submission.shop_id, v_sub.id, v_submission.plan_id, v_submission.amount_lkr, 'paid', now(), now());

  begin
    insert into public.notifications (
      shop_id, user_id, subject, title, message, type, is_read, recipient_email
    )
    values (
      v_submission.shop_id,
      null,
      'Subscription Activated',
      'Payment approved',
      'Your subscription has been activated successfully.',
      'billing',
      false,
      'notification@orderbase.local'
    );
  exception when others then
    raise notice 'Billing approval notification failed: %', sqlerrm;
  end;

  return v_submission;
end;
$$;

create or replace function public.reject_payment_submission(
  p_submission_id uuid,
  p_reason text
)
returns public.payment_submissions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submission public.payment_submissions;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if coalesce(trim(p_reason), '') = '' then
    raise exception 'Rejection reason is required';
  end if;

  update public.payment_submissions
  set
    status = 'rejected',
    approved_by = auth.uid(),
    approved_at = now(),
    rejection_reason = p_reason
  where id = p_submission_id
  returning * into v_submission;

  if not found then
    raise exception 'Submission not found';
  end if;

  update public.shop_subscriptions
  set status = case when trial_ends_at > now() then 'trialing' else 'past_due' end
  where shop_id = v_submission.shop_id;

  update public.shops
  set subscription_status = case when trial_ends_at > now() then 'trialing' else 'past_due' end
  where id = v_submission.shop_id;

  return v_submission;
end;
$$;

create or replace function public.refresh_shop_lock_states()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  update public.shop_subscriptions
  set
    status = 'locked',
    locked_at = now()
  where status in ('past_due', 'pending_payment')
    and grace_until is not null
    and grace_until < now()
    and status <> 'locked';

  get diagnostics v_count = row_count;

  update public.shops s
  set
    service_locked = true,
    subscription_status = 'locked',
    lock_reason = 'Subscription expired'
  where exists (
    select 1
    from public.shop_subscriptions ss
    where ss.shop_id = s.id
      and ss.status = 'locked'
  );

  return v_count;
end;
$$;

alter table public.subscription_plans enable row level security;
alter table public.shop_subscriptions enable row level security;
alter table public.payment_submissions enable row level security;
alter table public.billing_invoices enable row level security;
alter table public.subscription_reminders enable row level security;

drop policy if exists "Public read active plans" on public.subscription_plans;
create policy "Public read active plans"
on public.subscription_plans for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Members read own shop subscriptions" on public.shop_subscriptions;
create policy "Members read own shop subscriptions"
on public.shop_subscriptions for select
to authenticated
using (public.user_has_shop_access(shop_id) or public.is_admin());

drop policy if exists "Admins manage subscriptions" on public.shop_subscriptions;
create policy "Admins manage subscriptions"
on public.shop_subscriptions for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Members read own payment submissions" on public.payment_submissions;
create policy "Members read own payment submissions"
on public.payment_submissions for select
to authenticated
using (public.user_has_shop_access(shop_id) or public.is_admin());

drop policy if exists "Members submit own payment submissions" on public.payment_submissions;
create policy "Members submit own payment submissions"
on public.payment_submissions for insert
to authenticated
with check (public.user_has_shop_access(shop_id));

drop policy if exists "Admins update payment submissions" on public.payment_submissions;
create policy "Admins update payment submissions"
on public.payment_submissions for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Members read own invoices" on public.billing_invoices;
create policy "Members read own invoices"
on public.billing_invoices for select
to authenticated
using (public.user_has_shop_access(shop_id) or public.is_admin());

drop policy if exists "Admins manage invoices" on public.billing_invoices;
create policy "Admins manage invoices"
on public.billing_invoices for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Members read own reminders" on public.subscription_reminders;
create policy "Members read own reminders"
on public.subscription_reminders for select
to authenticated
using (public.user_has_shop_access(shop_id) or public.is_admin());

drop policy if exists "Admins manage reminders" on public.subscription_reminders;
create policy "Admins manage reminders"
on public.subscription_reminders for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant execute on function public.ensure_shop_subscription(uuid) to authenticated;
grant execute on function public.submit_payment_submission(uuid, text, integer, text, text) to authenticated;
grant execute on function public.approve_payment_submission(uuid, text) to authenticated;
grant execute on function public.reject_payment_submission(uuid, text) to authenticated;
grant execute on function public.refresh_shop_lock_states() to authenticated;

insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Users upload payment proofs" on storage.objects;
create policy "Users upload payment proofs"
on storage.objects for insert
to authenticated
with check (bucket_id = 'payment-proofs');

drop policy if exists "Users read payment proofs" on storage.objects;
create policy "Users read payment proofs"
on storage.objects for select
to authenticated
using (bucket_id = 'payment-proofs');
