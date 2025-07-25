CREATE TABLE new_account_applications (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    company_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    business_address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    business_type TEXT NOT NULL,
    tax_id TEXT NOT NULL,
    years_in_business TEXT NOT NULL,
    annual_revenue_range TEXT NOT NULL,
    primary_music_focus TEXT NOT NULL,
    how_did_you_hear TEXT NOT NULL,
    additional_info TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by TEXT,
    notes TEXT
);

-- RLS Policies
ALTER TABLE new_account_applications ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own application
CREATE POLICY "Allow authenticated users to insert their own application"
ON new_account_applications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow admin users to view all applications
CREATE POLICY "Allow admin users to view all applications"
ON new_account_applications
FOR SELECT
TO authenticated
USING (
  (get_my_claim('user_role'::text)) = '"admin"'::jsonb
);

-- Allow admin users to update applications
CREATE POLICY "Allow admin users to update applications"
ON new_account_applications
FOR UPDATE
TO authenticated
USING (
  (get_my_claim('user_role'::text)) = '"admin"'::jsonb
)
WITH CHECK (
  (get_my_claim('user_role'::text)) = '"admin"'::jsonb
);

-- Allow admin users to delete applications
CREATE POLICY "Allow admin users to delete applications"
ON new_account_applications
FOR DELETE
TO authenticated
USING (
  (get_my_claim('user_role'::text)) = '"admin"'::jsonb
);
