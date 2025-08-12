-- Create site_status table for managing site online/offline state
CREATE TABLE IF NOT EXISTS public.site_status (
    status TEXT PRIMARY KEY CHECK (status IN ('online', 'offline')),
    status_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on site_status table
ALTER TABLE public.site_status ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read site status" ON public.site_status;
DROP POLICY IF EXISTS "Only account 999 can insert site status" ON public.site_status;
DROP POLICY IF EXISTS "Only account 999 can update site status" ON public.site_status;
DROP POLICY IF EXISTS "Only account 999 can delete site status" ON public.site_status;

-- Create RLS policies
-- Anyone can read site status
CREATE POLICY "Anyone can read site status" 
    ON public.site_status 
    FOR SELECT 
    USING (true);

-- Only account 999 can insert site status
CREATE POLICY "Only account 999 can insert site status" 
    ON public.site_status 
    FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.accounts_lcmd
            WHERE accounts_lcmd.email_address = auth.email()
            AND accounts_lcmd.account_number = '999'
        )
    );

-- Only account 999 can update site status
CREATE POLICY "Only account 999 can update site status" 
    ON public.site_status 
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.accounts_lcmd
            WHERE accounts_lcmd.email_address = auth.email()
            AND accounts_lcmd.account_number = '999'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.accounts_lcmd
            WHERE accounts_lcmd.email_address = auth.email()
            AND accounts_lcmd.account_number = '999'
        )
    );

-- Only account 999 can delete site status
CREATE POLICY "Only account 999 can delete site status" 
    ON public.site_status 
    FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.accounts_lcmd
            WHERE accounts_lcmd.email_address = auth.email()
            AND accounts_lcmd.account_number = '999'
        )
    );

-- Grant necessary permissions
GRANT ALL ON public.site_status TO authenticated;
GRANT SELECT ON public.site_status TO anon;