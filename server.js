// server.js - Обновленный сервер с реальной интеграцией Supabase

import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

// Загружаем переменные окружения ПЕРВЫМ ДЕЛОМ
import { config } from 'dotenv';
const result = config();

console.log('📁 Loading .env file...');
if (result.error) {
  console.error('❌ Error loading .env file:', result.error.message);
  console.log('💡 Make sure .env file exists in the same directory as server.js');
} else {
  console.log('✅ .env file loaded successfully');
  console.log('📋 Found variables:', Object.keys(result.parsed || {}).join(', '));
}

// ВАЖНО: Импортируем EmailService ПОСЛЕ загрузки .env
import emailService from './emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Инициализация Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ CRITICAL ERROR: Supabase configuration missing!');
  console.error('Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('✅ Supabase initialized successfully');
console.log('🔍 Environment check:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- PORT:', process.env.PORT);
console.log('- FRONTEND_URL:', process.env.FRONTEND_URL);
console.log('- EMAIL_USER:', process.env.EMAIL_USER ? '✅ configured' : '❌ not set');
console.log('- EMAIL_PASS:', process.env.EMAIL_PASS ? '✅ configured' : '❌ not set');

// CORS конфигурация
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:4173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware для логирования API запросов
app.use('/api', (req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log('Headers:', req.headers.authorization ? 'Authorization present' : 'No authorization');
  next();
});


const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Webhook endpoint для Telegram (ВАЖНО: до static files)
app.post('/webhook', async (req, res) => {
  try {
    const update = req.body;
    console.log('📨 Telegram webhook update:', JSON.stringify(update, null, 2));

    if (update.message) {
      await handleTelegramMessage(update.message);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(200).send('OK');
  }
});

// Установка webhook (ВАЖНО: до static files)
app.get('/setup-webhook', async (req, res) => {
  if (!TELEGRAM_BOT_TOKEN) {
    return res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN not set' });
  }

  try {
    const webhookUrl = `${req.protocol}://${req.get('host')}/webhook`;

    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        drop_pending_updates: true
      })
    });

    const data = await response.json();

    if (data.ok) {
      res.json({
        success: true,
        webhook_url: webhookUrl,
        message: 'Webhook установлен успешно!',
        telegram_response: data
      });
    } else {
      res.status(400).json({
        success: false,
        error: data.description
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Простая обработка сообщений
async function handleTelegramMessage(message) {
  const chatId = message.chat.id;
  const text = message.text || '';
  const senderName = message.from.first_name + (message.from.username ? ` (@${message.from.username})` : '');

  console.log(`📨 Message from ${senderName}: ${text}`);

  try {
    // Получаем или создаем conversation
    let conversationId;
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id')
      .eq('telegram_chat_identifier', chatId.toString())
      .single();

    if (existingConv) {
      conversationId = existingConv.id;
    } else {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({
          name: message.chat.first_name || `Chat ${chatId}`,
          telegram_chat_identifier: chatId.toString()
        })
        .select('id')
        .single();

      conversationId = newConv.id;
    }

    // Сохраняем сообщение
    await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        content: text,
        sender_name: senderName,
        message_type: 'received',
        telegram_message_id: message.message_id
      });

    console.log('💾 Message saved to database');

    // Автоответ
    if (text.toLowerCase().includes('привет') || text.startsWith('/start')) {
      await sendTelegramMessage(chatId, 'Привет! Спасибо за сообщение. Наша команда ответит вам в ближайшее время.');
    } else {
      await sendTelegramMessage(chatId, 'Спасибо за ваше сообщение! Мы рассмотрим его и ответим в ближайшее время.');
    }

  } catch (dbError) {
    console.error('❌ Database error:', dbError);
  }
}

// Отправка сообщения в Telegram
async function sendTelegramMessage(chatId, text) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN not set');
    return;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text
      })
    });

    const data = await response.json();

    if (data.ok) {
      console.log('✅ Auto-reply sent');

      // Сохраняем отправленное сообщение
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('telegram_chat_identifier', chatId.toString())
        .single();

      if (conversation) {
        await supabase
          .from('messages')
          .insert({
            conversation_id: conversation.id,
            content: text,
            sender_name: 'LegalFlow Bot',
            message_type: 'sent',
            telegram_message_id: data.result.message_id
          });
      }
    } else {
      console.error('❌ Telegram API error:', data.description);
    }
  } catch (error) {
    console.error('❌ Error sending message:', error);
  }
}

// Middleware для проверки авторизации
async function verifyAuth(req, res, next) {
  try {
    console.log('🔐 Verifying authentication...');
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      console.log('❌ No authorization header');
      return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('🎫 Token received (first 20 chars):', token.substring(0, 20) + '...');

    // Проверяем токен через Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) {
      console.log('❌ Token verification failed:', error.message);
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }

    if (!user) {
      console.log('❌ No user found for token');
      return res.status(401).json({ error: 'Unauthorized - No user found' });
    }

    console.log('👤 Auth user found:', { id: user.id, email: user.email });

    // Получаем полную информацию о пользователе из таблицы users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.log('❌ Database user lookup failed:', userError.message);

      // Если пользователь есть в auth, но нет в users таблице, создаем запись
      if (userError.code === 'PGRST116') {
        console.log('🆕 Creating user record in database...');

        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'Unknown',
            email: user.email,
            role: user.user_metadata?.role || 'lawyer',
            office_id: user.user_metadata?.office_id || null,
            is_active: true
          })
          .select()
          .single();

        if (createError) {
          console.log('❌ Failed to create user record:', createError.message);
          return res.status(500).json({
            error: 'Failed to create user record',
            details: createError.message
          });
        }

        console.log('✅ User record created:', newUser);
        req.user = newUser;
        return next();
      }

      return res.status(401).json({
        error: 'User not found in database',
        details: userError.message
      });
    }

    if (!userData) {
      console.log('❌ No user data found');
      return res.status(401).json({ error: 'User data not found' });
    }

    // Проверяем, активен ли пользователь
    if (!userData.is_active) {
      console.log('❌ User is not active');
      return res.status(401).json({ error: 'User account is disabled' });
    }

    console.log('✅ Database user found:', {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      office_id: userData.office_id
    });

    // Обновляем last_login (необязательно, но полезно)
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', userData.id);

    req.user = userData;
    next();
  } catch (error) {
    console.error('💥 Auth verification error:', error);
    res.status(401).json({
      error: 'Authentication failed',
      details: error.message
    });
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: port,
    supabase: {
      url: supabaseUrl ? 'configured' : 'not configured',
      connected: !!supabase
    }
  });
});

// Добавить после существующих API роутов (например, после /api/health)
app.get('/api/external/httpbin-status', async (req, res) => {
  try {
    const response = await fetch('https://httpbin.org/status/200');
    const status = response.status;
    const statusText = response.statusText;

    res.json({
      status,
      statusText,
      success: response.ok,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      success: false
    });
  }
});

// API маршруты для офисов
app.get('/api/offices', verifyAuth, async (req, res) => {
  try {
    console.log('🏢 Loading offices from Supabase...');
    console.log('User role:', req.user.role);

    let query = supabase
      .from('offices')
      .select('id, name, address, city, phone, email, created_at');

    // Если пользователь не админ, показываем только его офис
    if (req.user.role !== 'admin' && req.user.office_id) {
      query = query.eq('id', req.user.office_id);
    }

    const { data: offices, error } = await query.order('name');

    if (error) {
      console.error('Supabase offices error:', error);
      return res.status(500).json({ error: 'Failed to load offices from database' });
    }

    console.log(`✅ Loaded ${offices?.length || 0} offices from Supabase`);
    res.json(offices || []);
  } catch (error) {
    console.error('Get offices error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/offices', verifyAuth, async (req, res) => {
  try {
    const { name, address, city, phone, email } = req.body;

    // Проверяем права доступа
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create offices' });
    }

    if (!name || !city) {
      return res.status(400).json({ error: 'Name and city are required' });
    }

    console.log('🏢 Creating office in Supabase:', { name, city });

    const { data: office, error } = await supabase
      .from('offices')
      .insert({
        name: name.trim(),
        address: address?.trim() || null,
        city: city.trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase create office error:', error);
      return res.status(500).json({ error: 'Failed to create office in database' });
    }

    console.log('✅ Office created in Supabase:', office);
    res.status(201).json(office);
  } catch (error) {
    console.error('Create office error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE офис - ИСПРАВЛЕННАЯ ВЕРСИЯ
app.delete('/api/offices/:id', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ DELETE /api/offices/:id called with id:', id);
    console.log('📋 User info:', {
      id: req.user?.id,
      role: req.user?.role,
      email: req.user?.email
    });

    // Проверяем права доступа - только админы могут удалять офисы
    if (req.user?.role !== 'admin') {
      console.log('❌ Access denied: user role is', req.user?.role);
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only administrators can delete offices'
      });
    }

    // Проверяем, что ID валидный
    if (!id || id.length < 10) {
      console.log('❌ Invalid office ID:', id);
      return res.status(400).json({
        error: 'Invalid office ID'
      });
    }

    // Проверяем, существует ли офис
    console.log('🔍 Checking if office exists...');
    const { data: existingOffice, error: checkError } = await supabase
      .from('offices')
      .select('id, name')
      .eq('id', id)
      .single();

    if (checkError) {
      console.log('❌ Error checking office existence:', checkError);
      if (checkError.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Office not found',
          message: `Office with ID ${id} does not exist`
        });
      }
      return res.status(500).json({
        error: 'Database error',
        details: checkError.message
      });
    }

    if (!existingOffice) {
      console.log('❌ Office not found in database:', id);
      return res.status(404).json({
        error: 'Office not found'
      });
    }

    console.log('✅ Found office to delete:', existingOffice.name);

    // Транзакция для безопасного удаления
    console.log('🔄 Starting deletion transaction...');

    // Шаг 1: Отвязываем всех пользователей от офиса
    console.log('👥 Step 1: Unbinding users from office...');
    const { error: unbindUsersError, count: unbindUsersCount } = await supabase
      .from('users')
      .update({ office_id: null })
      .eq('office_id', id)
      .select('id', { count: 'exact', head: true });

    if (unbindUsersError) {
      console.error('❌ Error unbinding users:', unbindUsersError);
      return res.status(500).json({
        error: 'Failed to unbind users from office',
        details: unbindUsersError.message
      });
    }

    console.log(`✅ Unbound ${unbindUsersCount || 0} users from office`);

    // Шаг 2: Удаляем компании, связанные с офисом
    console.log('🏢 Step 2: Deleting companies associated with office...');
    const { error: deleteCompaniesError, count: deleteCompaniesCount } = await supabase
      .from('companies')
      .delete()
      .eq('office_id', id)
      .select('id', { count: 'exact', head: true });

    if (deleteCompaniesError) {
      console.error('❌ Error deleting companies:', deleteCompaniesError);
      return res.status(500).json({
        error: 'Failed to delete companies associated with office',
        details: deleteCompaniesError.message
      });
    }

    console.log(`✅ Deleted ${deleteCompaniesCount || 0} companies from office`);

    // Шаг 3: Отвязываем дела от офиса (если есть)
    console.log('📋 Step 3: Unbinding cases from office...');
    const { error: unbindCasesError, count: unbindCasesCount } = await supabase
      .from('cases')
      .update({ office_id: null })
      .eq('office_id', id)
      .select('id', { count: 'exact', head: true });

    if (unbindCasesError) {
      console.error('⚠️ Warning: Error unbinding cases:', unbindCasesError);
      // Не останавливаемся на этой ошибке, так как таблица может не существовать
    } else {
      console.log(`✅ Unbound ${unbindCasesCount || 0} cases from office`);
    }

    // Шаг 4: Отвязываем сообщения от офиса (если есть)
    console.log('💬 Step 4: Unbinding messages from office...');
    const { error: unbindMessagesError, count: unbindMessagesCount } = await supabase
      .from('telegram_messages')
      .update({ office_id: null })
      .eq('office_id', id)
      .select('id', { count: 'exact', head: true });

    if (unbindMessagesError) {
      console.error('⚠️ Warning: Error unbinding messages:', unbindMessagesError);
      // Не останавливаемся на этой ошибке
    } else {
      console.log(`✅ Unbound ${unbindMessagesCount || 0} messages from office`);
    }

    // Шаг 5: Удаляем приглашения для этого офиса
    console.log('📧 Step 5: Deleting invitations for office...');
    const { error: deleteInvitationsError, count: deleteInvitationsCount } = await supabase
      .from('invitations')
      .delete()
      .eq('office_id', id)
      .select('id', { count: 'exact', head: true });

    if (deleteInvitationsError) {
      console.error('⚠️ Warning: Error deleting invitations:', deleteInvitationsError);
      // Не останавливаемся на этой ошибке, так как таблица может не существовать
    } else {
      console.log(`✅ Deleted ${deleteInvitationsCount || 0} invitations`);
    }

    // Шаг 6: Удаляем сам офис
    console.log('🏢 Step 6: Deleting office...');

    // Шаг 6: Удаляем сам офис
    console.log('🏢 Step 6: Deleting office...');
    const { error: deleteError, count: deleteCount } = await supabase
      .from('offices')
      .delete()
      .eq('id', id)
      .select('id', { count: 'exact', head: true });

    if (deleteError) {
      console.error('❌ Error deleting office:', deleteError);
      return res.status(500).json({
        error: 'Failed to delete office',
        details: deleteError.message
      });
    }


    console.log('✅ Office deleted successfully:', existingOffice.name);

    // Возвращаем успешный ответ
    res.status(200).json({
      success: true,
      message: 'Office and associated data deleted successfully',
      deletedOffice: {
        id: id,
        name: existingOffice.name
      },
      stats: {
        unboundUsers: unbindUsersCount || 0,
        deletedCompanies: deleteCompaniesCount || 0,
        unboundCases: unbindCasesCount || 0,
        unboundMessages: unbindMessagesCount || 0,
        deletedInvitations: deleteInvitationsCount || 0
      }
    });

  } catch (error) {
    console.error('💥 Unexpected error in DELETE /api/offices/:id:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// === ТАКЖЕ ДОБАВИМ GET для отладки ===
app.get('/api/offices/:id', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔍 GET /api/offices/:id called with id:', id);

    const { data: office, error } = await supabase
      .from('offices')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Office not found' });
      }
      return res.status(500).json({ error: error.message });
    }

    res.json(office);
  } catch (error) {
    console.error('Error getting office:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT (обновить) офис
app.put('/api/offices/:id', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, city, phone, email } = req.body;

    console.log('📝 Updating office:', id);
    console.log('User role:', req.user?.role);

    // Проверяем права доступа
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only administrators can update offices'
      });
    }

    // Валидация обязательных полей
    if (!name?.trim() || !city?.trim()) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Name and city are required'
      });
    }

    // Обновляем офис
    const { data: updatedOffice, error } = await supabase
      .from('offices')
      .update({
        name: name.trim(),
        address: address?.trim() || null,
        city: city.trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update office error:', error);
      return res.status(500).json({
        error: 'Failed to update office',
        details: error.message
      });
    }

    if (!updatedOffice) {
      return res.status(404).json({
        error: 'Office not found'
      });
    }

    console.log('✅ Office updated successfully');
    res.json(updatedOffice);

  } catch (error) {
    console.error('Update office error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

// API маршруты для приглашений
app.post('/api/invitations', verifyAuth, async (req, res) => {
  try {
    console.log('📨 Creating invitation in Supabase:', req.body);
    console.log('👤 User making request:', { id: req.user.id, role: req.user.role, office_id: req.user.office_id });

    const { email, role, officeId } = req.body;

    // Проверяем права доступа
    if (!['admin', 'office_admin'].includes(req.user.role)) {
      console.log('❌ Access denied: user role not allowed');
      return res.status(403).json({ error: 'Only admins and office admins can create invitations' });
    }

    if (!email || !role) {
      console.log('❌ Validation failed: missing email or role');
      return res.status(400).json({ error: 'Email and role are required' });
    }

    // Проверяем, что office_admin может приглашать только в свой офис
    let targetOfficeId = officeId;
    if (req.user.role === 'office_admin') {
      if (officeId && officeId !== req.user.office_id) {
        console.log('❌ Access denied: office_admin trying to invite to different office');
        return res.status(403).json({ error: 'Office admins can only invite to their own office' });
      }
      targetOfficeId = req.user.office_id;
    }

    console.log('🎯 Target office ID:', targetOfficeId);

    // Проверяем, нет ли уже пользователя с таким email
    console.log('🔍 Checking for existing user...');
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (userCheckError && userCheckError.code !== 'PGRST116') {
      console.error('❌ Error checking existing user:', userCheckError);
      return res.status(500).json({ error: 'Database error while checking existing user' });
    }

    if (existingUser) {
      console.log('❌ User already exists');
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    console.log('✅ No existing user found');

    // Проверяем, нет ли активного приглашения на этот email
    console.log('🔍 Checking for existing invitation...');
    const { data: existingInvitation, error: inviteCheckError } = await supabase
      .from('invitations')
      .select('id')
      .eq('email', email)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (inviteCheckError && inviteCheckError.code !== 'PGRST116') {
      console.error('❌ Error checking existing invitation:', inviteCheckError);
      return res.status(500).json({ error: 'Database error while checking existing invitation' });
    }

    if (existingInvitation) {
      console.log('❌ Active invitation already exists');
      return res.status(400).json({ error: 'Active invitation for this email already exists' });
    }

    console.log('✅ No existing invitation found');

    // Генерация токена
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 дней

    console.log('🎲 Generated token:', token);
    console.log('⏰ Expires at:', expiresAt.toISOString());

    // Сохраняем приглашение в Supabase
    console.log('💾 Inserting invitation into database...');
    const invitationData = {
      email,
      role,
      office_id: targetOfficeId || null,
      invited_by: req.user.id,
      created_by: req.user.id, // Добавляем created_by тоже
      token,
      expires_at: expiresAt.toISOString()
    };

    console.log('📋 Invitation data to insert:', invitationData);

    const { data: invitation, error } = await supabase
      .from('invitations')
      .insert(invitationData)
      .select(`
        id,
        email,
        role,
        office_id,
        token,
        expires_at,
        created_at,
        offices(name, city)
      `)
      .single();

    if (error) {
      console.error('❌ Supabase create invitation error:', error);
      return res.status(500).json({
        error: 'Failed to create invitation in database',
        details: error.message
      });
    }

    console.log('✅ Invitation created in Supabase:', invitation);

    // Отправляем реальный email
    const emailResult = await emailService.sendInvitation({
      email: invitation.email,
      role: invitation.role,
      officeName: invitation.offices ? `${invitation.offices.name} (${invitation.offices.city})` : null,
      token: invitation.token,
      expiresAt: invitation.expires_at,
      inviterName: req.user.name
    });

    const response = {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      officeId: invitation.office_id,
      officeName: invitation.offices ? `${invitation.offices.name} (${invitation.offices.city})` : null,
      token: invitation.token,
      expiresAt: invitation.expires_at,
      createdAt: invitation.created_at,
      message: emailResult.simulation
        ? `Приглашение создано! (Email симуляция - настройте EMAIL_USER и EMAIL_PASS в .env для реальной отправки)`
        : emailResult.success
          ? `Приглашение успешно отправлено на ${email}!`
          : `Приглашение создано, но email не отправлен: ${emailResult.error}`,
      emailSent: emailResult.success && !emailResult.simulation
    };

    console.log('📤 Sending response:', response);
    res.status(201).json(response);

  } catch (error) {
    console.error('💥 Create invitation error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

app.get('/api/invitations', verifyAuth, async (req, res) => {
  try {
    console.log('📋 Loading invitations from Supabase...');

    let query = supabase
      .from('invitations')
      .select(`
        id,
        email,
        role,
        office_id,
        expires_at,
        created_at,
        offices(name, city),
        users!invited_by(name, email)
      `)
      .gte('expires_at', new Date().toISOString()) // Только не истекшие
      .order('created_at', { ascending: false });

    // Если пользователь не админ, показываем только приглашения его офиса
    if (req.user.role !== 'admin' && req.user.office_id) {
      query = query.eq('office_id', req.user.office_id);
    }

    const { data: invitations, error } = await query;

    if (error) {
      console.error('Supabase invitations error:', error);
      return res.status(500).json({ error: 'Failed to load invitations from database' });
    }

    const formattedInvitations = (invitations || []).map(inv => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      officeId: inv.office_id,
      officeName: inv.offices ? `${inv.offices.name} (${inv.offices.city})` : 'No office',
      sentBy: inv.users?.name || 'Unknown',
      expiresAt: inv.expires_at,
      createdAt: inv.created_at,
      isExpired: new Date(inv.expires_at) < new Date()
    }));

    console.log(`✅ Loaded ${formattedInvitations.length} invitations from Supabase`);
    res.json(formattedInvitations);
  } catch (error) {
    console.error('Get invitations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/invitations/:id/resend', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Получаем приглашение
    const { data: invitation, error: fetchError } = await supabase
      .from('invitations')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    // Проверяем права доступа
    if (req.user.role !== 'admin' && invitation.office_id !== req.user.office_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Обновляем срок действия
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    const { error: updateError } = await supabase
      .from('invitations')
      .update({ expires_at: newExpiresAt.toISOString() })
      .eq('id', id);

    if (updateError) {
      console.error('Supabase resend invitation error:', updateError);
      return res.status(500).json({ error: 'Failed to resend invitation' });
    }

    console.log(`📧 EMAIL SIMULATION: Повторно отправлено приглашение на ${invitation.email}`);
    console.log(`🔗 Registration link: ${req.protocol}://${req.get('host')}/invite/${invitation.token}`);

    res.json({ message: 'Invitation resent successfully' });
  } catch (error) {
    console.error('Resend invitation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/invitations/:id', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Получаем приглашение для проверки прав
    const { data: invitation, error: fetchError } = await supabase
      .from('invitations')
      .select('office_id')
      .eq('id', id)
      .single();

    if (fetchError || !invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    // Проверяем права доступа
    if (req.user.role !== 'admin' && invitation.office_id !== req.user.office_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { error } = await supabase
      .from('invitations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase delete invitation error:', error);
      return res.status(500).json({ error: 'Failed to delete invitation' });
    }

    console.log('✅ Invitation deleted from Supabase:', id);
    res.json({ message: 'Invitation deleted successfully' });
  } catch (error) {
    console.error('Delete invitation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/invitations/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const { data: invitation, error } = await supabase
      .from('invitations')
      .select(`
        id,
        email,
        role,
        office_id,
        expires_at,
        offices(name, city)
      `)
      .eq('token', token)
      .single();

    if (error || !invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Invitation has expired' });
    }

    res.json({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      officeId: invitation.office_id,
      officeName: invitation.offices ? `${invitation.offices.name} (${invitation.offices.city})` : null,
      expiresAt: invitation.expires_at,
      isExpired: false
    });
  } catch (error) {
    console.error('Get invitation by token error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/invitations/:token/accept', async (req, res) => {
  try {
    const { token } = req.params;
    const { name, password } = req.body;

    console.log('🎫 Processing invitation acceptance:', { token: token.substring(0, 8) + '...', name });

    if (!name || !password) {
      return res.status(400).json({ error: 'Name and password are required' });
    }

    // Проверяем приглашение
    const { data: invitation, error: inviteError } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .single();

    if (inviteError || !invitation) {
      console.log('❌ Invalid invitation:', inviteError?.message);
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      console.log('❌ Invitation expired');
      return res.status(410).json({ error: 'Invitation has expired' });
    }

    console.log('✅ Valid invitation found:', {
      email: invitation.email,
      role: invitation.role,
      office_id: invitation.office_id
    });

    // Проверяем, не существует ли уже пользователь с таким email
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', invitation.email)
      .single();

    if (existingUser) {
      console.log('❌ User already exists:', invitation.email);
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Создаем пользователя в Supabase Auth с метаданными
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: invitation.email,
      password: password,
      email_confirm: true,
      user_metadata: {
        name: name.trim(),
        role: invitation.role,
        office_id: invitation.office_id
      }
    });

    if (authError) {
      console.error('❌ Auth error details:', authError);
      return res.status(500).json({
        error: 'Failed to create user account',
        details: authError.message
      });
    }

    console.log('✅ Auth user created:', authUser.user.id);

    // Ждем немного для возможного срабатывания триггера
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Проверяем, создалась ли запись в public.users через триггер
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.user.id)
      .single();

    // Если триггер не сработал или записи нет, создаем вручную
    if (userError && userError.code === 'PGRST116') {
      console.log('🔧 Creating user record manually...');

      const { data: manualUser, error: manualError } = await supabase
        .from('users')
        .insert({
          id: authUser.user.id,
          name: name.trim(),
          email: invitation.email,
          role: invitation.role,
          office_id: invitation.office_id,
          is_active: true
        })
        .select()
        .single();

      if (manualError) {
        console.error('❌ Manual user creation error:', manualError);
        // Удаляем auth пользователя если не удалось создать запись в users
        await supabase.auth.admin.deleteUser(authUser.user.id);
        return res.status(500).json({
          error: 'Failed to create user record',
          details: manualError.message
        });
      }

      user = manualUser;
      console.log('✅ User created manually:', user.id);
    } else if (userError) {
      console.error('❌ User lookup error:', userError);
      await supabase.auth.admin.deleteUser(authUser.user.id);
      return res.status(500).json({
        error: 'Failed to create user record',
        details: userError.message
      });
    } else {
      console.log('✅ User created by trigger:', user.id);
    }

    // Обновляем статус приглашения на "accepted"
    const { error: updateError } = await supabase
      .from('invitations')
      .update({ status: 'accepted' })
      .eq('token', token);

    if (updateError) {
      console.error('❌ Failed to update invitation status:', updateError);
      // Не прерываем процесс, но логируем ошибку
    }

    console.log('✅ User registered successfully:', {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      office_id: user.office_id
    });

    res.json({
      message: 'Registration completed successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        office_id: user.office_id
      }
    });

  } catch (error) {
    console.error('💥 Accept invitation error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});
// Middleware для обработки ошибок
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message
  });
});

// Serve static files from dist directory
app.use(express.static(join(__dirname, 'dist')));

// ВАЖНО: React Router fallback должен быть ПОСЛЕДНИМ
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});



app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📡 API available at: http://localhost:${port}/api`);
  console.log(`🌐 Frontend available at: http://localhost:${port}`);
  console.log(`🔧 Health check: http://localhost:${port}/api/health`);
  console.log(`🗄️  Supabase URL: ${supabaseUrl ? 'configured' : 'NOT CONFIGURED'}`);
});