/**
 * Password Validation Utility
 *
 * Provides comprehensive password strength validation and scoring.
 * Enforces secure password requirements to prevent weak passwords.
 */

export interface PasswordValidationResult {
  isValid: boolean;
  score: number; // 0-100
  strength: 'weak' | 'medium' | 'strong' | 'very-strong';
  errors: string[];
  suggestions: string[];
}

// Common weak passwords to block (top 100 most common)
const COMMON_PASSWORDS = [
  'password', '123456', '12345678', 'qwerty', 'abc123', 'monkey', '1234567',
  'letmein', 'trustno1', 'dragon', 'baseball', 'iloveyou', 'master', 'sunshine',
  'ashley', 'bailey', 'passw0rd', 'shadow', '123123', '654321', 'superman',
  'qazwsx', 'michael', 'football', 'password1', 'admin', 'welcome', '1234',
  'pass', 'root', 'toor', 'changeme', 'test', 'guest', 'demo'
];

const MIN_LENGTH = 12;
const MIN_LENGTH_WEAK = 8;

/**
 * Validates password strength and returns detailed feedback
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  // Length checks
  if (!password || password.length === 0) {
    return {
      isValid: false,
      score: 0,
      strength: 'weak',
      errors: ['Password is required'],
      suggestions: ['Enter a password with at least 12 characters'],
    };
  }

  if (password.length < MIN_LENGTH_WEAK) {
    errors.push(`Password must be at least ${MIN_LENGTH_WEAK} characters`);
  } else if (password.length < MIN_LENGTH) {
    errors.push(`For better security, use at least ${MIN_LENGTH} characters`);
    score += 10;
  } else {
    score += 25;
  }

  // Length bonus
  if (password.length >= 16) score += 10;
  if (password.length >= 20) score += 10;

  // Character variety checks
  const hasLowerCase = /[a-z]/.test(password);
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  if (!hasLowerCase) {
    errors.push('Password must contain lowercase letters');
  } else {
    score += 10;
  }

  if (!hasUpperCase) {
    errors.push('Password must contain uppercase letters');
  } else {
    score += 15;
  }

  if (!hasNumbers) {
    errors.push('Password must contain numbers');
  } else {
    score += 15;
  }

  if (!hasSpecialChars) {
    suggestions.push('Add special characters (!@#$%^&*) for extra security');
    score += 5;
  } else {
    score += 20;
  }

  // Check for common passwords
  const lowerPassword = password.toLowerCase();
  if (COMMON_PASSWORDS.some(common => lowerPassword.includes(common))) {
    errors.push('Password is too common and easily guessable');
    score = Math.min(score, 20); // Cap score for common passwords
  }

  // Check for sequential characters (123, abc, etc.)
  if (/(?:012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(password)) {
    suggestions.push('Avoid sequential characters like "123" or "abc"');
    score -= 10;
  }

  // Check for repeated characters (aaa, 111, etc.)
  if (/(.)\1{2,}/.test(password)) {
    suggestions.push('Avoid repeated characters like "aaa" or "111"');
    score -= 10;
  }

  // Bonus for good variety
  const characterTypes = [hasLowerCase, hasUpperCase, hasNumbers, hasSpecialChars].filter(Boolean).length;
  if (characterTypes >= 4) {
    score += 5;
  }

  // Ensure score is within bounds
  score = Math.max(0, Math.min(100, score));

  // Determine strength
  let strength: PasswordValidationResult['strength'];
  if (score >= 80) {
    strength = 'very-strong';
  } else if (score >= 60) {
    strength = 'strong';
  } else if (score >= 40) {
    strength = 'medium';
  } else {
    strength = 'weak';
  }

  // Only valid if no critical errors
  const isValid = errors.length === 0;

  return {
    isValid,
    score,
    strength,
    errors,
    suggestions,
  };
}

/**
 * Get color for password strength indicator
 */
export function getStrengthColor(strength: PasswordValidationResult['strength']): string {
  switch (strength) {
    case 'very-strong':
      return 'text-green-600';
    case 'strong':
      return 'text-blue-600';
    case 'medium':
      return 'text-yellow-600';
    case 'weak':
      return 'text-red-600';
  }
}

/**
 * Get background color for password strength bar
 */
export function getStrengthBgColor(strength: PasswordValidationResult['strength']): string {
  switch (strength) {
    case 'very-strong':
      return 'bg-green-600';
    case 'strong':
      return 'bg-blue-600';
    case 'medium':
      return 'bg-yellow-600';
    case 'weak':
      return 'bg-red-600';
  }
}

/**
 * Get localized strength label
 */
export function getStrengthLabel(strength: PasswordValidationResult['strength'], locale: string = 'en'): string {
  const enLabels = {
    'very-strong': 'Very Strong',
    'strong': 'Strong',
    'medium': 'Medium',
    'weak': 'Weak',
  };

  const ruLabels = {
    'very-strong': 'Очень сильный',
    'strong': 'Сильный',
    'medium': 'Средний',
    'weak': 'Слабый',
  };

  // Select labels based on locale
  const labels = locale === 'ru' ? ruLabels : enLabels;
  return labels[strength];
}
