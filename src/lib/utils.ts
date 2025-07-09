// lib/utils.ts - Утилиты для работы с приглашениями
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import {supabase} from "./supabase.ts";

export function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function sendInvitationEmail({
  email,
  token,
  inviterName,
  role,
  officeName,
  expiresAt
}: {
  email: string;
  token: string;
  inviterName: string;
  role: string;
  officeName?: string;
  expiresAt: Date;
}) {
  const transporter = nodemailer.createTransporter({
    // Настройки вашего SMTP сервера
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const invitationUrl = `${process.env.FRONTEND_URL}/invitation/${token}`;

  const roleNames = {
    admin: 'Администратор',
    office_admin: 'Администратор офиса',
    lawyer: 'Юрист',
    client: 'Клиент'
  };

  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@legalflow.com',
    to: email,
    subject: 'Приглашение в LegalFlow',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">LegalFlow</h1>
          <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Система управления юридическими делами</p>
        </div>
        
        <div style="padding: 30px; background: white;">
          <h2 style="color: #333; margin-bottom: 20px;">Вас пригласили присоединиться!</h2>
          
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            <strong>${inviterName}</strong> приглашает вас присоединиться к LegalFlow в качестве 
            <strong>${roleNames[role] || role}</strong>${officeName ? ` в офисе "${officeName}"` : ''}.
          </p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h3 style="margin: 0 0 10px 0; color: #333;">Детали приглашения:</h3>
            <p style="margin: 5px 0; color: #666;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 5px 0; color: #666;"><strong>Роль:</strong> ${roleNames[role] || role}</p>
            ${officeName ? `<p style="margin: 5px 0; color: #666;"><strong>Офис:</strong> ${officeName}</p>` : ''}
            <p style="margin: 5px 0; color: #666;"><strong>Срок действия:</strong> ${expiresAt.toLocaleDateString('ru-RU')}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${invitationUrl}" 
               style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Принять приглашение
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Если кнопка не работает, скопируйте и вставьте эту ссылку в браузер:
            <br>
            <a href="${invitationUrl}" style="color: #667eea; word-break: break-all;">${invitationUrl}</a>
          </p>
          
          <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              Это приглашение действительно до ${expiresAt.toLocaleDateString('ru-RU')}. 
              Если вы не ожидали этого приглашения, просто проигнорируйте это письмо.
            </p>
          </div>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
}

// Middleware для проверки прав доступа к приглашениям
export function checkInvitationPermissions(requiredRole?: string[]) {
  return async (req: Request, context: any, next: Function) => {
    const authHeader = req.headers.get('authorization');

    if (!authHeader) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, office_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Проверяем права
    if (requiredRole && !requiredRole.includes(userData.role)) {
      return Response.json({
        error: 'Insufficient permissions'
      }, { status: 403 });
    }

    // Добавляем данные пользователя в контекст
    context.user = { ...userData, id: user.id };

    return next();
  };
}