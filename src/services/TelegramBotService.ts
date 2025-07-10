import {SupabaseChatStorage, ChatMessage, Conversation} from './SupabaseChatStorage';
import type { User } from '../types/legal';
import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import {networkService} from "./NetworkService.ts";

interface TelegramMessage {
  message_id: number;
  from: {
    id: number;
    first_name: string;
    username?: string;
  };
  chat: {
    id: number;
    type: string;
    title?: string;
    first_name?: string;
    username?: string;
  };
  date: number;
  text?: string;
  edit_date?: number;
  photo?: Array<{
    file_id: string;
    file_unique_id: string;
    width: number;
    height: number;
    file_size?: number;
  }>;
  document?: {
    file_id: string;
    file_unique_id: string;
    file_name?: string;
    mime_type?: string;
    file_size?: number;
    thumbnail?: {
      file_id: string;
      file_unique_id: string;
      width: number;
      height: number;
      file_size?: number;
    };
  };
  video?: {
    file_id: string;
    file_unique_id: string;
    width: number;
    height: number;
    duration: number;
    thumbnail?: {
      file_id: string;
      file_unique_id: string;
      width: number;
      height: number;
      file_size?: number;
    };
    file_name?: string;
    mime_type?: string;
    file_size?: number;
  };
  audio?: {
    file_id: string;
    file_unique_id: string;
    duration: number;
    performer?: string;
    title?: string;
    file_name?: string;
    mime_type?: string;
    file_size?: number;
  };
  voice?: {
    file_id: string;
    file_unique_id: string;
    duration: number;
    mime_type?: string;
    file_size?: number;
  };
  sticker?: {
    file_id: string;
    file_unique_id: string;
    width: number;
    height: number;
    is_animated: boolean;
    is_video: boolean;
    thumbnail?: {
      file_id: string;
      file_unique_id: string;
      width: number;
      height: number;
      file_size?: number;
    };
    emoji?: string;
    set_name?: string;
    file_size?: number;
  };
  caption?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  callback_query?: {
    id: string;
    from: {
      id: number;
      first_name: string;
      username?: string;
    };
    message: {
      chat: {
        id: number;
        type: string;
      };
    };
    data?: string;
  };
}

interface BotInfo {
  id: number;
  first_name: string;
  username: string;
}

interface ServiceMessage {
  id: string;
  content: string;
  timestamp: Date;
  direction: 'incoming' | 'outgoing';
  status: 'sending' | 'sent' | 'delivered' | 'failed';
  senderName: string;
  isEdited: boolean;
  chatId: string;
  telegramMessageId?: number;
  attachments?: FileAttachment[];
  messageType?: 'text' | 'photo' | 'document' | 'video' | 'audio' | 'voice' | 'sticker';
  conversationId?: string;
  senderId?: string;
  recipientId?: string;
  recipientName?: string;
}

interface FileAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileId: string;
  url?: string;
  thumbnail?: {
    fileId: string;
    width: number;
    height: number;
  };
  duration?: number;
  dimensions?: {
    width: number;
    height: number;
  };
}

interface ServiceChat {
  id: string;
  name: string;
  lastMessage?: ServiceMessage;
  unreadCount: number;
  lastActivity: Date;
}

interface ConnectionHealth {
  isConnected: boolean;
  consecutiveErrors: number;
  lastSuccessfulPoll: Date;
  lastError: any;
}

interface ServiceCallbacks {
  onNewMessage: (message: ServiceMessage) => void;
  onConnectionChange: (connected: boolean) => void;
  onUnreadCountChange: (count: number) => void;
  onError: (error: string) => void;
  onMessageStatusUpdate: (messageId: string, status: string) => void;
}

interface CommandHandler {
  command: string;
  description: string;
  handler: (telegramMessage: TelegramMessage, args: string[]) => Promise<void>;
}

interface Region {
  id: string;
  name: string;
  code: string;
  country: string;
}

interface Office {
  id: string;
  name: string;
  address: string;
  companyId?: string;
}

export class TelegramBotService {
  private static instance: TelegramBotService | null = null;
  private botToken: string;
  private isInitialized = false;
  private isPolling = false;
  private pollingAbortController: AbortController | null = null;
  private lastUpdateId = 0;
  private callbacks: ServiceCallbacks | null = null;
  private connectionHealth: ConnectionHealth;
  private botInfo: BotInfo | null = null;
  private chats: Map<string, ServiceChat> = new Map();
  private messages: Map<string, ServiceMessage[]> = new Map();
  private messageCleanupInterval: NodeJS.Timeout | null = null;
  private chatStorage: SupabaseChatStorage;
  private isBrowserMode = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  private regions: Map<string, Region> = new Map();
  private userOfficeMap: Map<string, string> = new Map();
  private userCompanyMap: Map<string, string> = new Map();

  private constructor(botToken: string) {
    this.botToken = botToken;
    this.chatStorage = new SupabaseChatStorage();
    this.connectionHealth = {
      isConnected: false,
      consecutiveErrors: 0,
      lastSuccessfulPoll: new Date(),
      lastError: null
    };
  }

  static getInstance(botToken?: string): TelegramBotService | null {
    if (!TelegramBotService.instance && botToken) {
      TelegramBotService.instance = new TelegramBotService(botToken);
    }
    return TelegramBotService.instance;
  }

  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    try {
      console.log('🚀 Initializing Telegram Bot Service...');

      // Load regions first
      await this.loadRegions();

      // Check if running in browser environment
      if (typeof window !== 'undefined') {
        console.log('🌐 Browser environment detected - attempting connection...');

        try {
          // Test connection with timeout
          this.botInfo = await this.getBotInfoWithTimeout(8000);
          console.log('✅ Bot info retrieved successfully:', this.botInfo?.username);

          // Clear any existing webhooks
          await this.clearWebhook();

          // Initialize polling
          await this.startPolling();

          this.isInitialized = true;
          this.updateConnectionHealth(true);
          this.reconnectAttempts = 0;

          console.log('✅ Telegram Bot Service initialized successfully in live mode');
          return true;
        } catch (error) {
          console.warn('⚠️ Telegram API not accessible, switching to offline mode:', error);
          await this.switchToBrowserMode();
          return true;
        }
      }

      // Server environment fallback
      console.log('🖥️ Server environment detected');
      this.botInfo = await this.getBotInfoFromAPI();
      await this.clearWebhook();
      await this.startPolling();

      this.isInitialized = true;
      this.updateConnectionHealth(true);
      console.log('✅ Telegram Bot Service initialized successfully in server mode');
      return true;

    } catch (error) {
      console.error('❌ Failed to initialize Telegram Bot Service:', error);
      await this.switchToBrowserMode();
      return true; // Still return true as we have fallback mode
    }
  }

  private async switchToBrowserMode(): Promise<void> {
    console.log('🔄 Switching to browser mode...');

    // Stop any active polling
    this.stopPolling();

    // Set browser mode
    this.isBrowserMode = true;
    this.botInfo = { id: 0, first_name: 'Offline Bot', username: 'offline_bot' };
    this.isInitialized = true;
    this.updateConnectionHealth(false);

    // Load existing conversations from database
    await this.loadConversationsFromDatabase();

    console.log('✅ Successfully switched to browser mode');
  }

  private async loadConversationsFromDatabase(): Promise<void> {
    try {
      const conversations = await this.chatStorage.getAllConversations(false);

      for (const conversation of conversations) {
        if (conversation.telegramChatIdentifier && conversation.telegramChatIdentifier !== 'system') {
          const chatId = conversation.telegramChatIdentifier;

          // Load recent messages for this conversation
          const messages = await this.chatStorage.getConversationHistory(
              conversation.id,
              50,
              0,
              false
          );

          // Convert and store messages
          const serviceMessages = messages.map(msg => this.convertChatMessageToServiceMessage(msg, chatId));
          this.messages.set(chatId, serviceMessages);

          // Create chat entry
          const lastMessage = serviceMessages[serviceMessages.length - 1];
          if (lastMessage) {
            this.updateChat(chatId, conversation.name, lastMessage);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load conversations from database:', error);
    }
  }

  private async loadRegions(): Promise<void> {
    try {
      const { data, error } = await this.chatStorage.supabase
          .from('regions')
          .select('id, name, code, country')
          .eq('is_active', true);

      if (error) throw error;

      this.regions.clear();
      data.forEach(region => this.regions.set(region.id, region));
      console.log(`📍 Loaded ${data.length} regions`);
    } catch (error) {
      console.error('Failed to load regions:', error);
    }
  }

  private async clearWebhook(): Promise<void> {
    try {
      console.log('🧹 Clearing any existing webhooks...');
      await this.makeAPIRequest('deleteWebhook', {}, 5000);
      console.log('✅ Webhooks cleared successfully');
    } catch (error) {
      console.warn('⚠️ Could not clear webhooks (this is usually fine):', this.getErrorMessage(error));
    }
  }

  private async startPolling(): Promise<void> {
    if (this.isPolling) {
      console.log('⚠️ Polling already active');
      return;
    }

    this.isPolling = true;
    this.pollingAbortController = new AbortController();

    console.log('🔄 Starting message polling...');

    // Start message cleanup
    this.startMessageCleanup();

    // Start the polling loop
    this.pollLoop();
  }

  private async pollLoop(): Promise<void> {
    while (this.isPolling && !this.pollingAbortController?.signal.aborted) {
      try {
        await this.pollForUpdates();
        this.updateConnectionHealth(true);
        this.reconnectAttempts = 0;

        // Short delay between successful polls
        await this.sleep(1000);
      } catch (error) {
        console.error('❌ Polling error:', error);
        this.updateConnectionHealth(false, error);

        // Handle different types of errors
        const errorMessage = this.getErrorMessage(error);
        if (errorMessage.includes('409') || errorMessage.includes('Conflict') || errorMessage.includes('webhook') || errorMessage.includes('polling')) {
          await this.switchToBrowserMode();
          break;
        }

        // Exponential backoff for retries
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        console.log(`⏳ Retrying in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);

        await this.sleep(delay);
        this.reconnectAttempts++;

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error('❌ Max reconnection attempts reached, switching to browser mode');
          await this.switchToBrowserMode();
          break;
        }
      }
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private stopPolling(): void {
    if (this.isPolling) {
      console.log('⏹️ Stopping polling...');
      this.isPolling = false;

      if (this.pollingAbortController) {
        this.pollingAbortController.abort();
        this.pollingAbortController = null;
      }
    }
  }



  private async handleCallbackQuery(callbackQuery: any): Promise<void> {
    const chatId = callbackQuery.message.chat.id.toString();
    const userId = callbackQuery.from.id.toString();
    const callbackData = callbackQuery.data;

    try {
      if (callbackData?.startsWith('select_region_')) {
        const regionId = callbackData.replace('select_region_', '');
        await this.handleRegionSelection(chatId, regionId);
      } else if (callbackData?.startsWith('select_office_')) {
        const officeId = callbackData.replace('select_office_', '');
        await this.selectOffice(userId, chatId, officeId);
      }

      // Answer callback query
      if (callbackQuery.id) {
        await this.makeAPIRequest('answerCallbackQuery', {
          callback_query_id: callbackQuery.id
        }, 5000);
      }
    } catch (error) {
      console.error('❌ Error handling callback query:', error);
    }
  }

  private async handleRegionSelection(chatId: string, regionId: string): Promise<void> {
    try {
      // Update conversation metadata
      const { data: existingConversation } = await this.chatStorage.supabase
          .from('conversations')
          .select('id, metadata')
          .eq('telegram_chat_identifier', chatId)
          .single();

      if (existingConversation) {
        await this.chatStorage.supabase
            .from('conversations')
            .update({
              metadata: { ...existingConversation.metadata, regionId }
            })
            .eq('id', existingConversation.id);
      } else {
        const conversation: Conversation = {
          id: crypto.randomUUID(),
          type: 'direct',
          name: `Chat ${chatId}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          unreadCount: 0,
          isArchived: false,
          isMuted: false,
          settings: {
            retentionDays: 365,
            autoBackup: true,
            encryptionEnabled: false,
            allowFileSharing: true,
            maxFileSize: 50 * 1024 * 1024,
            allowedFileTypes: ['image/*', 'application/pdf', 'text/*'],
            supportedDocumentTypes: ['pdf', 'doc', 'docx', 'txt']
          },
          telegramChatIdentifier: chatId,
          metadata: { companyId: null }
        };
        await this.chatStorage.storeConversation(conversation);
      }

      await this.showOfficesMenu(chatId, regionId);
    } catch (error) {
      console.error('❌ Error handling region selection:', error);
      await this.sendMessage(chatId, 'Error selecting region. Please try again.');
    }
  }

  private async makeAPIRequest(method: string, params: any = {}, timeoutMs: number = 10000): Promise<any> {
    const url = `https://api.telegram.org/bot${this.botToken}/${method}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.ok) {
        throw new Error(`Telegram API Error: ${data.description}`);
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private async getBotInfoFromAPI(): Promise<BotInfo> {
    const response = await this.makeAPIRequest('getMe', {}, 5000);
    return response.result;
  }

  private async getBotInfoWithTimeout(timeoutMs: number): Promise<BotInfo> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, timeoutMs);

      this.getBotInfoFromAPI()
          .then(info => {
            clearTimeout(timeout);
            resolve(info);
          })
          .catch(error => {
            clearTimeout(timeout);
            reject(error);
          });
    });
  }

  private async handleIncomingTelegramMessage(telegramMessage: TelegramMessage, isEdit: boolean): Promise<void> {
    const chatId = telegramMessage.chat.id.toString();
    const telegramMessageId = telegramMessage.message_id;

    // Determine sender name
    let senderName = telegramMessage.from.first_name;
    if (telegramMessage.from.username) {
      senderName += ` (@${telegramMessage.from.username})`;
    }

    // Determine chat name
    let chatName = '';
    if (telegramMessage.chat.type === 'private') {
      chatName = telegramMessage.chat.first_name || telegramMessage.chat.username || 'Private Chat';
    } else {
      chatName = telegramMessage.chat.title || `Group ${chatId}`;
    }

    // Handle /start command
    if (telegramMessage.text?.startsWith('/start')) {
      await this.sendMessage(chatId, 'Welcome to LegalFlow! Please select a region to continue.');
      await this.showRegionsMenu(chatId);
      return;
    }

    // Process message content and attachments
    const { content, messageType, attachments } = this.processMessageContent(telegramMessage);

    try {
      // Get or create conversation UUID
      const conversationUuid = await this.chatStorage.getOrCreateConversationUUID(
          chatId,
          senderName,
          'Bot'
      );

      // Check if this message already exists in Supabase
      const existingMessage = await this.chatStorage.getMessageByTelegramId(
          conversationUuid,
          telegramMessageId
      );

      if (existingMessage && isEdit) {
        // Update existing message
        const updatedMessage: Partial<ChatMessage> = {
          content,
          editedAt: new Date((telegramMessage.edit_date || telegramMessage.date) * 1000),
          isEdited: true,
          timestamp: new Date(telegramMessage.date * 1000),
          messageType: (
            messageType === 'photo' ? 'image' :
            messageType === 'voice' ? 'audio' :
            messageType === 'sticker' ? 'image' :
            messageType
          ) || 'text',
          attachments: attachments.map(att => ({
            id: att.id,
            fileName: att.fileName,
            fileSize: att.fileSize,
            mimeType: att.mimeType,
            url: att.url,
            localPath: undefined,
            thumbnail: att.thumbnail?.fileId,
            duration: att.duration,
            dimensions: att.dimensions
          }))
        };

        const success = await this.chatStorage.updateMessage(existingMessage.id, updatedMessage);

        if (success) {
          // Update local message cache
          this.updateLocalMessage(chatId, existingMessage.id, {
            content,
            isEdited: true,
            timestamp: updatedMessage.timestamp!,
            messageType,
            attachments
          });

          console.log(`📝 Updated message ${telegramMessageId} in chat ${chatId}`);
        }
        return;
      } else if (existingMessage && !isEdit) {
        // Message already exists and this is not an edit, skip
        console.log(`⏭️ Skipping duplicate message ${telegramMessageId} in chat ${chatId}`);
        return;
      }

      // Create new message
      const messageId = crypto.randomUUID();
      const serviceMessage: ServiceMessage = {
        id: messageId,
        content,
        messageType,
        timestamp: new Date(telegramMessage.date * 1000),
        direction: 'incoming',
        status: 'delivered',
        senderName,
        isEdited: isEdit,
        chatId,
        telegramMessageId,
        attachments
      };

      // Store message locally
      this.storeMessage(chatId, serviceMessage);

      // Store in Supabase
      const chatMessage: ChatMessage = {
        id: serviceMessage.id,
        conversationId: conversationUuid,
        senderId: telegramMessage.from.id.toString(),
        senderName: serviceMessage.senderName,
        recipientId: 'Bot',
        recipientName: 'Bot',
        content: serviceMessage.content,
        messageType: (
          serviceMessage.messageType === 'photo' ? 'image' :
          serviceMessage.messageType === 'voice' ? 'audio' :
          serviceMessage.messageType === 'sticker' ? 'image' :
          serviceMessage.messageType
        ) || 'text',
        timestamp: serviceMessage.timestamp,
        editedAt: serviceMessage.isEdited ? serviceMessage.timestamp : undefined,
        isEdited: serviceMessage.isEdited,
        status: serviceMessage.status,
        attachments: (serviceMessage.attachments || []).map(att => ({
          id: att.id,
          fileName: att.fileName,
          fileSize: att.fileSize,
          mimeType: att.mimeType,
          url: att.url,
          localPath: undefined,
          thumbnail: att.thumbnail?.fileId,
          duration: att.duration,
          dimensions: att.dimensions
        })),
        metadata: {},
        isDeleted: false,
        telegramMessageId: serviceMessage.telegramMessageId
      };
      await this.chatStorage.storeMessage(chatMessage);

      // Update or create chat
      this.updateChat(chatId, chatName, serviceMessage);

      // Update unread count and notify
      if (this.callbacks?.onUnreadCountChange) {
        this.callbacks.onUnreadCountChange(this.getUnreadCount());
      }

      // Notify callbacks
      if (this.callbacks?.onNewMessage) {
        this.callbacks.onNewMessage(serviceMessage);
      }

      const logContent = (messageType || 'text') === 'text' ? serviceMessage.content.substring(0, 50) : `[${(messageType || 'text').toUpperCase()}]`;
      console.log(`📨 ${isEdit ? 'Updated' : 'New'} ${messageType} message from ${senderName} in ${chatName}: ${logContent}...`);
    } catch (error) {
      console.error('❌ Failed to handle incoming Telegram message:', error);
    }
  }
  private async pollForUpdates(): Promise<void> {
    try {
      console.log('🔍 Making request to Telegram API...');
      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/getUpdates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offset: this.lastUpdateId + 1, limit: 100, timeout: 10 })
      });
      console.log('🔍 Response received:', response);

      if (!response) {
        throw new Error('No response from Telegram API');
      }

      const updates: TelegramUpdate[] = (await response.json()).result;

      for (const update of updates) {
        if (update.message) {
          await this.handleIncomingTelegramMessage(update.message, false);
        }
        if (update.edited_message) {
          await this.handleIncomingTelegramMessage(update.edited_message, true);
        }
        if ((update as any).callback_query) {
          const callback_query = (update as any).callback_query;
          const chatId = callback_query.message.chat.id.toString();
          const userId = callback_query.from.id.toString();
          const callbackData = callback_query.data;

          if (callbackData.startsWith('select_region_')) {
            const regionId = callbackData.replace('select_region_', '');
            await this.showOfficesMenu(chatId, regionId);
          } else if (callbackData.startsWith('select_office_')) {
            const officeId = callbackData.replace('select_office_', '');
            await this.selectOffice(userId, chatId, officeId);
          }

          await this.makeAPIRequest('answerCallbackQuery', {
            callback_query_id: callback_query.id
          });
        }
        this.lastUpdateId = Math.max(this.lastUpdateId, update.update_id);
      }
    } catch (error: any) {
      if (error.message?.includes('Network') || error.message?.includes('timeout')) {
        console.warn('⚠️ Network issue detected - switching to browser mode');
        await this.switchToBrowserMode();
        return;
      }
      console.error('Polling error:', error);
    }
  }
  private processMessageContent(telegramMessage: TelegramMessage): {
    content: string;
    messageType: ServiceMessage['messageType'];
    attachments: FileAttachment[];
  } {
    const attachments: FileAttachment[] = [];
    let content = telegramMessage.text || telegramMessage.caption || '';
    let messageType: ServiceMessage['messageType'] = 'text';

    // Handle photos
    if (telegramMessage.photo && telegramMessage.photo.length > 0) {
      messageType = 'photo';
      const largestPhoto = telegramMessage.photo.reduce((prev, current) =>
          (prev.file_size || 0) > (current.file_size || 0) ? prev : current
      );

      attachments.push({
        id: crypto.randomUUID(),
        fileName: `photo_${largestPhoto.file_id}.jpg`,
        fileSize: largestPhoto.file_size || 0,
        mimeType: 'image/jpeg',
        fileId: largestPhoto.file_id,
        dimensions: {
          width: largestPhoto.width,
          height: largestPhoto.height
        }
      });

      if (!content) {
        content = '📷 Photo';
      }
    }

    // Handle documents
    if (telegramMessage.document) {
      messageType = 'document';
      const doc = telegramMessage.document;

      attachments.push({
        id: crypto.randomUUID(),
        fileName: doc.file_name || `document_${doc.file_id}`,
        fileSize: doc.file_size || 0,
        mimeType: doc.mime_type || 'application/octet-stream',
        fileId: doc.file_id,
        thumbnail: doc.thumbnail ? {
          fileId: doc.thumbnail.file_id,
          width: doc.thumbnail.width,
          height: doc.thumbnail.height
        } : undefined
      });

      if (!content) {
        content = `📄 ${doc.file_name || 'Document'}`;
      }
    }

    // Handle videos
    if (telegramMessage.video) {
      messageType = 'video';
      const video = telegramMessage.video;

      attachments.push({
        id: crypto.randomUUID(),
        fileName: video.file_name || `video_${video.file_id}.mp4`,
        fileSize: video.file_size || 0,
        mimeType: video.mime_type || 'video/mp4',
        fileId: video.file_id,
        duration: video.duration,
        dimensions: {
          width: video.width,
          height: video.height
        },
        thumbnail: video.thumbnail ? {
          fileId: video.thumbnail.file_id,
          width: video.thumbnail.width,
          height: video.thumbnail.height
        } : undefined
      });

      if (!content) {
        content = `🎥 Video (${this.formatDuration(video.duration)})`;
      }
    }

    // Handle audio
    if (telegramMessage.audio) {
      messageType = 'audio';
      const audio = telegramMessage.audio;

      attachments.push({
        id: crypto.randomUUID(),
        fileName: audio.file_name || `${audio.performer || 'Unknown'} - ${audio.title || 'Audio'}.mp3`,
        fileSize: audio.file_size || 0,
        mimeType: audio.mime_type || 'audio/mpeg',
        fileId: audio.file_id,
        duration: audio.duration
      });

      if (!content) {
        const title = audio.title || 'Audio';
        const performer = audio.performer || 'Unknown Artist';
        content = `🎵 ${performer} - ${title} (${this.formatDuration(audio.duration)})`;
      }
    }

    // Handle voice messages
    if (telegramMessage.voice) {
      messageType = 'voice';
      const voice = telegramMessage.voice;

      attachments.push({
        id: crypto.randomUUID(),
        fileName: `voice_${voice.file_id}.ogg`,
        fileSize: voice.file_size || 0,
        mimeType: voice.mime_type || 'audio/ogg',
        fileId: voice.file_id,
        duration: voice.duration
      });

      if (!content) {
        content = `🎤 Voice message (${this.formatDuration(voice.duration)})`;
      }
    }

    // Handle stickers
    if (telegramMessage.sticker) {
      messageType = 'sticker';
      const sticker = telegramMessage.sticker;

      attachments.push({
        id: crypto.randomUUID(),
        fileName: `sticker_${sticker.file_id}.webp`,
        fileSize: sticker.file_size || 0,
        mimeType: 'image/webp',
        fileId: sticker.file_id,
        dimensions: {
          width: sticker.width,
          height: sticker.height
        }
      });

      if (!content) {
        content = `${sticker.emoji || '🎭'} Sticker`;
      }
    }

    // If no content and no recognized media type, provide fallback
    if (!content && attachments.length === 0) {
      content = '[Unsupported message type]';
      messageType = 'text';
    }

    return { content, messageType, attachments };
  }

  private formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  private async showRegionsMenu(chatId: string): Promise<void> {
    try {
      const regions = Array.from(this.regions.values());
      if (regions.length === 0) {
        await this.sendMessage(chatId, 'No regions available. Please contact support.');
        return;
      }

      const inlineKeyboard = regions.map(region => [
        { text: region.name, callback_data: `select_region_${region.id}` }
      ]);

      await this.makeAPIRequest('sendMessage', {
        chat_id: parseInt(chatId),
        text: 'Please select a region:',
        reply_markup: { inline_keyboard: inlineKeyboard }
      }, 5000);
    } catch (error) {
      console.error('❌ Failed to show regions menu:', error);
      await this.sendMessage(chatId, 'Failed to show regions. Please try again.');
    }
  }

  private async showOfficesMenu(chatId: string, regionId: string): Promise<void> {
    try {
      const offices = await this.loadOfficesByRegion(regionId);
      if (offices.length === 0) {
        await this.sendMessage(chatId, 'No offices found in this region. Please contact support.');
        return;
      }

      const inlineKeyboard = offices.map(office => [
        { text: `${office.name} (${office.address})`, callback_data: `select_office_${office.id}` }
      ]);

      await this.makeAPIRequest('sendMessage', {
        chat_id: parseInt(chatId),
        text: 'Please select an office:',
        reply_markup: { inline_keyboard: inlineKeyboard }
      }, 5000);
    } catch (error) {
      console.error('❌ Failed to show offices menu:', error);
      await this.sendMessage(chatId, 'Failed to show offices. Please try again.');
    }
  }

  private async loadOfficesByRegion(regionId: string): Promise<Office[]> {
    try {
      const { data: companies, error: companyError } = await this.chatStorage.supabase
          .from('companies')
          .select('id, office_id')
          .eq('region_id', regionId)
          .eq('status', 'active');

      if (companyError) throw companyError;

      if (!companies || companies.length === 0) {
        return [];
      }

      const officeIds = companies.map(c => c.office_id).filter(id => id);
      const { data: offices, error: officeError } = await this.chatStorage.supabase
          .from('offices')
          .select('id, name, address')
          .in('id', officeIds)
          .order('address', { ascending: true });

      if (officeError) throw officeError;

      const officesWithCompany = offices.map(office => ({
        ...office,
        companyId: companies.find(c => c.office_id === office.id)?.id
      }));

      return officesWithCompany;
    } catch (error) {
      console.error('❌ Failed to load offices for region:', error);
      return [];
    }
  }

  private async selectOffice(userId: string, chatId: string, officeId: string): Promise<void> {
    try {
      const { data: conversation } = await this.chatStorage.supabase
          .from('conversations')
          .select('metadata')
          .eq('telegram_chat_identifier', chatId)
          .single();

      const regionId = conversation?.metadata?.regionId || 'f28b48e8-3bc7-4d7f-b6a1-ba7e81549256';

      const offices = await this.loadOfficesByRegion(regionId);
      const office = offices.find(o => o.id === officeId);

      if (!office) {
        await this.sendMessage(chatId, 'Office not found. Please try again.');
        return;
      }

      const companyId = office.companyId;
      if (!companyId) {
        await this.sendMessage(chatId, 'No company associated with this office. Please contact support.');
        return;
      }

      this.userOfficeMap.set(userId, officeId);
      this.userCompanyMap.set(userId, companyId);

      const { data: existingConversation } = await this.chatStorage.supabase
          .from('conversations')
          .select('id, metadata')
          .eq('telegram_chat_identifier', chatId)
          .single();

      if (existingConversation) {
        await this.chatStorage.supabase
            .from('conversations')
            .update({
              metadata: {
                ...existingConversation.metadata,
                companyId,
                officeId
              }
            })
            .eq('id', existingConversation.id);
      } else {
        const conversation: Conversation = {
          id: crypto.randomUUID(),
          type: 'direct',
          name: `Chat ${chatId}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          unreadCount: 0,
          isArchived: false,
          isMuted: false,
          settings: {
            retentionDays: 365,
            autoBackup: true,
            encryptionEnabled: false,
            allowFileSharing: true,
            maxFileSize: 50 * 1024 * 1024,
            allowedFileTypes: ['image/*', 'application/pdf', 'text/*']
          },
          telegramChatIdentifier: chatId,
          metadata: { companyId, officeId, regionId }
        };
        await this.chatStorage.storeConversation(conversation);
      }

      await this.sendMessage(chatId, `✅ You selected office: ${office.name} (${office.address})\n\nYou can now communicate with the associated company.`);
    } catch (error) {
      console.error('❌ Failed to select office:', error);
      await this.sendMessage(chatId, 'Failed to select office. Please try again.');
    }
  }

  async sendMessage(chatId: string, text: string, options: any = {}): Promise<boolean> {

    return this.sendMessageWithFile(chatId, text, undefined, options);
  }

  async sendMessageWithFile(chatId: string, text: string, file?: File, options: any = {}): Promise<boolean> {
    // In browser mode, simulate message sending by storing locally
    if (this.isBrowserMode) {
      return this.simulateMessageSending(chatId, text, file);
    }

    try {
      console.log(`📤 Sending message to chat ${chatId}: ${text.substring(0, 50)}...`);

      let telegramMessage;
      if (file) {
        // Send file with caption
        console.log(`📎 Sending file: ${file.name} (${file.size} bytes, ${file.type})`);
        
        const formData = new FormData();
        formData.append('chat_id', chatId);
        formData.append('caption', text);
        formData.append('document', file);
        
        const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendDocument`, {
          method: 'POST',
          body: formData
        });

        console.log('📡 Response status:', response.status);
        console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Telegram API error:', response.status, errorText);
          throw new Error(`Telegram API error: ${response.status} - ${errorText}`);
        }

        const responseData = await response.json();
        console.log('📡 Response data:', responseData);
        
        if (!responseData.ok) {
          console.error('❌ Telegram API error:', responseData);
          throw new Error(`Telegram API error: ${responseData.description}`);
        }

        telegramMessage = responseData.result;
        console.log('📎 File sent successfully:', telegramMessage);
      } else {
        // Send text message
        const response = await this.makeAPIRequest('sendMessage', {
          chat_id: parseInt(chatId),
          text,
          ...options
        });
        telegramMessage = response.result;
      }

      // Create service message for sent message
      const conversationUuid = await this.chatStorage.getOrCreateConversationUUID(
          chatId,
          'Bot',
          'User'
      );

      const serviceMessage: ServiceMessage = {
        id: crypto.randomUUID(),
        content: text,
        messageType: file ? 'document' : 'text',
        timestamp: new Date(telegramMessage.date * 1000),
        direction: 'outgoing',
        status: 'sent',
        senderName: this.botInfo?.first_name || 'Bot',
        isEdited: false,
        chatId,
        telegramMessageId: telegramMessage.message_id,
        attachments: file ? [{
          id: crypto.randomUUID(),
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          fileId: telegramMessage.document?.file_id || '',
          url: undefined
        }] : undefined
      };

      // Store the sent message
      this.storeMessage(chatId, serviceMessage);
      await this.storeMessageInSupabase(serviceMessage, chatId, telegramMessage.message_id);

      // Update chat
      const chat = this.chats.get(chatId);
      if (chat) {
        chat.lastMessage = serviceMessage;
        chat.lastActivity = serviceMessage.timestamp;
      }

      // Notify callbacks
      if (this.callbacks?.onNewMessage) {
        this.callbacks.onNewMessage(serviceMessage);
      }

      console.log('✅ Message sent successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      return false;
    }
  }

  private async simulateMessageSending(chatId: string, text: string, file?: File): Promise<boolean> {
    try {
      const serviceMessage: ServiceMessage = {
        id: crypto.randomUUID(),
        content: text,
        timestamp: new Date(),
        direction: 'outgoing',
        status: 'sent',
        senderName: 'You',
        isEdited: false,
        chatId,
        messageType: file ? 'document' : 'text',
        attachments: file ? [{
          id: crypto.randomUUID(),
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          fileId: '',
          url: URL.createObjectURL(file)
        }] : undefined
      };

      // Store the message locally
      this.storeMessage(chatId, serviceMessage);

      // Store in Supabase
      await this.storeMessageInSupabase(serviceMessage, chatId);

      // Update chat
      const chat = this.chats.get(chatId);
      if (chat) {
        chat.lastMessage = serviceMessage;
        chat.lastActivity = serviceMessage.timestamp;
      }

      // Notify callbacks
      if (this.callbacks?.onNewMessage) {
        this.callbacks.onNewMessage(serviceMessage);
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to simulate message sending:', error);
      return false;
    }
  }

  private storeMessage(chatId: string, message: ServiceMessage): void {
    if (!this.messages.has(chatId)) {
      this.messages.set(chatId, []);
    }

    const chatMessages = this.messages.get(chatId)!;

    // Check for duplicates
    const exists = chatMessages.find(m =>
        m.id === message.id ||
        (m.telegramMessageId && message.telegramMessageId && m.telegramMessageId === message.telegramMessageId)
    );

    if (!exists) {
      chatMessages.push(message);

      // Keep only last 1000 messages per chat
      if (chatMessages.length > 1000) {
        chatMessages.splice(0, chatMessages.length - 1000);
      }

      // Sort by timestamp
      chatMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    }
  }

  private updateChat(chatId: string, chatName: string, lastMessage: ServiceMessage): void {
    const existingChat = this.chats.get(chatId);

    const chat: ServiceChat = {
      id: chatId,
      name: chatName,
      lastMessage,
      unreadCount: existingChat ? existingChat.unreadCount + 1 : 1,
      lastActivity: lastMessage.timestamp
    };

    this.chats.set(chatId, chat);
  }

  private updateLocalMessage(chatId: string, messageId: string, updates: Partial<ServiceMessage>): void {
    const chatMessages = this.messages.get(chatId);
    if (chatMessages) {
      const messageIndex = chatMessages.findIndex(m => m.id === messageId);
      if (messageIndex !== -1) {
        chatMessages[messageIndex] = { ...chatMessages[messageIndex], ...updates };
      }
    }
  }

  private startMessageCleanup(): void {
    if (this.messageCleanupInterval) {
      return;
    }

    this.messageCleanupInterval = setInterval(() => {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      for (const [chatId, messages] of this.messages.entries()) {
        const filteredMessages = messages.filter(msg => msg.timestamp > oneWeekAgo);
        if (filteredMessages.length !== messages.length) {
          this.messages.set(chatId, filteredMessages);
          console.log(`🧹 Cleaned up ${messages.length - filteredMessages.length} old messages for chat ${chatId}`);
        }
      }
    }, 60 * 60 * 1000); // Every hour
  }

  private updateConnectionHealth(isConnected: boolean, error?: any): void {
    this.connectionHealth.isConnected = isConnected;

    if (isConnected) {
      this.connectionHealth.consecutiveErrors = 0;
      this.connectionHealth.lastSuccessfulPoll = new Date();
      this.connectionHealth.lastError = null;
    } else {
      this.connectionHealth.consecutiveErrors++;
      this.connectionHealth.lastError = error;
    }

    if (this.callbacks?.onConnectionChange) {
      this.callbacks.onConnectionChange(isConnected);
    }
  }

  private getErrorMessage(error: any): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  private async storeMessageInSupabase(message: ServiceMessage, telegramChatIdString: string, telegramMessageId?: number): Promise<void> {
    try {
      const conversationUuid = await this.chatStorage.getOrCreateConversationUUID(
          telegramChatIdString,
          message.senderName,
          message.direction === 'outgoing' ? 'User' : 'Bot'
      );

      const chatMessage: ChatMessage = {
        id: message.id,
        conversationId: conversationUuid,
        senderId: message.direction === 'outgoing' ? 'user' : telegramChatIdString,
        senderName: message.senderName,
        recipientId: message.direction === 'outgoing' ? telegramChatIdString : 'bot',
        recipientName: message.direction === 'outgoing' ? 'User' : 'Bot',
        content: message.content,
        messageType: (
          message.messageType === 'photo' ? 'image' :
          message.messageType === 'voice' ? 'audio' :
          message.messageType === 'sticker' ? 'image' :
          message.messageType
        ) || 'text',
        timestamp: message.timestamp,
        editedAt: message.isEdited ? message.timestamp : undefined,
        isEdited: message.isEdited,
        status: message.status,
        attachments: (message.attachments || []).map(att => ({
          id: att.id,
          fileName: att.fileName,
          fileSize: att.fileSize,
          mimeType: att.mimeType,
          url: att.url,
          localPath: undefined,
          thumbnail: att.thumbnail?.fileId,
          duration: att.duration,
          dimensions: att.dimensions
        })),
        metadata: {
          direction: message.direction,
          telegramFileIds: message.attachments?.map(att => att.fileId) || []
        },
        isDeleted: false,
        telegramMessageId: telegramMessageId || message.telegramMessageId
      };

      await this.chatStorage.storeMessage(chatMessage);
    } catch (error) {
      console.error('❌ Failed to store message in Supabase:', error);
    }
  }

  private convertChatMessageToServiceMessage(chatMessage: ChatMessage, chatId: string): ServiceMessage {
    return {
      id: chatMessage.id,
      content: chatMessage.content,
      timestamp: chatMessage.timestamp,
      direction: chatMessage.senderId === 'user' ? 'outgoing' : 'incoming',
      status: chatMessage.status as ServiceMessage['status'],
      senderName: chatMessage.senderName,
      isEdited: chatMessage.isEdited,
      chatId: chatId,
      telegramMessageId: chatMessage.telegramMessageId,
      attachments: (chatMessage.attachments || []).map(att => ({
        id: att.id,
        fileName: att.fileName,
        fileSize: att.fileSize,
        mimeType: att.mimeType,
        fileId: (chatMessage.metadata as any)?.telegramFileIds?.[0] || '',
        url: att.url,
        thumbnail: att.thumbnail ? {
          fileId: att.thumbnail,
          width: att.dimensions?.width || 0,
          height: att.dimensions?.height || 0
        } : undefined,
        duration: att.duration,
        dimensions: att.dimensions
      })) || [],

      messageType: (
        chatMessage.messageType === 'photo' ? 'image' :
        chatMessage.messageType === 'voice' ? 'audio' :
        chatMessage.messageType === 'sticker' ? 'image' :
        chatMessage.messageType
      ) || 'text'
    };
  }

  // Public interface methods
  addCallbacks(callbacks: ServiceCallbacks): () => void {
    this.callbacks = callbacks;
    return () => {
      this.callbacks = null;
    };
  }

  getAllChats(): ServiceChat[] {
    return Array.from(this.chats.values()).sort((a, b) =>
        b.lastActivity.getTime() - a.lastActivity.getTime()
    );
  }

  getMessagesForChat(chatId: string): ServiceMessage[] {
    const messages = this.messages.get(chatId) || [];
    return messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  markMessagesAsRead(chatId: string): void {
    const chat = this.chats.get(chatId);
    if (chat) {
      chat.unreadCount = 0;

      if (this.callbacks?.onUnreadCountChange) {
        this.callbacks.onUnreadCountChange(this.getUnreadCount());
      }
    }
  }

  getBotInfo(): BotInfo | null {
    return this.botInfo;
  }

  isConnectionActive(): boolean {
    return this.connectionHealth.isConnected && !this.isBrowserMode;
  }

  getConnectionHealth(): ConnectionHealth {
    return { ...this.connectionHealth };
  }

  isBrowserModeActive(): boolean {
    return this.isBrowserMode;
  }

  getUnreadCount(): number {
    let totalUnread = 0;
    for (const chat of this.chats.values()) {
      totalUnread += chat.unreadCount;
    }
    return totalUnread;
  }

  async getFileUrl(fileId: string): Promise<string | null> {
    if (this.isBrowserMode) {
      return null;
    }

    try {
      const response = await this.makeAPIRequest('getFile', { file_id: fileId }, 5000);
      const filePath = response.result.file_path;
      return `https://api.telegram.org/file/bot${this.botToken}/${filePath}`;
    } catch (error) {
      console.error('❌ Failed to get file URL:', error);
      return null;
    }
  }

  async reconnect(): Promise<boolean> {
    console.log('🔄 Reconnecting...');

    this.disconnect();
    await this.sleep(1000);

    return await this.initialize();
  }

  disconnect(): void {
    console.log('🔌 Disconnecting Telegram Bot Service...');

    // Stop polling
    this.stopPolling();

    // Clear cleanup interval
    if (this.messageCleanupInterval) {
      clearInterval(this.messageCleanupInterval);
      this.messageCleanupInterval = null;
    }

    // Clear reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Reset state
    this.isInitialized = false;
    this.reconnectAttempts = 0;
    this.updateConnectionHealth(false);
  }

  clearLocalCaches(): void {
    this.chats.clear();
    this.messages.clear();
    this.chatStorage.clearConversationCache();
  }

  static resetInstance(): void {
    if (TelegramBotService.instance) {
      TelegramBotService.instance.disconnect();
      TelegramBotService.instance = null;
    }
  }
}