import nodemailer from "nodemailer";

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
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL,
    to: email,
    subject: `Twiller ${plan} Plan Subscription Invoice`,
    html: `
      <h2>Twiller Subscription Successful</h2>

      <p>Hello ${name || "User"},</p>

      <p>Your subscription has been successfully activated.</p>

      <hr>

      <h3>Subscription Details</h3>

      <p><strong>Plan:</strong> ${plan}</p>
      <p><strong>Amount:</strong> ₹${amount}</p>
      <p><strong>Payment ID:</strong> ${paymentId}</p>
      <p><strong>Order ID:</strong> ${orderId}</p>
      <p><strong>Start Date:</strong>
        ${new Date(startDate).toLocaleDateString("en-IN")}
      </p>
      <p><strong>End Date:</strong>
        ${new Date(endDate).toLocaleDateString("en-IN")}
      </p>

      <hr>

      <p>Thank you for subscribing to Twiller.</p>
    `,
  });

  console.log("Subscription invoice sent to:", email);
};