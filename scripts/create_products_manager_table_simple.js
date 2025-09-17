import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function createTable() {
  try {
    console.log('🚀 Creating products_manager table...\n');
    
    // First, try to create the table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS products_manager (
        id SERIAL PRIMARY KEY,
        product_code VARCHAR(50) UNIQUE NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        subcategory VARCHAR(100),
        price DECIMAL(10,2) NOT NULL DEFAULT 0,
        cost DECIMAL(10,2) NOT NULL DEFAULT 0,
        quantity_on_hand INTEGER NOT NULL DEFAULT 0,
        reorder_level INTEGER NOT NULL DEFAULT 0,
        supplier VARCHAR(100),
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    console.log('📝 Creating table structure...');
    const { data: createResult, error: createError } = await supabase.rpc('execute_sql', {
      sql_query: createTableSQL
    });
    
    if (createError) {
      console.log('❌ Error creating table:', createError.message);
      return;
    }
    
    console.log('✅ Table created successfully!');
    
    // Insert sample data
    console.log('\n📊 Inserting sample data...');
    const sampleData = [
      {
        product_code: 'GUIT001',
        product_name: 'Fender Stratocaster Electric Guitar',
        description: 'Classic electric guitar with maple neck',
        category: 'Guitars',
        subcategory: 'Electric',
        price: 899.99,
        cost: 450.00,
        quantity_on_hand: 15,
        reorder_level: 5,
        supplier: 'Fender Musical Instruments',
        active: true
      },
      {
        product_code: 'GUIT002',
        product_name: 'Gibson Les Paul Standard',
        description: 'Premium electric guitar with mahogany body',
        category: 'Guitars',
        subcategory: 'Electric',
        price: 2499.99,
        cost: 1250.00,
        quantity_on_hand: 8,
        reorder_level: 3,
        supplier: 'Gibson Guitar Corp',
        active: true
      },
      {
        product_code: 'BASS001',
        product_name: 'Fender Precision Bass',
        description: '4-string electric bass guitar',
        category: 'Bass Guitars',
        subcategory: 'Electric',
        price: 749.99,
        cost: 375.00,
        quantity_on_hand: 12,
        reorder_level: 4,
        supplier: 'Fender Musical Instruments',
        active: true
      },
      {
        product_code: 'DRUM001',
        product_name: 'Pearl Export Series Drum Kit',
        description: '5-piece drum set with hardware',
        category: 'Drums',
        subcategory: 'Acoustic Kits',
        price: 699.99,
        cost: 350.00,
        quantity_on_hand: 10,
        reorder_level: 3,
        supplier: 'Pearl Corporation',
        active: true
      },
      {
        product_code: 'KEYB001',
        product_name: 'Yamaha P-125 Digital Piano',
        description: '88-key weighted action digital piano',
        category: 'Keyboards',
        subcategory: 'Digital Pianos',
        price: 649.99,
        cost: 325.00,
        quantity_on_hand: 20,
        reorder_level: 5,
        supplier: 'Yamaha Corporation',
        active: true
      }
    ];
    
    const { data: insertData, error: insertError } = await supabase
      .from('products_manager')
      .insert(sampleData);
    
    if (insertError) {
      console.log('❌ Error inserting sample data:', insertError.message);
    } else {
      console.log('✅ Sample data inserted successfully!');
    }
    
    // Test final query
    console.log('\n🧪 Final test...');
    const { data: finalTest, error: finalError } = await supabase
      .from('products_manager')
      .select('*')
      .limit(3);
    
    if (finalError) {
      console.log('❌ Final test failed:', finalError.message);
    } else {
      console.log('✅ Final test passed!');
      console.log('📋 Records in table:', finalTest?.length || 0);
    }
    
  } catch (err) {
    console.log('❌ Error:', err.message);
  }
}

createTable();
