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

async function checkProductsManagerTable() {
  try {
    console.log('🔍 Checking products_manager table...');
    
    // Try to query the table
    const { data, error } = await supabase
      .from('products_manager')
      .select('count(*)')
      .single();

    if (error) {
      console.log('❌ Table does not exist or has issues:', error.message);
      console.log('📝 Need to apply migration...');
      return false;
    }

    console.log('✅ Table exists with', data?.count || 0, 'records');
    return true;
  } catch (err) {
    console.log('❌ Error checking table:', err.message);
    return false;
  }
}

async function testQuery() {
  try {
    console.log('🧪 Testing basic query...');
    
    const { data, error } = await supabase
      .from('products_manager')
      .select('product_code, product_name, price')
      .limit(5);

    if (error) {
      console.log('❌ Query failed:', error.message);
      return;
    }

    console.log('✅ Sample data:');
    console.log(data);
  } catch (err) {
    console.log('❌ Query error:', err.message);
  }
}

async function main() {
  console.log('🚀 Starting products_manager table check...\n');
  
  const tableExists = await checkProductsManagerTable();
  
  if (tableExists) {
    await testQuery();
  }
  
  console.log('\n✨ Check complete!');
}

main().catch(console.error);
