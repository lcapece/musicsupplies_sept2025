-- Add phone numbers for 2FA authentication
-- These numbers will receive the 6-digit security code when account 999 logs in

-- Add your phone numbers here (format: include country code)
-- Example for US numbers: +15165551234

INSERT INTO public."2fa" (phonenumber) VALUES 
  ('+15164107455'),  -- Add your primary phone
  ('+18003215584');  -- Add backup phone if needed

-- To view current 2FA phone numbers:
-- SELECT * FROM public."2fa";

-- To remove a phone number:
-- DELETE FROM public."2fa" WHERE phonenumber = '+15165551234';