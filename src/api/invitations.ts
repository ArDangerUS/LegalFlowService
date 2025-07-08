// api/invitations.ts - API обработчики для приглашений

import { supabase } from '../lib/supabase';
import { generateInvitationToken, sendInvitationEmail } from '../lib/utils';

// Создание приглашения
export async function createInvitation(req: Request) {
  try {
    const { email, role, officeId } = await req.json();
    const authHeader = req.headers.get('authorization');

    if (!authHeader) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Получаем текущего пользователя
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Получаем данные пользователя из базы
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, role, office_id, name')
      .eq('id', user.id)
      .single();

    if (userError || !currentUser) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Проверяем права на создание приглашения
    if (currentUser.role === 'lawyer' || currentUser.role === 'client') {
      return Response.json({
        error: 'Insufficient permissions'
      }, { status: 403 });
    }

    // Админ офиса может приглашать только в свой офис
    if (currentUser.role === 'office_admin') {
      if (!currentUser.office_id || officeId !== currentUser.office_id) {
        return Response.json({
          error: 'Office admin can only invite to their own office'
        }, { status: 403 });
      }

      // Админ офиса не может создавать системных админов
      if (role === 'admin') {
        return Response.json({
          error: 'Office admin cannot create system administrators'
        }, { status: 403 });
      }
    }

    // Проверяем, нет ли уже пользователя с таким email
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return Response.json({
        error: 'User with this email already exists'
      }, { status: 400 });
    }

    // Проверяем, нет ли активного приглашения
    const { data: existingInvitation } = await supabase
      .from('invitations')
      .select('id')
      .eq('email', email)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (existingInvitation) {
      return Response.json({
        error: 'Active invitation already exists for this email'
      }, { status: 400 });
    }

    // Генерируем токен приглашения
    const token = generateInvitationToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 дней

    // Создаем приглашение
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .insert({
        email,
        role,
        office_id: officeId,
        invited_by: currentUser.id,
        token,
        expires_at: expiresAt.toISOString()
      })
      .select(`
        *,
        office:offices(name),
        inviter:users!invited_by(name)
      `)
      .single();

    if (invitationError) {
      console.error('Invitation creation error:', invitationError);
      return Response.json({
        error: 'Failed to create invitation'
      }, { status: 500 });
    }

    // Отправляем email с приглашением
    try {
      await sendInvitationEmail({
        email,
        token,
        inviterName: currentUser.name,
        role,
        officeName: invitation.office?.name,
        expiresAt
      });
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // Не удаляем приглашение, просто логируем ошибку
    }

    return Response.json({
      id: invitation.id,
      message: 'Invitation created successfully'
    });

  } catch (error) {
    console.error('Create invitation error:', error);
    return Response.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// Получение списка приглашений
export async function getInvitations(req: Request) {
  try {
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

    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, role, office_id')
      .eq('id', user.id)
      .single();

    if (userError || !currentUser) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Юристы не могут видеть приглашения
    if (currentUser.role === 'lawyer' || currentUser.role === 'client') {
      return Response.json([]);
    }

    let query = supabase
      .from('invitations')
      .select(`
        id,
        email,
        role,
        office_id,
        expires_at,
        created_at,
        office:offices(name),
        inviter:users!invited_by(name)
      `)
      .order('created_at', { ascending: false });

    // Админ офиса видит только приглашения своего офиса
    if (currentUser.role === 'office_admin') {
      query = query.eq('office_id', currentUser.office_id);
    }

    const { data: invitations, error } = await query;

    if (error) {
      console.error('Get invitations error:', error);
      return Response.json({
        error: 'Failed to fetch invitations'
      }, { status: 500 });
    }

    // Форматируем данные для фронтенда
    const formattedInvitations = invitations.map(inv => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      officeId: inv.office_id,
      officeName: inv.office?.name,
      inviterName: inv.inviter?.name,
      expiresAt: inv.expires_at,
      createdAt: inv.created_at
    }));

    return Response.json(formattedInvitations);

  } catch (error) {
    console.error('Get invitations error:', error);
    return Response.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// Повторная отправка приглашения
export async function resendInvitation(req: Request, { params }: { params: { id: string } }) {
  try {
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

    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, role, office_id, name')
      .eq('id', user.id)
      .single();

    if (userError || !currentUser) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Получаем приглашение
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .select(`
        *,
        office:offices(name)
      `)
      .eq('id', params.id)
      .single();

    if (invitationError || !invitation) {
      return Response.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // Проверяем права
    if (currentUser.role === 'office_admin' &&
        invitation.office_id !== currentUser.office_id) {
      return Response.json({
        error: 'Insufficient permissions'
      }, { status: 403 });
    }

    // Генерируем новый токен и продлеваем срок
    const newToken = generateInvitationToken();
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Обновляем приглашение
    const { error: updateError } = await supabase
      .from('invitations')
      .update({
        token: newToken,
        expires_at: newExpiresAt.toISOString()
      })
      .eq('id', params.id);

    if (updateError) {
      console.error('Update invitation error:', updateError);
      return Response.json({
        error: 'Failed to update invitation'
      }, { status: 500 });
    }

    // Отправляем новое приглашение
    try {
      await sendInvitationEmail({
        email: invitation.email,
        token: newToken,
        inviterName: currentUser.name,
        role: invitation.role,
        officeName: invitation.office?.name,
        expiresAt: newExpiresAt
      });
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      return Response.json({
        error: 'Failed to send invitation email'
      }, { status: 500 });
    }

    return Response.json({ message: 'Invitation resent successfully' });

  } catch (error) {
    console.error('Resend invitation error:', error);
    return Response.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// Удаление приглашения
export async function deleteInvitation(req: Request, { params }: { params: { id: string } }) {
  try {
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

    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, role, office_id')
      .eq('id', user.id)
      .single();

    if (userError || !currentUser) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Получаем приглашение для проверки прав
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .select('office_id')
      .eq('id', params.id)
      .single();

    if (invitationError || !invitation) {
      return Response.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // Проверяем права
    if (currentUser.role === 'office_admin' &&
        invitation.office_id !== currentUser.office_id) {
      return Response.json({
        error: 'Insufficient permissions'
      }, { status: 403 });
    }

    // Удаляем приглашение
    const { error: deleteError } = await supabase
      .from('invitations')
      .delete()
      .eq('id', params.id);

    if (deleteError) {
      console.error('Delete invitation error:', deleteError);
      return Response.json({
        error: 'Failed to delete invitation'
      }, { status: 500 });
    }

    return Response.json({ message: 'Invitation deleted successfully' });

  } catch (error) {
    console.error('Delete invitation error:', error);
    return Response.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// Принятие приглашения и регистрация пользователя
export async function acceptInvitation(req: Request, { params }: { params: { token: string } }) {
  try {
    const { name, password } = await req.json();

    if (!name || !password) {
      return Response.json({
        error: 'Name and password are required'
      }, { status: 400 });
    }

    // Находим приглашение по токену
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', params.token)
      .single();

    if (invitationError || !invitation) {
      return Response.json({
        error: 'Invalid or expired invitation'
      }, { status: 404 });
    }

    // Проверяем срок действия
    if (new Date(invitation.expires_at) < new Date()) {
      return Response.json({
        error: 'Invitation has expired'
      }, { status: 400 });
    }

    // Проверяем, не зарегистрирован ли уже пользователь
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', invitation.email)
      .single();

    if (existingUser) {
      return Response.json({
        error: 'User already registered'
      }, { status: 400 });
    }

    // Создаем пользователя в Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: invitation.email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role: invitation.role,
        office_id: invitation.office_id
      }
    });

    if (authError) {
      console.error('Auth user creation error:', authError);
      return Response.json({
        error: 'Failed to create user account'
      }, { status: 500 });
    }

    // Создаем запись в таблице users
    const { error: userInsertError } = await supabase
      .from('users')
      .insert({
        id: authUser.user.id,
        name,
        email: invitation.email,
        role: invitation.role,
        office_id: invitation.office_id,
        is_active: true
      });

    if (userInsertError) {
      console.error('User insert error:', userInsertError);
      // Удаляем пользователя из Auth если не удалось создать в users
      await supabase.auth.admin.deleteUser(authUser.user.id);
      return Response.json({
        error: 'Failed to create user profile'
      }, { status: 500 });
    }

    // Удаляем использованное приглашение
    await supabase
      .from('invitations')
      .delete()
      .eq('id', invitation.id);

    // Создаем сессию для пользователя
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: invitation.email,
      options: {
        redirectTo: `${process.env.FRONTEND_URL}/dashboard`
      }
    });

    if (sessionError) {
      console.error('Session creation error:', sessionError);
    }

    return Response.json({
      message: 'User registered successfully',
      userId: authUser.user.id,
      loginUrl: sessionData?.properties?.action_link
    });

  } catch (error) {
    console.error('Accept invitation error:', error);
    return Response.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// Получение информации о приглашении по токену (для страницы регистрации)
export async function getInvitationByToken(req: Request, { params }: { params: { token: string } }) {
  try {
    const { data: invitation, error } = await supabase
      .from('invitations')
      .select(`
        id,
        email,
        role,
        expires_at,
        office:offices(name),
        inviter:users!invited_by(name)
      `)
      .eq('token', params.token)
      .single();

    if (error || !invitation) {
      return Response.json({
        error: 'Invalid invitation token'
      }, { status: 404 });
    }

    // Проверяем срок действия
    if (new Date(invitation.expires_at) < new Date()) {
      return Response.json({
        error: 'Invitation has expired'
      }, { status: 400 });
    }

    // Проверяем, не зарегистрирован ли уже пользователь
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', invitation.email)
      .single();

    if (existingUser) {
      return Response.json({
        error: 'User already registered'
      }, { status: 400 });
    }

    return Response.json({
      email: invitation.email,
      role: invitation.role,
      officeName: invitation.office?.name,
      inviterName: invitation.inviter?.name,
      expiresAt: invitation.expires_at
    });

  } catch (error) {
    console.error('Get invitation by token error:', error);
    return Response.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// lib/utils.ts - Утилиты для работы с приглашениями
import crypto from 'crypto';
import nodemailer from 'nodemailer';

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