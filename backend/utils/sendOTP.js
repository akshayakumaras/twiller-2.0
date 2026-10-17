
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const getSender = () => {
  const sender = process.env.RESEND_FROM_EMAIL;

  if (!sender) {
    throw new Error("RESEND_FROM_EMAIL is not configured");
  }

  return sender;
};

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
  };

const normalizeEmail = (email) => {
  if (typeof email !== "string" || !email.trim()) {
    throw new Error("A valid recipient email is required");
  }

  return email.trim().toLowerCase();
};

// Send an email through Resend.
const sendEmail = async ({ to, subject, html }) => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const recipient = normalizeEmail(to);

  const { data, error } = await resend.emails.send({
    from: getSender(),
    to: [recipient],
    subject,
    html,
  });

  if (error) {
    console.error("Resend email error:", {
      message: error.message,
      name: error.name,
      statusCode: error.statusCode,
    });

    throw new Error(error.message || "Failed to send email");
  }

  console.log("Email sent successfully. Resend ID:", data?.id);

  return data;
};

// ==========================================
// OTP EMAIL
// ==========================================

export const sendOTP = async (email, otp) => {
  if (!otp) {
    throw new Error("OTP is required");
  }

  const recipient = normalizeEmail(email);
  const safeOtp = escapeHtml(otp);

  return sendEmail({
    to: recipient,
    subject: "Twiller Login OTP",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2>Twiller Login Verification</h2>
        <p>Your verification code is:</p>
        <h1 style="letter-spacing: 5px;">${safeOtp}</h1>
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
  const recipient = normalizeEmail(email);

  const safeName = escapeHtml(name || "User");
  const safePlan = escapeHtml(plan || "Subscription");
  const safeAmount = escapeHtml(amount ?? "0");
  const safePaymentId = escapeHtml(paymentId || "Not available");
  const safeOrderId = escapeHtml(orderId || "Not available");

  const formatDate = (value) => {
    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? "Not available"
      : date.toLocaleDateString("en-IN", {
          timeZone: "Asia/Kolkata",
        });
  };

  const safeStartDate = formatDate(startDate);
  const safeEndDate = formatDate(endDate);

  const result = await sendEmail({
    to: recipient,
    subject: `Twiller ${plan || "Subscription"} Plan Subscription Invoice`,
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
        <p><strong>Start Date:</strong> ${safeStartDate}</p>
        <p><strong>End Date:</strong> ${safeEndDate}</p>

        <hr />

        <p>Thank you for subscribing to Twiller.</p>
        <p style="color: #666; font-size: 13px;">
          This email confirms your subscription payment.
        </p>
      </div>
    `,
  });

  console.log("Subscription invoice email sent successfully.");

  return result;
};
