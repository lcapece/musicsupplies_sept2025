import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function applyMigration() {
  try {
    console.log('🚀 Applying products_manager migration...\n');
    
    // Read the migration file
    const migrationPath = 'supabase/migrations/20250827_create_products_manager_table.sql';
    console.log('📖 Reading migration file:', migrationPath);
    
    if (!fs.existsSync(migrationPath)) {
      console.log('❌ Migration file not found!');
      return;
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('✅ Migration file loaded');
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length < 10) continue; // Skip very short statements
      
      console.log(`⚡ Executing statement ${i + 1}/${statements.length}`);
      console.log(`   ${statement.substring(0, 60)}${statement.length > 60 ? '...' : ''}`);
      
      const { data, error } = await supabase.rpc('execute_sql', { 
        sql_query: statement + ';' 
      });
      
      if (error) {
        console.log(`❌ Error executing statement ${i + 1}:`, error.message);
        if (error.message.includes('already exists')) {
          console.log('   ℹ️  This is expected if the table was already created');
        } else {
          console.log('   🛑 This may be a serious error');
        }
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`);
      }
    }
    
    console.log('\n🎉 Migration application complete!');
    
    // Test the table
    console.log('\n🧪 Testing table access...');
    const { data: testData, error: testError } = await supabase
      .from('products_manager')
      .select('product_code, product_name')
      .limit(3);
    
    if (testError) {
      console.log('❌ Table test failed:', testError.message);
    } else {
      console.log('✅ Table test successful!');
      console.log('📊 Sample records:', testData?.length || 0);
      if (testData && testData.length > 0) {
        console.log('   First record:', testData[0]);
      }
    }
    
  } catch (err) {
    console.log('❌ Migration failed:', err.message);
  }
}

applyMigration();
