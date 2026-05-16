import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';

import { prisma } from './database.js';
import { env } from './env.js';
import { Messages } from '../constants/messages.js';
import { UserStatus } from '../generated/prisma/enums.js';
import type { JwtPayload } from '../utils/jwt.js';

// ─── JWT Access Token Strategy ────────────────────────────────────────────────

passport.use(
  'jwt',
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: env.jwtSecret,
    },
    async (payload: JwtPayload, done) => {
      try {
        const user = await prisma.user.findUnique({ where: { id: payload.sub } });

        if (!user || user.status === UserStatus.DELETED) {
          return done(null, false, { message: Messages.auth.UNAUTHORIZED });
        }
        if (user.status === UserStatus.PENDING) {
          return done(null, false, { message: Messages.auth.ACCOUNT_PENDING_VERIFICATION });
        }
        if (user.status === UserStatus.BANNED) {
          return done(null, false, { message: Messages.auth.ACCOUNT_BANNED });
        }
        if (user.status === UserStatus.TEMPORARILY_LOGIN_DISABLED) {
          return done(null, false, { message: Messages.auth.LOGIN_TEMPORARILY_DISABLED });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    },
  ),
);

export { passport };
