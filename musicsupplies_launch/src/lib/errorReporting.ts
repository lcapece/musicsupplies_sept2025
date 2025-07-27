import { supabase } from './supabase';

interface ErrorDetails {
  message: string;
  stack?: string;
  component?: string;
  user?: {
    accountNumber?: number;
    acctName?: string;
    email?: string;
  };
  additionalContext?: any;
}

export const sendErrorNotificationSMS = async (errorDetails: ErrorDetails): Promise<boolean> => {
  try {
    const userInfo = errorDetails.user 
      ? `User: ${errorDetails.user.acctName} (${errorDetails.user.accountNumber})\nEmail: ${errorDetails.user.email}`
      : 'User: Not logged in';

    const componentInfo = errorDetails.component ? `\nComponent: ${errorDetails.component}` : '';
    
    const additionalInfo = errorDetails.additionalContext 
      ? `\nContext: ${JSON.stringify(errorDetails.additionalContext, null, 2).substring(0, 200)}...`
      : '';

    const message = `🚨 SYSTEM ERROR ALERT 🚨\n\nError: ${errorDetails.message}\n\n${userInfo}${componentInfo}${additionalInfo}\n\nTime: ${new Date().toLocaleString()}`;

    const { data, error } = await supabase.functions.invoke('send-test-sms', {
      body: {
        accountNumber: 'System Error',
        accountName: 'Error Reporting System',
        smsNumber: '+15164550980', // Your admin SMS number
        message: message
      }
    });

    if (error) {
      console.error('Error sending error notification SMS:', error);
      return false;
    }

    console.log('Error notification SMS sent successfully:', data);
    return true;
  } catch (error) {
    console.error('Failed to send error notification SMS:', error);
    return false;
  }
};

export const reportError = async (
  error: Error | string, 
  component?: string, 
  user?: { accountNumber?: number; acctName?: string; email?: string },
  additionalContext?: any
): Promise<void> => {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorStack = typeof error === 'string' ? undefined : error.stack;

  const errorDetails: ErrorDetails = {
    message: errorMessage,
    stack: errorStack,
    component,
    user,
    additionalContext
  };

  // Log error to console for debugging
  console.error('Error reported:', errorDetails);

  // Send SMS notification (don't await to avoid blocking)
  sendErrorNotificationSMS(errorDetails).catch(console.error);

  // You could also log to a monitoring service here
  // e.g., Sentry, LogRocket, etc.
};

// React Error Boundary compatible error reporter
export const reportReactError = (error: Error, errorInfo: any, component?: string): void => {
  reportError(error, component, undefined, { errorInfo });
};

// Global error handler for unhandled promise rejections and errors
export const setupGlobalErrorHandling = (): void => {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    reportError(
      `Unhandled Promise Rejection: ${event.reason}`,
      'Global Handler',
      undefined,
      { url: window.location.href }
    );
  });

  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    reportError(
      event.error || event.message,
      'Global Handler',
      undefined,
      { 
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        url: window.location.href
      }
    );
  });
};
