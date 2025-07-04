// Import the Supabase client
import { createClient } from '@supabase/supabase-js';

// Get environment variables with fallbacks to prevent white screen
const supabaseUrl = 'https://ekklokrukxmqlahtonnc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNzMxOTQsImV4cCI6MjA1NTY0OTE5NH0.LFyaAQyBb2l6rxdUAXpDQVZnR4gHDNrVZH0YudbjP3k';

// Create the Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function applyPromoCodeLimitsUpdates() {
  try {
    console.log('Applying promo code per-account limits updates...');
    
    // 1. First check if the exec_sql function exists
    console.log('Creating exec_sql function if it does not exist...');
    await supabase.rpc('postgres_query', { 
      query: `
        CREATE OR REPLACE FUNCTION exec_sql(sql_string text)
        RETURNS void AS $$
        BEGIN
          EXECUTE sql_string;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        
        GRANT EXECUTE ON FUNCTION exec_sql TO authenticated;
      `
    }).catch(error => {
      console.log('Note: postgres_query function may not exist yet, continuing...');
    });
    
    // 2. Add the new columns to the promo_codes table
    console.log('Adding columns to promo_codes table...');
    await supabase.rpc('exec_sql', {
      sql_string: `
        ALTER TABLE IF EXISTS promo_codes
        ADD COLUMN IF NOT EXISTS max_uses_per_account INTEGER DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS uses_per_account_tracking BOOLEAN DEFAULT FALSE;
      `
    }).catch(error => {
      console.error('Error adding columns:', error);
      throw error;
    });
    
    // 3. Add a constraint to ensure max_uses_per_account is positive
    console.log('Adding constraint for max_uses_per_account...');
    await supabase.rpc('exec_sql', {
      sql_string: `
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'valid_per_account_uses'
          ) THEN
            ALTER TABLE promo_codes
            ADD CONSTRAINT valid_per_account_uses CHECK (max_uses_per_account IS NULL OR max_uses_per_account > 0);
          END IF;
        END
        $$;
      `
    }).catch(error => {
      console.error('Error adding constraint:', error);
      throw error;
    });
    
    // 4. Create index for better performance
    console.log('Creating index for promo_code_usage...');
    await supabase.rpc('exec_sql', {
      sql_string: `
        CREATE INDEX IF NOT EXISTS idx_promo_code_usage_account_promo
        ON promo_code_usage(promo_code_id, account_number);
      `
    }).catch(error => {
      console.error('Error creating index:', error);
      throw error;
    });
    
    // 5. Update the check_promo_code_validity function
    console.log('Updating check_promo_code_validity function...');
    await supabase.rpc('exec_sql', {
      sql_string: `
        CREATE OR REPLACE FUNCTION check_promo_code_validity(
          p_code TEXT,
          p_account_number TEXT,
          p_order_value DECIMAL
        )
        RETURNS TABLE (
          is_valid BOOLEAN,
          message TEXT,
          promo_id UUID,
          promo_type TEXT,
          promo_value DECIMAL,
          discount_amount DECIMAL
        )
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
          v_promo promo_codes%ROWTYPE;
          v_account_usage_count INTEGER;
          v_discount_amount DECIMAL;
        BEGIN
          -- Get promo code details (convert to uppercase for case insensitivity)
          SELECT * INTO v_promo
          FROM promo_codes
          WHERE UPPER(code) = UPPER(p_code)
            AND is_active = TRUE
            AND start_date <= CURRENT_TIMESTAMP
            AND end_date >= CURRENT_TIMESTAMP;
          
          -- Check if promo code exists and is active
          IF v_promo.id IS NULL THEN
            RETURN QUERY SELECT 
              FALSE, 
              'Invalid or expired promo code.',
              NULL::UUID,
              NULL::TEXT,
              NULL::DECIMAL,
              NULL::DECIMAL;
            RETURN;
          END IF;
          
          -- Check if minimum order value is met
          IF p_order_value < v_promo.min_order_value THEN
            RETURN QUERY SELECT 
              FALSE, 
              'Order value does not meet minimum requirement of $' || v_promo.min_order_value::TEXT,
              NULL::UUID,
              NULL::TEXT,
              NULL::DECIMAL,
              NULL::DECIMAL;
            RETURN;
          END IF;
          
          -- Check if there are uses remaining (if limited)
          IF v_promo.max_uses IS NOT NULL AND v_promo.uses_remaining <= 0 THEN
            RETURN QUERY SELECT 
              FALSE, 
              'This promo code has reached its usage limit.',
              NULL::UUID,
              NULL::TEXT,
              NULL::DECIMAL,
              NULL::DECIMAL;
            RETURN;
          END IF;
          
          -- NEW: Check if account has reached its usage limit for this promo code
          IF v_promo.uses_per_account_tracking AND v_promo.max_uses_per_account IS NOT NULL THEN
            SELECT COUNT(*) INTO v_account_usage_count
            FROM promo_code_usage
            WHERE promo_code_id = v_promo.id
              AND account_number = p_account_number;
              
            IF v_account_usage_count >= v_promo.max_uses_per_account THEN
              RETURN QUERY SELECT 
                FALSE, 
                'You have already used this promo code the maximum number of times (' || v_promo.max_uses_per_account::TEXT || ').',
                NULL::UUID,
                NULL::TEXT,
                NULL::DECIMAL,
                NULL::DECIMAL;
              RETURN;
            END IF;
          END IF;
          
          -- Calculate discount amount
          IF v_promo.type = 'percent_off' THEN
            v_discount_amount := p_order_value * (v_promo.value / 100.0);
          ELSE -- dollars_off
            v_discount_amount := v_promo.value;
            -- Ensure discount doesn't exceed order value
            IF v_discount_amount > p_order_value THEN
              v_discount_amount := p_order_value;
            END IF;
          END IF;
          
          -- Return success with promo details
          RETURN QUERY SELECT 
            TRUE, 
            'Promo code applied successfully: ' || v_promo.name,
            v_promo.id,
            v_promo.type,
            v_promo.value,
            v_discount_amount;
        END;
        $$;
      `
    }).catch(error => {
      console.error('Error updating check_promo_code_validity function:', error);
      throw error;
    });
    
    // 6. Update the get_available_promo_codes function
    console.log('Updating get_available_promo_codes function...');
    await supabase.rpc('exec_sql', {
      sql_string: `
        CREATE OR REPLACE FUNCTION get_available_promo_codes(
          p_account_number TEXT,
          p_order_value DECIMAL DEFAULT 0
        )
        RETURNS TABLE (
          code TEXT,
          name TEXT,
          description TEXT,
          type TEXT,
          value DECIMAL,
          min_order_value DECIMAL,
          is_best BOOLEAN,
          uses_remaining_for_account INTEGER
        )
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
          RETURN QUERY
          WITH account_usage AS (
            SELECT 
              promo_code_id,
              COUNT(*) as times_used
            FROM promo_code_usage
            WHERE account_number = p_account_number
            GROUP BY promo_code_id
          )
          SELECT
            pc.code,
            pc.name,
            'Save ' || 
              CASE 
                WHEN pc.type = 'percent_off' THEN pc.value::TEXT || '%'
                ELSE '$' || pc.value::TEXT
              END ||
              CASE
                WHEN pc.min_order_value > 0 THEN ' on orders over $' || pc.min_order_value::TEXT
                ELSE ''
              END ||
              CASE
                WHEN pc.max_uses IS NOT NULL THEN ' (Limited time offer)'
                ELSE ''
              END as description,
            pc.type,
            pc.value,
            pc.min_order_value,
            -- Best promo logic based on discount amount
            CASE 
              WHEN pc.type = 'percent_off' AND p_order_value >= pc.min_order_value THEN 
                RANK() OVER (ORDER BY pc.value DESC) = 1
              WHEN pc.type = 'dollars_off' AND p_order_value >= pc.min_order_value THEN
                RANK() OVER (ORDER BY pc.value DESC) = 1
              ELSE FALSE
            END as is_best,
            -- Compute remaining uses for this account
            CASE
              WHEN pc.uses_per_account_tracking AND pc.max_uses_per_account IS NOT NULL THEN
                pc.max_uses_per_account - COALESCE(au.times_used, 0)
              ELSE NULL
            END as uses_remaining_for_account
          FROM promo_codes pc
          LEFT JOIN account_usage au ON pc.id = au.promo_code_id
          WHERE pc.is_active = TRUE
            AND pc.start_date <= CURRENT_TIMESTAMP
            AND pc.end_date >= CURRENT_TIMESTAMP
            AND (pc.max_uses IS NULL OR pc.uses_remaining > 0)
            AND (
              -- Skip per-account limit check if not tracking per account
              NOT pc.uses_per_account_tracking
              OR
              -- Include if tracking but no max per account
              pc.max_uses_per_account IS NULL
              OR
              -- Include if tracking and under max per account
              (
                pc.max_uses_per_account > COALESCE(
                  (SELECT times_used FROM account_usage WHERE promo_code_id = pc.id),
                  0
                )
              )
            )
            AND (pc.min_order_value <= p_order_value OR p_order_value = 0)
          ORDER BY is_best DESC, pc.value DESC;
        END;
        $$;
        
        -- Grant execute permissions
        GRANT EXECUTE ON FUNCTION get_available_promo_codes TO anon, authenticated;
      `
    }).catch(error => {
      console.error('Error updating get_available_promo_codes function:', error);
      throw error;
    });
    
    // 7. Create the get_best_promo_code function
    console.log('Creating get_best_promo_code function...');
    await supabase.rpc('exec_sql', {
      sql_string: `
        CREATE OR REPLACE FUNCTION get_best_promo_code(
          p_account_number TEXT
        )
        RETURNS TABLE (
          code TEXT,
          name TEXT,
          description TEXT,
          type TEXT,
          value DECIMAL,
          min_order_value DECIMAL
        )
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
          -- Return only the best promo code (assuming a minimal order value for calculation)
          -- This is a simplified version that always returns the first available promo code
          -- sorted by potential value
          RETURN QUERY
          SELECT 
            pc.code,
            pc.name,
            'Save ' || 
              CASE 
                WHEN pc.type = 'percent_off' THEN pc.value::TEXT || '%'
                ELSE '$' || pc.value::TEXT
              END ||
              CASE
                WHEN pc.min_order_value > 0 THEN ' on orders over $' || pc.min_order_value::TEXT
                ELSE ''
              END ||
              CASE
                WHEN pc.max_uses IS NOT NULL THEN ' (Limited time offer)'
                ELSE ''
              END as description,
            pc.type,
            pc.value,
            pc.min_order_value
          FROM promo_codes pc
          WHERE pc.is_active = TRUE
            AND pc.start_date <= CURRENT_TIMESTAMP
            AND pc.end_date >= CURRENT_TIMESTAMP
            AND (pc.max_uses IS NULL OR pc.uses_remaining > 0)
          ORDER BY
            -- Sort by percentage off first (higher percentages first)
            CASE WHEN pc.type = 'percent_off' THEN pc.value ELSE 0 END DESC,
            -- Then by fixed amount off (higher amounts first)
            CASE WHEN pc.type = 'dollars_off' THEN pc.value ELSE 0 END DESC,
            -- Then by minimum order value (lower minimums first)
            pc.min_order_value ASC
          LIMIT 1;
        END;
        $$;

        -- Grant execute permissions
        GRANT EXECUTE ON FUNCTION get_best_promo_code TO anon, authenticated;
      `
    }).catch(error => {
      console.error('Error creating get_best_promo_code function:', error);
      throw error;
    });
    
    console.log('Promo code schema updates completed successfully');
    return { 
      success: true, 
      message: 'Promo code per-account limits have been successfully added to the database schema' 
    };
  } catch (error) {
    console.error('Error applying promo code schema updates:', error);
    return { 
      success: false, 
      message: `Failed to apply promo code updates: ${error.message}` 
    };
  }
}

async function applyMigrations() {
  console.log('Starting migration process...');
  
  // Apply the promo code limits updates
  const limitsResult = await applyPromoCodeLimitsUpdates();
  console.log('Promo code limits update result:', limitsResult);
  
  console.log('Migration process completed.');
  
  if (limitsResult.success) {
    console.log('All migrations applied successfully!');
    console.log('Please restart the application to see the changes.');
  } else {
    console.error('Some migrations failed:');
    console.error('- Promo code limits update:', limitsResult.message);
  }
}

// Run the migrations
applyMigrations().catch(error => {
  console.error('Migration process failed with error:', error);
});
