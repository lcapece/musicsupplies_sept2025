-- Create unresolved_issues table to track outstanding problems
CREATE TABLE IF NOT EXISTS public.unresolved_issues (
  id SERIAL PRIMARY KEY,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  issue_name VARCHAR(255) NOT NULL,
  comments TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comment to the table
COMMENT ON TABLE public.unresolved_issues IS 'Tracks unresolved technical issues for future resolution';

-- Add RLS policies
ALTER TABLE public.unresolved_issues ENABLE ROW LEVEL SECURITY;

-- Only allow admins to see and manage unresolved issues
CREATE POLICY "Admins can view unresolved issues" 
  ON public.unresolved_issues 
  FOR SELECT 
  USING (auth.uid() IN (SELECT user_id FROM public.admin_users));

CREATE POLICY "Admins can insert unresolved issues" 
  ON public.unresolved_issues 
  FOR INSERT 
  WITH CHECK (auth.uid() IN (SELECT user_id FROM public.admin_users));

CREATE POLICY "Admins can update unresolved issues" 
  ON public.unresolved_issues 
  FOR UPDATE 
  USING (auth.uid() IN (SELECT user_id FROM public.admin_users));

-- Insert record for ClickSend SMS integration issue
INSERT INTO public.unresolved_issues (
  issue_date,
  issue_name,
  comments,
  status
) VALUES (
  '2025-06-05',
  'ClickSend SMS Integration Failure',
  'SMS sending from PasswordChangeModal not working. Function appears correctly configured (send-order-sms) but messages are not being delivered. Possible issues: 1) Environment variable mismatch (CLICKSEND_USERNAME vs CLICKSEND_USER_ID), 2) API credentials invalid or expired, 3) ClickSend account balance/permissions issue. Function needs updated to check for both variable names, improve error logging, and ensure proper credential handling.',
  'OPEN'
);
