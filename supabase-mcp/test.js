console.log('Starting import test...');
try {
  const { Server } = await import('@modelcontextprotocol/sdk/dist/server/index.js');
  console.log('Success! Server imported:', typeof Server);
} catch (error) {
  console.log('Failed with error:', error.message);
  console.log('Trying alternative import...');
  try {
    const { Server } = await import('@modelcontextprotocol/sdk/dist/server.js');
    console.log('Alternative worked! Server imported:', typeof Server);
  } catch (error2) {
    console.log('Alternative also failed:', error2.message);
  }
}