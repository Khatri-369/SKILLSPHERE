import nodemailer from 'nodemailer';
import config from '../config/index.js';
import fs from 'fs';

export const sendEmail = async ({ email, subject, html }) => {
  try {
    // 1. Check if SMTP configuration has username and password
    const hasSmtpCreds = config.smtp.user && config.smtp.pass;

    if (!hasSmtpCreds) {
      // Extract token or 2FA code using regex to write to last-email-token.txt for testing
      const tokenMatch = html.match(/token=([a-f0-9]+)/) || html.match(/(?:code|otp) is:?\s*<b>(\d{6})<\/b>/i);
      if (tokenMatch && tokenMatch[1]) {
        try {
          if (!fs.existsSync('logs')) {
            fs.mkdirSync('logs');
          }
          fs.writeFileSync('logs/last-email-token.txt', tokenMatch[1]);
        } catch (err) {
          console.error('Failed to write email token/code to log file: ', err);
        }
      }

      // Direct console logging in development for easy debugging and testing
      console.log('\n==================================================');
      console.log(`✉️  [MOCK EMAIL SENT TO: ${email}]`);
      console.log(`Subject: ${subject}`);
      console.log(`Body:\n${html.replace(/<[^>]*>/g, '')}`); // Strip HTML for console read
      console.log('==================================================\n');
      return { message: 'Mock email logged to console successfully' };
    }

    // 2. Configure NodeMailer Transporter
    const transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });

    // 3. Define message options
    const mailOptions = {
      from: `"SkillSphere" <${config.smtp.fromEmail}>`,
      to: email,
      subject: subject,
      html: html,
    };

    // 4. Dispatch Email
    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ Email successfully dispatched to ${email}. MessageId: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('Email dispatch failed: ', error);
    throw new Error(`Email dispatch failed: ${error.message}`);
  }
};
