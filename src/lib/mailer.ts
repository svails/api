import nodemailer from "nodemailer";
import { type Attachment } from "nodemailer/lib/mailer";

type SendMail = {
  to: string;
  subject: string;
  html: string | Promise<string>;
  attachments?: Attachment[];
};

export async function sendMail({ to, subject, html: tsx, attachments }: SendMail) {
  // Evaluate HTML first if it's TSX
  const html = tsx instanceof Promise ? await tsx : tsx;
  if (process.env.SMTP_EMAIL && process.env.SMTP_PASSWORD && process.env.SMTP_HOST) {
    // Create account for sending mail
    const account = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 465,
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    // If HTML is JSX, evaluate it first
    await account.sendMail({
      from: `${process.env.SMTP_NAME} <${process.env.SMTP_EMAIL}>`,
      to,
      subject,
      html,
      attachments,
    });
  } else {
    console.log(`✉️  ${to}`);
    console.log(`📋 Subject: ${subject}`);
    console.log(`📝 HTML: ${html}`);
    if (attachments)
      console.log(`📎 Attachments: ${attachments.length}`);
  }
}
