import nodemailer from "nodemailer";

export function getTransport() {
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD } = process.env;
  if (!EMAIL_HOST || !EMAIL_PORT || !EMAIL_USER || !EMAIL_PASSWORD) {
    throw new Error(
      "Email credentials are not configured. Populate EMAIL_* variables in your environment."
    );
  }

  return nodemailer.createTransport({
    host: EMAIL_HOST,
    port: Number(EMAIL_PORT),
    secure: Number(EMAIL_PORT) === 465,
    requireTLS: true,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASSWORD
    },
    tls: {
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2'
    }
  });
}

export async function sendSavingsDigestEmail({
  to,
  subject,
  html,
  text
}: {
  to: string[];
  subject: string;
  html: string;
  text: string;
}) {
  try {
    const transporter = getTransport();
    const from = process.env.EMAIL_FROM ?? "no-reply@pensioncrm.test";

    await transporter.sendMail({
      from,
      to,
      subject,
      html,
      text
    });
  } catch (error) {
    console.error('Email sending failed:', error);
    throw new Error(`Email delivery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
