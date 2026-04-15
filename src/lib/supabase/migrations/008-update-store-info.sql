-- Migration 008: Update store info to Danaty Fashion bilingual identity
-- Run in: Supabase Dashboard → SQL Editor

-- 1. Update existing core settings
UPDATE store_settings SET value = 'Danaty Fashion'          WHERE key = 'store_name';
UPDATE store_settings SET value = '04 2801936'              WHERE key = 'store_phone';
UPDATE store_settings SET value = 'Buhamidm2024@gmail.com'  WHERE key = 'store_email';

-- 2. Insert new bilingual / location / liability fields
--    ON CONFLICT DO UPDATE makes this safe to run multiple times.
INSERT INTO store_settings (key, value)
VALUES
  ('store_name_ar',            'داناتي فاشن'),
  ('store_location',           'Aswaq Al Warqa 2'),
  ('store_location_ar',        'أسواق الورقاء 2'),
  ('store_shop_number',        'Shop No. 39 & 40'),
  ('store_shop_number_ar',     'محل رقم 39 و 40'),
  ('store_mobile',             '055 696 3779'),
  ('store_liability_notice',   'The shop is not responsible for keeping any item above 6 months'),
  ('store_liability_notice_ar','لا يتحمل المحل مسؤولية الاحتفاظ بأي بضاعة فوق 6 شهور')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
