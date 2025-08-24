-- PURPOSE:
-- 1) Show the phone numbers that admin 2FA (account 999) SMSes are sent to.
--    The Edge Function send-admin-sms reads from:
--      a) public.sms_notification_settings where event_name = '2FA_LOGIN' AND is_enabled = true
--         (uses notification_phones text[] column)
--      b) Fallback: public."2fa" table, column phonenumber (legacy)
-- 2) Optionally add/update your phone (+1 516-455-0980) in the correct place.
-- 3) Verify final state.

-- RECOMMENDED: Use the sms_notification_settings table for configuration.
-- Only use the legacy public."2fa" table if you cannot use sms_notification_settings.

-- 0) SAFETY: inspect existing structures
--    These queries won't modify data.
--    Run them in the Supabase SQL editor to view current config.

-- List current '2FA_LOGIN' notification phones (primary source)
SELECT
  event_name,
  is_enabled,
  notification_phones
FROM public.sms_notification_settings
WHERE event_name = '2FA_LOGIN';

-- Flatten phones for readability
SELECT
  unnest(notification_phones)::text AS phone
FROM public.sms_notification_settings
WHERE event_name = '2FA_LOGIN'
  AND is_enabled = true;

-- Check legacy fallback table
SELECT phonenumber
FROM public."2fa";

--------------------------------------------------------------------------------
-- 1) OPTIONAL FIX: Add your phone to the primary config (recommended)
--    Replace the phone below if needed. Use E.164 format if possible (+15164550980).
--    This will upsert the '2FA_LOGIN' row and ensure is_enabled = true and includes your number.
--------------------------------------------------------------------------------
-- BEGIN;  -- uncomment if you want to wrap in a manual transaction

-- Ensure a row exists for '2FA_LOGIN'; if it exists, merge your phone into the array.
WITH existing AS (
  SELECT id, notification_phones
  FROM public.sms_notification_settings
  WHERE event_name = '2FA_LOGIN'
)
-- Insert row if missing
INSERT INTO public.sms_notification_settings (event_name, is_enabled, notification_phones)
SELECT '2FA_LOGIN', true, ARRAY['+15164550980']::text[]
WHERE NOT EXISTS (SELECT 1 FROM existing);

-- If row exists, add the phone if not already present
UPDATE public.sms_notification_settings
SET notification_phones = (
  SELECT DISTINCT ON (p) p
  FROM unnest(
         COALESCE(notification_phones, ARRAY[]::text[]) ||
         ARRAY['+15164550980']::text[]
       ) AS p
)
, is_enabled = true
WHERE event_name = '2FA_LOGIN';

-- COMMIT; -- uncomment if you used BEGIN

--------------------------------------------------------------------------------
-- 2) OPTIONAL (Legacy) Add your phone to public."2fa"
--    Only do this if you cannot manage sms_notification_settings.
--------------------------------------------------------------------------------
-- INSERT INTO public."2fa"(phonenumber) VALUES ('+15164550980');

--------------------------------------------------------------------------------
-- 3) VERIFY
--------------------------------------------------------------------------------
-- Re-run verification queries:

-- Primary source verification
SELECT
  event_name,
  is_enabled,
  notification_phones
FROM public.sms_notification_settings
WHERE event_name = '2FA_LOGIN';

SELECT
  unnest(notification_phones)::text AS phone
FROM public.sms_notification_settings
WHERE event_name = '2FA_LOGIN'
  AND is_enabled = true;

-- Legacy fallback verification
SELECT phonenumber
FROM public."2fa";
