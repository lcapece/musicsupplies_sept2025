const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://rchmrjizxyevrcbkagiy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjaG1yaml6eHlldnJjYmthZ2l5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjEzMzExMzksImV4cCI6MjAzNjkwNzEzOX0.O-rZdOa5J6g7YvX1ZyA8YBSZeG8kXyXXHOZX8QC8vl0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test2FA() {
  console.log('Testing 2FA system for account 999...');
  
  try {
    // Step 1: Generate 2FA code
    console.log('\n=== Step 1: Generating 2FA code ===');
    const { data: codeResult, error: codeError } = await supabase
      .rpc('generate_2fa_code', {
        p_account_number: 999,
        p_ip_address: '127.0.0.1',
        p_user_agent: 'MCP-Test'
      });

    if (codeError) {
      console.error('Error generating 2FA code:', codeError);
      return;
    }

    console.log('2FA Code generated successfully:', codeResult);

    // Step 2: Query admin_logins table
    console.log('\n=== Step 2: Checking admin_logins table ===');
    const { data: adminLogins, error: adminError } = await supabase
      .from('admin_logins')
      .select('*')
      .eq('account_number', 999)
      .order('created_at', { ascending: false })
      .limit(3);

    if (adminError) {
      console.error('Error querying admin_logins:', adminError);
    } else {
      console.log('Recent admin_logins entries:', adminLogins);
    }

    // Step 3: Query sms_admins table
    console.log('\n=== Step 3: Checking sms_admins table ===');
    const { data: smsAdmins, error: smsError } = await supabase
      .from('sms_admins')
      .select('*')
      .eq('is_active', true);

    if (smsError) {
      console.error('Error querying sms_admins:', smsError);
    } else {
      console.log('Active SMS admin phone numbers:', smsAdmins);
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

test2FA().then(() => {
  console.log('\n=== Test completed ===');
}).catch(error => {
  console.error('Test failed:', error);
});