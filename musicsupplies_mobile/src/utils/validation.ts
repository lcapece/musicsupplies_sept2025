interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitized?: string;
}

export const validateEmail = (email: string): ValidationResult => {
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }

  const trimmedEmail = email.trim().toLowerCase();
  
  // Basic email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(trimmedEmail)) {
    return { isValid: false, error: 'Invalid email format' };
  }

  return { isValid: true, sanitized: trimmedEmail };
};

export const validateAccountNumber = (accountNumber: string): ValidationResult => {
  if (!accountNumber) {
    return { isValid: false, error: 'Account number is required' };
  }

  const trimmed = accountNumber.trim();
  
  // Account number should be numeric
  if (!/^\d+$/.test(trimmed)) {
    return { isValid: false, error: 'Account number must contain only numbers' };
  }

  const num = parseInt(trimmed, 10);
  if (num <= 0) {
    return { isValid: false, error: 'Account number must be a positive number' };
  }

  return { isValid: true, sanitized: trimmed };
};

export const validatePassword = (password: string): ValidationResult => {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }

  if (password.length < 6) {
    return { isValid: false, error: 'Password must be at least 6 characters long' };
  }

  return { isValid: true };
};
