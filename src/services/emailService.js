const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,

  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

exports.sendOrderConfirmation = async (email, order) => {
  await transporter.sendMail({
    to: email,

    from: process.env.MAIL_FROM,

    subject: "Order Confirmation",

    html: `
      <h1>Thank You!</h1>

      <p>Your order #${order.id} has been placed successfully.</p>
    `,
  });
};
