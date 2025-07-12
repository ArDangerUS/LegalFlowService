import asyncio
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
import json
from supabase import create_client, Client
from telegram import Update, Message, Chat, User, BotCommand
from telegram.ext import Application, CommandHandler, MessageHandler, filters, CallbackContext
from telegram.constants import ChatType
import time

# Настройка логирования
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)


class MessageType(Enum):
    TEXT = "text"
    DOCUMENT = "document"
    PHOTO = "photo"
    AUDIO = "audio"
    VIDEO = "video"
    VOICE = "voice"
    STICKER = "sticker"
    LOCATION = "location"
    CONTACT = "contact"


class MessageDirection(Enum):
    INCOMING = "incoming"
    OUTGOING = "outgoing"


class MessageStatus(Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"
    DELIVERED = "delivered"
    READ = "read"


@dataclass
class ServiceMessage:
    id: str
    content: str
    message_type: MessageType
    timestamp: datetime
    direction: MessageDirection
    status: MessageStatus
    sender_name: str
    is_edited: bool
    chat_id: str
    telegram_message_id: Optional[int] = None
    attachments: Optional[List[str]] = None
    reply_to_message_id: Optional[str] = None
    user_id: Optional[str] = None
    edit_date: Optional[datetime] = None


class TelegramBotService:
    def __init__(self, bot_token: str, supabase_url: str, supabase_key: str):
        self.bot_token = bot_token
        self.application = Application.builder().token(bot_token).build()
        self.is_initialized = False
        self.is_polling = False
        self.reconnect_attempts = 0
        self.max_reconnect_attempts = 5
        self.connection_healthy = False
        self.last_update_id = 0
        self.message_cache: Dict[str, ServiceMessage] = {}
        self.chat_cache: Dict[str, Dict] = {}
        self.regions: Dict[str, str] = {}
        self.bot_info = None

        # Supabase клиент
        try:
            self.supabase: Client = create_client(supabase_url, supabase_key)
        except Exception as e:
            logger.warning(f"Could not initialize Supabase: {e}")
            self.supabase = None

        # Добавляем обработчики
        self._setup_handlers()

    def _setup_handlers(self):
        """Настройка обработчиков сообщений"""
        # Обработчик команды /start
        self.application.add_handler(CommandHandler("start", self._handle_start))

        # Обработчик команды /help
        self.application.add_handler(CommandHandler("help", self._handle_help))

        # Обработчик команды /status
        self.application.add_handler(CommandHandler("status", self._handle_status))

        # Обработчик текстовых сообщений
        self.application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, self._handle_message))

        # Обработчик фотографий
        self.application.add_handler(MessageHandler(filters.PHOTO, self._handle_photo))

        # Обработчик аудио
        self.application.add_handler(MessageHandler(filters.AUDIO, self._handle_audio))

        # Обработчик видео
        self.application.add_handler(MessageHandler(filters.VIDEO, self._handle_video))

        # Обработчик голосовых сообщений
        self.application.add_handler(MessageHandler(filters.VOICE, self._handle_voice))

        # Обработчик контактов
        self.application.add_handler(MessageHandler(filters.CONTACT, self._handle_contact))

        # Обработчик местоположения
        self.application.add_handler(MessageHandler(filters.LOCATION, self._handle_location))

    async def initialize(self) -> bool:
        """Инициализация бота"""
        if self.is_initialized:
            return True

        try:
            logger.info("Initializing Telegram Bot Service...")

            # Загружаем регионы
            await self._load_regions()

            # Получаем информацию о боте
            bot_info = await self.application.bot.get_me()
            self.bot_info = bot_info

            logger.info(f"Bot info retrieved: @{bot_info.username}")

            # Очищаем webhook
            await self._clear_webhook()

            # Настраиваем команды бота
            await self._setup_bot_commands()

            self.is_initialized = True
            self.connection_healthy = True
            self.reconnect_attempts = 0

            logger.info("Telegram Bot Service initialized successfully")
            return True

        except Exception as error:
            logger.error(f"Failed to initialize Telegram Bot Service: {error}")
            self.connection_healthy = False
            return False

    async def _setup_bot_commands(self):
        """Настройка команд бота"""
        try:
            commands = [
                BotCommand("start", "Запустить бота"),
                BotCommand("help", "Показать справку"),
                BotCommand("status", "Статус бота"),
            ]
            await self.application.bot.set_my_commands(commands)
            logger.info("Bot commands configured")
        except Exception as error:
            logger.error(f"Error setting up bot commands: {error}")

    async def start_polling(self):
        """Запуск поллинга"""
        if not self.is_initialized:
            await self.initialize()

        if self.is_polling:
            logger.info("Already polling")
            return

        try:
            logger.info("Starting polling...")
            self.is_polling = True

            # Запускаем поллинг
            await self.application.initialize()
            await self.application.start()
            await self.application.updater.start_polling(
                drop_pending_updates=True,
                allowed_updates=Update.ALL_TYPES
            )

            logger.info("Polling started successfully")

        except Exception as error:
            logger.error(f"Failed to start polling: {error}")
            self.is_polling = False
            await self._handle_polling_error(error)

    async def stop_polling(self):
        """Остановка поллинга"""
        if not self.is_polling:
            return

        try:
            logger.info("Stopping polling...")

            await self.application.updater.stop()
            await self.application.stop()
            await self.application.shutdown()

            self.is_polling = False
            logger.info("Polling stopped successfully")

        except Exception as error:
            logger.error(f"Error stopping polling: {error}")

    async def send_message(self, chat_id: str, text: str, options: Dict = None) -> bool:
        """Отправка сообщения"""
        return await self.send_message_with_file(chat_id, text, None, options)

    async def send_message_with_file(self, chat_id: str, text: str, file_path: Optional[str] = None,
                                     options: Dict = None) -> bool:
        """Отправка сообщения с файлом"""
        if options is None:
            options = {}

        try:
            logger.info(f"Sending message to chat {chat_id}: {text[:50]}...")

            telegram_message = None

            if file_path:
                # Отправляем файл с подписью
                logger.info(f"Sending file: {file_path}")

                with open(file_path, 'rb') as file:
                    telegram_message = await self.application.bot.send_document(
                        chat_id=int(chat_id),
                        document=file,
                        caption=text,
                        **options
                    )
            else:
                # Отправляем текстовое сообщение
                telegram_message = await self.application.bot.send_message(
                    chat_id=int(chat_id),
                    text=text,
                    **options
                )

            # Создаем ServiceMessage
            service_message = ServiceMessage(
                id=str(uuid.uuid4()),
                content=text,
                message_type=MessageType.DOCUMENT if file_path else MessageType.TEXT,
                timestamp=datetime.fromtimestamp(telegram_message.date.timestamp(), tz=timezone.utc),
                direction=MessageDirection.OUTGOING,
                status=MessageStatus.SENT,
                sender_name=self.bot_info.first_name if self.bot_info else "Bot",
                is_edited=False,
                chat_id=chat_id,
                telegram_message_id=telegram_message.message_id,
                attachments=[file_path] if file_path else None
            )

            # Сохраняем сообщение
            await self._save_message(service_message)

            logger.info("Message sent successfully")
            return True

        except Exception as error:
            logger.error(f"Failed to send message: {error}")
            return False

    async def _handle_start(self, update: Update, context: CallbackContext):
        """Обработчик команды /start"""
        welcome_text = """
Добро пожаловать! 

Я ваш персональный помощник. Вы можете писать мне сообщения, отправлять файлы и задавать вопросы.

Доступные команды:
/help - показать справку
/status - статус бота

Просто напишите мне что-нибудь для начала работы!
        """
        await update.message.reply_text(welcome_text.strip())

        # Обрабатываем как обычное сообщение для сохранения
        await self._process_message(update.message, MessageType.TEXT)

    async def _handle_help(self, update: Update, context: CallbackContext):
        """Обработчик команды /help"""
        help_text = """
Справка по командам:

/start - запустить бота
/help - показать эту справку
/status - показать статус бота

Вы можете отправлять:
• Текстовые сообщения
• Документы и файлы
• Фотографии и изображения
• Аудио и видео
• Голосовые сообщения
• Контакты и местоположение

Все ваши сообщения сохраняются и обрабатываются безопасно.
        """
        await update.message.reply_text(help_text.strip())
        await self._process_message(update.message, MessageType.TEXT)

    async def _handle_status(self, update: Update, context: CallbackContext):
        """Обработчик команды /status"""
        status_text = "Бот активен и работает нормально"

        if self.bot_info:
            status_text += f"\n\nBot: @{self.bot_info.username}"
            status_text += f"\nReconnect attempts: {self.reconnect_attempts}"

        # Добавляем статистику
        messages_count = len(await self.get_messages(limit=1000))
        conversations_count = len(await self.get_conversations())

        status_text += f"\n\nStatistics:"
        status_text += f"\n• Messages: {messages_count}"
        status_text += f"\n• Conversations: {conversations_count}"

        await update.message.reply_text(status_text)
        await self._process_message(update.message, MessageType.TEXT)

    async def _handle_message(self, update: Update, context: CallbackContext):
        """Обработчик текстовых сообщений"""
        if not update.message:
            return

        message = update.message
        await self._process_message(message, MessageType.TEXT)

        # Простой эхо-ответ
        response = f"Получил ваше сообщение: {message.text}"
        await message.reply_text(response)

    async def _handle_document(self, update: Update, context: CallbackContext):
        """Обработчик документов"""
        if not update.message:
            return

        message = update.message
        await self._process_message(message, MessageType.DOCUMENT)

        response = f"Получил документ: {message.document.file_name}"
        await message.reply_text(response)

    async def _handle_photo(self, update: Update, context: CallbackContext):
        """Обработчик фотографий"""
        if not update.message:
            return

        message = update.message
        await self._process_message(message, MessageType.PHOTO)

        response = "Получил фотографию"
        await message.reply_text(response)

    async def _handle_audio(self, update: Update, context: CallbackContext):
        """Обработчик аудио"""
        if not update.message:
            return

        message = update.message
        await self._process_message(message, MessageType.AUDIO)

        response = "Получил аудиофайл"
        await message.reply_text(response)

    async def _handle_video(self, update: Update, context: CallbackContext):
        """Обработчик видео"""
        if not update.message:
            return

        message = update.message
        await self._process_message(message, MessageType.VIDEO)

        response = "Получил видеофайл"
        await message.reply_text(response)

    async def _handle_voice(self, update: Update, context: CallbackContext):
        """Обработчик голосовых сообщений"""
        if not update.message:
            return

        message = update.message
        await self._process_message(message, MessageType.VOICE)

        response = "Получил голосовое сообщение"
        await message.reply_text(response)

    async def _handle_sticker(self, update: Update, context: CallbackContext):
        """Обработчик стикеров"""
        if not update.message:
            return

        message = update.message
        await self._process_message(message, MessageType.STICKER)

        response = "Получил стикер"
        await message.reply_text(response)

    async def _handle_contact(self, update: Update, context: CallbackContext):
        """Обработчик контактов"""
        if not update.message:
            return

        message = update.message
        await self._process_message(message, MessageType.CONTACT)

        response = "Получил контакт"
        await message.reply_text(response)

    async def _handle_location(self, update: Update, context: CallbackContext):
        """Обработчик местоположения"""
        if not update.message:
            return

        message = update.message
        await self._process_message(message, MessageType.LOCATION)

        response = "Получил местоположение"
        await message.reply_text(response)

    async def _process_message(self, message: Message, message_type: MessageType):
        """Обработка входящего сообщения"""
        try:
            chat_id = str(message.chat.id)

            # Получаем содержимое сообщения в зависимости от типа
            content = await self._extract_message_content(message, message_type)

            # Определяем имя отправителя
            sender_name = self._get_sender_name(message.from_user)

            # Создаем ServiceMessage
            service_message = ServiceMessage(
                id=str(uuid.uuid4()),
                content=content,
                message_type=message_type,
                timestamp=datetime.fromtimestamp(message.date.timestamp(), tz=timezone.utc),
                direction=MessageDirection.INCOMING,
                status=MessageStatus.DELIVERED,
                sender_name=sender_name,
                is_edited=bool(message.edit_date),
                chat_id=chat_id,
                telegram_message_id=message.message_id,
                user_id=str(message.from_user.id) if message.from_user else None,
                edit_date=datetime.fromtimestamp(message.edit_date.timestamp(),
                                                 tz=timezone.utc) if message.edit_date else None
            )

            # Обновляем информацию о чате
            await self._update_chat_info(message.chat, message.from_user)

            # Сохраняем сообщение
            await self._save_message(service_message)

            logger.info(f"New message from {sender_name}: {content[:50]}...")

        except Exception as error:
            logger.error(f"Error processing message: {error}")

    async def _extract_message_content(self, message: Message, message_type: MessageType) -> str:
        """Извлечение содержимого сообщения"""
        if message_type == MessageType.TEXT:
            return message.text or ""
        elif message_type == MessageType.DOCUMENT:
            return message.document.file_name or "Document"
        elif message_type == MessageType.PHOTO:
            return message.caption or "Photo"
        elif message_type == MessageType.AUDIO:
            return message.caption or "Audio"
        elif message_type == MessageType.VIDEO:
            return message.caption or "Video"
        elif message_type == MessageType.VOICE:
            return "Voice message"
        elif message_type == MessageType.STICKER:
            return message.sticker.emoji or "Sticker"
        elif message_type == MessageType.CONTACT:
            contact = message.contact
            return f"Contact: {contact.first_name} {contact.last_name or ''}"
        elif message_type == MessageType.LOCATION:
            location = message.location
            return f"Location: {location.latitude}, {location.longitude}"
        else:
            return "Unknown message type"

    def _get_sender_name(self, user: Optional[User]) -> str:
        """Получение имени отправителя"""
        if not user:
            return "Unknown"

        if user.first_name and user.last_name:
            return f"{user.first_name} {user.last_name}"
        elif user.first_name:
            return user.first_name
        elif user.username:
            return f"@{user.username}"
        else:
            return f"User {user.id}"

    async def _update_chat_info(self, chat: Chat, user: Optional[User]):
        """Обновление информации о чате"""
        try:
            chat_id = str(chat.id)

            # Обновляем кеш чата
            chat_info = {
                'id': chat_id,
                'type': chat.type,
                'title': chat.title,
                'username': chat.username,
                'first_name': chat.first_name,
                'last_name': chat.last_name,
                'last_activity': datetime.now(timezone.utc).isoformat()
            }

            if user:
                chat_info['user_info'] = {
                    'id': str(user.id),
                    'username': user.username,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'language_code': user.language_code
                }

            self.chat_cache[chat_id] = chat_info

            # Сохраняем в базу данных
            await self._save_conversation(chat_info)

        except Exception as error:
            logger.error(f"Error updating chat info: {error}")

    async def _save_message(self, message: ServiceMessage):
        """Сохранение сообщения в базу данных"""
        try:
            # Сохраняем в кеш
            self.message_cache[message.id] = message

            # Сохраняем в Supabase если доступен
            if self.supabase:
                data = {
                    'id': message.id,
                    'conversation_id': message.chat_id,
                    'sender_id': message.user_id or 'bot',
                    'content': message.content,
                    'message_type': message.message_type.value,
                    'timestamp': message.timestamp.isoformat(),
                    'direction': message.direction.value,
                    'status': message.status.value,
                    'sender_name': message.sender_name,
                    'is_edited': message.is_edited,
                    'telegram_message_id': message.telegram_message_id,
                    'edit_date': message.edit_date.isoformat() if message.edit_date else None
                }

                result = self.supabase.table('messages').insert(data).execute()

                if result.data:
                    logger.debug(f"Message saved to database: {message.id}")
                else:
                    logger.error(f"Failed to save message to database: {message.id}")
            else:
                logger.debug(f"Message saved to cache only: {message.id}")

        except Exception as error:
            logger.error(f"Error saving message: {error}")

    async def _save_conversation(self, chat_info: Dict):
        """Сохранение беседы в базу данных"""
        try:
            if not self.supabase:
                return

            # Проверяем, существует ли беседа
            existing = self.supabase.table('conversations').select('*').eq('id', chat_info['id']).execute()

            data = {
                'id': chat_info['id'],
                'name': chat_info.get('title') or chat_info.get('first_name') or 'Unknown',
                'telegram_chat_identifier': chat_info['id'],
                'updated_at': datetime.now(timezone.utc).isoformat()
            }

            if existing.data:
                # Обновляем существующую беседу
                result = self.supabase.table('conversations').update(data).eq('id', chat_info['id']).execute()
            else:
                # Создаем новую беседу
                data['created_at'] = datetime.now(timezone.utc).isoformat()
                result = self.supabase.table('conversations').insert(data).execute()

            if result.data:
                logger.debug(f"Conversation saved to database: {chat_info['id']}")
            else:
                logger.error(f"Failed to save conversation to database: {chat_info['id']}")

        except Exception as error:
            logger.error(f"Error saving conversation: {error}")

    async def _load_regions(self):
        """Загрузка регионов"""
        try:
            # Базовые регионы
            self.regions = {
                'US': 'United States',
                'CA': 'Canada',
                'GB': 'United Kingdom',
                'DE': 'Germany',
                'FR': 'France',
                'IT': 'Italy',
                'ES': 'Spain',
                'RU': 'Russia',
                'CN': 'China',
                'JP': 'Japan',
                'BR': 'Brazil',
                'AU': 'Australia',
                'IN': 'India'
            }

            logger.info("Regions loaded successfully")

        except Exception as error:
            logger.error(f"Error loading regions: {error}")

    async def _clear_webhook(self):
        """Очистка webhook"""
        try:
            await self.application.bot.delete_webhook(drop_pending_updates=True)
            logger.info("Webhook cleared")
        except Exception as error:
            logger.error(f"Error clearing webhook: {error}")

    async def _handle_polling_error(self, error: Exception):
        """Обработка ошибок поллинга"""
        self.reconnect_attempts += 1
        self.connection_healthy = False

        if self.reconnect_attempts < self.max_reconnect_attempts:
            logger.warning(
                f"Polling error, attempting reconnect {self.reconnect_attempts}/{self.max_reconnect_attempts}")

            # Ждем перед повторной попыткой
            await asyncio.sleep(5 * self.reconnect_attempts)

            try:
                await self.stop_polling()
                await self.start_polling()
            except Exception as reconnect_error:
                logger.error(f"Reconnect failed: {reconnect_error}")
        else:
            logger.error(f"Max reconnect attempts reached. Stopping polling.")
            await self.stop_polling()

    def get_connection_status(self) -> Dict:
        """Получение статуса подключения"""
        return {
            'is_connected': self.connection_healthy,
            'is_polling': self.is_polling,
            'reconnect_attempts': self.reconnect_attempts,
            'bot_info': {
                'id': self.bot_info.id,
                'username': self.bot_info.username,
                'first_name': self.bot_info.first_name
            } if self.bot_info else None
        }

    async def get_messages(self, chat_id: Optional[str] = None, limit: int = 100) -> List[ServiceMessage]:
        """Получение сообщений"""
        try:
            if self.supabase:
                query = self.supabase.table('messages').select('*').order('timestamp', desc=True)

                if chat_id:
                    query = query.eq('conversation_id', chat_id)

                query = query.limit(limit)

                result = query.execute()

                messages = []
                for row in result.data:
                    message = ServiceMessage(
                        id=row['id'],
                        content=row['content'],
                        message_type=MessageType(row['message_type']),
                        timestamp=datetime.fromisoformat(row['timestamp']),
                        direction=MessageDirection(row['direction']),
                        status=MessageStatus(row['status']),
                        sender_name=row['sender_name'],
                        is_edited=row['is_edited'],
                        chat_id=row['conversation_id'],
                        telegram_message_id=row['telegram_message_id'],
                        user_id=row['sender_id'],
                        edit_date=datetime.fromisoformat(row['edit_date']) if row['edit_date'] else None
                    )
                    messages.append(message)

                return messages
            else:
                # Возвращаем из кеша
                messages = list(self.message_cache.values())
                if chat_id:
                    messages = [msg for msg in messages if msg.chat_id == chat_id]
                messages.sort(key=lambda x: x.timestamp, reverse=True)
                return messages[:limit]

        except Exception as error:
            logger.error(f"Error getting messages: {error}")
            return []

    async def get_conversations(self) -> List[Dict]:
        """Получение списка бесед"""
        try:
            if self.supabase:
                result = self.supabase.table('conversations').select('*').order('updated_at', desc=True).execute()

                conversations = []
                for row in result.data:
                    conversation = {
                        'id': row['id'],
                        'name': row['name'],
                        'telegram_chat_identifier': row['telegram_chat_identifier'],
                        'created_at': row['created_at'],
                        'updated_at': row['updated_at']
                    }
                    conversations.append(conversation)

                return conversations
            else:
                # Возвращаем из кеша
                return list(self.chat_cache.values())

        except Exception as error:
            logger.error(f"Error getting conversations: {error}")
            return []