import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail({ to, subject, text, html }) {
  try {
    await transporter.sendMail({
      from: `"Marketplace" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
    });
    return true;
  } catch (err) {
    console.error('Email delivery error:', err.message);
    return false;
  }
}

export async function sendWelcomeEmail(user) {
  return sendEmail({
    to: user.email,
    subject: 'Welcome to Marketplace!',
    text: `Hi ${user.name}, thanks for signing up. Your account has been created successfully.`,
    html: `<p>Hi <strong>${user.name}</strong>,</p><p>Thanks for signing up to Marketplace. Your account has been created successfully.</p>`,
  });
}