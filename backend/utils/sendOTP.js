import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});


// ==========================================
// OTP EMAIL
// ==========================================

export const sendOTP = async (email, otp) => {
  console.log("EMAIL:", process.env.EMAIL);
  console.log(
    "EMAIL_PASSWORD:",
    process.env.EMAIL_PASSWORD ? "Loaded" : "Missing"
  );

  await transporter.sendMail({
    from: process.env.EMAIL,
    to: email,
    subject: "Twiller Login OTP",
    html: `
      <h2>Twiller Login Verification</h2>
      <p>Your OTP is:</p>
      <h1>${otp}</h1>
      <p>This OTP expires in 5 minutes.</p>
    `,
  });

  console.log("OTP sent successfully to:", email);
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
  await transporter.sendMail({
    from: process.env.EMAIL,
    to: email,
    subject: `Twiller ${plan} Plan Subscription Invoice`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">

        <h2 style="color: #1d9bf0;">
          Twiller Subscription Successful
        </h2>

        <p>Hello ${name || "User"},</p>

        <p>
          Your Twiller subscription has been successfully activated.
        </p>

        <hr />

        <h3>Subscription Details</h3>

        <p>
          <strong>Plan:</strong> ${plan}
        </p>

        <p>
          <strong>Amount:</strong> ₹${amount}
        </p>

        <p>
          <strong>Payment ID:</strong> ${paymentId}
        </p>

        <p>
          <strong>Order ID:</strong> ${orderId}
        </p>

        <p>
          <strong>Start Date:</strong>
          ${new Date(startDate).toLocaleDateString("en-IN")}
        </p>

        <p>
          <strong>End Date:</strong>
          ${new Date(endDate).toLocaleDateString("en-IN")}
        </p>

        <hr />

        <p>
          Thank you for subscribing to Twiller.
        </p>

        <p style="color: #666; font-size: 13px;">
          This email serves as your subscription payment confirmation.
        </p>

      </div>
    `,
  });

  console.log(
    "Subscription invoice sent successfully to:",
    email
  );
};