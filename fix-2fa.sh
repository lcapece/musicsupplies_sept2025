#!/bin/bash

# Script to fix 2FA system for account 999 using Supabase REST API
SUPABASE_URL="https://ekklokrukxmqlahtonnc.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNzMxOTQsImV4cCI6MjA1NTY0OTE5NH0.LFyaAQyBb2l6rxdUAXpDQVZnR4gHDNrVZH0YudbjP3k"

echo "🔧 Starting 2FA system fix for account 999..."
echo ""

# Step 1: Populate sms_admins table
echo "1. Populating sms_admins table..."
curl -X POST \
  "$SUPABASE_URL/rest/v1/sms_admins" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -d '[
    {"phone_number": "+15164550980", "is_active": true, "notes": "Primary admin"},
    {"phone_number": "+15164107455", "is_active": true, "notes": "Secondary admin"},
    {"phone_number": "+15167650816", "is_active": true, "notes": "Tertiary admin"}
  ]'

echo ""
echo "✅ Admin phone numbers inserted"
echo ""

# Step 2: Verify sms_admins table
echo "2. Verifying sms_admins table..."
curl -X GET \
  "$SUPABASE_URL/rest/v1/sms_admins?is_active=eq.true&select=*" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY"

echo ""
echo "✅ SMS admins retrieved"
echo ""

# Step 3: Test 2FA code generation
echo "3. Testing 2FA code generation function..."
curl -X POST \
  "$SUPABASE_URL/rest/v1/rpc/generate_2fa_code" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "p_account_number": 999,
    "p_ip_address": "127.0.0.1",
    "p_user_agent": "test-browser"
  }'

echo ""
echo "✅ 2FA code generation tested"
echo ""

# Step 4: Check admin_logins table
echo "4. Checking admin_logins table..."
curl -X GET \
  "$SUPABASE_URL/rest/v1/admin_logins?account_number=eq.999&select=*&order=created_at.desc&limit=3" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY"

echo ""
echo "✅ Admin logins retrieved"
echo ""

echo "🎉 2FA system fix completed!"