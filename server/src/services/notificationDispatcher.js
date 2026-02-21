/**
 * Notification Dispatcher — Unified multi-channel notification delivery
 *
 * Routes notifications to: in-app + email + WhatsApp based on user preferences.
 */

import { query } from '../db/connection.js';
import { createNotification } from '../routes/notifications.js';
import { sendNotificationEmail, sendAttendanceAlertEmail, logEmailNotification } from './email.js';
import { sendGenericWhatsApp, sendAttendanceWhatsApp, sendNoticeWhatsApp, sendExamResultWhatsApp, logWhatsAppNotification } from './whatsapp.js';

/**
 * Send a notification across all enabled channels for a user.
 *
 * @param {object} opts
 * @param {string} opts.userId       — Target user ID
 * @param {string} [opts.instituteId] — Institute ID
 * @param {string} opts.title        — Notification title
 * @param {string} opts.message      — Body text
 * @param {string} [opts.type]       — 'info' | 'warning' | 'success' | 'error'
 * @param {string} [opts.link]       — In-app relative link
 * @param {string} [opts.template]   — Template type: 'attendance' | 'notice' | 'exam_result' | 'generic'
 * @param {object} [opts.templateData] — Extra data for template rendering
 */
export async function dispatchNotification({
  userId,
  instituteId,
  title,
  message,
  type = 'info',
  link,
  template = 'generic',
  templateData = {},
}) {
  // 1. Always create in-app notification
  try {
    await createNotification({ userId, instituteId, title, message, type, link });
  } catch (err) {
    console.error('[DISPATCH] In-app notification failed:', err.message);
  }

  // 2. Fetch user preferences
  let user;
  try {
    const { rows } = await query(
      'SELECT name, email, phone, email_notifications, whatsapp_notifications FROM users WHERE id = $1',
      [userId]
    );
    user = rows[0];
  } catch (err) {
    console.error('[DISPATCH] Failed to fetch user:', err.message);
    return;
  }

  if (!user) return;

  // 3. Email channel
  if (user.email_notifications && user.email) {
    try {
      if (template === 'attendance') {
        await sendAttendanceAlertEmail({
          to: user.email,
          parentName: templateData.parentName || user.name,
          studentName: templateData.studentName,
          date: templateData.date,
          status: templateData.status,
        });
      } else {
        await sendNotificationEmail({
          to: user.email,
          name: user.name,
          title,
          message,
          link,
        });
      }
      await logEmailNotification({ userId, instituteId, subject: title, body: message, status: 'sent' });
    } catch (err) {
      console.error('[DISPATCH] Email failed:', err.message);
      await logEmailNotification({ userId, instituteId, subject: title, body: message, status: 'failed', error: err.message });
    }
  }

  // 4. WhatsApp channel
  if (user.whatsapp_notifications && user.phone) {
    try {
      let result;
      switch (template) {
        case 'attendance':
          result = await sendAttendanceWhatsApp({
            to: user.phone,
            parentName: templateData.parentName || user.name,
            studentName: templateData.studentName,
            date: templateData.date,
            status: templateData.status,
          });
          break;
        case 'notice':
          result = await sendNoticeWhatsApp({
            to: user.phone,
            name: user.name,
            noticeTitle: title,
            priority: templateData.priority,
          });
          break;
        case 'exam_result':
          result = await sendExamResultWhatsApp({
            to: user.phone,
            parentName: templateData.parentName || user.name,
            studentName: templateData.studentName,
            examName: templateData.examName,
            marks: templateData.marks,
            total: templateData.total,
          });
          break;
        default:
          result = await sendGenericWhatsApp({
            to: user.phone,
            title,
            message,
            link,
          });
      }
      await logWhatsAppNotification({
        userId,
        instituteId,
        body: message,
        status: 'sent',
        metadata: { sid: result?.sid },
      });
    } catch (err) {
      console.error('[DISPATCH] WhatsApp failed:', err.message);
      await logWhatsAppNotification({
        userId,
        instituteId,
        body: message,
        status: 'failed',
        error: err.message,
      });
    }
  }
}

/**
 * Send a notification to multiple users across all their enabled channels.
 */
export async function dispatchToMany({ userIds, instituteId, title, message, type, link, template, templateData }) {
  const results = await Promise.allSettled(
    userIds.map(userId =>
      dispatchNotification({ userId, instituteId, title, message, type, link, template, templateData })
    )
  );
  const failed = results.filter(r => r.status === 'rejected').length;
  if (failed > 0) {
    console.warn(`[DISPATCH] ${failed}/${userIds.length} notifications failed`);
  }
  return { total: userIds.length, sent: userIds.length - failed, failed };
}
