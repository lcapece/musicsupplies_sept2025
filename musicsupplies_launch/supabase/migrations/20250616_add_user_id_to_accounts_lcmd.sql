-- Add user_id column to accounts_lcmd table
ALTER TABLE public.accounts_lcmd
ADD COLUMN user_id uuid UNIQUE;

-- Optional: Add a foreign key constraint to auth.users if desired
-- ALTER TABLE public.accounts_lcmd
-- ADD CONSTRAINT fk_user_id
-- FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing accounts_lcmd entries with user_id from auth.users
-- This part assumes a mapping exists or can be derived.
-- For example, if account_number is stored in auth.users metadata, or if there's a direct link.
-- This might require manual intervention or a more complex update query.
-- For now, we'll leave it as a placeholder.
