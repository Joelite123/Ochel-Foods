-- ============================================================
-- O'CHEL FOODS — MIGRATION: Referral Anti-Fraud Unique Indexes
-- Prevents duplicate referral rewards at the database level.
-- Run this in your Supabase SQL Editor.
-- ============================================================

-- 1. Ensure a referred user (by auth user ID) can only ever receive ONE rewarded referral across all codes
create unique index if not exists idx_referrals_unique_rewarded_user 
  on public.referrals (referred_id) 
  where (referred_id is not null and status = 'rewarded');

-- 2. Ensure a referred customer (by phone number) can only ever receive ONE rewarded referral across all codes
create unique index if not exists idx_referrals_unique_rewarded_phone 
  on public.referrals (referred_phone) 
  where (referred_phone is not null and status = 'rewarded');
