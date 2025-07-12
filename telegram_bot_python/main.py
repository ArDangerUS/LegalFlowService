#!/usr/bin/env python3
"""
Основной файл Telegram бота на Python
Полный порт функционала с TypeScript версии
"""

import asyncio
import logging
import signal
import sys
from typing import Dict, List, Optional
from datetime import datetime, timezone

from telegram import Update, BotCommand
from telegram.ext import Application, CallbackContext
from telegram.error import TelegramError

from config import settings, BOT_COMMANDS, MESSAGES
from utils import (
    FileUtils, DateTimeUtils, MessageUtils, RateLimiter,
    CacheManager, ErrorHandler, rate_limiter, cache_manager,
    setup_logging, async_retry
)

# Импортируем основной класс бота
from telegram_bot_service import TelegramBotService

logger = logging.getLogger(__name__)


class TelegramBotApp:
    """Основное приложение Telegram бота"""

    def __init__(self):
        self.bot_service: Optional[TelegramBotService] = None
        self.is_running = False
        self.shutdown_event = asyncio.Event()

    async def initialize(self) -> bool:
        """Инициализация приложения"""
        try:
            logger.info("Starting Telegram Bot Application...")

            # Создаем экземпляр бота
            self.bot_service = TelegramBotService(
                bot_token=settings.telegram_bot_token,
                supabase_url=settings.supabase_url,
                supabase_key=settings.supabase_key
            )

            # Инициализируем бот
            if not await self.bot_service.initialize():
                logger.error("Failed to initialize bot service")
                return False

            # Настраиваем команды бота
            await self._setup_bot_commands()

            # Добавляем дополнительные обработчики
            await self._setup_additional_handlers()

            logger.info("Telegram Bot Application initialized successfully")
            return True

        except Exception as error:
            logger.error(f"Failed to initialize application: {error}")
            return False

    async def _setup_bot_commands(self):
        """Настройка команд бота"""
        try:
            # Команды настраиваются в TelegramBotService
            logger.info("Bot commands configured")
        except Exception as error:
            logger.error(f"Error setting up bot commands: {error}")

    async def _setup_additional_handlers(self):
        """Настройка дополнительных обработчиков"""
        try:
            # Основные обработчики уже настроены в TelegramBotService
            # Здесь можем добавить дополнительные обработчики если нужно
            logger.info("Additional handlers configured")

        except Exception as error:
            logger.error(f"Error setting up additional handlers: {error}")

    async def _handle_help_command(self, update: Update, context: CallbackContext):
        """Обработчик команды /help"""
        try:
            if not await self._check_rate_limit(update):
                return

            await update.message.reply_text(
                MESSAGES['help'],
                parse_mode='HTML'
            )

        except Exception as error:
            logger.error(f"❌ Error in help command: {error}")
            await self._send_error_message(update)

    async def _handle_status_command(self, update: Update, context: CallbackContext):
        """Обработчик команды /status"""
        try:
            if not await self._check_rate_limit(update):
                return

            status = self.bot_service.get_connection_status()

            if status['is_connected'] and status['is_polling']:
                status_text = MESSAGES['status_active']

                # Добавляем информацию о боте
                if status['bot_info']:
                    bot_info = status['bot_info']
                    status_text += f"\n\n🤖 Bot: @{bot_info['username']}"
                    status_text += f"\n📊 Reconnect attempts: {status['reconnect_attempts']}"

                # Добавляем статистику
                messages_count = len(await self.bot_service.get_messages(limit=1000))
                conversations_count = len(await self.bot_service.get_conversations())

                status_text += f"\n\n📈 Statistics:"
                status_text += f"\n• Messages: {messages_count}"
                status_text += f"\n• Conversations: {conversations_count}"
                status_text += f"\n• Uptime: {DateTimeUtils.time_ago(datetime.now(timezone.utc))}"

            else:
                status_text = MESSAGES['status_error']

            await update.message.reply_text(status_text)

        except Exception as error:
            logger.error(f"❌ Error in status command: {error}")
            await self._send_error_message(update)

    async def _handle_history_command(self, update: Update, context: CallbackContext):
        """Обработчик команды /history"""
        try:
            if not await self._check_rate_limit(update):
                return

            chat_id = str(update.message.chat.id)
            messages = await self.bot_service.get_messages(chat_id=chat_id, limit=10)

            if not messages:
                await update.message.reply_text("History is empty")
                return

            history_text = "Last 10 messages:\n\n"

            for msg in reversed(messages[-10:]):  # Показываем в хронологическом порядке
                timestamp = DateTimeUtils.format_datetime(msg.timestamp, "%d.%m %H:%M")
                sender = msg.sender_name
                content = MessageUtils.truncate_text(msg.content, 50)

                direction_emoji = "OUT" if msg.direction.value == "outgoing" else "IN"
                history_text += f"{direction_emoji} {timestamp} - {sender}: {content}\n"

            await update.message.reply_text(
                history_text,
                parse_mode='HTML'
            )

        except Exception as error:
            logger.error(f"❌ Error in history command: {error}")
            await self._send_error_message(update)

    async def _handle_export_command(self, update: Update, context: CallbackContext):
        """Обработчик команды /export"""
        try:
            if not await self._check_rate_limit(update):
                return

            await update.message.reply_text("Preparing data export...")

            chat_id = str(update.message.chat.id)
            messages = await self.bot_service.get_messages(chat_id=chat_id, limit=1000)

            if not messages:
                await update.message.reply_text("No data to export")
                return

            # Конвертируем в словари для экспорта
            messages_data = []
            for msg in messages:
                messages_data.append({
                    'timestamp': msg.timestamp.isoformat(),
                    'sender': msg.sender_name,
                    'content': msg.content,
                    'type': msg.message_type.value,
                    'direction': msg.direction.value
                })

            # Экспортируем в JSON
            from utils import DataExporter
            json_data = DataExporter.export_messages_to_json(messages_data)

            if json_data:
                # Сохраняем во временный файл
                import tempfile
                with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False, encoding='utf-8') as f:
                    f.write(json_data)
                    temp_file = f.name

                # Отправляем файл
                with open(temp_file, 'rb') as f:
                    await update.message.reply_document(
                        document=f,
                        filename=f"chat_export_{chat_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
                        caption=MESSAGES['export_ready']
                    )

                # Удаляем временный файл
                import os
                os.unlink(temp_file)
            else:
                await update.message.reply_text("❌ Ошибка при экспорте данных")

        except Exception as error:
            logger.error(f"❌ Error in export command: {error}")
            await self._send_error_message(update)

    async def _handle_clear_command(self, update: Update, context: CallbackContext):
        """Обработчик команды /clear"""
        try:
            if not await self._check_rate_limit(update):
                return

            # Это деструктивная операция, требуем подтверждения
            await update.message.reply_text(
                "⚠️ Вы уверены, что хотите очистить историю сообщений?\n"
                "Это действие необратимо!\n\n"
                "Отправьте 'ДА' для подтверждения или любое другое сообщение для отмены."
            )

            # Сохраняем состояние ожидания подтверждения
            user_id = str(update.message.from_user.id)
            cache_manager.set(f"clear_confirmation_{user_id}", True)

        except Exception as error:
            logger.error(f"❌ Error in clear command: {error}")
            await self._send_error_message(update)

    async def _handle_settings_command(self, update: Update, context: CallbackContext):
        """Обработчик команды /settings"""
        try:
            if not await self._check_rate_limit(update):
                return

            settings_text = "⚙️ Настройки бота:\n\n"
            settings_text += f"📊 Максимальный размер файла: {FileUtils.format_file_size(settings.max_file_size)}\n"
            settings_text += f"📁 Разрешенные типы файлов: {settings.allowed_file_types}\n"
            settings_text += f"⏱️ Лимит сообщений: {settings.rate_limit_messages} в минуту\n"
            settings_text += f"🗄️ Размер кеша: {settings.max_message_cache_size} сообщений\n"
            settings_text += f"🔄 Интервал поллинга: {settings.polling_interval} сек\n"

            await update.message.reply_text(settings_text)

        except Exception as error:
            logger.error(f"❌ Error in settings command: {error}")
            await self._send_error_message(update)

    async def _handle_contact_command(self, update: Update, context: CallbackContext):
        """Обработчик команды /contact"""
        try:
            if not await self._check_rate_limit(update):
                return

            await update.message.reply_text(MESSAGES['contact_support'])

        except Exception as error:
            logger.error(f"❌ Error in contact command: {error}")
            await self._send_error_message(update)

    async def _check_rate_limit(self, update: Update) -> bool:
        """Проверка лимита частоты запросов"""
        user_id = str(update.message.from_user.id)

        if not rate_limiter.is_allowed(user_id):
            reset_time = rate_limiter.get_reset_time(user_id)
            if reset_time:
                wait_time = int(reset_time - datetime.now().timestamp())
                await update.message.reply_text(
                    f"{MESSAGES['rate_limit']}\nПопробуйте снова через {wait_time} сек."
                )
            else:
                await update.message.reply_text(MESSAGES['rate_limit'])
            return False

        return True

    async def _send_error_message(self, update: Update):
        """Отправка сообщения об ошибке"""
        try:
            await update.message.reply_text(MESSAGES['error_occurred'])
        except Exception:
            logger.error("❌ Failed to send error message")

    async def start(self):
        """Запуск приложения"""
        if self.is_running:
            logger.warning("⚠️ Application is already running")
            return

        try:
            logger.info("Starting Telegram Bot Application...")

            if not await self.initialize():
                logger.error("Failed to initialize application")
                return False

            # Запускаем поллинг
            await self.bot_service.start_polling()

            self.is_running = True
            logger.info("Telegram Bot Application started successfully")

            # Отправляем уведомление о запуске (если есть admin chat)
            try:
                if hasattr(settings, 'admin_chat_id') and settings.admin_chat_id:
                    await self.bot_service.send_message(
                        settings.admin_chat_id,
                        f"Bot started successfully!\n\nTime: {DateTimeUtils.format_datetime(DateTimeUtils.now_utc())}"
                    )
            except Exception as e:
                logger.debug(f"Could not send startup notification: {e}")

            # Ожидаем сигнала остановки
            await self.shutdown_event.wait()

        except Exception as error:
            logger.error(f"Error starting application: {error}")
            self.is_running = False
            raise

    async def stop(self):
        """Остановка приложения"""
        if not self.is_running:
            logger.warning("⚠️ Application is not running")
            return

        try:
            logger.info("Stopping Telegram Bot Application...")

            # Отправляем уведомление об остановке
            try:
                if hasattr(settings, 'admin_chat_id') and settings.admin_chat_id:
                    await self.bot_service.send_message(
                        settings.admin_chat_id,
                        f"Bot stopped\n\nTime: {DateTimeUtils.format_datetime(DateTimeUtils.now_utc())}"
                    )
            except Exception as e:
                logger.debug(f"Could not send shutdown notification: {e}")

            # Останавливаем поллинг
            if self.bot_service:
                await self.bot_service.stop_polling()

            # Очищаем кеш
            cache_manager.clear()

            # Очищаем временные файлы
            FileUtils.cleanup_old_files(
                "/tmp/telegram_bot_files",
                max_age_hours=1
            )

            self.is_running = False
            self.shutdown_event.set()

            logger.info("Telegram Bot Application stopped successfully")

        except Exception as error:
            logger.error(f"Error stopping application: {error}")

    def signal_handler(self, signum, frame):
        """Обработчик сигналов для graceful shutdown"""
        logger.info(f"📡 Received signal {signum}, initiating shutdown...")

        # Создаем задачу для остановки в event loop
        loop = asyncio.get_event_loop()
        loop.create_task(self.stop())


async def main():
    """Основная функция приложения"""

    # Настраиваем логирование
    setup_logging()

    logger.info("=" * 50)
    logger.info("TELEGRAM BOT APPLICATION")
    logger.info("=" * 50)

    # Проверяем обязательные настройки
    required_settings = [
        'telegram_bot_token',
        'supabase_url',
        'supabase_key'
    ]

    missing_settings = []
    for setting in required_settings:
        if not getattr(settings, setting, None):
            missing_settings.append(setting)

    if missing_settings:
        logger.error(f"Missing required settings: {', '.join(missing_settings)}")
        logger.error("Please check your .env file or environment variables")
        sys.exit(1)

    # Создаем приложение
    app = TelegramBotApp()

    # Настраиваем обработчики сигналов для graceful shutdown
    def signal_handler(signum, frame):
        logger.info(f"📡 Received signal {signum}")
        asyncio.create_task(app.stop())

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    try:
        # Запускаем приложение
        await app.start()

    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt")
        await app.stop()

    except Exception as error:
        logger.error(f"Unhandled error: {error}", exc_info=True)
        await app.stop()
        sys.exit(1)

    finally:
        logger.info("Application finished")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nGoodbye!")
    except Exception as e:
        print(f"Fatal error: {e}")
        sys.exit(1)