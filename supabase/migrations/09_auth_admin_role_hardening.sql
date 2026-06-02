-- Fix auth signup trigger drift and add robust admin-role architecture.

create unique index if not exists idx_customers_user_id_unique
on public.customers(user_id)
where user_id is not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_existing_id uuid;
begin
  v_name := coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1));

  -- First, adopt any existing customer row by email that is not already linked
  -- to a different auth user. This avoids signup 500s in drifted schemas where
  -- email uniqueness may still exist from older migrations.
  select id into v_existing_id
  from public.customers
  where lower(coalesce(email, '')) = lower(new.email)
    and (user_id is null or user_id = new.id)
  order by join_date asc nulls last, id asc
  limit 1;

  if v_existing_id is not null then
    update public.customers
    set
      user_id = new.id,
      name = coalesce(nullif(name, ''), v_name),
      email = new.email,
      status = coalesce(status, 'active')
    where id = v_existing_id;
    return new;
  end if;

  insert into public.customers (name, email, user_id, status)
  values (v_name, new.email, new.id, 'active')
  on conflict (user_id) do update
    set
      name = excluded.name,
      email = excluded.email,
      status = coalesce(public.customers.status, 'active');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create table if not exists public.admin_roles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  role text not null check (role in ('super_admin', 'admin')),
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamp default now()
);

create index if not exists idx_admin_roles_role on public.admin_roles(role);

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    lower(coalesce(auth.jwt() ->> 'email', '')) = 'maneeshaakash2005@gmail.com'
    or exists (
      select 1
      from public.admin_roles
      where user_id = auth.uid()
        and role = 'super_admin'
    );
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin()
    or exists (
      select 1
      from public.admin_roles
      where user_id = auth.uid()
        and role = 'admin'
    );
$$;

create or replace function public.grant_admin_role_by_email(
  p_email text,
  p_role text
)
returns public.admin_roles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_row public.admin_roles;
begin
  if not public.is_super_admin() then
    raise exception 'Super admin access required';
  end if;

  if p_role not in ('admin', 'super_admin') then
    raise exception 'Invalid role';
  end if;

  select id into v_user_id
  from auth.users
  where lower(email) = lower(trim(p_email))
  limit 1;

  if v_user_id is null then
    raise exception 'User not found';
  end if;

  if lower(trim(p_email)) = 'maneeshaakash2005@gmail.com' and p_role <> 'super_admin' then
    raise exception 'Primary super admin email must remain super_admin';
  end if;

  insert into public.admin_roles (user_id, role, granted_by)
  values (v_user_id, p_role, auth.uid())
  on conflict (user_id) do update
    set role = excluded.role,
        granted_by = excluded.granted_by
  returning * into v_row;

  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', p_role)
  where id = v_user_id;

  return v_row;
end;
$$;

create or replace function public.revoke_admin_role_by_email(p_email text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  if not public.is_super_admin() then
    raise exception 'Super admin access required';
  end if;

  if lower(trim(p_email)) = 'maneeshaakash2005@gmail.com' then
    raise exception 'Primary super admin role cannot be revoked';
  end if;

  select id into v_user_id
  from auth.users
  where lower(email) = lower(trim(p_email))
  limit 1;

  if v_user_id is null then
    return false;
  end if;

  delete from public.admin_roles where user_id = v_user_id;
  update auth.users
  set raw_app_meta_data = (coalesce(raw_app_meta_data, '{}'::jsonb) - 'role')
  where id = v_user_id;

  return true;
end;
$$;

create or replace function public.list_admin_users()
returns table(user_id uuid, email text, role text, created_at timestamp)
language sql
security definer
set search_path = public
as $$
  select ar.user_id, u.email::text, ar.role, ar.created_at
  from public.admin_roles ar
  join auth.users u on u.id = ar.user_id
  where public.is_platform_admin()
  order by ar.created_at desc;
$$;

create or replace function public.admin_override_shop_subscription(
  p_shop_id uuid,
  p_plan_id text,
  p_status text,
  p_extend_days integer default 0,
  p_lock boolean default false,
  p_note text default null
)
returns public.shop_subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.shop_subscriptions;
begin
  if not public.is_platform_admin() then
    raise exception 'Admin access required';
  end if;

  if p_status not in ('trialing', 'pending_payment', 'active', 'past_due', 'locked', 'cancelled') then
    raise exception 'Invalid status';
  end if;

  perform public.ensure_shop_subscription(p_shop_id);

  update public.shop_subscriptions
  set
    plan_id = p_plan_id,
    status = p_status,
    current_period_end = case
      when p_extend_days > 0 and current_period_end is not null then current_period_end + make_interval(days => p_extend_days)
      when p_extend_days > 0 then now() + make_interval(days => p_extend_days)
      else current_period_end
    end,
    trial_ends_at = case
      when p_status = 'trialing' and p_extend_days > 0 and trial_ends_at is not null then trial_ends_at + make_interval(days => p_extend_days)
      when p_status = 'trialing' and p_extend_days > 0 then now() + make_interval(days => p_extend_days)
      else trial_ends_at
    end,
    grace_until = case
      when p_status in ('pending_payment', 'past_due') then now() + interval '30 days'
      else grace_until
    end,
    locked_at = case when p_lock or p_status = 'locked' then now() else null end
  where shop_id = p_shop_id
  returning * into v_row;

  update public.shops
  set
    subscription_plan = case when p_plan_id = 'pro' then 'pro' else 'free' end,
    subscription_status = p_status,
    service_locked = (p_lock or p_status = 'locked'),
    lock_reason = case when (p_lock or p_status = 'locked') then coalesce(p_note, 'Locked by admin') else null end
  where id = p_shop_id;

  return v_row;
end;
$$;

alter table public.admin_roles enable row level security;

drop policy if exists "Platform admins read admin roles" on public.admin_roles;
create policy "Platform admins read admin roles"
on public.admin_roles for select
to authenticated
using (public.is_platform_admin());

drop policy if exists "Super admins manage admin roles" on public.admin_roles;
create policy "Super admins manage admin roles"
on public.admin_roles for all
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.grant_admin_role_by_email(text, text) to authenticated;
grant execute on function public.revoke_admin_role_by_email(text) to authenticated;
grant execute on function public.list_admin_users() to authenticated;
grant execute on function public.admin_override_shop_subscription(uuid, text, text, integer, boolean, text) to authenticated;
