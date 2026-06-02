insert into public.customers (name, email, user_id)
select
  coalesce(raw_user_meta_data ->> 'name', split_part(email, '@', 1)),
  email,
  id
from auth.users
where email is not null
on conflict (email) do update
set user_id = excluded.user_id,
    name = coalesce(public.customers.name, excluded.name);
