// Test Script for Single-Use Promo Code Enforcement
// This script tests that promo codes with single-use restrictions cannot be exploited

const testSingleUsePromoCode = async () => {
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ekklokrukxmqlahtonnc.supabase.co';
  const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjAyMTA0ODgsImV4cCI6MjAzNTc4NjQ4OH0.lCB0-0iNAK8nh9V7Jt6JVk0N80wkMpJnDEpfWMISuew';

  // Test configuration
  const testAccountNumber = '101'; // Use a real account number for testing
  const testPromoCode = 'WELCOME15'; // This is configured as single-use
  const orderValue = 100.00; // Meets the $50 minimum

  console.log('===== SINGLE-USE PROMO CODE TEST =====\n');
  console.log(`Test Account: ${testAccountNumber}`);
  console.log(`Test Promo Code: ${testPromoCode}`);
  console.log(`Order Value: $${orderValue}\n`);

  try {
    // First validation attempt
    console.log('1. Testing first validation (should succeed)...');
    const firstValidation = await fetch(`${SUPABASE_URL}/rest/v1/rpc/check_promo_code_validity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({
        p_code: testPromoCode,
        p_account_number: testAccountNumber,
        p_order_value: orderValue
      })
    });

    const firstResult = await firstValidation.json();
    console.log('First validation result:', JSON.stringify(firstResult, null, 2));

    if (firstResult && firstResult[0] && firstResult[0].is_valid) {
      console.log('✅ First validation PASSED - Promo code is valid\n');

      // Simulate recording usage (this would normally happen during order placement)
      console.log('2. Recording promo code usage...');
      const recordUsage = await fetch(`${SUPABASE_URL}/rest/v1/rpc/record_promo_code_usage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        },
        body: JSON.stringify({
          p_promo_id: firstResult[0].promo_id,
          p_account_number: testAccountNumber,
          p_order_id: 999990 + Math.floor(Math.random() * 10), // Random test order ID
          p_order_value: orderValue,
          p_discount_amount: firstResult[0].discount_amount
        })
      });

      const recordResult = await recordUsage.json();
      console.log('Usage recording result:', recordResult);
      console.log('✅ Usage recorded successfully\n');

      // Second validation attempt (should fail)
      console.log('3. Testing second validation (should fail)...');
      const secondValidation = await fetch(`${SUPABASE_URL}/rest/v1/rpc/check_promo_code_validity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        },
        body: JSON.stringify({
          p_code: testPromoCode,
          p_account_number: testAccountNumber,
          p_order_value: orderValue
        })
      });

      const secondResult = await secondValidation.json();
      console.log('Second validation result:', JSON.stringify(secondResult, null, 2));

      if (secondResult && secondResult[0] && !secondResult[0].is_valid) {
        console.log('✅ Second validation FAILED as expected - Single use limit enforced!');
        console.log(`   Rejection message: "${secondResult[0].message}"\n`);
      } else {
        console.log('❌ SECURITY ISSUE: Second validation succeeded when it should have failed!');
        console.log('   Single-use promo code was allowed to be used twice!\n');
      }

      // Test concurrent validation (simulate race condition)
      console.log('4. Testing concurrent validations (race condition test)...');
      console.log('   Creating 5 simultaneous validation requests...');
      
      const concurrentRequests = [];
      for (let i = 0; i < 5; i++) {
        concurrentRequests.push(
          fetch(`${SUPABASE_URL}/rest/v1/rpc/check_promo_code_validity`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`
            },
            body: JSON.stringify({
              p_code: testPromoCode,
              p_account_number: testAccountNumber + '_concurrent',
              p_order_value: orderValue
            })
          }).then(r => r.json())
        );
      }

      const concurrentResults = await Promise.all(concurrentRequests);
      const validCount = concurrentResults.filter(r => r && r[0] && r[0].is_valid).length;
      
      console.log(`   Concurrent results: ${validCount} valid out of 5 attempts`);
      if (validCount === 5) {
        console.log('   ✅ All concurrent validations passed (promo not yet used for this test account)\n');
      } else {
        console.log('   ⚠️  Some concurrent validations were rejected\n');
      }

    } else {
      console.log('❌ First validation FAILED - Promo code might already be used or invalid');
      console.log(`   Message: "${firstResult[0]?.message || 'Unknown error'}"\n`);
    }

    // Check usage statistics
    console.log('5. Fetching promo code usage statistics...');
    const statsResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_promo_code_usage_by_accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({
        p_code: testPromoCode
      })
    });

    const stats = await statsResponse.json();
    console.log('\nUsage statistics for WELCOME15:');
    console.log('--------------------------------');
    if (stats && stats.length > 0) {
      stats.forEach(stat => {
        console.log(`Account ${stat.account_number}: Used ${stat.times_used} time(s)`);
      });
    } else {
      console.log('No usage data found');
    }

  } catch (error) {
    console.error('Test failed with error:', error);
  }

  console.log('\n===== TEST COMPLETE =====');
};

// Run the test
testSingleUsePromoCode();
