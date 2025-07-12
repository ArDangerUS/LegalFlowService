import os
from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Настройки приложения"""

    # Telegram Bot
    telegram_bot_token: str = Field(..., env="TELEGRAM_BOT_TOKEN")
    telegram_webhook_url: Optional[str] = Field(None, env="TELEGRAM_WEBHOOK_URL")
    admin_chat_id: Optional[str] = Field(None, env="ADMIN_CHAT_ID")

    # Supabase
    supabase_url: str = Field(..., env="SUPABASE_URL")
    supabase_key: str = Field(..., env="SUPABASE_KEY")

    # Приложение
    app_name: str = Field("Telegram Bot", env="APP_NAME")
    debug: bool = Field(False, env="DEBUG")
    log_level: str = Field("INFO", env="LOG_LEVEL")
    timezone: str = Field("UTC", env="TIMEZONE")
    language: str = Field("ru", env="LANGUAGE")
    enable_metrics: bool = Field(False, env="ENABLE_METRICS")

    # Поллинг
    polling_interval: int = Field(1, env="POLLING_INTERVAL")
    max_reconnect_attempts: int = Field(5, env="MAX_RECONNECT_ATTEMPTS")
    reconnect_delay: int = Field(5, env="RECONNECT_DELAY")

    # Сообщения
    max_message_cache_size: int = Field(1000, env="MAX_MESSAGE_CACHE_SIZE")
    message_batch_size: int = Field(100, env="MESSAGE_BATCH_SIZE")

    # Файлы
    max_file_size: int = Field(50 * 1024 * 1024, env="MAX_FILE_SIZE")  # 50MB
    allowed_file_types: str = Field("pdf,doc,docx,txt,jpg,jpeg,png,gif,mp3,mp4,avi", env="ALLOWED_FILE_TYPES")

    # Безопасность
    rate_limit_messages: int = Field(30, env="RATE_LIMIT_MESSAGES")  # сообщений в минуту
    rate_limit_window: int = Field(60, env="RATE_LIMIT_WINDOW")  # секунд

    # Развёртывание
    port: int = Field(8000, env="PORT")
    host: str = Field("0.0.0.0", env="HOST")
    ssl_cert_path: Optional[str] = Field(None, env="SSL_CERT_PATH")
    ssl_key_path: Optional[str] = Field(None, env="SSL_KEY_PATH")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"  # Игнорируем дополнительные поля


# Создаем глобальный экземпляр настроек
settings = Settings()

# Регионы и их коды
REGIONS = {
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
    'IN': 'India',
    'MX': 'Mexico',
    'NL': 'Netherlands',
    'SE': 'Sweden',
    'NO': 'Norway',
    'DK': 'Denmark',
    'FI': 'Finland',
    'PL': 'Poland',
    'CZ': 'Czech Republic',
    'HU': 'Hungary',
    'RO': 'Romania',
    'BG': 'Bulgaria',
    'GR': 'Greece',
    'PT': 'Portugal',
    'IE': 'Ireland',
    'BE': 'Belgium',
    'CH': 'Switzerland',
    'AT': 'Austria',
    'LU': 'Luxembourg',
    'KR': 'South Korea',
    'TH': 'Thailand',
    'VN': 'Vietnam',
    'SG': 'Singapore',
    'MY': 'Malaysia',
    'ID': 'Indonesia',
    'PH': 'Philippines',
    'BD': 'Bangladesh',
    'PK': 'Pakistan',
    'LK': 'Sri Lanka',
    'NP': 'Nepal',
    'MM': 'Myanmar',
    'KH': 'Cambodia',
    'LA': 'Laos',
    'MN': 'Mongolia',
    'KZ': 'Kazakhstan',
    'UZ': 'Uzbekistan',
    'KG': 'Kyrgyzstan',
    'TJ': 'Tajikistan',
    'TM': 'Turkmenistan',
    'AF': 'Afghanistan',
    'IR': 'Iran',
    'IQ': 'Iraq',
    'SY': 'Syria',
    'JO': 'Jordan',
    'LB': 'Lebanon',
    'IL': 'Israel',
    'PS': 'Palestine',
    'SA': 'Saudi Arabia',
    'AE': 'United Arab Emirates',
    'QA': 'Qatar',
    'KW': 'Kuwait',
    'BH': 'Bahrain',
    'OM': 'Oman',
    'YE': 'Yemen',
    'EG': 'Egypt',
    'LY': 'Libya',
    'TN': 'Tunisia',
    'DZ': 'Algeria',
    'MA': 'Morocco',
    'SD': 'Sudan',
    'ET': 'Ethiopia',
    'KE': 'Kenya',
    'UG': 'Uganda',
    'TZ': 'Tanzania',
    'RW': 'Rwanda',
    'BI': 'Burundi',
    'DJ': 'Djibouti',
    'SO': 'Somalia',
    'ER': 'Eritrea',
    'SS': 'South Sudan',
    'CF': 'Central African Republic',
    'TD': 'Chad',
    'NE': 'Niger',
    'ML': 'Mali',
    'BF': 'Burkina Faso',
    'CI': 'Ivory Coast',
    'GH': 'Ghana',
    'TG': 'Togo',
    'BJ': 'Benin',
    'NG': 'Nigeria',
    'CM': 'Cameroon',
    'GQ': 'Equatorial Guinea',
    'GA': 'Gabon',
    'CG': 'Republic of the Congo',
    'CD': 'Democratic Republic of the Congo',
    'AO': 'Angola',
    'ZM': 'Zambia',
    'ZW': 'Zimbabwe',
    'BW': 'Botswana',
    'NA': 'Namibia',
    'ZA': 'South Africa',
    'SZ': 'Eswatini',
    'LS': 'Lesotho',
    'MW': 'Malawi',
    'MZ': 'Mozambique',
    'MG': 'Madagascar',
    'MU': 'Mauritius',
    'SC': 'Seychelles',
    'KM': 'Comoros',
    'AR': 'Argentina',
    'CL': 'Chile',
    'PE': 'Peru',
    'BO': 'Bolivia',
    'PY': 'Paraguay',
    'UY': 'Uruguay',
    'CO': 'Colombia',
    'VE': 'Venezuela',
    'GY': 'Guyana',
    'SR': 'Suriname',
    'EC': 'Ecuador',
    'CR': 'Costa Rica',
    'PA': 'Panama',
    'NI': 'Nicaragua',
    'HN': 'Honduras',
    'GT': 'Guatemala',
    'BZ': 'Belize',
    'SV': 'El Salvador',
    'CU': 'Cuba',
    'JM': 'Jamaica',
    'HT': 'Haiti',
    'DO': 'Dominican Republic',
    'TT': 'Trinidad and Tobago',
    'BB': 'Barbados',
    'GD': 'Grenada',
    'LC': 'Saint Lucia',
    'VC': 'Saint Vincent and the Grenadines',
    'AG': 'Antigua and Barbuda',
    'KN': 'Saint Kitts and Nevis',
    'DM': 'Dominica',
    'BS': 'Bahamas',
    'NZ': 'New Zealand',
    'FJ': 'Fiji',
    'VU': 'Vanuatu',
    'SB': 'Solomon Islands',
    'PG': 'Papua New Guinea',
    'NC': 'New Caledonia',
    'PF': 'French Polynesia',
    'AS': 'American Samoa',
    'GU': 'Guam',
    'MP': 'Northern Mariana Islands',
    'PW': 'Palau',
    'FM': 'Federated States of Micronesia',
    'MH': 'Marshall Islands',
    'KI': 'Kiribati',
    'NR': 'Nauru',
    'TV': 'Tuvalu',
    'TO': 'Tonga',
    'WS': 'Samoa',
    'CK': 'Cook Islands',
    'NU': 'Niue',
    'TK': 'Tokelau'
}

# Типы сообщений и их описания
MESSAGE_TYPES = {
    'text': 'Текстовое сообщение',
    'document': 'Документ',
    'photo': 'Фотография',
    'audio': 'Аудио',
    'video': 'Видео',
    'voice': 'Голосовое сообщение',
    'sticker': 'Стикер',
    'location': 'Местоположение',
    'contact': 'Контакт',
    'animation': 'Анимация',
    'video_note': 'Видеосообщение',
    'poll': 'Опрос',
    'dice': 'Кубик',
    'game': 'Игра'
}

# Статусы сообщений
MESSAGE_STATUSES = {
    'pending': 'Ожидает отправки',
    'sent': 'Отправлено',
    'delivered': 'Доставлено',
    'read': 'Прочитано',
    'failed': 'Ошибка отправки'
}

# Направления сообщений
MESSAGE_DIRECTIONS = {
    'incoming': 'Входящее',
    'outgoing': 'Исходящее'
}

# Настройки логирования
LOGGING_CONFIG = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'default': {
            'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            'datefmt': '%Y-%m-%d %H:%M:%S'
        },
        'detailed': {
            'format': '%(asctime)s - %(name)s - %(levelname)s - %(filename)s:%(lineno)d - %(funcName)s - %(message)s',
            'datefmt': '%Y-%m-%d %H:%M:%S'
        }
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'level': 'INFO',
            'formatter': 'default',
            'stream': 'ext://sys.stdout'
        },
        'file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'level': 'DEBUG',
            'formatter': 'detailed',
            'filename': 'telegram_bot.log',
            'maxBytes': 10485760,  # 10MB
            'backupCount': 5
        }
    },
    'loggers': {
        '': {
            'level': 'DEBUG',
            'handlers': ['console', 'file']
        },
        'telegram': {
            'level': 'INFO',
            'handlers': ['console', 'file'],
            'propagate': False
        },
        'httpx': {
            'level': 'WARNING',
            'handlers': ['console'],
            'propagate': False
        }
    }
}

# Команды бота
BOT_COMMANDS = [
    ('start', 'Запустить бота'),
    ('help', 'Показать справку'),
    ('status', 'Статус бота'),
    ('settings', 'Настройки'),
    ('history', 'История сообщений'),
    ('clear', 'Очистить историю'),
    ('export', 'Экспорт данных'),
    ('contact', 'Связаться с поддержкой')
]

# Тексты сообщений
MESSAGES = {
    'welcome': """
🤖 Добро пожаловать!

Я ваш персональный помощник. Вы можете писать мне сообщения, отправлять файлы и задавать вопросы.

Доступные команды:
/help - показать справку
/status - статус бота
/history - история сообщений

Просто напишите мне что-нибудь для начала работы!
    """,

    'help': """
📋 Справка по командам:

/start - запустить бота
/help - показать эту справку
/status - показать статус бота
/settings - настройки бота
/history - показать историю сообщений
/clear - очистить историю
/export - экспортировать данные
/contact - связаться с поддержкой

🔹 Вы можете отправлять:
• Текстовые сообщения
• Документы и файлы
• Фотографии и изображения
• Аудио и видео
• Голосовые сообщения
• Контакты и местоположение

Все ваши сообщения сохраняются и обрабатываются безопасно.
    """,

    'status_active': '✅ Бот активен и работает нормально',
    'status_error': '❌ Бот испытывает проблемы',
    'processing': '⏳ Обрабатываю ваше сообщение...',
    'file_received': '📎 Файл получен и сохранен',
    'file_too_large': '❌ Файл слишком большой. Максимальный размер: {max_size}MB',
    'file_type_not_allowed': '❌ Тип файла не поддерживается',
    'error_occurred': '❌ Произошла ошибка. Попробуйте позже.',
    'maintenance': '🔧 Бот находится на техническом обслуживании',
    'rate_limit': '⚠️ Слишком много сообщений. Пожалуйста, подождите.',
    'export_ready': '📤 Экспорт данных готов',
    'history_cleared': '🗑️ История сообщений очищена',
    'contact_support': '📞 Для связи с поддержкой напишите на: support@example.com'
}