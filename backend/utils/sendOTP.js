
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const getSender = () => {
  const sender = process.env.RESEND_FROM_EMAIL;

  if (!sender) {
    throw new Error("RESEND_FROM_EMAIL is not configured");
  }

  return sender;
};

// Escape dynamic text before inserting it into HTML emails.
const escapeHtml = (value = "") =>
  String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[char];
  });

// Send an email through Resend.
const sendEmail = async ({ to, subject, html }) => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const { data, error } = await resend.emails.send({
    from: getSender(),
    to,
    subject,
    html,
  });

  if (error) {
    console.error("Resend email error:", error);
    throw new Error(error.message || "Failed to send email");
  }

  console.log("Email sent successfully. Resend ID:", data?.id);
  return data;
};

// ==========================================
// OTP EMAIL
// ==========================================

export const sendOTP = async (email, otp) => {
  if (!email || !otp) {
    throw new Error("Email and OTP are required");
  }

  await sendEmail({
    to: email,
    subject: "Twiller Login OTP",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2>Twiller Login Verification</h2>
        <p>Your verification code is:</p>
        <h1 style="letter-spacing: 5px;">${escapeHtml(otp)}</h1>
        <p>This OTP expires in 5 minutes.</p>
        <p>If you did not request this code, you can ignore this email.</p>
      </div>
    `,
  });
};

// ==========================================
// SUBSCRIPTION INVOICE EMAIL
// ==========================================

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
    throw new Error("Recipient email is required");
  }

  const safeName = escapeHtml(name || "User");
  const safePlan = escapeHtml(plan || "Subscription");
  const safeAmount = escapeHtml(amount);
  const safePaymentId = escapeHtml(paymentId);
  const safeOrderId = escapeHtml(orderId);

  const formatDate = (value) => {
    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? "Not available"
      : date.toLocaleDateString("en-IN", {
          timeZone: "Asia/Kolkata",
        });
  };

  await sendEmail({
    to: email,
    subject: `Twiller ${plan} Plan Subscription Invoice`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
        <h2 style="color: #1d9bf0;">Twiller Subscription Successful</h2>

        <p>Hello ${safeName},</p>
        <p>Your Twiller subscription has been successfully activated.</p>

        <hr />

        <h3>Subscription Details</h3>
        <p><strong>Plan:</strong> ${safePlan}</p>
        <p><strong>Amount:</strong> ₹${safeAmount}</p>
        <p><strong>Payment ID:</strong> ${safePaymentId}</p>
        <p><strong>Order ID:</strong> ${safeOrderId}</p>
        <p><strong>Start Date:</strong> ${formatDate(startDate)}</p>
        <p><strong>End Date:</strong> ${formatDate(endDate)}</p>

        <hr />

        <p>Thank you for subscribing to Twiller.</p>
        <p style="color: #666; font-size: 13px;">
          This email confirms your subscription payment.
        </p>
      </div>
    `,
  });

  console.log("Subscription invoice email sent successfully.");
};
