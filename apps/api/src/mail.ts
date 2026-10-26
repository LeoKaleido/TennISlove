import nodemailer from 'nodemailer';
import { env } from './env';

const transport = nodemailer.createTransport({
  host: env.smtpHost,
  port: env.smtpPort,
  secure: env.smtpPort === 465,
  auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPass } : undefined,
});

// impostazioni in uso, scritte all'avvio per capire subito dove partono le email (mai la password)
console.log(
  `Email: SMTP ${env.smtpHost}:${env.smtpPort}, SSL ${env.smtpPort === 465 ? 'sì' : 'no'}, utente ${env.smtpUser ?? 'nessuno'}, mittente ${env.mailFrom}`,
);

// nei log l'oggetto non deve contenere il codice di accesso
const safe = (subject: string) => subject.replace(/\d{6}/g, '******');

export interface Mail {
  to: string;
  subject: string;
  /** testo semplice; i link vanno su righe proprie */
  text: string;
  attachments?: { filename: string; content: string; contentType: string }[];
}

export async function sendMail(mail: Mail) {
  try {
    const info = await transport.sendMail({ from: env.mailFrom, ...mail });
    console.log(`Email inviata a ${mail.to}: "${safe(mail.subject)}" (server: ${info.response})`);
  } catch (e) {
    // Un'email non inviata non deve bloccare l'azione dell'utente
    console.error(`Invio email fallito a ${mail.to}: "${safe(mail.subject)}"`, e);
  }
}
