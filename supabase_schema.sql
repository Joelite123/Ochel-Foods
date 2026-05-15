-- ============================================================
--  O'CHEL FOODS — SUPABASE SCHEMA
--  Run this entire file in your Supabase SQL Editor.
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- PROFILES (extends Supabase auth.users)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id                     uuid primary key references auth.users(id) on delete cascade,
  email                  text not null,
  full_name              text,
  phone                  text,
  role                   text not null default 'customer' check (role in ('customer', 'admin')),
  referral_wallet_balance numeric(12,2) not null default 0,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Admins can view all profiles" on public.profiles for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- CATEGORIES
-- ─────────────────────────────────────────────────────────────
create table if not exists public.categories (
  id          text primary key,
  name        text not null,
  slug        text not null unique,
  image_url   text,
  color       text not null default '#E8192C',
  sort_order  int not null default 0,
  is_active   boolean not null default true
);
alter table public.categories enable row level security;
create policy "Anyone can view categories" on public.categories for select using (true);
create policy "Admins can manage categories" on public.categories for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Seed default categories
insert into public.categories (id, name, slug, color, sort_order) values
  ('pizza',        'Pizza',            '/pizza',        '#E8192C', 1),
  ('burgers',      'Burgers & Wraps',  '/burgers',      '#FF6B35', 2),
  ('shawarma',     'Shawarma',         '/shawarma',     '#FFB800', 3),
  ('finger-foods', 'Finger Foods',     '/finger-foods', '#E8192C', 4),
  ('pastries',     'Pastries',         '/pastries',     '#FF6B35', 5),
  ('baked-goodies','Baked Goodies',    '/baked-goodies','#FFB800', 6)
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────
-- PRODUCTS
-- ─────────────────────────────────────────────────────────────
create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text not null default '',
  category_id  text not null references public.categories(id),
  base_price   numeric(12,2) not null,
  image_url    text,
  sizes        jsonb,        -- [{label, description, price}]
  extras       jsonb,        -- [{name, price}]
  ingredients  jsonb,        -- string[]
  tag          text,
  note         text,
  is_available boolean not null default true,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.products enable row level security;
create policy "Anyone can view available products" on public.products for select using (is_available = true);
create policy "Admins can manage products" on public.products for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- ─────────────────────────────────────────────────────────────
-- DELIVERY ZONES
-- ─────────────────────────────────────────────────────────────
create table if not exists public.delivery_zones (
  id          uuid primary key default gen_random_uuid(),
  label       text not null,
  price       numeric(12,2) not null,
  description text,
  is_active   boolean not null default true,
  sort_order  int not null default 0
);
alter table public.delivery_zones enable row level security;
create policy "Anyone can view delivery zones" on public.delivery_zones for select using (is_active = true);
create policy "Admins can manage delivery zones" on public.delivery_zones for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Seed default delivery zones
insert into public.delivery_zones (label, price, sort_order) values
  ('Ekwulobia Town',          500,  1),
  ('Aguata (within 5km)',     800,  2),
  ('Ekwulobia Area (5–10km)', 1000, 3),
  ('Outside Ekwulobia (10–15km)', 1500, 4),
  ('Other Areas (call us)',   2000, 5)
on conflict do nothing;

-- ─────────────────────────────────────────────────────────────
-- ORDERS
-- ─────────────────────────────────────────────────────────────
create table if not exists public.orders (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid references auth.users(id) on delete set null,
  customer_name         text not null,
  customer_phone        text not null,
  customer_email        text,
  delivery_address      text not null,
  delivery_zone_id      uuid references public.delivery_zones(id),
  delivery_fee          numeric(12,2) not null default 0,
  subtotal              numeric(12,2) not null,
  total                 numeric(12,2) not null,
  discount_amount       numeric(12,2) not null default 0,
  referral_wallet_used  numeric(12,2) not null default 0,
  promo_code            text,
  status                text not null default 'pending'
    check (status in ('pending','confirmed','preparing','out_for_delivery','delivered','cancelled')),
  delivery_time         text,
  special_instructions  text,
  referral_code_used    text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
alter table public.orders enable row level security;
create policy "Users can view own orders" on public.orders for select using (auth.uid() = user_id);
create policy "Users can insert orders" on public.orders for insert with check (true);
create policy "Admins can manage all orders" on public.orders for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- ─────────────────────────────────────────────────────────────
-- ORDER ITEMS
-- ─────────────────────────────────────────────────────────────
create table if not exists public.order_items (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid not null references public.orders(id) on delete cascade,
  product_id          uuid references public.products(id) on delete set null,
  product_name        text not null,
  size                text,
  price               numeric(12,2) not null,
  quantity            int not null default 1,
  extras              jsonb,               -- [{name, quantity, price}]
  removed_ingredients jsonb,               -- string[]
  note                text
);
alter table public.order_items enable row level security;
create policy "Anyone can insert order items" on public.order_items for insert with check (true);
create policy "Admins can view all order items" on public.order_items for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
create policy "Users can view own order items" on public.order_items for select using (
  exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
);

-- ─────────────────────────────────────────────────────────────
-- REFERRAL CODES
-- ─────────────────────────────────────────────────────────────
create table if not exists public.referral_codes (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  code             text not null unique,
  total_referrals  int not null default 0,
  total_earned     numeric(12,2) not null default 0,
  created_at       timestamptz not null default now()
);
alter table public.referral_codes enable row level security;
create policy "Users can view own referral code" on public.referral_codes for select using (auth.uid() = user_id);
create policy "Anyone can look up code by code value" on public.referral_codes for select using (true);
create policy "Users can insert own code" on public.referral_codes for insert with check (auth.uid() = user_id);
create policy "Admins can manage all" on public.referral_codes for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- ─────────────────────────────────────────────────────────────
-- REFERRALS (tracking)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.referrals (
  id              uuid primary key default gen_random_uuid(),
  referrer_id     uuid not null references auth.users(id) on delete cascade,
  referred_id     uuid references auth.users(id) on delete set null,
  referred_phone  text,
  referred_ip     text,
  code            text not null,
  status          text not null default 'pending'
    check (status in ('pending','rewarded','rejected','expired')),
  reward_amount   numeric(12,2) not null default 0,
  reward_type     text not null default 'cash_credit',
  order_id        uuid references public.orders(id) on delete set null,
  notes           text,
  created_at      timestamptz not null default now(),
  rewarded_at     timestamptz
);
alter table public.referrals enable row level security;
create policy "Admins can manage all referrals" on public.referrals for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
create policy "Users can view own referrals" on public.referrals for select using (
  auth.uid() = referrer_id or auth.uid() = referred_id
);
create policy "Anyone can insert referral" on public.referrals for insert with check (true);

-- Abuse log
create table if not exists public.referral_abuse_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id),
  code        text,
  ip          text,
  phone       text,
  reason      text,
  created_at  timestamptz not null default now()
);
alter table public.referral_abuse_log enable row level security;
create policy "Admins can view abuse log" on public.referral_abuse_log for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
create policy "Anyone can insert abuse log" on public.referral_abuse_log for insert with check (true);

-- ─────────────────────────────────────────────────────────────
-- USER REWARDS (wallet)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.user_rewards (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  reward_type text not null default 'cash_credit'
    check (reward_type in ('cash_credit','free_delivery','percentage_discount','fixed_discount')),
  amount      numeric(12,2) not null default 0,
  balance     numeric(12,2) not null default 0,
  description text not null default '',
  source      text not null default 'referral'
    check (source in ('referral','admin','promo')),
  expires_at  timestamptz,
  is_used     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.user_rewards enable row level security;
create policy "Users can view own rewards" on public.user_rewards for select using (auth.uid() = user_id);
create policy "Admins can manage all rewards" on public.user_rewards for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
create policy "Service can insert rewards" on public.user_rewards for insert with check (true);
create policy "Service can update rewards" on public.user_rewards for update using (true);

-- ─────────────────────────────────────────────────────────────
-- REWARD SETTINGS (admin-configurable)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.reward_settings (
  id           uuid primary key default gen_random_uuid(),
  reward_type  text not null unique,
  reward_value numeric(12,2) not null default 2000,
  expiry_days  int not null default 60,
  is_active    boolean not null default true,
  description  text not null default '',
  updated_at   timestamptz not null default now()
);
alter table public.reward_settings enable row level security;
create policy "Anyone can view reward settings" on public.reward_settings for select using (true);
create policy "Admins can manage reward settings" on public.reward_settings for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Seed default reward setting
insert into public.reward_settings (reward_type, reward_value, expiry_days, description) values
  ('cash_credit', 2000, 60, 'Default referral reward — ₦2,000 cash credit added to referrer wallet')
on conflict (reward_type) do nothing;

-- ─────────────────────────────────────────────────────────────
-- OPERATING HOURS
-- ─────────────────────────────────────────────────────────────
create table if not exists public.operating_hours (
  id           uuid primary key default gen_random_uuid(),
  day_of_week  int not null unique check (day_of_week between 0 and 6),
  open_hour    int not null default 9,
  open_minute  int not null default 0,
  close_hour   int not null default 22,
  close_minute int not null default 0,
  is_closed    boolean not null default false
);
alter table public.operating_hours enable row level security;
create policy "Anyone can view hours" on public.operating_hours for select using (true);
create policy "Admins can manage hours" on public.operating_hours for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Seed default hours (Mon–Sat 9am–10pm, Sun 2pm–10pm)
insert into public.operating_hours (day_of_week, open_hour, open_minute, close_hour, close_minute, is_closed) values
  (0, 14, 0, 22, 0, false),
  (1,  9, 0, 22, 0, false),
  (2,  9, 0, 22, 0, false),
  (3,  9, 0, 22, 0, false),
  (4,  9, 0, 22, 0, false),
  (5,  9, 0, 22, 0, false),
  (6,  9, 0, 22, 0, false)
on conflict (day_of_week) do nothing;

-- ─────────────────────────────────────────────────────────────
-- PUBLIC HOLIDAYS
-- ─────────────────────────────────────────────────────────────
create table if not exists public.public_holidays (
  id        uuid primary key default gen_random_uuid(),
  date      date not null unique,
  name      text not null,
  is_closed boolean not null default true
);
alter table public.public_holidays enable row level security;
create policy "Anyone can view holidays" on public.public_holidays for select using (true);
create policy "Admins can manage holidays" on public.public_holidays for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- ─────────────────────────────────────────────────────────────
-- PROMOTIONS
-- ─────────────────────────────────────────────────────────────
create table if not exists public.promotions (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  description      text,
  code             text unique,
  discount_type    text not null default 'percentage' check (discount_type in ('percentage','fixed')),
  discount_value   numeric(12,2) not null default 0,
  min_order_amount numeric(12,2),
  max_uses         int,
  uses_count       int not null default 0,
  banner_url       text,
  is_active        boolean not null default true,
  starts_at        timestamptz,
  ends_at          timestamptz,
  created_at       timestamptz not null default now()
);
alter table public.promotions enable row level security;
create policy "Anyone can view active promotions" on public.promotions for select using (is_active = true);
create policy "Admins can manage promotions" on public.promotions for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- ─────────────────────────────────────────────────────────────
-- NEWSLETTER SUBSCRIBERS
-- ─────────────────────────────────────────────────────────────
create table if not exists public.newsletter_subscribers (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  name          text,
  is_active     boolean not null default true,
  subscribed_at timestamptz not null default now()
);
alter table public.newsletter_subscribers enable row level security;
create policy "Admins can manage newsletter" on public.newsletter_subscribers for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
create policy "Anyone can subscribe" on public.newsletter_subscribers for insert with check (true);

-- ─────────────────────────────────────────────────────────────
-- FAVORITES
-- ─────────────────────────────────────────────────────────────
create table if not exists public.favorites (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);
alter table public.favorites enable row level security;
create policy "Users can manage own favorites" on public.favorites for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- STORAGE BUCKETS (run in Supabase Dashboard > Storage)
-- ─────────────────────────────────────────────────────────────
-- Create bucket: "product-images"   (public)
-- Create bucket: "promo-banners"    (public)
-- ─────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────
-- MAKE YOURSELF AN ADMIN
-- Replace 'your-email@example.com' with your actual email,
-- AFTER signing up through the app.
-- ─────────────────────────────────────────────────────────────
-- update public.profiles set role = 'admin' where email = 'your-email@example.com';
