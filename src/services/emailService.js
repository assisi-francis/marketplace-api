import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendWelcomeEmail(user) {
  try {
    await transporter.sendMail({
      from: `"Marketplace" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: 'Welcome to Marketplace!',
      text: `Hi ${user.name}, thanks for signing up. Your account has been created successfully.`,
      html: `<p>Hi <strong>${user.name}</strong>,</p><p>Thanks for signing up to Marketplace. Your account has been created successfully.</p>`,
    });
  } catch (err) {
    console.error('Failed to send welcome email:', err.message);
  }
}