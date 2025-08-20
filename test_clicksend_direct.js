// Direct ClickSend API test
const username = 'lcapece@optonline.net';
const apiKey = '831F409D-D014-C9FE-A453-56538DDA7802';

async function testClickSend() {
  const auth = btoa(`${username}:${apiKey}`);
  const url = 'https://rest.clicksend.com/v3/sms/send';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify({
        messages: [
          {
            source: 'MusicSupplies',
            body: 'EMERGENCY TEST: ClickSend working! Code: 999999',
            to: '+15164550980'
          }
        ]
      })
    });

    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testClickSend();