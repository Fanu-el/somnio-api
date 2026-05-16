// ─── banDetails ───────────────────────────────────────────────────────────────

export interface BanHistoryEntry {
  bannedAt: string;       // ISO date string
  banReason: string;
  bannerUserId: string;   // SUPER_ADMIN user id
}

export interface BanDetails {
  lastBannedAt: string | null;
  lastBannedReason: string | null;
  banHistory: BanHistoryEntry[];
  [key: string]: unknown;
}

// ─── authActivity ─────────────────────────────────────────────────────────────

export interface LoginFrom {
  device: string | null;
  ipAddress: string | null;
}

export interface LoginHistoryEntry {
  loginAt: string;        // ISO date string
  loginFrom: LoginFrom;
}

export interface AuthActivity {
  loginAttempts: number;
  loginDisableCount: number;
  lastLoggedInAt: string | null;
  loginDisableWillResetOn: string | null;
  loginHistory: LoginHistoryEntry[];
  [key: string]: unknown;
}
