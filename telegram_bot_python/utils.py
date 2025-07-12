import os
import asyncio
import hashlib
import mimetypes
from datetime import datetime, timezone
from typing import Optional, Dict, List, Any, Tuple
from pathlib import Path
import logging
import json
import csv
from io import StringIO, BytesIO
import tempfile
import shutil

from config import settings, REGIONS, MESSAGE_TYPES

logger = logging.getLogger(__name__)


class FileUtils:
    """Утилиты для работы с файлами"""

    @staticmethod
    def get_file_extension(filename: str) -> str:
        """Получить расширение файла"""
        return Path(filename).suffix.lower().lstrip('.')

    @staticmethod
    def get_mime_type(filename: str) -> str:
        """Получить MIME тип файла"""
        mime_type, _ = mimetypes.guess_type(filename)
        return mime_type or 'application/octet-stream'

    @staticmethod
    def is_file_allowed(filename: str) -> bool:
        """Проверить, разрешен ли тип файла"""
        extension = FileUtils.get_file_extension(filename)
        allowed_types = settings.allowed_file_types.split(',')
        return extension in allowed_types

    @staticmethod
    def format_file_size(size_bytes: int) -> str:
        """Форматировать размер файла"""
        if size_bytes == 0:
            return "0 B"

        size_names = ["B", "KB", "MB", "GB", "TB"]
        i = 0
        size = float(size_bytes)

        while size >= 1024.0 and i < len(size_names) - 1:
            size /= 1024.0
            i += 1

        return f"{size:.1f} {size_names[i]}"

    @staticmethod
    def generate_file_hash(file_path: str) -> str:
        """Генерировать хеш файла"""
        hash_sha256 = hashlib.sha256()

        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_sha256.update(chunk)

        return hash_sha256.hexdigest()

    @staticmethod
    async def save_telegram_file(file_path: str, telegram_file) -> Optional[str]:
        """Сохранить файл из Telegram"""
        try:
            # Создаем временную директорию если не существует
            temp_dir = Path(tempfile.gettempdir()) / "telegram_bot_files"
            temp_dir.mkdir(exist_ok=True)

            # Генерируем уникальное имя файла
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            unique_filename = f"{timestamp}_{Path(file_path).name}"
            save_path = temp_dir / unique_filename

            # Сохраняем файл
            await telegram_file.download_to_drive(str(save_path))

            logger.info(f"📁 File saved: {save_path}")
            return str(save_path)

        except Exception as error:
            logger.error(f"❌ Error saving file: {error}")
            return None

    @staticmethod
    def cleanup_old_files(directory: str, max_age_hours: int = 24):
        """Очистка старых файлов"""
        try:
            dir_path = Path(directory)
            if not dir_path.exists():
                return

            cutoff_time = datetime.now().timestamp() - (max_age_hours * 3600)

            for file_path in dir_path.iterdir():
                if file_path.is_file() and file_path.stat().st_mtime < cutoff_time:
                    file_path.unlink()
                    logger.debug(f"🗑️ Deleted old file: {file_path}")

        except Exception as error:
            logger.error(f"❌ Error cleaning up files: {error}")


class DateTimeUtils:
    """Утилиты для работы с датой и временем"""

    @staticmethod
    def now_utc() -> datetime:
        """Текущее время в UTC"""
        return datetime.now(timezone.utc)

    @staticmethod
    def format_datetime(dt: datetime, format_str: str = "%Y-%m-%d %H:%M:%S") -> str:
        """Форматирование даты и времени"""
        return dt.strftime(format_str)

    @staticmethod
    def parse_datetime(dt_str: str) -> Optional[datetime]:
        """Парсинг даты и времени"""
        try:
            return datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
        except ValueError:
            try:
                return datetime.strptime(dt_str, "%Y-%m-%d %H:%M:%S")
            except ValueError:
                return None

    @staticmethod
    def time_ago(dt: datetime) -> str:
        """Время, прошедшее с указанной даты"""
        now = DateTimeUtils.now_utc()
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)

        diff = now - dt

        if diff.days > 0:
            return f"{diff.days} дн. назад"
        elif diff.seconds > 3600:
            hours = diff.seconds // 3600
            return f"{hours} ч. назад"
        elif diff.seconds > 60:
            minutes = diff.seconds // 60
            return f"{minutes} мин. назад"
        else:
            return "только что"


class MessageUtils:
    """Утилиты для работы с сообщениями"""

    @staticmethod
    def truncate_text(text: str, max_length: int = 100) -> str:
        """Обрезать текст до указанной длины"""
        if len(text) <= max_length:
            return text
        return text[:max_length - 3] + "..."

    @staticmethod
    def escape_markdown(text: str) -> str:
        """Экранировать символы Markdown"""
        escape_chars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!']
        for char in escape_chars:
            text = text.replace(char, f'\\{char}')
        return text

    @staticmethod
    def extract_mentions(text: str) -> List[str]:
        """Извлечь упоминания пользователей из текста"""
        import re
        return re.findall(r'@(\w+)', text)

    @staticmethod
    def extract_hashtags(text: str) -> List[str]:
        """Извлечь хештеги из текста"""
        import re
        return re.findall(r'#(\w+)', text)

    @staticmethod
    def clean_text(text: str) -> str:
        """Очистить текст от лишних символов"""
        import re
        # Удаляем лишние пробелы и переносы строк
        text = re.sub(r'\s+', ' ', text.strip())
        return text


class RateLimiter:
    """Ограничитель скорости для предотвращения спама"""

    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: Dict[str, List[float]] = {}

    def is_allowed(self, user_id: str) -> bool:
        """Проверить, разрешен ли запрос для пользователя"""
        now = datetime.now().timestamp()

        if user_id not in self.requests:
            self.requests[user_id] = []

        # Удаляем старые запросы
        self.requests[user_id] = [
            req_time for req_time in self.requests[user_id]
            if now - req_time < self.window_seconds
        ]

        # Проверяем лимит
        if len(self.requests[user_id]) >= self.max_requests:
            return False

        # Добавляем новый запрос
        self.requests[user_id].append(now)
        return True

    def get_reset_time(self, user_id: str) -> Optional[float]:
        """Получить время сброса лимита для пользователя"""
        if user_id not in self.requests or not self.requests[user_id]:
            return None

        oldest_request = min(self.requests[user_id])
        return oldest_request + self.window_seconds


class DataExporter:
    """Экспорт данных в различные форматы"""

    @staticmethod
    def export_messages_to_json(messages: List[Dict]) -> str:
        """Экспорт сообщений в JSON"""
        try:
            return json.dumps(messages, ensure_ascii=False, indent=2, default=str)
        except Exception as error:
            logger.error(f"❌ Error exporting to JSON: {error}")
            return ""

    @staticmethod
    def export_messages_to_csv(messages: List[Dict]) -> str:
        """Экспорт сообщений в CSV"""
        try:
            output = StringIO()

            if not messages:
                return ""

            fieldnames = messages[0].keys()
            writer = csv.DictWriter(output, fieldnames=fieldnames)

            writer.writeheader()
            for message in messages:
                writer.writerow(message)

            return output.getvalue()

        except Exception as error:
            logger.error(f"❌ Error exporting to CSV: {error}")
            return ""

    @staticmethod
    def export_messages_to_txt(messages: List[Dict]) -> str:
        """Экспорт сообщений в текстовый формат"""
        try:
            output = []

            for message in messages:
                timestamp = message.get('timestamp', '')
                sender = message.get('sender_name', 'Unknown')
                content = message.get('content', '')

                output.append(f"[{timestamp}] {sender}: {content}")
                output.append("")  # Пустая строка между сообщениями

            return "\n".join(output)

        except Exception as error:
            logger.error(f"❌ Error exporting to TXT: {error}")
            return ""


class ValidationUtils:
    """Утилиты для валидации данных"""

    @staticmethod
    def is_valid_email(email: str) -> bool:
        """Проверить валидность email"""
        import re
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None

    @staticmethod
    def is_valid_phone(phone: str) -> bool:
        """Проверить валидность номера телефона"""
        import re
        # Простая проверка для международных номеров
        pattern = r'^\+?[\d\s\-\(\)]{7,15}$'
        return re.match(pattern, phone) is not None

    @staticmethod
    def is_valid_url(url: str) -> bool:
        """Проверить валидность URL"""
        import re
        pattern = r'^https?://[^\s/$.?#].[^\s]*$'
        return re.match(pattern, url) is not None

    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """Очистить имя файла от недопустимых символов"""
        import re
        # Удаляем недопустимые символы
        filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
        # Ограничиваем длину
        if len(filename) > 255:
            name, ext = os.path.splitext(filename)
            filename = name[:255 - len(ext)] + ext
        return filename


class CacheManager:
    """Менеджер кеша для хранения временных данных"""

    def __init__(self, max_size: int = 1000, ttl_seconds: int = 3600):
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds
        self.cache: Dict[str, Tuple[Any, float]] = {}

    def get(self, key: str) -> Optional[Any]:
        """Получить значение из кеша"""
        if key not in self.cache:
            return None

        value, timestamp = self.cache[key]

        # Проверяем TTL
        if datetime.now().timestamp() - timestamp > self.ttl_seconds:
            del self.cache[key]
            return None

        return value

    def set(self, key: str, value: Any) -> None:
        """Установить значение в кеш"""
        # Очищаем старые записи если кеш переполнен
        if len(self.cache) >= self.max_size:
            self._cleanup_old_entries()

        self.cache[key] = (value, datetime.now().timestamp())

    def delete(self, key: str) -> None:
        """Удалить значение из кеша"""
        if key in self.cache:
            del self.cache[key]

    def clear(self) -> None:
        """Очистить весь кеш"""
        self.cache.clear()

    def _cleanup_old_entries(self) -> None:
        """Очистить старые записи"""
        now = datetime.now().timestamp()
        keys_to_delete = []

        for key, (_, timestamp) in self.cache.items():
            if now - timestamp > self.ttl_seconds:
                keys_to_delete.append(key)

        for key in keys_to_delete:
            del self.cache[key]

        # Если все еще переполнен, удаляем самые старые
        if len(self.cache) >= self.max_size:
            sorted_items = sorted(self.cache.items(), key=lambda x: x[1][1])
            keys_to_delete = [item[0] for item in sorted_items[:len(self.cache) - self.max_size + 1]]

            for key in keys_to_delete:
                del self.cache[key]


class ErrorHandler:
    """Обработчик ошибок с логированием и уведомлениями"""

    @staticmethod
    def handle_exception(func):
        """Декоратор для обработки исключений"""

        async def wrapper(*args, **kwargs):
            try:
                return await func(*args, **kwargs)
            except Exception as error:
                logger.error(f"❌ Error in {func.__name__}: {error}", exc_info=True)
                return None

        return wrapper

    @staticmethod
    def log_error(error: Exception, context: str = "") -> None:
        """Логирование ошибки с контекстом"""
        logger.error(f"❌ Error {context}: {error}", exc_info=True)

    @staticmethod
    def format_error_message(error: Exception) -> str:
        """Форматирование сообщения об ошибке для пользователя"""
        # Не показываем подробности ошибки пользователю
        return "Произошла техническая ошибка. Попробуйте позже или обратитесь в поддержку."


# Глобальные экземпляры утилит
rate_limiter = RateLimiter(
    max_requests=settings.rate_limit_messages,
    window_seconds=settings.rate_limit_window
)

cache_manager = CacheManager(
    max_size=settings.max_message_cache_size,
    ttl_seconds=3600  # 1 час
)


# Функции-помощники
def get_user_display_name(user_data: Dict) -> str:
    """Получить отображаемое имя пользователя"""
    if user_data.get('first_name') and user_data.get('last_name'):
        return f"{user_data['first_name']} {user_data['last_name']}"
    elif user_data.get('first_name'):
        return user_data['first_name']
    elif user_data.get('username'):
        return f"@{user_data['username']}"
    else:
        return f"User {user_data.get('id', 'Unknown')}"


def format_message_type(message_type: str) -> str:
    """Форматировать тип сообщения для отображения"""
    return MESSAGE_TYPES.get(message_type, message_type.title())


def get_region_name(region_code: str) -> str:
    """Получить название региона по коду"""
    return REGIONS.get(region_code.upper(), region_code)


async def async_retry(func, max_attempts: int = 3, delay: float = 1.0):
    """Асинхронная функция повтора с экспоненциальной задержкой"""
    for attempt in range(max_attempts):
        try:
            return await func()
        except Exception as error:
            if attempt == max_attempts - 1:
                raise error

            wait_time = delay * (2 ** attempt)
            logger.warning(f"⚠️ Attempt {attempt + 1} failed, retrying in {wait_time}s: {error}")
            await asyncio.sleep(wait_time)


def setup_logging():
    """Настройка логирования"""
    import logging.config
    from config import LOGGING_CONFIG

    # Создаем директорию для логов если не существует
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)

    # Обновляем путь к файлу лога
    LOGGING_CONFIG['handlers']['file']['filename'] = str(log_dir / "telegram_bot.log")

    logging.config.dictConfig(LOGGING_CONFIG)

    logger.info("📝 Logging configured successfully")