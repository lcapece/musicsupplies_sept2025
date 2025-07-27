// Simple utility to check if the database update has been applied
import { SupabaseClient } from '@supabase/supabase-js';

// Check if brand and map columns exist in products_supabase table
export const checkDbUpdate = async (supabase: SupabaseClient): Promise<boolean> => {
  try {
    console.log('Checking if database updates have been applied...');
    
    // Try to fetch a single row with the new columns
    const { data, error } = await supabase
      .from('products_supabase')
      .select('partnumber, brand, map')
      .limit(1);
    
    if (error) {
      console.error('Error checking database updates:', error);
      return false;
    }
    
    // Log the data for debugging
    console.log('Database check response:', data);
    return true;
  } catch (error) {
    console.error('Error in checkDbUpdate:', error);
    return false;
  }
};
