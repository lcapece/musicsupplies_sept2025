import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ekklokrukxmqlahtonnc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTcxNzU5MjMsImV4cCI6MjAzMjc1MTkyM30.PsrpqAWl6IpBGX_Qo5JCmJV2W_wSmJYdlZjUqDU-Yt4'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testMasterPassword() {
  console.log('Testing master password authentication...')
  
  try {
    const { data, error } = await supabase.functions.invoke('authenticate-with-master-password', {
      body: {
        accountNumber: '999',
        password: 'Music123'
      }
    })
    
    console.log('Function response:', { data, error })
    
    if (error) {
      console.error('Function error:', error)
    } else {
      console.log('Success! Data:', data)
    }
  } catch (err) {
    console.error('Exception:', err)
  }
}

testMasterPassword()
