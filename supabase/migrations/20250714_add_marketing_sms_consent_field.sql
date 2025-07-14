-- Add marketing SMS consent field to accounts_lcmd table
-- This allows separate tracking of transactional vs marketing SMS consent
-- as required by ClickSend TFN registration compliance

ALTER TABLE accounts_lcmd 
ADD COLUMN marketing_sms_consent BOOLEAN DEFAULT FALSE;

-- Add comment to explain the field
COMMENT ON COLUMN accounts_lcmd.marketing_sms_consent IS 'Tracks express written consent for marketing SMS messages, separate from transactional SMS consent';

-- Update existing records to have marketing consent false by default
UPDATE accounts_lcmd 
SET marketing_sms_consent = FALSE 
WHERE marketing_sms_consent IS NULL;

-- Add index for performance on consent queries
CREATE INDEX idx_accounts_lcmd_marketing_sms_consent ON accounts_lcmd(marketing_sms_consent);
CREATE INDEX idx_accounts_lcmd_sms_consents ON accounts_lcmd(sms_consent, marketing_sms_consent);
