console.log('Testing basic Node.js execution');
console.log('Process version:', process.version);

try {
  console.log('Fetch available:', typeof fetch !== 'undefined');
} catch (e) {
  console.log('Error checking fetch:', e.message);
}