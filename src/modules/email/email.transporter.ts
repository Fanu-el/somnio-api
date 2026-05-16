import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';

export const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: env.email.gmailUser,
    pass: env.email.gmailAppPassword,
  },
});
