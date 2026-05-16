export const Messages = {
  // ─── Auth ────────────────────────────────────────────────────────────────
  auth: {
    INVALID_CREDENTIALS: 'Invalid credentials.',
    ACCOUNT_BANNED: 'Account is banned.',
    ACCOUNT_PENDING_VERIFICATION: 'Account is pending email verification.',
    ACCOUNT_NOT_FOUND: 'Account not found.',
    LOGIN_TEMPORARILY_DISABLED: 'Login is temporarily disabled due to too many failed attempts.',
    UNAUTHORIZED: 'Unauthorized. Valid Bearer token required.',
    FORBIDDEN: 'Forbidden. Insufficient permissions.',
    EMAIL_TAKEN: 'An account with that email already exists.',
    INVALID_REFRESH_TOKEN: 'Invalid refresh token.',
    EXPIRED_REFRESH_TOKEN: 'Refresh token has expired. Please log in again.',
    LOGGED_OUT: 'Logged out successfully.',
  },

  // ─── Validation ──────────────────────────────────────────────────────────
  validation: {
    REQUIRED_FIELDS: 'Required fields are missing.',
    INVALID_EMAIL: 'Please provide a valid email address.',
    PASSWORD_TOO_SHORT: 'Password must be at least 8 characters long.',
  },

  // ─── General ─────────────────────────────────────────────────────────────
  general: {
    NOT_FOUND: 'Route not found.',
    SERVER_ERROR: 'Unexpected server error.',
    USER_NOT_FOUND: 'User not found.',
    NO_FIELDS_TO_UPDATE: 'No fields to update were provided.',
  },
} as const;
