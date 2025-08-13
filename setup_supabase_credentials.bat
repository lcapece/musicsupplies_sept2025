@echo off
cls
echo ========================================
echo    SUPABASE CREDENTIALS SETUP
echo ========================================
echo.
echo This will help you set up your Supabase credentials
echo for both local development and Netlify deployment.
echo.
echo ========================================
echo    STEP 1: GET YOUR SUPABASE INFO
echo ========================================
echo.
echo 1. Go to: https://supabase.com/dashboard
echo 2. Select your project (musicsupplies or similar)
echo 3. Go to Settings (gear icon) > API
echo 4. You will need:
echo    - Project URL (looks like: https://xxxxx.supabase.co)
echo    - Anon/Public Key (a long string starting with 'eyJ...')
echo.
pause
echo.

:: Get Supabase URL
echo ========================================
echo    STEP 2: ENTER SUPABASE URL
echo ========================================
echo.
echo Example: https://ekklokrukxmqlahtonnc.supabase.co
echo.
set /p SUPABASE_URL="Enter your Supabase Project URL: "

:: Get Supabase Anon Key
echo.
echo ========================================
echo    STEP 3: ENTER ANON KEY
echo ========================================
echo.
echo This is the long key starting with 'eyJ...'
echo.
set /p SUPABASE_ANON_KEY="Enter your Supabase Anon/Public Key: "

:: Get ElevenLabs API Key (optional)
echo.
echo ========================================
echo    STEP 4: ELEVENLABS (Optional)
echo ========================================
echo.
echo For voice chat feature (press Enter to skip)
echo.
set /p ELEVENLABS_KEY="Enter your ElevenLabs API Key (or press Enter): "

:: Create/Update .env file
echo.
echo ========================================
echo    CREATING .ENV FILE
echo ========================================
echo.

:: Backup existing .env if it exists
if exist .env (
    echo Backing up existing .env to .env.backup
    copy .env .env.backup >nul
)

:: Write the essential variables to .env
echo # Essential Supabase Configuration > .env
echo VITE_SUPABASE_URL=%SUPABASE_URL% >> .env
echo VITE_SUPABASE_ANON_KEY=%SUPABASE_ANON_KEY% >> .env
echo. >> .env

if not "%ELEVENLABS_KEY%"=="" (
    echo # Voice Chat Configuration >> .env
    echo VITE_ELEVENLABS_API_KEY=%ELEVENLABS_KEY% >> .env
    echo. >> .env
)

:: Add other important variables
echo # Other Configuration >> .env
echo NODE_ENV=production >> .env

echo .env file created successfully!
echo.

:: Create Netlify environment variables script
echo ========================================
echo    CREATING NETLIFY ENV SCRIPT
echo ========================================
echo.

echo # Netlify Environment Variables > netlify_env_vars.txt
echo # Copy and paste these into Netlify Dashboard >> netlify_env_vars.txt
echo # Site Settings ^> Environment Variables >> netlify_env_vars.txt
echo. >> netlify_env_vars.txt
echo VITE_SUPABASE_URL=%SUPABASE_URL% >> netlify_env_vars.txt
echo VITE_SUPABASE_ANON_KEY=%SUPABASE_ANON_KEY% >> netlify_env_vars.txt
if not "%ELEVENLABS_KEY%"=="" (
    echo VITE_ELEVENLABS_API_KEY=%ELEVENLABS_KEY% >> netlify_env_vars.txt
)

echo Netlify environment variables saved to netlify_env_vars.txt
echo.

:: Test the configuration
echo ========================================
echo    TESTING CONFIGURATION
echo ========================================
echo.

:: Try to build with the new config
echo Testing build with new configuration...
call npm run build

if errorlevel 1 (
    echo.
    echo WARNING: Build failed. Please check the credentials above.
    echo.
) else (
    echo.
    echo SUCCESS: Build completed successfully!
    echo.
)

echo.
echo ========================================
echo    NEXT STEPS
echo ========================================
echo.
echo 1. LOCAL DEVELOPMENT:
echo    - Your .env file has been created
echo    - Run: npm run dev
echo.
echo 2. NETLIFY DEPLOYMENT:
echo    a. Go to Netlify Dashboard
echo    b. Select your site
echo    c. Go to: Site Settings > Environment Variables
echo    d. Add the variables from netlify_env_vars.txt
echo    e. Deploy using: netlify deploy --prod --dir=dist
echo.
echo 3. The following files were created:
echo    - .env (your local environment variables)
echo    - .env.backup (backup of previous .env if it existed)
echo    - netlify_env_vars.txt (for copying to Netlify)
echo.
pause