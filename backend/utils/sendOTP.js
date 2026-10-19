
import nodemailer from "nodemailer";

const getTransporter = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error("Mailtrap SMTP environment variables are missing");
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
};

const sendEmail = async ({ to, subject, html }) => {
  const transporter = getTransporter();

  const info = await transporter.sendMail({
    from: '"Twiller Testing" <test@twiller.local>',
    to,
    subject,
    html,
  });

  console.log("Mailtrap accepted test email:", info.messageId);
  return info;
};
