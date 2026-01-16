'use client';

import { useMemo } from 'react';
import {
  validatePassword,
  getStrengthColor,
  getStrengthBgColor,
  getStrengthLabel,
  type PasswordValidationResult,
} from '@/lib/auth/passwordValidation';

interface PasswordStrengthIndicatorProps {
  password: string;
  locale?: string;
  showErrors?: boolean;
  showSuggestions?: boolean;
}

export function PasswordStrengthIndicator({
  password,
  locale = 'en',
  showErrors = true,
  showSuggestions = true,
}: PasswordStrengthIndicatorProps) {
  const validation = useMemo<PasswordValidationResult>(
    () => validatePassword(password),
    [password]
  );

  // Don't show anything if password is empty
  if (!password || password.length === 0) {
    return null;
  }

  const { score, strength, errors, suggestions } = validation;

  return (
    <div className="mt-2 space-y-2">
      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            {locale === 'ru' ? 'Сила пароля' : 'Password Strength'}
          </span>
          <span className={`font-medium ${getStrengthColor(strength)}`}>
            {getStrengthLabel(strength, locale)}
          </span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${getStrengthBgColor(strength)}`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* Errors */}
      {showErrors && errors.length > 0 && (
        <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
          {errors.map((error, index) => (
            <li key={index} className="flex items-start">
              <span className="mr-2">•</span>
              <span>{error}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Suggestions */}
      {showSuggestions && suggestions.length > 0 && errors.length === 0 && (
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          {suggestions.map((suggestion, index) => (
            <li key={index} className="flex items-start">
              <span className="mr-2">💡</span>
              <span>{suggestion}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Hook to get password validation result
 */
export function usePasswordValidation(password: string): PasswordValidationResult {
  return useMemo(() => validatePassword(password), [password]);
}
