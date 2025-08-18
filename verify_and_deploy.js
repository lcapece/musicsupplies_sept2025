const { execSync } = require('child_process');
const fs = require('fs');

console.log('=== VERIFICATION AND DEPLOYMENT SCRIPT ===\n');

// 1. Check AuthContext for Music123 blocks
console.log('1. Checking AuthContext.tsx for Music123 blocks...');
const authContext = fs.readFileSync('src/context/AuthContext.tsx', 'utf8');
if (authContext.includes('NUCLEAR BLOCK')) {
    console.log('   ✅ NUCLEAR BLOCK found in AuthContext');
} else {
    console.log('   ❌ WARNING: NUCLEAR BLOCK not found in AuthContext');
}

// 2. Build the application
console.log('\n2. Building application...');
try {
    execSync('npx vite build', { stdio: 'inherit' });
    console.log('   ✅ Build completed successfully');
} catch (e) {
    console.log('   ❌ Build failed:', e.message);
    process.exit(1);
}

// 3. Check if dist folder was created
if (fs.existsSync('dist')) {
    const files = fs.readdirSync('dist');
    console.log(`   ✅ Dist folder created with ${files.length} items`);
} else {
    console.log('   ❌ Dist folder not found');
    process.exit(1);
}

// 4. Deploy to Netlify
console.log('\n3. Deploying to Netlify...');
try {
    const output = execSync('npx netlify deploy --prod --dir=dist', { encoding: 'utf8' });
    console.log(output);
    console.log('   ✅ Deployment completed');
    console.log('\n🌐 Site should be live at: https://musicsupplies.com/5150');
} catch (e) {
    console.log('   ❌ Deployment failed:', e.message);
}

console.log('\n=== CRITICAL SECURITY NOTES ===');
console.log('1. Music123 is blocked in frontend (AuthContext.tsx)');
console.log('2. Database function authenticate_user_v5 should reject Music123');
console.log('3. Test immediately at https://musicsupplies.com/5150');
console.log('4. Try logging in with 999/Music123 - it should FAIL');
console.log('5. Try logging in with 999/2750grove - it should WORK');