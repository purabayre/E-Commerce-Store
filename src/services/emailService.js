const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  sendEmail: true,
  host: process.env.MAILTRAP_HOST,
  port: process.env.MAILTRAP_PORT,
  auth: {
    user: process.env.MAILTRAP_USER,
    pass: process.env.MAILTRAP_PASS,
  },
});

exports.sendEmail = async (to, subject, html) => {
  try {
    const from = process.env.MAILTRAP_USER;
    await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });

    return { success: true };
  } catch (error) {
    console.error("Error sending email:", error.message);
    return { success: false, error: error.message };
  }
};
