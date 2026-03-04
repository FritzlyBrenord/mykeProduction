import { env, getGmailSmtpEnv } from "@/lib/env";
import nodemailer from "nodemailer";

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function createTransporter() {
  const { user, appPassword } = getGmailSmtpEnv();

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user,
      pass: appPassword,
    },
  });
}

export function isSmtpConfigured() {
  return Boolean(env.GMAIL_SMTP_USER && env.GMAIL_SMTP_APP_PASSWORD);
}

export function getSmtpTransporter() {
  if (!transporter) {
    transporter = createTransporter();
  }
  return transporter;
}

export function getEmailFromAddress() {
  if (env.EMAIL_FROM) return env.EMAIL_FROM;
  if (env.GMAIL_SMTP_USER) return env.GMAIL_SMTP_USER;
  return "no-reply@myke-industrie.local";
}
