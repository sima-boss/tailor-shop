-- ============================================================
-- Tailor Shop Management System — Database Schema
-- Target: Supabase (PostgreSQL 15+)
-- Run this in the Supabase SQL Editor as a single transaction.
-- ============================================================

-- ===================
-- 1. EXTENSIONS
-- ===================
create extension if not exists pg_trgm;  -- fuzzy text search on customer names


-- ===================
-- 2. ENUM TYPES
-- ===================
create type user_role as enum ('admin', 'staff');

create type order_type as enum ('alteration', 'tailoring');

create type order_status as enum ('in_progress', 'completed', 'delivered', 'cancelled');

create type payment_status as enum ('unpaid', 'deposit_paid', 'fully_paid');


-- ===================
-- 3. HELPER FUNCTIONS
-- ===================

-- Reusable trigger: auto-set updated_at on every UPDATE
create or replace function handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Check if current user is an admin (used in RLS policies)
create or replace function is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- Auto-create a profile row when a new user signs up
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    'staff'
  );
  return new;
end;
$$ language plpgsql security definer;


-- ===================
-- 4. TABLES
-- ===================

-- ----- profiles -----
-- Every auth.users row gets a matching profile.
-- Roles control what the user can do in the app.
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text        not null,
  role        user_role   not null default 'staff',
  phone       text,
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Wire up the auth trigger (fires after a new user signs up)
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();


-- ----- customers -----
-- The people who bring garments in or order new ones.
create table customers (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null,
  phone       text        not null,
  email       text,
  address     text,
  notes       text,
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz          -- soft delete
);


-- ----- orders -----
-- Central table. Each order is either an alteration or a tailoring job.
-- Detail tables (below) hold type-specific information.
create table orders (
  id              uuid primary key default gen_random_uuid(),
  order_number    text            not null unique,
  customer_id     uuid            not null references customers(id) on delete restrict,
  order_type      order_type      not null,
  status          order_status    not null default 'in_progress',
  payment_status  payment_status  not null default 'unpaid',
  total_amount    numeric(10,2)   not null default 0   check (total_amount   >= 0),
  deposit_amount  numeric(10,2)   not null default 0   check (deposit_amount >= 0),
  notes           text,
  due_date        date,
  completed_by    text check (completed_by IN ('Mumtaz', 'Shan')),
  assigned_to     uuid references profiles(id) on delete set null,
  created_by      uuid references profiles(id) on delete set null,
  created_at      timestamptz     not null default now(),
  updated_at      timestamptz     not null default now(),
  deleted_at      timestamptz,

  constraint deposit_lte_total check (deposit_amount <= total_amount)
);


-- Auto-increment sequence for order numbers (1001, 1002, ...)
create sequence order_number_seq start with 1001;
alter table orders alter column order_number set default nextval('order_number_seq')::text;


-- ----- alteration_details -----
-- 1:1 with orders where order_type = 'alteration'.
-- Describes the existing garment being modified.
create table alteration_details (
  id                    uuid primary key default gen_random_uuid(),
  order_id              uuid not null unique references orders(id) on delete cascade,
  garment_type          text not null,                       -- "Pants", "Jacket", "Dress", etc.
  description           text not null,                       -- what work is needed
  special_instructions  text,
  garment_brand         text,
  garment_color         text,
  quantity              integer not null default 1 check (quantity > 0),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);


-- ----- tailoring_details -----
-- 1:1 with orders where order_type = 'tailoring'.
-- Holds fabric info, design notes, and every body measurement.
-- Measurements are in centimeters; nullable because not every
-- garment needs every measurement.
create table tailoring_details (
  id                    uuid primary key default gen_random_uuid(),
  order_id              uuid not null unique references orders(id) on delete cascade,
  garment_type          text not null,                       -- "Suit", "Shirt", "Blouse", etc.
  fabric_details        text,
  design_notes          text,
  special_instructions  text,
  quantity              integer not null default 1 check (quantity > 0),

  -- Body measurements (cm)
  chest                 numeric(6,2),
  waist                 numeric(6,2),
  hips                  numeric(6,2),
  shoulders             numeric(6,2),
  neck                  numeric(6,2),
  sleeve_length         numeric(6,2),
  arm_circumference     numeric(6,2),
  wrist                 numeric(6,2),
  back_length           numeric(6,2),
  front_length          numeric(6,2),
  inseam                numeric(6,2),
  outseam               numeric(6,2),
  thigh                 numeric(6,2),
  knee                  numeric(6,2),
  calf                  numeric(6,2),
  trouser_length        numeric(6,2),
  skirt_length          numeric(6,2),
  dress_length          numeric(6,2),

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);


-- ----- store_settings -----
-- Key-value configuration for the shop.
-- Examples: store_name, currency, tax_rate, default_due_days.
create table store_settings (
  id          uuid primary key default gen_random_uuid(),
  key         text        not null unique,
  value       text        not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);


-- ===================
-- 5. updated_at TRIGGERS
-- ===================
create trigger set_profiles_updated_at
  before update on profiles
  for each row execute function handle_updated_at();

create trigger set_customers_updated_at
  before update on customers
  for each row execute function handle_updated_at();

create trigger set_orders_updated_at
  before update on orders
  for each row execute function handle_updated_at();

create trigger set_alteration_details_updated_at
  before update on alteration_details
  for each row execute function handle_updated_at();

create trigger set_tailoring_details_updated_at
  before update on tailoring_details
  for each row execute function handle_updated_at();

create trigger set_store_settings_updated_at
  before update on store_settings
  for each row execute function handle_updated_at();


-- ===================
-- 6. INDEXES
-- ===================

-- profiles
create index idx_profiles_role on profiles(role);

-- customers
create index idx_customers_phone      on customers(phone);
create index idx_customers_name_trgm  on customers using gin(name gin_trgm_ops);   -- fuzzy name search
create index idx_customers_active     on customers(created_at desc) where deleted_at is null;

-- orders
create index idx_orders_customer_id    on orders(customer_id);
create index idx_orders_status         on orders(status);
create index idx_orders_payment_status on orders(payment_status);
create index idx_orders_due_date       on orders(due_date);
create index idx_orders_assigned_to    on orders(assigned_to);
create index idx_orders_active         on orders(created_at desc) where deleted_at is null;
create index idx_orders_status_due     on orders(status, due_date) where deleted_at is null;


-- ===================
-- 7. ROW LEVEL SECURITY
-- ===================

alter table profiles           enable row level security;
alter table customers          enable row level security;
alter table orders             enable row level security;
alter table alteration_details enable row level security;
alter table tailoring_details  enable row level security;
alter table store_settings     enable row level security;

-- ----- profiles policies -----
create policy "profiles: anyone authenticated can read"
  on profiles for select
  to authenticated
  using (true);

create policy "profiles: users can update own row"
  on profiles for update
  to authenticated
  using (auth.uid() = id);

create policy "profiles: admins can update any row"
  on profiles for update
  to authenticated
  using (is_admin());

-- ----- customers policies -----
-- No `TO` clause = defaults to `public` role (anon + authenticated).
-- Tighten these to `TO authenticated` once login is implemented.
create policy "customers: allow read"
  on customers for select
  using (deleted_at is null);

create policy "customers: allow insert"
  on customers for insert
  with check (true);

create policy "customers: allow update"
  on customers for update
  using (deleted_at is null);

create policy "customers: admin delete"
  on customers for delete to authenticated
  using (is_admin());

-- ----- orders policies -----
create policy "orders: allow read"
  on orders for select
  using (deleted_at is null);

create policy "orders: allow insert"
  on orders for insert
  with check (true);

create policy "orders: allow update"
  on orders for update
  using (deleted_at is null);

create policy "orders: admin delete"
  on orders for delete to authenticated
  using (is_admin());

-- ----- alteration_details policies -----
create policy "alteration_details: allow read"
  on alteration_details for select
  using (true);

create policy "alteration_details: allow insert"
  on alteration_details for insert
  with check (true);

create policy "alteration_details: allow update"
  on alteration_details for update
  using (true);

create policy "alteration_details: admin delete"
  on alteration_details for delete to authenticated
  using (is_admin());

-- ----- tailoring_details policies -----
create policy "tailoring_details: allow read"
  on tailoring_details for select
  using (true);

create policy "tailoring_details: allow insert"
  on tailoring_details for insert
  with check (true);

create policy "tailoring_details: allow update"
  on tailoring_details for update
  using (true);

create policy "tailoring_details: admin delete"
  on tailoring_details for delete to authenticated
  using (is_admin());

-- ----- store_settings policies -----
-- No `TO` clause = public (anon + authenticated) so the app
-- can read settings before auth is implemented.
create policy "store_settings: allow read"
  on store_settings for select
  using (true);

create policy "store_settings: admin insert"
  on store_settings for insert to authenticated
  with check (is_admin());

create policy "store_settings: admin update"
  on store_settings for update to authenticated
  using (is_admin());

create policy "store_settings: admin delete"
  on store_settings for delete to authenticated
  using (is_admin());


-- ===================
-- 8. SEED: default store settings
-- ===================
insert into store_settings (key, value, description) values
  ('store_name',         'My Tailor Shop',       'Business name shown on receipts and UI'),
  ('store_phone',        '',                      'Shop contact phone number'),
  ('store_email',        '',                      'Shop contact email'),
  ('store_address',      '',                      'Physical shop address'),
  ('currency',           'AED',                   'Currency code for prices'),
  ('tax_rate',           '0',                     'Tax percentage applied to orders (e.g. 5 = 5%)'),
  ('default_due_days',   '7',                     'Default number of days until order is due'),
  ('receipt_footer_text','Thank you for your business!', 'Text printed at the bottom of receipts')
on conflict (key) do nothing;
