import nodemailer from 'nodemailer';
import { env } from './env';

const transport = nodemailer.createTransport({
  host: env.smtpHost,
  port: env.smtpPort,
  secure: env.smtpPort === 465,
  auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPass } : undefined,
});

export interface Mail {
  to: string;
  subject: string;
  /** testo semplice; i link vanno su righe proprie */
  text: string;
  attachments?: { filename: string; content: string; contentType: string }[];
}

export async function sendMail(mail: Mail) {
  try {
    await transport.sendMail({ from: env.mailFrom, ...mail });
  } catch (e) {
    // Un'email non inviata non deve bloccare l'azione dell'utente
    console.error('Invio email fallito', mail.to, mail.subject, e);
  }
}
