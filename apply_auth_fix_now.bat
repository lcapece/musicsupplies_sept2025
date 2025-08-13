@echo off
echo Applying emergency authentication fix to production...
npx supabase db push --file EMERGENCY_AUTH_FIX.sql --db-url "postgresql://postgres.ekklokrukxmqlahtonnc:M6wMp&2ecHBw@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
echo Done!
pause