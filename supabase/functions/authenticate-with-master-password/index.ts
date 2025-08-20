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

    // EMERGENCY SECURITY BLOCK: REJECT Music123 IMMEDIATELY
    if (password.toLowerCase() === 'music123' || password === 'Music123' || password === '999') {
      console.error('SECURITY BREACH ATTEMPT: Music123 or backdoor password used!', {
        accountNumber,
        timestamp: new Date().toISOString()
      })
      
      // Log to database
      await supabase.from('app_events').insert({
        event_type: 'SECURITY_BREACH',
        event_name: 'edge_function_backdoor_blocked',
        event_data: {
          account: accountNumber,
          password_pattern: 'Music123_or_backdoor',
          timestamp: new Date().toISOString()
        }
      })
      
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

    // CRITICAL SECURITY: No universal passwords allowed
    // The old Music123 backdoor has been removed
    
    // STEP 1: Try regular authentication first
    console.log('Attempting regular authentication for:', accountNumber)
    
    let regularAuthSucceeded = false
    let regularAccountData = null

    try {
      // First, get account data
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
      let actualAccountNumber
      if (!isNaN(Number(accountNumber))) {
        actualAccountNumber = parseInt(accountNumber, 10)
        accountQuery = accountQuery.eq('account_number', actualAccountNumber)
      } else {
        accountQuery = accountQuery.eq('email_address', accountNumber)
      }

      const { data: accountData, error: accountError } = await accountQuery.single()
      
      if (accountError || !accountData) {
        console.log('Account not found:', accountError)
        throw new Error('Account not found')
      }

      actualAccountNumber = accountData.account_number

      // Check user_passwords table first (new system)
      console.log('Checking user_passwords table for account:', actualAccountNumber)
      const { data: userPasswordData, error: userPasswordError } = await supabase
        .from('user_passwords')
        .select('password_hash')
        .eq('account_number', actualAccountNumber)
        .single()

      if (!userPasswordError && userPasswordData && userPasswordData.password_hash) {
        // Use bcrypt verification via database function
        const { data: verifyResult, error: verifyError } = await supabase.rpc('verify_password', {
          plain_password: password,
          hashed_password: userPasswordData.password_hash
        })
        
        if (!verifyError && verifyResult === true) {
          console.log('Regular authentication successful via user_passwords table (bcrypt)')
          regularAuthSucceeded = true
          regularAccountData = accountData
        }
      } else {
        console.log('Regular authentication failed - password mismatch')
        console.log('user_passwords result:', userPasswordData)
      }
    } catch (regularAuthException) {
      console.log('Regular authentication exception:', regularAuthException.message)
    }

    // If regular authentication succeeded, check if 2FA is required
    if (regularAuthSucceeded && regularAccountData) {
      // EMERGENCY: Account 999 requires 2FA SMS
      if (regularAccountData.account_number === 999) {
        console.log('Account 999 authenticated - triggering 2FA SMS')
        
        try {
          // Generate 2FA code
          const twoFactorCode = Math.floor(100000 + Math.random() * 900000).toString()
          const expiresAt = new Date(Date.now() + 90000) // 90 seconds from now
          
          // Store 2FA code in database
          await supabase.from('two_factor_codes').insert({
            account_number: 999,
            code: twoFactorCode,
            expires_at: expiresAt.toISOString(),
            used: false
          })
          
          // Send SMS with 2FA code
          const smsResponse = await supabase.functions.invoke('send-admin-sms', {
            body: {
              eventName: '2FA_LOGIN',
              message: `MusicSupplies.com Admin Security Code: ${twoFactorCode} (expires in 90 seconds)`,
              customPhones: ['+15164550980']
            }
          })
          
          console.log('2FA SMS triggered for account 999:', smsResponse)
          
          return new Response(
            JSON.stringify({ 
              success: false,
              requires2FA: true,
              message: '2FA code sent to your phone'
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200 
            }
          )
        } catch (smsError) {
          console.error('Failed to send 2FA SMS:', smsError)
          // Continue with regular login if SMS fails
        }
      }
      
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

    // STEP 2: CRITICAL SECURITY CHECK - If regular authentication fails, check if master password authentication is allowed
    console.log('Attempting master password authentication for:', accountNumber)

    // SECURITY ENFORCEMENT: Check if the account has a custom password in user_passwords table
    // If they do, zip code (master password) login should be COMPLETELY DISABLED
    let actualAccountNumberForCheck
    if (!isNaN(Number(accountNumber))) {
      actualAccountNumberForCheck = parseInt(accountNumber, 10)
    } else {
      // Need to get account number from email first
      const { data: emailAccountData, error: emailAccountError } = await supabase
        .from('accounts_lcmd')
        .select('account_number')
        .eq('email_address', accountNumber)
        .single()
      
      if (emailAccountError || !emailAccountData) {
        console.log('Account not found by email for security check:', emailAccountError)
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
      actualAccountNumberForCheck = emailAccountData.account_number
    }

    console.log('Checking if account has custom password:', actualAccountNumberForCheck)
    const { data: customPasswordCheck, error: customPasswordError } = await supabase
      .from('user_passwords')
      .select('account_number')
      .eq('account_number', actualAccountNumberForCheck)
      .single()

    // CRITICAL: If account has a custom password, DENY zip code authentication
    if (!customPasswordError && customPasswordCheck) {
      console.log('SECURITY BLOCK: Account', actualAccountNumberForCheck, 'has custom password - zip code login DISABLED')
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

    console.log('Account', actualAccountNumberForCheck, 'does not have custom password - allowing zip code authentication')

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
