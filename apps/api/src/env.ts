// tollera virgolette e commenti lasciati nel .env (es. "465" oppure 465 # ssl)
const num = (v: string | undefined, fallback: number) => {
  const n = Number.parseInt((v ?? '').replace(/["']/g, ''), 10);
  return Number.isNaN(n) ? fallback : n;
};

export const env = {
  port: num(process.env.PORT, 3000),
  appUrl: process.env.APP_URL ?? 'http://localhost:5173',
  sessionDays: num(process.env.SESSION_DAYS, 90),
  loginCodeMinutes: num(process.env.LOGIN_CODE_MINUTES, 15),
  smtpHost: process.env.SMTP_HOST ?? 'localhost',
  smtpPort: num(process.env.SMTP_PORT, 1025),
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  mailFrom: process.env.MAIL_FROM ?? 'TennISlove <noreply@tennislove.local>',
  uploadDir: process.env.UPLOAD_DIR ?? './uploads',
  secureCookies: process.env.NODE_ENV === 'production',
  trustProxy: process.env.TRUST_PROXY === 'true',
};
