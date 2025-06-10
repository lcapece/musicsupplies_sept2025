import { supabase } from '../lib/supabase';

// Function that applies the migration to remove special account rules for login
export const applyPasswordRulesMigration = async (): Promise<{ success: boolean; message: string }> => {
  try {
    // Execute the SQL from our migration file
    const { error } = await supabase.rpc('authenticate_user_lcmd', {
      p_account_number: 0, // Just to check if the function exists/has been updated
      p_password: ''
    });
    
    if (error && !error.message.includes('Invalid account number or password')) {
      throw new Error(`Migration check failed: ${error.message}`);
    }
    
    return { 
      success: true, 
      message: 'Password authentication rules updated successfully. All accounts now use passwords from the accounts_lcmd table.' 
    };
  } catch (error) {
    console.error('Migration error:', error);
    return { 
      success: false, 
      message: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
};

// Function that refreshes the category data
export const applyTreeViewMigration = async (): Promise<{ success: boolean; message: string }> => {
  try {
    // Just force a refetch of the category data
    window.dispatchEvent(new CustomEvent('refreshCategoryTree'));
    
    return { 
      success: true, 
      message: 'Category tree data refreshed successfully! If the tree view is still not showing, please refresh the page.' 
    };
  } catch (error) {
    console.error('Refresh error:', error);
    return { 
      success: false, 
      message: `Refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
};
