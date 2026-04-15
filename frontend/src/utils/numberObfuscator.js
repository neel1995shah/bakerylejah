// Mapping: 0=b, 1=a, 2=c, 3=k, 4=g, 5=r, 6=o, 7=u, 8=n, 9=d
const OBFUSCATION_MAP = {
  '0': 'b',
  '1': 'a',
  '2': 'c',
  '3': 'k',
  '4': 'g',
  '5': 'r',
  '6': 'o',
  '7': 'u',
  '8': 'n',
  '9': 'd'
};

const REVERSE_MAP = Object.entries(OBFUSCATION_MAP).reduce(
  (acc, [num, char]) => ({ ...acc, [char]: num }),
  {}
);

/**
 * Convert numbers to obfuscated format
 * e.g., "123" -> "aac"
 */
export const obfuscateNumbers = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  return str.replace(/\d/g, (digit) => OBFUSCATION_MAP[digit] || digit);
};

/**
 * Convert obfuscated format back to numbers
 * e.g., "aac" -> "123"
 */
export const deobfuscateNumbers = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  return str.replace(/[bacgkround]/g, (char) => REVERSE_MAP[char] || char);
};

/**
 * Check if a string contains obfuscated characters
 */
export const isObfuscated = (value) => {
  if (value === null || value === undefined) return false;
  const str = String(value);
  return /[bacgkround]/.test(str);
};

/**
 * Storage key for the obscured mode state
 */
export const OBSCURED_MODE_KEY = 'finance-obscured-numbers-mode';

/**
 * Check if obscured mode is enabled
 */
export const isObscuredModeEnabled = () => {
  const stored = localStorage.getItem(OBSCURED_MODE_KEY);
  // Default to true for first-time visitors (when nothing is stored)
  if (stored === null) {
    return true;
  }
  return stored === 'true';
};

/**
 * Toggle obscured mode
 */
export const toggleObscuredMode = () => {
  const current = isObscuredModeEnabled();
  localStorage.setItem(OBSCURED_MODE_KEY, String(!current));
  return !current;
};

/**
 * Set obscured mode explicitly
 */
export const setObscuredMode = (enabled) => {
  localStorage.setItem(OBSCURED_MODE_KEY, String(enabled));
};

/**
 * Format a number with optional obfuscation
 */
export const formatNumber = (value, shouldObfuscate = null) => {
  const useObfuscated = shouldObfuscate !== null ? shouldObfuscate : isObscuredModeEnabled();
  const formatted = String(value || '');
  return useObfuscated ? obfuscateNumbers(formatted) : formatted;
};
