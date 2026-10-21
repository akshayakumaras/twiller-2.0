import nodemailer from "nodemailer";

const escapeHtml = (value = "") =>
  String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);

const createTransporter = () => {
  // Mailtrap sandbox is used when SMTP_* values are configured.
  if (
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  ) {
    const port = Number(process.env.SMTP_PORT);
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Backward-compatible Gmail SMTP fallback for existing deployments.
  if (process.env.EMAIL && process.env.EMAIL_PASSWORD) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  throw new Error(
    "Email is not configured. Set SMTP_* for Mailtrap or EMAIL/EMAIL_PASSWORD for Gmail."
  );
};

export const sendSubscriptionInvoice = async ({
  email,
  name,
  plan,
  amount,
  paymentId,
  orderId,
  startDate,
  endDate,
}) => {
  if (!email) {
    throw new Error("Invoice recipient email is required.");
  }

  const sender = process.env.SMTP_USER || process.env.EMAIL;
  const transporter = createTransporter();

  await transporter.sendMail({
    from: sender
      ? `"Twiller" <${sender}>`
      : '"Twiller Testing" <test@twiller.local>',
    to: email,
    subject: `Twiller ${escapeHtml(plan)} Plan Subscription Invoice`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Twiller Subscription Invoice</h2>
        <p>Hello ${escapeHtml(name || "User")},</p>
        <p>Your subscription payment was verified and your plan was activated.</p>
        <hr />
        <h3>Subscription Details</h3>
        <p><strong>Plan:</strong> ${escapeHtml(plan)}</p>
        <p><strong>Amount:</strong> ₹${escapeHtml(amount)}</p>
        <p><strong>Payment ID:</strong> ${escapeHtml(paymentId)}</p>
        <p><strong>Order ID:</strong> ${escapeHtml(orderId)}</p>
        <p><strong>Start Date:</strong> ${escapeHtml(new Date(startDate).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }))}</p>
        <p><strong>End Date:</strong> ${escapeHtml(new Date(endDate).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }))}</p>
        <hr />
        <p>Thank you for subscribing to Twiller.</p>
      </div>
    `,
  });

  console.log("Subscription invoice email accepted for:", email);
};
