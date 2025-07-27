import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { setupGlobalErrorHandling } from './lib/errorReporting';
import { checkDbUpdate } from './utils/checkDbUpdate';
import { supabase } from './lib/supabase';

// Set up global error handling
setupGlobalErrorHandling();

// Check if database updates have been applied
checkDbUpdate(supabase).then((success: boolean) => {
  console.log('Database update check result:', success);
}).catch((error: unknown) => {
  console.error('Error during database update check:', error);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
