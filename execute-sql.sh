#!/bin/bash

# Emergency SQL Execution Script
echo "🚨 EMERGENCY SQL EXECUTION"
echo "=========================="

# Supabase credentials
PROJECT_REF="ekklokrukxmqlahtonnc"
SERVICE_KEY="sbp_810a322ea6315b249e3972aab484906e30dbd24b"

# Execute the SQL file directly via Supabase Management API
echo "Executing MASTER_SQL_EMERGENCY.sql..."

# Using npx supabase to run SQL
npx supabase db push \
  --project-ref "$PROJECT_REF" \
  --password "$SERVICE_KEY" \
  < MASTER_SQL_EMERGENCY.sql

echo "✅ SQL execution complete!"