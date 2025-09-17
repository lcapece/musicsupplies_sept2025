import { readFile, writeFile, appendFile } from 'fs/promises';
import https from 'https';

const SUPABASE_URL = 'https://ekklokrukxmqlahtonnc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDA3MzE5NCwiZXhwIjoyMDU1NjQ5MTk0fQ.ZsVqBj8TaF5RbILv-JOlXWzQjNFI5yt5Yqn5cQMkgzw';
const LOG_FILE = 'sql-execution.log';

async function log(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  await appendFile(LOG_FILE, logEntry);
}

async function makeHttpRequest(endpoint, method = 'POST', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}${endpoint}`);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, data });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function executeSqlFile(filename) {
  await log(`Starting execution of ${filename}`);
  
  try {
    const sqlContent = await readFile(filename, 'utf-8');
    await log(`Read ${sqlContent.length} characters from ${filename}`);
    
    // Split into statements and execute one by one
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    await log(`Found ${statements.length} SQL statements to execute`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement || statement.length < 10) continue;
      
      try {
        await log(`Executing statement ${i + 1}: ${statement.substring(0, 50)}...`);
        
        // Try to execute via PostgreSQL direct connection (if available)
        // Since we don't have direct access, let's try multiple endpoints
        
        let success = false;
        const endpoints = ['/rest/v1/rpc/exec_sql', '/rest/v1/rpc/query'];
        
        for (const endpoint of endpoints) {
          try {
            const response = await makeHttpRequest(endpoint, 'POST', {
              sql_query: statement,
              query: statement
            });
            
            await log(`Statement ${i + 1} executed successfully via ${endpoint}`);
            success = true;
            successCount++;
            break;
            
          } catch (endpointError) {
            await log(`Failed via ${endpoint}: ${endpointError.message}`);
          }
        }
        
        if (!success) {
          errorCount++;
          await log(`Statement ${i + 1} failed on all endpoints`);
        }
        
      } catch (statementError) {
        errorCount++;
        await log(`Error in statement ${i + 1}: ${statementError.message}`);
      }
    }
    
    await log(`Completed ${filename}: ${successCount} succeeded, ${errorCount} failed`);
    return errorCount === 0;
    
  } catch (err) {
    await log(`Fatal error in ${filename}: ${err.message}`);
    return false;
  }
}

async function main() {
  // Initialize log file
  await writeFile(LOG_FILE, `SQL Execution Log Started: ${new Date().toISOString()}\n`);
  
  await log('Starting SQL script execution');
  await log(`Connecting to: ${SUPABASE_URL}`);
  
  const sqlFiles = [
    'EMERGENCY_AUTH_FIX_FINAL.sql',
    '2FA_SETUP.sql', 
    'ADD_2FA_PHONES.sql'
  ];
  
  let totalSuccess = true;
  
  for (const filename of sqlFiles) {
    const success = await executeSqlFile(filename);
    if (!success) {
      totalSuccess = false;
      await log(`CRITICAL: ${filename} failed - stopping execution`);
      break;
    }
    
    // Small delay between files
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  if (totalSuccess) {
    await log('SUCCESS: All SQL scripts executed successfully!');
    await log('Authentication system has been updated with:');
    await log('- Emergency auth fix applied');
    await log('- 2FA system setup for account 999');
    await log('- Phone numbers added for 2FA notifications');
  } else {
    await log('FAILURE: Some SQL scripts failed - check log for details');
  }
  
  await log('SQL execution completed');
}

main().catch(async (error) => {
  await log(`Script error: ${error.message}`);
});