import nodemailer from 'nodemailer';
import { config } from '../config';

export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;

  private static getTransporter(): nodemailer.Transporter | null {
    if (this.transporter) {
      return this.transporter;
    }

    if (config.smtpHost && config.smtpUser && config.smtpPass) {
      this.transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpSecure,
        auth: {
          user: config.smtpUser,
          pass: config.smtpPass,
        },
      });
      return this.transporter;
    }

    return null;
  }

  /**
   * Send a 6-digit verification code to the user's email address
   */
  static async sendPasswordResetEmail({
    toEmail,
    userName,
    resetCode,
  }: {
    toEmail: string;
    userName: string;
    resetCode: string;
  }): Promise<{ sent: boolean; reason?: string }> {
    const transporter = this.getTransporter();

    const subject = `Your StartupBaazi Verification Code: ${resetCode}`;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #020617; color: #f8fafc; margin: 0; padding: 24px; }
          .container { max-width: 520px; margin: 0 auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 20px; padding: 32px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5); }
          .logo-badge { display: inline-flex; align-items: center; gap: 8px; font-size: 20px; font-weight: 900; color: #ffffff; text-decoration: none; }
          .accent { color: #f97316; }
          .title { font-size: 22px; font-weight: 800; color: #ffffff; margin-top: 24px; margin-bottom: 8px; }
          .subtitle { font-size: 13px; color: #94a3b8; line-height: 1.5; margin-bottom: 24px; }
          .code-box { background: #020617; border: 2px dashed #f97316; border-radius: 14px; padding: 20px; text-align: center; margin: 24px 0; }
          .code { font-family: 'Courier New', monospace; font-size: 34px; font-weight: 900; letter-spacing: 10px; color: #f59e0b; margin: 0; }
          .info-text { font-size: 12px; color: #64748b; line-height: 1.6; }
          .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #1e293b; font-size: 11px; color: #475569; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo-badge">
            🔥 Startup<span class="accent">Baazi</span>
          </div>
          <div class="title">Password Reset Verification</div>
          <div class="subtitle">
            Hello <strong>${userName}</strong>,<br>
            We received a request to reset the password for your StartupBaazi account (<strong>${toEmail}</strong>).
          </div>

          <div class="code-box">
            <p style="font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 700; margin-bottom: 8px; letter-spacing: 1px;">Your 6-Digit Verification Code</p>
            <div class="code">${resetCode}</div>
          </div>

          <p class="info-text">
            ⏰ <strong>This code is valid for 1 hour.</strong> Enter this code on the password reset page to choose your new password.
          </p>
          <p class="info-text">
            🛡️ <strong>Did not request this?</strong> If you didn't initiate this request, your account is still secure. You can safely ignore this email.
          </p>

          <div class="footer">
            &copy; ${new Date().getFullYear()} StartupBaazi Technologies &bull; India's Premier Startup Visibility Platform
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `Hello ${userName},\n\nYour StartupBaazi password reset verification code is: ${resetCode}\n\nThis code expires in 1 hour.\nIf you did not request a password reset, please ignore this email.\n\nStartupBaazi Team`;

    if (!transporter) {
      console.log(`\n======================================================`);
      console.log(`📧 [StartupBaazi Email Service] (SMTP not configured in environment)`);
      console.log(`   Recipient: ${toEmail}`);
      console.log(`   Verification Code: ${resetCode}`);
      console.log(`   To send via real Gmail / Resend / SendGrid SMTP, add:`);
      console.log(`   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in environment.`);
      console.log(`======================================================\n`);
      return { sent: false, reason: 'SMTP credentials not configured in environment' };
    }

    try {
      await transporter.sendMail({
        from: config.smtpFrom,
        to: toEmail,
        subject,
        text: textContent,
        html: htmlContent,
      });

      console.log(`✅ [StartupBaazi Email Service] Verification code email delivered to ${toEmail}`);
      return { sent: true };
    } catch (err: any) {
      console.error(`❌ [StartupBaazi Email Service] Failed to send email to ${toEmail}:`, err.message);
      return { sent: false, reason: err.message };
    }
  }
}
