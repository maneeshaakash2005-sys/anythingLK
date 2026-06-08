-- Migration 13: AnythingLK Marketplace & Reviews System

-- 1. Alter public.shops to support marketplace configuration
alter table public.shops
  add column if not exists marketplace_visible boolean default true,
  add column if not exists is_verified boolean default false,
  add column if not exists cover_image_url text,
  add column if not exists description text,
  add column if not exists category varchar(100) default 'other',
  add column if not exists average_rating decimal(3,2) default 0.0,
  add column if not exists review_count int default 0;

-- 2. Alter public.products to support marketplace categories and ratings
alter table public.products
  add column if not exists marketplace_category varchar(100) default 'other',
  add column if not exists is_featured boolean default false,
  add column if not exists average_rating decimal(3,2) default 0.0,
  add column if not exists review_count int default 0;

-- 3. Create reviews table
create table if not exists public.reviews (
  id uuid default gen_random_uuid() primary key,
  shop_id uuid references public.shops(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  customer_name text not null,
  customer_email text,
  rating int not null check (rating >= 1 and rating <= 5),
  comment text,
  helpful_votes int default 0,
  created_at timestamp default now()
);

-- 4. Create indexes for quick retrieval
create index if not exists idx_reviews_shop_id on public.reviews(shop_id);
create index if not exists idx_reviews_product_id on public.reviews(product_id);
create index if not exists idx_reviews_order_id on public.reviews(order_id);

-- 5. Create rating trigger logic to keep rating counts and averages in sync
create or replace function public.update_rating_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop_id uuid;
  v_product_id uuid;
begin
  -- Identify IDs to update
  if TG_OP = 'DELETE' then
    v_shop_id := old.shop_id;
    v_product_id := old.product_id;
  else
    v_shop_id := new.shop_id;
    v_product_id := new.product_id;
  end if;

  -- Update shop aggregate rating (covers all shop-level reviews)
  if v_shop_id is not null then
    update public.shops
    set average_rating = coalesce((
          select round(avg(rating)::numeric, 2)
          from public.reviews
          where shop_id = v_shop_id
        ), 0.0),
        review_count = (
          select count(*)
          from public.reviews
          where shop_id = v_shop_id
        )
    where id = v_shop_id;
  end if;

  -- Update product rating
  if v_product_id is not null then
    update public.products
    set average_rating = coalesce((
          select round(avg(rating)::numeric, 2)
          from public.reviews
          where product_id = v_product_id
        ), 0.0),
        review_count = (
          select count(*)
          from public.reviews
          where product_id = v_product_id
        )
    where id = v_product_id;
  end if;

  return null;
end;
$$;

drop trigger if exists trigger_update_rating_stats on public.reviews;
create trigger trigger_update_rating_stats
after insert or update or delete
on public.reviews
for each row execute function public.update_rating_stats();

-- 6. Enable RLS on reviews table
alter table public.reviews enable row level security;

-- Policies for public.reviews
drop policy if exists "Public reads reviews" on public.reviews;
create policy "Public reads reviews"
on public.reviews for select
to anon, authenticated
using (true);

drop policy if exists "Public inserts reviews" on public.reviews;
create policy "Public inserts reviews"
on public.reviews for insert
to anon, authenticated
with check (true);

drop policy if exists "Shop members manage reviews" on public.reviews;
create policy "Shop members manage reviews"
on public.reviews for all
to authenticated
using (public.user_has_shop_access(shop_id))
with check (public.user_has_shop_access(shop_id));
