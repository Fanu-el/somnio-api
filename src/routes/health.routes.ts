import { Router } from 'express';
import { sendOk } from '../utils/response.js';

const router = Router();

const routes = [
  // ─── Auth ──────────────────────────────────────────────────────────────────
  { method: 'POST',  path: '/api/auth/register',             auth: 'public' },
  { method: 'POST',  path: '/api/auth/verify-email',         auth: 'public' },
  { method: 'POST',  path: '/api/auth/resend-verification',  auth: 'public' },
  { method: 'POST',  path: '/api/auth/login',                auth: 'public' },
  { method: 'POST',  path: '/api/auth/refresh',              auth: 'public' },
  { method: 'POST',  path: '/api/auth/logout',               auth: 'jwt' },
  { method: 'GET',   path: '/api/auth/me',                   auth: 'jwt' },
  { method: 'POST',  path: '/api/auth/forgot-password',      auth: 'public' },
  { method: 'POST',  path: '/api/auth/reset-password',       auth: 'public' },

  // ─── Users ─────────────────────────────────────────────────────────────────
  { method: 'GET',   path: '/api/users',                     auth: 'SUPER_ADMIN' },
  { method: 'GET',   path: '/api/users/:id',                 auth: 'SUPER_ADMIN' },
  { method: 'PATCH', path: '/api/users/update-profile',      auth: 'jwt' },
  { method: 'PATCH', path: '/api/users/update-profile-picture', auth: 'jwt' },
  { method: 'PATCH', path: '/api/users/:id/status',          auth: 'SUPER_ADMIN' },
  { method: 'DELETE',path: '/api/users/:id',                 auth: 'SUPER_ADMIN' },
  { method: 'DELETE',path: '/api/users/delete-account',      auth: 'jwt' },

  // ─── Test ──────────────────────────────────────────────────────────────────
  { method: 'GET', path: '/api/test', auth: 'public' },
];

router.get('/', (_req, res) => {
  sendOk(res, {
    status: 'ok',
    service: 'somnio-api',
    routes,
  });
});

export { router as healthRouter };
