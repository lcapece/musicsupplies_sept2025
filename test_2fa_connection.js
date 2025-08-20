import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ekklokrukxmqlahtonnc.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNzMxOTQsImV4cCI6MjA1NTY0OTE5NH0.LFyaAQyBb2l6rxdUAXpDQVZnR4gHDNrVZH0YudbjP3k'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test2FA() {
  try {
    // Test storing a 2FA code
    const { data: storeResult, error: storeError } = await supabase
      .rpc('store_2fa_code', {
        p_account_number: 999,
        p_code: '123456',
        p_ip_address: '127.0.0.1'
      })
    
    if (storeError) {
      console.error('Store 2FA error:', storeError)
    } else {
      console.log('Store 2FA result:', storeResult)
    }

    // Test validating the 2FA code
    const { data: validateResult, error: validateError } = await supabase
      .rpc('validate_2fa_code', {
        p_account_number: 999,
        p_code: '123456'
      })
    
    if (validateError) {
      console.error('Validate 2FA error:', validateError)
    } else {
      console.log('Validate 2FA result:', validateResult)
    }

    // Check if tables exist
    const { data: tablesData, error: tablesError } = await supabase
      .from('2fa')
      .select('*')
      .limit(1)
    
    if (tablesError) {
      console.error('Tables check error:', tablesError)
    } else {
      console.log('2FA table exists and accessible')
    }

  } catch (error) {
    console.error('Connection error:', error)
  }
}

test2FA()