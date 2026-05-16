import crypto from 'crypto';

/**
 * Generates an anonymized email for deleted users.
 * 
 * Strategy: deleted-{userId}-{timestamp}@deleted.local
 * 
 * Benefits:
 * - Frees up original email for re-registration
 * - Maintains audit trail via userId
 * - Timestamp shows when account was deleted
 * - Irreversible (can't recover original email)
 * - Compliant with data protection regulations
 * 
 * @param userId - The user's ID
 * @param timestamp - Optional timestamp (defaults to now)
 * @returns Anonymized email address
 */
export function generateDeletedEmail(userId: string, timestamp?: number): string {
  const ts = timestamp ?? Date.now();
  return `deleted-${userId}-${ts}@deleted.local`;
}

/**
 * Alternative: Hash-based anonymization (most secure)
 * Completely anonymizes the email with no traceable information.
 */
export function generateDeletedEmailHash(email: string, userId: string): string {
  const hash = crypto
    .createHash('sha256')
    .update(`${email}-${userId}-${Date.now()}`)
    .digest('hex')
    .substring(0, 16);
  return `deleted-${hash}@deleted.local`;
}

/**
 * Checks if an email is a deleted user email
 */
export function isDeletedEmail(email: string): boolean {
  return email.startsWith('deleted-') && email.endsWith('@deleted.local');
}

/**
 * Extracts userId from a deleted email (if using timestamp strategy)
 * Returns null if not a valid deleted email or can't extract userId
 */
export function extractUserIdFromDeletedEmail(email: string): string | null {
  if (!isDeletedEmail(email)) return null;
  
  // Format: deleted-{userId}-{timestamp}@deleted.local
  const match = email.match(/^deleted-([^-]+)-\d+@deleted\.local$/);
  return match?.[1] ?? null;
}
