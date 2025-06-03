/*
  # Add Administrator Account

  1. Insert admin account 999
    - Account number: 999
    - Company name: System Administrator
    - Default password: admin123
    - Requires password change: false (admin can manage this)
*/

-- Insert admin account if it doesn't exist
INSERT INTO accounts_lcmd (account_number, password, acct_name, address, city, state, zip, requires_password_change)
VALUES (999, 'admin123', 'System Administrator', '123 Admin St', 'Admin City', 'AC', '99999', false)
ON CONFLICT (account_number) DO NOTHING;
