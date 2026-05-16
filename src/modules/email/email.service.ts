import { transporter } from './email.transporter.js';
import { env } from '../../config/env.js';
import { prisma } from '../../config/database.js';
import { EmailStatus } from '../../generated/prisma/enums.js';

const from = `"${env.email.fromName}" <${env.email.gmailUser}>`;

async function logEmail(to: string, subject: string, text: string, error?: unknown): Promise<void> {
  const status: EmailStatus = error ? EmailStatus.FAILED : EmailStatus.SENT;
  const errorMessage = error instanceof Error ? error.message : error ? String(error) : undefined;
  await prisma.email.create({
    data: { to, subject, body: text, status, ...(errorMessage ? { error: errorMessage } : {}) },
  });
}

/**
 * Sends an email and logs the plain-text summary to the Email table.
 * Throws on failure so callers can react.
 */
export async function sendEmail(to: string, subject: string, html: string, text: string): Promise<void> {
  try {
    await transporter.sendMail({ from, to, subject, html, text });
    await logEmail(to, subject, text);
  } catch (err) {
    await logEmail(to, subject, text, err);
    throw err;
  }
}
