import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { accountNumber, password } = await req.json()

    if (!accountNumber || !password) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Account number and password are required' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // STEP 1: Try regular authentication first
    console.log('Attempting regular authentication for:', accountNumber)
    
    let regularAuthSucceeded = false
    let regularAccountData = null

    try {
      // Query the account directly and check password
      let accountQuery = supabase
        .from('accounts_lcmd')
        .select(`
          account_number, 
          acct_name, 
          address, 
          city, 
          state, 
          zip, 
          email_address, 
          phone,
          mobile_phone,
          requires_password_change,
          is_special_admin,
          password
        `)

      // Check if accountNumber is numeric or email
      if (!isNaN(Number(accountNumber))) {
        accountQuery = accountQuery.eq('account_number', parseInt(accountNumber, 10))
      } else {
        accountQuery = accountQuery.eq('email_address', accountNumber)
      }

      const { data: accountData, error: accountError } = await accountQuery.single()

      if (!accountError && accountData && accountData.password === password) {
        console.log('Regular authentication successful')
        regularAuthSucceeded = true
        regularAccountData = accountData
      } else {
        console.log('Regular authentication failed, trying master password fallback')
      }
    } catch (regularAuthException) {
      console.log('Regular authentication exception, trying master password fallback:', regularAuthException.message)
    }

    // If regular authentication succeeded, return success
    if (regularAuthSucceeded && regularAccountData) {
      return new Response(
        JSON.stringify({ 
          success: true,
          account: {
            account_number: regularAccountData.account_number,
            acct_name: regularAccountData.acct_name,
            address: regularAccountData.address,
            city: regularAccountData.city,
            state: regularAccountData.state,
            zip: regularAccountData.zip,
            email_address: regularAccountData.email_address,
            phone: regularAccountData.phone,
            mobile_phone: regularAccountData.mobile_phone,
            requires_password_change: regularAccountData.requires_password_change || false,
            is_special_admin: regularAccountData.is_special_admin || false
          },
          loginType: 'regular'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // STEP 2: If regular authentication fails, try master password authentication
    console.log('Attempting master password authentication for:', accountNumber)

    // Get the master password from the PWD table
    const { data: masterPasswordData, error: pwdError } = await supabase
      .from('pwd')
      .select('pwd')
      .limit(1)
      .single()

    if (pwdError || !masterPasswordData) {
      console.error('Error fetching master password:', pwdError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid account number/email or password.' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      )
    }

    const masterPassword = masterPasswordData.pwd

    // Check if the provided password matches the master password
    if (password !== masterPassword) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid account number/email or password.' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      )
    }

    // If password matches master password, verify the account exists
    let accountQuery = supabase
      .from('accounts_lcmd')
      .select(`
        account_number, 
        acct_name, 
        address, 
        city, 
        state, 
        zip, 
        email_address, 
        phone,
        mobile_phone,
        requires_password_change,
        is_special_admin
      `)

    // Check if accountNumber is numeric or email
    if (!isNaN(Number(accountNumber))) {
      accountQuery = accountQuery.eq('account_number', parseInt(accountNumber, 10))
    } else {
      accountQuery = accountQuery.eq('email_address', accountNumber)
    }

    const { data: accountData, error: accountError } = await accountQuery.single()

    if (accountError || !accountData) {
      console.error('Account not found for master password auth:', accountError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Account not found' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404 
        }
      )
    }

    // Success - master password authentication worked
    console.log('Master password authentication successful for account:', accountData.account_number)
    
    return new Response(
      JSON.stringify({ 
        success: true,
        account: {
          account_number: accountData.account_number,
          acct_name: accountData.acct_name,
          address: accountData.address,
          city: accountData.city,
          state: accountData.state,
          zip: accountData.zip,
          email_address: accountData.email_address,
          phone: accountData.phone,
          mobile_phone: accountData.mobile_phone,
          requires_password_change: accountData.requires_password_change || false,
          is_special_admin: accountData.is_special_admin || false
        },
        loginType: 'master_password'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in authenticate-with-master-password:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
