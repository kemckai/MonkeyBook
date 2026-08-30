const nodemailer = require('nodemailer');

function getAppOrigin() {
  return process.env.CLIENT_ORIGIN || 'http://localhost:3000';
}

function smtpConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

async function sendPasswordResetEmail(email, token) {
  const resetUrl = `${getAppOrigin()}/reset-password?token=${token}`;
  const subject = 'Reset your Monkeybook password';
  const text = `Reset your Monkeybook password:\n\n${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`;
  const html = `<p>Reset your Monkeybook password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 1 hour.</p>`;

  if (smtpConfigured()) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject,
      text,
      html,
    });
    return { sent: true };
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log(`\n[Monkeybook] Password reset for ${email}:\n${resetUrl}\n`);
    return { sent: false, devUrl: resetUrl };
  }

  console.warn(`[Monkeybook] SMTP not configured — could not email reset link to ${email}`);
  return { sent: false };
}

module.exports = { sendPasswordResetEmail, getAppOrigin };
