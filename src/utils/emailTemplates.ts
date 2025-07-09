export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export function getInvitationEmailTemplate({
  email,
  inviterName,
  role,
  officeName,
  invitationUrl,
  expiresAt
}: {
  email: string;
  inviterName: string;
  role: string;
  officeName?: string;
  invitationUrl: string;
  expiresAt: Date;
}): EmailTemplate {
  const roleNames = {
    admin: 'Администратор системы',
    office_admin: 'Администратор офиса',
    lawyer: 'Юрист',
    client: 'Клиент'
  };

  const roleName = roleNames[role as keyof typeof roleNames] || role;
  const formattedDate = expiresAt.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const subject = `Приглашение в LegalFlow - ${roleName}`;

  const html = `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Приглашение в LegalFlow</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 32px; font-weight: bold;">LegalFlow</h1>
                  <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Система управления юридическими делами</p>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="color: #333; margin: 0 0 20px 0; font-size: 24px;">Вас пригласили присоединиться!</h2>
                  
                  <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                    <strong>${inviterName}</strong> приглашает вас присоединиться к LegalFlow в качестве 
                    <strong style="color: #667eea;">${roleName}</strong>${officeName ? ` в офисе "<strong>${officeName}</strong>"` : ''}.
                  </p>
                  
                  <!-- Invitation Details -->
                  <table width="100%" cellpadding="15" cellspacing="0" style="background: #f8f9fa; border-radius: 8px; margin: 25px 0;">
                    <tr>
                      <td>
                        <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">Детали приглашения:</h3>
                        <table width="100%" cellpadding="5" cellspacing="0">
                          <tr>
                            <td style="color: #666; font-weight: 600; width: 120px;">Email:</td>
                            <td style="color: #333;">${email}</td>
                          </tr>
                          <tr>
                            <td style="color: #666; font-weight: 600;">Роль:</td>
                            <td style="color: #333;">${roleName}</td>
                          </tr>
                          ${officeName ? `
                          <tr>
                            <td style="color: #666; font-weight: 600;">Офис:</td>
                            <td style="color: #333;">${officeName}</td>
                          </tr>
                          ` : ''}
                          <tr>
                            <td style="color: #666; font-weight: 600;">Действует до:</td>
                            <td style="color: #333;">${formattedDate}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- CTA Button -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                    <tr>
                      <td align="center">
                        <a href="${invitationUrl}" 
                           style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                  color: white; 
                                  padding: 15px 40px; 
                                  text-decoration: none; 
                                  border-radius: 6px; 
                                  font-weight: bold; 
                                  font-size: 16px;
                                  display: inline-block;
                                  box-shadow: 0 3px 6px rgba(102, 126, 234, 0.3);">
                          Принять приглашение
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Alternative Link -->
                  <p style="color: #666; font-size: 14px; margin-top: 25px; padding-top: 20px; border-top: 1px solid #eee;">
                    Если кнопка не работает, скопируйте и вставьте эту ссылку в браузер:
                    <br>
                    <a href="${invitationUrl}" style="color: #667eea; word-break: break-all; text-decoration: none;">${invitationUrl}</a>
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background: #f8f9fa; padding: 20px 30px; border-top: 1px solid #eee;">
                  <p style="color: #999; font-size: 12px; margin: 0; text-align: center;">
                    Это приглашение действительно до ${formattedDate}.<br>
                    Если вы не ожидали этого приглашения, просто проигнорируйте это письмо.
                  </p>
                  <p style="color: #999; font-size: 12px; margin: 10px 0 0 0; text-align: center;">
                    © 2024 LegalFlow. Все права защищены.
                  </p>
                </td>
              </tr>
              
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const text = `
Приглашение в LegalFlow

${inviterName} приглашает вас присоединиться к LegalFlow в качестве ${roleName}${officeName ? ` в офисе "${officeName}"` : ''}.

Детали приглашения:
- Email: ${email}
- Роль: ${roleName}
${officeName ? `- Офис: ${officeName}` : ''}
- Действует до: ${formattedDate}

Для принятия приглашения перейдите по ссылке:
${invitationUrl}

Если вы не ожидали этого приглашения, просто проигнорируйте это письмо.

© 2024 LegalFlow
  `;

  return { subject, html, text };
}