import { sendEmail } from '../modules/email/index.js';
import {
  verificationEmailTemplate,
  banNotificationTemplate,
  unbanNotificationTemplate,
  passwordResetEmailTemplate,
} from '../modules/email/email.templates.js';

export async function sendVerificationEmail(
  to: string,
  firstName: string,
  code: string,
  expiresInMinutes: number,
): Promise<void> {
  const { subject, html, text } = verificationEmailTemplate(firstName, code, expiresInMinutes);
  await sendEmail(to, subject, html, text);
}

export async function sendBanNotificationEmail(
  to: string,
  firstName: string,
  reason: string | null,
): Promise<void> {
  const { subject, html, text } = banNotificationTemplate(firstName, reason);
  await sendEmail(to, subject, html, text);
}

export async function sendUnbanNotificationEmail(
  to: string,
  firstName: string,
): Promise<void> {
  const { subject, html, text } = unbanNotificationTemplate(firstName);
  await sendEmail(to, subject, html, text);
}

export async function sendPasswordResetEmail(
  to: string,
  firstName: string,
  code: string,
  expiresInMinutes: number,
): Promise<void> {
  const { subject, html, text } = passwordResetEmailTemplate(firstName, code, expiresInMinutes);
  await sendEmail(to, subject, html, text);
}
