// App Configuration
export const APP_CONFIG = {
  NAME: 'Meaz',
  VERSION: '1.0.0',
  BUILD_NUMBER: 1,
  BUNDLE_ID: 'com.meaz.mobilev2',
} as const;

// API Configuration
export const API_CONFIG = {
  SUPABASE_URL: 'https://orupcxnygtgofvvwhpmz.supabase.co',
  AGORA_APP_ID: 'a947e6c3aef249f882c8a2dca2f5cb15',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
} as const;

// UI Constants
export const UI_CONSTANTS = {
  HEADER_HEIGHT: 60,
  TAB_BAR_HEIGHT: 80,
  BORDER_RADIUS: 12,
  SPACING: {
    XS: 4,
    SM: 8,
    MD: 16,
    LG: 24,
    XL: 32,
  },
  FONT_SIZES: {
    XS: 12,
    SM: 14,
    MD: 16,
    LG: 18,
    XL: 24,
    XXL: 32,
  },
} as const;

// Colors
export const COLORS = {
  PRIMARY: '#FF6B35',
  SECONDARY: '#138808',
  ACCENT: '#000080',
  SUCCESS: '#4CAF50',
  WARNING: '#FF9800',
  ERROR: '#F44336',
  INFO: '#2196F3',
  LIGHT: '#F5F5F5',
  DARK: '#333333',
  WHITE: '#FFFFFF',
  BLACK: '#000000',
  TRANSPARENT: 'transparent',
} as const;

// Animation Durations
export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: '@auth_token',
  USER_PREFERENCES: '@user_preferences',
  THEME: '@theme',
  LANGUAGE: '@language',
} as const;

// Limits
export const LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_MESSAGE_LENGTH: 1000,
  MAX_CAPTION_LENGTH: 300,
  MAX_BIO_LENGTH: 150,
  MAX_USERNAME_LENGTH: 30,
} as const;

// Regex Patterns
export const PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[\d\s-()]+$/,
  USERNAME: /^[a-zA-Z0-9_]{3,30}$/,
  URL: /^https?:\/\/.+/,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network connection failed. Please check your internet connection.',
  PERMISSION_DENIED: 'Permission denied. Please grant the required permissions.',
  FILE_TOO_LARGE: 'File size exceeds the maximum limit.',
  INVALID_FORMAT: 'Invalid file format.',
  UPLOAD_FAILED: 'Upload failed. Please try again.',
  GENERIC_ERROR: 'Something went wrong. Please try again.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  UPLOAD_SUCCESS: 'Upload completed successfully.',
  MESSAGE_SENT: 'Message sent successfully.',
  PROFILE_UPDATED: 'Profile updated successfully.',
  SETTINGS_SAVED: 'Settings saved successfully.',
} as const;