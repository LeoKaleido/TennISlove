const num = (v: string | undefined, fallback: number) => (v ? Number(v) : fallback);

export const env = {
  port: num(process.env.PORT, 3000),
  appUrl: process.env.APP_URL ?? 'http://localhost:5173',
  sessionDays: num(process.env.SESSION_DAYS, 90),
  magicLinkMinutes: num(process.env.MAGIC_LINK_MINUTES, 15),
  smtpHost: process.env.SMTP_HOST ?? 'localhost',
  smtpPort: num(process.env.SMTP_PORT, 1025),
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  mailFrom: process.env.MAIL_FROM ?? 'ATP Umbria Tournament <noreply@atpumbria.local>',
  uploadDir: process.env.UPLOAD_DIR ?? './uploads',
  secureCookies: process.env.NODE_ENV === 'production',
};
