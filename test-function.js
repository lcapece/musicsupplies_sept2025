// Test script to verify admin-2fa-handler function deployment
const testUrl = 'https://ekklokrukxmqlahtonnc.supabase.co/functions/v1/admin-2fa-handler/generate';

fetch(testUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ account_number: 999 })
})
.then(response => {
  console.log('Status:', response.status);
  console.log('Status Text:', response.statusText);
  console.log('Headers:', Object.fromEntries(response.headers));
  return response.text();
})
.then(data => {
  console.log('Response Body:', data);
})
.catch(error => {
  console.error('Error:', error.message);
});