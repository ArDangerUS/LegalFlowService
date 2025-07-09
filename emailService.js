// emailService.js - Сервис для отправки email

import nodemailer from 'nodemailer';

class EmailService {
  constructor() {
    this.transporter = null;
  }

  setupTransporter() {
    console.log('🔧 Setting up email transporter...');

    const emailConfig = {
      service: process.env.EMAIL_SERVICE || 'gmail',
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false, // true для 465, false для других портов
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // App Password для Gmail
      }
    };

    console.log('📧 Email config check:');
    console.log('- EMAIL_SERVICE:', process.env.EMAIL_SERVICE || 'not set (using gmail)');
    console.log('- EMAIL_HOST:', process.env.EMAIL_HOST || 'not set (using smtp.gmail.com)');
    console.log('- EMAIL_PORT:', process.env.EMAIL_PORT || 'not set (using 587)');
    console.log('- EMAIL_USER:', process.env.EMAIL_USER ? '✅ set' : '❌ not set');
    console.log('- EMAIL_PASS:', process.env.EMAIL_PASS ? '✅ set' : '❌ not set');

    if (!emailConfig.auth.user || !emailConfig.auth.pass) {
      console.log('❌ Email not configured - using simulation mode');
      console.log('To enable real email:');
      console.log('1. Set EMAIL_USER and EMAIL_PASS in .env');
      console.log('2. For Gmail: use App Password (not regular password)');
      console.log('3. Restart the server after updating .env');
      return;
    }

    console.log('🚀 Creating email transporter with Gmail...');
    this.transporter = nodemailer.createTransport(emailConfig);

    // Проверяем подключение
    this.transporter.verify((error, success) => {
      if (error) {
        console.error('❌ Email configuration error:', error.message);
        console.log('💡 Common Gmail issues:');
        console.log('- Make sure you use App Password, not regular password');
        console.log('- Enable 2FA in Google Account first');
        console.log('- Check that EMAIL_USER is your full Gmail address');
        this.transporter = null;
      } else {
        console.log('✅ Email service ready - real emails will be sent!');
      }
    });
  }

  generateInvitationHTML(invitationData) {
    const { email, role, officeName, token, expiresAt, inviterName } = invitationData;
    const registrationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invite/${token}`;
    const expirationDate = new Date(expiresAt).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const roleNames = {
      admin: 'Администратор',
      office_admin: 'Администратор офиса',
      lawyer: 'Юрист',
      client: 'Клиент'
    };

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Приглашение в LegalFlow</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .info-box { background: #e3f2fd; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🏛️ LegalFlow</h1>
                <p>Система управления юридическими делами</p>
            </div>
            
            <div class="content">
                <h2>Приглашение к регистрации</h2>
                
                <p>Здравствуйте!</p>
                
                <p>Вас пригласили присоединиться к системе LegalFlow в качестве <strong>${roleNames[role] || role}</strong>.</p>
                
                <div class="info-box">
                    <h3>📋 Детали приглашения:</h3>
                    <ul>
                        <li><strong>Email:</strong> ${email}</li>
                        <li><strong>Роль:</strong> ${roleNames[role] || role}</li>
                        ${officeName ? `<li><strong>Офис:</strong> ${officeName}</li>` : ''}
                        ${inviterName ? `<li><strong>Пригласил:</strong> ${inviterName}</li>` : ''}
                        <li><strong>Действительно до:</strong> ${expirationDate}</li>
                    </ul>
                </div>
                
                <p>Чтобы завершить регистрацию, нажмите на кнопку ниже:</p>
                
                <div style="text-align: center;">
                    <a href="${registrationLink}" class="button">Завершить регистрацию</a>
                </div>
                
                <div class="warning">
                    <strong>⚠️ Важно:</strong>
                    <ul>
                        <li>Ссылка действительна в течение 7 дней</li>
                        <li>После регистрации ссылка станет недоступной</li>
                        <li>Если вы не запрашивали это приглашение, просто проигнорируйте письмо</li>
                    </ul>
                </div>
                
                <p>Если кнопка не работает, скопируйте и вставьте эту ссылку в браузер:</p>
                <p style="word-break: break-all; background: #f0f0f0; padding: 10px; border-radius: 3px;">
                    ${registrationLink}
                </p>
            </div>
            
            <div class="footer">
                <p>С уважением,<br>Команда LegalFlow</p>
                <p style="font-size: 12px; color: #999;">
                    Это автоматическое письмо, не отвечайте на него.
                </p>
            </div>
        </div>
    </body>
    </html>`;
  }

  async sendInvitation(invitationData) {
  // Настраиваем транспортер при первом использовании
  if (this.transporter === null) {
    this.setupTransporter();
  }

  const { email, role, officeName, token, expiresAt, inviterName } = invitationData;

    // Если транспортер не настроен, используем симуляцию
    if (!this.transporter) {
      console.log(`📧 EMAIL SIMULATION: Отправлено приглашение на ${email}`);
      console.log(`🔗 Registration link: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/invite/${token}`);
      return { success: true, simulation: true };
    }

    const roleNames = {
      admin: 'Администратор',
      office_admin: 'Администратор офиса',
      lawyer: 'Юрист',
      client: 'Клиент'
    };

    const mailOptions = {
      from: {
        name: 'LegalFlow System',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: `Приглашение в LegalFlow - ${roleNames[role] || role}`,
      html: this.generateInvitationHTML(invitationData),
      text: `
        Приглашение в LegalFlow
        
        Вас пригласили присоединиться к системе LegalFlow в качестве ${roleNames[role] || role}.
        
        Для завершения регистрации перейдите по ссылке:
        ${process.env.FRONTEND_URL || 'http://localhost:5173'}/invite/${token}
        
        Ссылка действительна до: ${new Date(expiresAt).toLocaleString('ru-RU')}
        
        С уважением,
        Команда LegalFlow
      `
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Email sending failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async sendPasswordReset(email, resetToken) {
    // Для будущего использования
    console.log(`📧 Password reset simulation for ${email}`);
  }

  async sendNotification(email, subject, message) {
    // Для будущего использования
    console.log(`📧 Notification simulation for ${email}: ${subject}`);
  }
}

export default new EmailService();