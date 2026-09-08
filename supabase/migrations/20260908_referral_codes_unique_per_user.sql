-- ============================================================
-- O'CHEL FOODS — MIGRATION: Unique referral code per user
-- Prevents a user from ever having more than one referral_codes row.
-- Run this in your Supabase SQL Editor.
-- ============================================================


-- ══════════════════════════════════════════════════════════════
-- FOREIGN KEY ANALYSIS (read before running anything)
-- ══════════════════════════════════════════════════════════════
-- The `referrals` table stores the code as a plain TEXT column
-- (referrals.code text not null) — it is NOT a foreign key to
-- referral_codes. There is no ON DELETE CASCADE between these
-- two tables. Deleting a row from referral_codes:
--   • will NOT cascade-delete any referrals rows
--   • will NOT be blocked by any FK constraint
--   • WILL silently orphan any referrals row whose .code value
--     matched the deleted referral_codes.code string
--
-- That last point is why you MUST run the pre-flight checks below
-- before deleting anything.
-- ══════════════════════════════════════════════════════════════


-- ── PRE-FLIGHT CHECK 1 ────────────────────────────────────────
-- Find which users have more than one referral_codes row,
-- and show all their codes with creation timestamps.
-- "Rows to keep" = newest (MAX created_at) per user_id.
-- "Rows to delete" = every other row for that user.
--
-- SELECT
--   rc.user_id,
--   rc.id,
--   rc.code,
--   rc.created_at,
--   CASE WHEN rc.created_at = mx.max_created_at THEN 'KEEP (newest)' ELSE 'DELETE' END AS action
-- FROM public.referral_codes rc
-- JOIN (
--   SELECT user_id, MAX(created_at) AS max_created_at, COUNT(*) AS cnt
--   FROM public.referral_codes
--   GROUP BY user_id
--   HAVING COUNT(*) > 1
-- ) mx ON rc.user_id = mx.user_id
-- ORDER BY rc.user_id, rc.created_at DESC;


-- ── PRE-FLIGHT CHECK 2 ────────────────────────────────────────
-- Critical: check whether any code that WOULD BE DELETED already
-- has a matching row in referrals (meaning someone signed up or
-- was referred using that specific code string).
-- Run this before deleting anything. If this returns rows, those
-- referral relationships exist and the code they used is about to
-- be removed from referral_codes — the referrals row itself will
-- survive (no cascade), but the code string will be an orphan.
--
-- SELECT
--   r.id             AS referral_id,
--   r.code           AS referral_code,
--   r.status         AS referral_status,
--   r.referred_id,
--   r.referred_phone,
--   r.created_at     AS referral_created_at,
--   rc.user_id       AS referrer_user_id,
--   rc.created_at    AS referral_code_row_created_at
-- FROM public.referrals r
-- JOIN public.referral_codes rc ON rc.code = r.code
-- WHERE rc.id NOT IN (
--   SELECT DISTINCT ON (user_id) id
--   FROM public.referral_codes
--   ORDER BY user_id, created_at DESC   -- keep newest, so this selects rows to KEEP
-- )
-- ORDER BY r.status, r.created_at DESC;


-- ── CLEANUP: Delete older duplicate rows, keep newest per user ─
-- Only run this AFTER both pre-flight checks return acceptable results.
-- This keeps the row with the highest created_at per user_id
-- and deletes all other rows for that user.
-- If pre-flight check 2 found referrals rows on codes being deleted,
-- discuss with the team before proceeding.
--
-- DELETE FROM public.referral_codes
-- WHERE id NOT IN (
--   SELECT DISTINCT ON (user_id) id
--   FROM public.referral_codes
--   ORDER BY user_id, created_at DESC
-- );


-- ── STEP 2: Add the unique constraint ─────────────────────────
-- Run this after the cleanup above (or immediately if no duplicates
-- were found in pre-flight check 1).
-- referral_codes has no status column, so a plain unique index
-- on user_id is the correct constraint — no partial index needed.
--
create unique index if not exists idx_referral_codes_unique_user
  on public.referral_codes (user_id);
