/**
 * WhatsApp Service — Twilio-based WhatsApp messaging for EduYantra
 *
 * Environment variables required:
 *   TWILIO_ACCOUNT_SID   — Twilio Account SID
 *   TWILIO_AUTH_TOKEN     — Twilio Auth Token
 *   TWILIO_WHATSAPP_FROM  — e.g. whatsapp:+14155238886 (Twilio sandbox or approved number)
 *   APP_URL               — frontend URL
 */

import twilio from 'twilio';
import { query } from '../db/connection.js';

let client = null;

function getClient() {
  if (client) return client;

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;

  if (!sid || !token) {
    console.warn('[WHATSAPP] TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN not configured — messages will be logged to console only');
    return null;
  }

  client = twilio(sid, token);
  return client;
}

const FROM_NUMBER = () => process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

// ── Core send helper ──
export async function sendWhatsApp({ to, body }) {
  // Ensure the number is in E.164 + whatsapp: prefix format
  const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

  const twilioClient = getClient();

  if (!twilioClient) {
    // Dev fallback
    console.log(`\n[WHATSAPP-DEV] To: ${toNumber}\n  Body: ${body}\n`);
    return { sid: 'dev-' + Date.now(), status: 'dev-logged' };
  }

  const message = await twilioClient.messages.create({
    from: FROM_NUMBER(),
    to: toNumber,
    body,
  });

  return message;
}

// ── Log to notification_log ──
export async function logWhatsAppNotification({ userId, instituteId, body, status = 'sent', error = null, metadata = {} }) {
  try {
    const { randomUUID } = await import('crypto');
    const id = `nl_${randomUUID().replace(/-/g, '').substring(0, 12)}`;
    await query(
      `INSERT INTO notification_log (id, institute_id, user_id, channel, subject, body, status, error_message, metadata)
       VALUES ($1, $2, $3, 'whatsapp', NULL, $4, $5, $6, $7)`,
      [id, instituteId || null, userId || null, body, status, error, JSON.stringify(metadata)]
    );
  } catch (err) {
    console.error('[WHATSAPP] Failed to log notification:', err.message);
  }
}

// ═══════════════════════════════════════════════
// PRE-BUILT WHATSAPP TEMPLATES
// ═══════════════════════════════════════════════

const APP_URL = () => process.env.APP_URL || 'http://localhost:5173';

// ——— Password reset via WhatsApp ———
export async function sendPasswordResetWhatsApp({ to, name, resetToken }) {
  const resetUrl = `${APP_URL()}/reset-password?token=${resetToken}`;
  const body = `🔐 *EduYantra Password Reset*\n\nHi ${name || 'there'},\nWe received a request to reset your password.\n\nClick here to reset: ${resetUrl}\n\n⏰ This link expires in 1 hour.\n\nIf you didn't request this, please ignore this message.`;

  return sendWhatsApp({ to, body });
}

// ——— Attendance alert ———
export async function sendAttendanceWhatsApp({ to, parentName, studentName, date, status }) {
  const emoji = status === 'absent' ? '🔴' : '🟢';
  const body = `${emoji} *Attendance Alert — EduYantra*\n\nDear ${parentName || 'Parent'},\n${studentName} was marked *${status}* on ${date}.\n\nView details: ${APP_URL()}/attendance`;

  return sendWhatsApp({ to, body });
}

// ——— Notice alert ———
export async function sendNoticeWhatsApp({ to, name, noticeTitle, priority }) {
  const emoji = priority === 'urgent' || priority === 'high' ? '🚨' : priority === 'medium' ? '⚠️' : 'ℹ️';
  const body = `${emoji} *New Notice — EduYantra*\n\nHi ${name || 'there'},\n*${noticeTitle}* (Priority: ${priority || 'normal'})\n\nView: ${APP_URL()}/notices`;

  return sendWhatsApp({ to, body });
}

// ——— Exam result alert ———
export async function sendExamResultWhatsApp({ to, parentName, studentName, examName, marks, total }) {
  const pct = Math.round((marks / total) * 100);
  const body = `📝 *Exam Result — EduYantra*\n\nDear ${parentName || 'Parent'},\n${studentName} scored *${marks}/${total} (${pct}%)* in *${examName}*.\n\nView full report: ${APP_URL()}/reports`;

  return sendWhatsApp({ to, body });
}

// ——— Generic message ———
export async function sendGenericWhatsApp({ to, title, message, link }) {
  const body = `📢 *${title}*\n\n${message}${link ? `\n\nView: ${APP_URL()}${link}` : ''}`;
  return sendWhatsApp({ to, body });
}
