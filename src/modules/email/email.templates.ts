// ─── Shared layout wrapper ────────────────────────────────────────────────────

function layout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Somnio</title>
</head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0"
               style="max-width:480px;background:#1a1a1a;border-radius:16px;
                      border:1px solid #2a2a2a;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 24px;border-bottom:1px solid #2a2a2a;">
              <span style="font-size:22px;font-weight:800;letter-spacing:-0.5px;color:#ffffff;">
                somnio<span style="color:#a855f7;">.</span>
              </span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 40px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #2a2a2a;">
              <p style="margin:0;font-size:12px;color:#4b4b4b;text-align:center;">
                © ${new Date().getFullYear()} Somnio. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Verification email ───────────────────────────────────────────────────────

export function verificationEmailTemplate(firstName: string, code: string, expiresInMinutes: number) {
  const digits = code.split('');

  const digitBoxes = digits
    .map(
      (d) => `
      <td style="padding:0 5px;text-align:center;">
        <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
          <tr>
            <td style="
              width:48px;
              height:64px;
              background:#111111;
              border-radius:10px;
              border:1px solid #3a3a3a;
              font-size:32px;
              font-weight:800;
              color:#a855f7;
              text-align:center;
              vertical-align:middle;
            ">${d}</td>
          </tr>
        </table>
        <div style="height:3px;background:linear-gradient(90deg,#a855f7,#7c3aed);
                    border-radius:2px;margin-top:6px;width:48px;"></div>
      </td>`,
    )
    .join('');

  const content = `
    <h2 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;">
      Verify your email 👋
    </h2>
    <p style="margin:0 0 32px;font-size:15px;color:#9ca3af;line-height:1.6;">
      Hey <strong style="color:#e5e7eb;">${firstName}</strong>, thanks for joining Somnio.
      Enter the code below to activate your account.
    </p>

    <!-- Code boxes -->
    <table cellpadding="0" cellspacing="0" style="margin:0 auto 12px;">
      <tr align="center">${digitBoxes}</tr>
    </table>

    <p style="margin:0 0 32px;font-size:12px;color:#6b7280;text-align:center;">
      Expires in <strong style="color:#9ca3af;">${expiresInMinutes} minutes</strong>
    </p>

    <div style="background:#111;border:1px solid #2a2a2a;border-radius:10px;padding:16px 20px;">
      <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">
        🔒 Never share this code with anyone. Somnio will never ask for it.
        If you didn't create an account, you can safely ignore this email.
      </p>
    </div>
  `;

  return {
    subject: 'Your Somnio verification code',
    html: layout(content),
    text: `Hey ${firstName}, your Somnio verification code is: ${code}. It expires in ${expiresInMinutes} minutes. Never share this code with anyone.`,
  };
}

// ─── Ban notification ─────────────────────────────────────────────────────────

export function banNotificationTemplate(firstName: string, reason: string | null) {
  const content = `
    <div style="margin-bottom:24px;">
      <span style="display:inline-block;background:#3f1515;color:#f87171;
                   font-size:12px;font-weight:600;letter-spacing:0.5px;
                   padding:4px 12px;border-radius:999px;border:1px solid #7f1d1d;">
        ACCOUNT SUSPENDED
      </span>
    </div>

    <h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#ffffff;">
      Hi ${firstName},
    </h2>
    <p style="margin:0 0 24px;font-size:15px;color:#9ca3af;line-height:1.6;">
      Your Somnio account has been <strong style="color:#f87171;">suspended</strong>
      and you will no longer be able to log in.
    </p>

    ${
      reason
        ? `<div style="background:#1f1010;border:1px solid #7f1d1d;border-radius:10px;
                       padding:16px 20px;margin-bottom:24px;">
             <p style="margin:0 0 4px;font-size:11px;font-weight:600;
                       letter-spacing:0.5px;color:#f87171;text-transform:uppercase;">Reason</p>
             <p style="margin:0;font-size:14px;color:#e5e7eb;">${reason}</p>
           </div>`
        : ''
    }

    <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">
      If you believe this is a mistake, please contact our support team.
    </p>
  `;

  return {
    subject: 'Your Somnio account has been suspended',
    html: layout(content),
    text: `Hi ${firstName}, your Somnio account has been suspended.${reason ? ` Reason: ${reason}.` : ''} If you believe this is a mistake, please contact our support team.`,
  };
}

// ─── Password reset ───────────────────────────────────────────────────────────

export function passwordResetEmailTemplate(firstName: string, code: string, expiresInMinutes: number) {
  const digits = code.split('');

  const digitBoxes = digits
    .map(
      (d) => `
      <td style="padding:0 5px;text-align:center;">
        <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
          <tr>
            <td style="
              width:48px;
              height:64px;
              background:#111111;
              border-radius:10px;
              border:1px solid #3a3a3a;
              font-size:32px;
              font-weight:800;
              color:#f59e0b;
              text-align:center;
              vertical-align:middle;
            ">${d}</td>
          </tr>
        </table>
        <div style="height:3px;background:linear-gradient(90deg,#f59e0b,#d97706);
                    border-radius:2px;margin-top:6px;width:48px;"></div>
      </td>`,
    )
    .join('');

  const content = `
    <h2 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;">
      Reset your password 🔑
    </h2>
    <p style="margin:0 0 32px;font-size:15px;color:#9ca3af;line-height:1.6;">
      Hey <strong style="color:#e5e7eb;">${firstName}</strong>, we received a request to reset
      your Somnio password. Use the code below to proceed.
    </p>

    <!-- Code boxes -->
    <table cellpadding="0" cellspacing="0" style="margin:0 auto 12px;">
      <tr align="center">${digitBoxes}</tr>
    </table>

    <p style="margin:0 0 32px;font-size:12px;color:#6b7280;text-align:center;">
      Expires in <strong style="color:#9ca3af;">${expiresInMinutes} minutes</strong>
    </p>

    <div style="background:#111;border:1px solid #2a2a2a;border-radius:10px;padding:16px 20px;">
      <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">
        🔒 If you didn't request a password reset, you can safely ignore this email.
        Your password will not change.
      </p>
    </div>
  `;

  return {
    subject: 'Reset your Somnio password',
    html: layout(content),
    text: `Hey ${firstName}, your Somnio password reset code is: ${code}. It expires in ${expiresInMinutes} minutes. If you didn't request this, you can safely ignore this email.`,
  };
}

// ─── Unban notification ───────────────────────────────────────────────────────

export function unbanNotificationTemplate(firstName: string) {
  const content = `
    <div style="margin-bottom:24px;">
      <span style="display:inline-block;background:#052e16;color:#4ade80;
                   font-size:12px;font-weight:600;letter-spacing:0.5px;
                   padding:4px 12px;border-radius:999px;border:1px solid #166534;">
        ACCOUNT RESTORED
      </span>
    </div>

    <h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#ffffff;">
      Welcome back, ${firstName} 🎉
    </h2>
    <p style="margin:0 0 24px;font-size:15px;color:#9ca3af;line-height:1.6;">
      Your Somnio account has been <strong style="color:#4ade80;">restored</strong>.
      You can now log in and pick up where you left off.
    </p>

    <div style="background:#0a1f12;border:1px solid #166534;border-radius:10px;padding:16px 20px;">
      <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">
        If you have any questions or concerns, feel free to reach out to our support team.
      </p>
    </div>
  `;

  return {
    subject: 'Your Somnio account has been restored',
    html: layout(content),
    text: `Welcome back, ${firstName}! Your Somnio account has been restored. You can now log in again.`,
  };
}
