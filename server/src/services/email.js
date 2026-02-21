/**
 * Email Service — Nodemailer-based email delivery for EduYantra
 *
 * Environment variables required:
 *   SMTP_HOST      — e.g. smtp.gmail.com
 *   SMTP_PORT      — e.g. 587
 *   SMTP_USER      — e.g. your-email@gmail.com
 *   SMTP_PASS      — app-specific password
 *   SMTP_FROM      — e.g. "EduYantra <noreply@eduyantra.com>"
 *   APP_URL        — frontend URL, e.g. http://localhost:5173
 */

import nodemailer from 'nodemailer';
import { query } from '../db/connection.js';

// ── Transporter (lazy, created once) ──
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.warn('[EMAIL] SMTP_USER / SMTP_PASS not configured — emails will be logged to console only');
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return transporter;
}

// ── Core send helper ──
export async function sendEmail({ to, subject, html, text }) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'EduYantra <noreply@eduyantra.com>';

  const transport = getTransporter();

  if (!transport) {
    // Dev fallback — log to console
    console.log(`\n[EMAIL-DEV] To: ${to}\n  Subject: ${subject}\n  Body:\n${text || html}\n`);
    return { accepted: [to], messageId: 'dev-' + Date.now() };
  }

  const info = await transport.sendMail({ from, to, subject, html, text });
  return info;
}

// ── Log email to notification_log table ──
export async function logEmailNotification({ userId, instituteId, subject, body, status = 'sent', error = null }) {
  try {
    const { randomUUID } = await import('crypto');
    const id = `nl_${randomUUID().replace(/-/g, '').substring(0, 12)}`;
    await query(
      `INSERT INTO notification_log (id, institute_id, user_id, channel, subject, body, status, error_message)
       VALUES ($1, $2, $3, 'email', $4, $5, $6, $7)`,
      [id, instituteId || null, userId || null, subject, body, status, error]
    );
  } catch (err) {
    console.error('[EMAIL] Failed to log notification:', err.message);
  }
}

// ═══════════════════════════════════════════════
// PRE-BUILT EMAIL TEMPLATES
// ═══════════════════════════════════════════════

const APP_URL = () => process.env.APP_URL || 'http://localhost:5173';

function baseTemplate(content) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
    <div style="background:linear-gradient(135deg,#6d28d9,#4f46e5);padding:28px 32px;">
      <h1 style="margin:0;color:#fff;font-size:22px;">EduYantra</h1>
    </div>
    <div style="padding:32px;">
      ${content}
    </div>
    <div style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; ${new Date().getFullYear()} EduYantra. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

// ——— Password reset email ———
export async function sendPasswordResetEmail({ to, name, resetToken }) {
  const resetUrl = `${APP_URL()}/reset-password?token=${resetToken}`;
  const subject = 'Reset Your EduYantra Password';
  const html = baseTemplate(`
    <h2 style="margin:0 0 16px;font-size:20px;color:#111827;">Password Reset</h2>
    <p style="color:#4b5563;line-height:1.6;">Hi <strong>${name || 'there'}</strong>,</p>
    <p style="color:#4b5563;line-height:1.6;">We received a request to reset your password. Click the button below to choose a new password:</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#6d28d9,#4f46e5);color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Reset Password</a>
    </div>
    <p style="color:#6b7280;font-size:13px;">This link expires in <strong>1 hour</strong>. If you didn't request this, you can safely ignore this email.</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
    <p style="color:#9ca3af;font-size:12px;">If the button doesn't work, copy this link:<br><a href="${resetUrl}" style="color:#6d28d9;word-break:break-all;">${resetUrl}</a></p>
  `);
  const text = `Hi ${name || 'there'}, reset your EduYantra password here: ${resetUrl} (expires in 1 hour)`;

  return sendEmail({ to, subject, html, text });
}

// ——— Welcome / signup confirmation ———
export async function sendWelcomeEmail({ to, name, role }) {
  const subject = 'Welcome to EduYantra!';
  const html = baseTemplate(`
    <h2 style="margin:0 0 16px;font-size:20px;color:#111827;">Welcome aboard, ${name}! 🎉</h2>
    <p style="color:#4b5563;line-height:1.6;">Your account has been created as <strong>${role.replace('_', ' ')}</strong>.</p>
    <p style="color:#4b5563;line-height:1.6;">You can now log in and start using EduYantra to manage your academic journey.</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${APP_URL()}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#6d28d9,#4f46e5);color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Go to Dashboard</a>
    </div>
  `);
  const text = `Welcome to EduYantra, ${name}! Your account (${role}) is ready. Log in: ${APP_URL()}`;

  return sendEmail({ to, subject, html, text });
}

// ——— Generic notification email ———
export async function sendNotificationEmail({ to, name, title, message, link }) {
  const subject = title || 'EduYantra Notification';
  const html = baseTemplate(`
    <h2 style="margin:0 0 16px;font-size:20px;color:#111827;">${title}</h2>
    <p style="color:#4b5563;line-height:1.6;">Hi <strong>${name || 'there'}</strong>,</p>
    <p style="color:#4b5563;line-height:1.6;">${message}</p>
    ${link ? `<div style="text-align:center;margin:28px 0;"><a href="${APP_URL()}${link}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#6d28d9,#4f46e5);color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">View Details</a></div>` : ''}
  `);
  const text = `${title}\n\nHi ${name || 'there'},\n${message}${link ? `\n\nView: ${APP_URL()}${link}` : ''}`;

  return sendEmail({ to, subject, html, text });
}

// ——— Attendance alert email ———
export async function sendAttendanceAlertEmail({ to, parentName, studentName, date, status }) {
  const subject = `Attendance Alert: ${studentName}`;
  const html = baseTemplate(`
    <h2 style="margin:0 0 16px;font-size:20px;color:#111827;">Attendance Update</h2>
    <p style="color:#4b5563;line-height:1.6;">Dear <strong>${parentName || 'Parent'}</strong>,</p>
    <p style="color:#4b5563;line-height:1.6;">This is to inform you that <strong>${studentName}</strong> was marked <strong style="color:${status === 'absent' ? '#dc2626' : '#16a34a'}">${status}</strong> on <strong>${date}</strong>.</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${APP_URL()}/attendance" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#6d28d9,#4f46e5);color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">View Attendance</a>
    </div>
  `);
  const text = `Attendance Alert: ${studentName} was marked ${status} on ${date}.`;

  return sendEmail({ to, subject, html, text });
}
