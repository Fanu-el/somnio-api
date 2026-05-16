import dotenv from 'dotenv';

dotenv.config();

const requireEnv = (key: string, fallback?: string): string => {
  const value = process.env[key];
  if (!value) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const port = Number(process.env.PORT ?? 3000);
if (Number.isNaN(port) || port <= 0) {
  throw new Error('PORT must be a valid positive number.');
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port,
  databaseUrl: (() => {
    const isTest = process.env.NODE_ENV === 'test';
    const key = isTest ? 'TEST_DATABASE_URL' : 'DATABASE_URL';
    return requireEnv(key);
  })(),
  jwtSecret: requireEnv('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
  jwtRefreshSecret: requireEnv('JWT_REFRESH_SECRET'),
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  loginDisableDurationMinutes: Number(process.env.LOGIN_DISABLE_DURATION_MINUTES ?? 30),
  verificationCodeExpiresInMinutes: Number(process.env.USER_SIGNUP_VERIFICATION_EMAIL_EXPIRES_IN_MINUTES ?? 15),
  passwordResetCodeExpiresInMinutes: Number(process.env.PASSWORD_RESET_CODE_EXPIRES_IN_MINUTES ?? 15),
  rateLimiting: {
    resendVerificationCooldownMinutes: Number(process.env.RESEND_SIGN_UP_VERIFICATION_COOL_DOWN_TIME_IN_MINUTES ?? 1),
    resendVerificationMaxPerHour: Number(process.env.RESEND_SIGN_UP_VERIFICATION_MAX_PER_HOUR ?? 5),
    resendPasswordResetCooldownMinutes: Number(process.env.RESEND_PASSWORD_RESET_COOL_DOWN_TIME_IN_MINUTES ?? 1),
    resendPasswordResetMaxPerHour: Number(process.env.RESEND_PASSWORD_RESET_MAX_PER_HOUR ?? 3),
  },
  email: {
    gmailUser: requireEnv('GMAIL_USER', 'dummy@gmail.com'),
    gmailAppPassword: requireEnv('GMAIL_APP_PASSWORD', 'dummy'),
    fromName: process.env.EMAIL_FROM_NAME ?? 'Somnio',
  },
};
