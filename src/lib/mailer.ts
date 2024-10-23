import nodemailer from "nodemailer";
import { type Attachment } from "nodemailer/lib/mailer";

// Options for sending mail
type SendMail = {
  to: string;
  subject: string;
  html: string;
  attachments?: Attachment[];
};

export async function sendMail({ to, subject, html, attachments }: SendMail) {
  if (process.env.SMTP_EMAIL && process.env.SMTP_PASSWORD && process.env.SMTP_HOST) {
    const account = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 465,
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });

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
