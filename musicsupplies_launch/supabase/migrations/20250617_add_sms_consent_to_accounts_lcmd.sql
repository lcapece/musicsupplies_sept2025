-- Add sms_consent_given column
ALTER TABLE accounts_lcmd
ADD COLUMN sms_consent_given BOOLEAN DEFAULT FALSE;

-- Add sms_consent_date column
ALTER TABLE accounts_lcmd
ADD COLUMN sms_consent_date TIMESTAMPTZ;
