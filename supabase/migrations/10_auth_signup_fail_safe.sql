-- Final fail-safe hardening for auth signup triggers.
-- Goal: never block auth.users insert due to downstream profile/shop bootstrap drift.

create extension if not exists "pgcrypto";

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

  begin
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
  exception
    when others then
      -- Never block signup because of profile bootstrap drift.
      raise notice 'handle_new_user skipped for %: %', new.email, sqlerrm;
  end;

  return new;
end;
$$;

create or replace function public.ensure_default_shop_for_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_slug text;
  final_slug text;
  suffix text;
begin
  begin
    base_slug := public.slugify(
      coalesce(
        new.raw_user_meta_data ->> 'shop_name',
        new.raw_user_meta_data ->> 'name',
        split_part(new.email, '@', 1)
      )
    );
    final_slug := base_slug;

    while exists (select 1 from public.shops where slug = final_slug) loop
      suffix := substr(replace(gen_random_uuid()::text, '-', ''), 1, 5);
      final_slug := base_slug || '-' || suffix;
    end loop;

    insert into public.shops (owner_id, shop_name, slug, email)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'shop_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
      final_slug,
      new.email
    )
    on conflict do nothing;

    insert into public.shop_members (shop_id, user_id, role)
    select id, new.id, 'admin'
    from public.shops
    where owner_id = new.id
    on conflict do nothing;

    insert into public.order_form_settings (shop_id)
    select id
    from public.shops
    where owner_id = new.id
    on conflict do nothing;
  exception
    when others then
      -- Never block signup because of shop bootstrap drift.
      raise notice 'ensure_default_shop_for_user skipped for %: %', new.email, sqlerrm;
  end;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

drop trigger if exists on_auth_user_shop_created on auth.users;
create trigger on_auth_user_shop_created
after insert on auth.users
for each row execute function public.ensure_default_shop_for_user();
