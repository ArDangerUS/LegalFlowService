import { supabase, supabaseConfig, testSupabaseConnection } from '../lib/supabase';
import { networkService } from './NetworkService';
import { offlineService } from './OfflineService';
import type { Database } from '../lib/supabase';
import type { User } from '../types/legal';

type ConversationRow = Database['public']['Tables']['conversations']['Row'];
type MessageRow = Database['public']['Tables']['messages']['Row'];
type ConversationInsert = Database['public']['Tables']['conversations']['Insert'];
type MessageInsert = Database['public']['Tables']['messages']['Insert'];
type MessageUpdate = Database['public']['Tables']['messages']['Update'];

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  content: string;
  messageType: 'text' | 'file' | 'image' | 'audio' | 'video' | 'document';
  timestamp: Date;
  editedAt?: Date;
  isEdited: boolean;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  attachments?: MessageAttachment[];
  metadata?: Record<string, any>;
  threadId?: string;
  replyToId?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  telegramMessageId?: number;
}

export interface MessageAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileExtension?: string;
  url?: string;
  localPath?: string;
  thumbnail?: string;
  duration?: number;
  dimensions?: { width: number; height: number };
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group' | 'channel';
  name: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessageId?: string;
  unreadCount: number;
  isArchived: boolean;
  isMuted: boolean;
  settings: ConversationSettings;
  metadata?: Record<string, any>;
  telegramChatIdentifier?: string;
}

export interface ConversationSettings {
  retentionDays: number;
  autoBackup: boolean;
  encryptionEnabled: boolean;
  allowFileSharing: boolean;
  maxFileSize: number;
  allowedFileTypes: string[];
  supportedDocumentTypes: string[];
}

export class SupabaseChatStorage {
  private conversationUuidCache = new Map<string, string>();
  readonly supabase: typeof supabase;
  constructor() {
    this.supabase = supabase;
  }

  /**
   * Check if Supabase is properly configured and connected
   */
  async verifyConnection(): Promise<{ success: boolean; error?: string }> {
    if (!supabaseConfig.isConfigured) {
      return {
        success: false,
        error: 'Supabase is not configured. Please check your environment variables.'
      };
    }

    return await testSupabaseConnection();
  }

  /**
   * Get or create a UUID for a conversation based on telegram chat identifier
   */
  async getOrCreateConversationUUID(
    telegramChatIdentifier: string,
    senderName: string,
    recipientName: string
  ): Promise<string> {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    // Check cache first
    if (this.conversationUuidCache.has(telegramChatIdentifier)) {
      return this.conversationUuidCache.get(telegramChatIdentifier)!;
    }

    try {
      // Try to find existing conversation
      const { data: existing, error: findError } = await supabase
        .from('conversations')
        .select('id')
        .eq('telegram_chat_identifier', telegramChatIdentifier);

      if (findError) {
        throw findError;
      }

      // If we found existing conversation(s), use the first one
      if (existing && existing.length > 0) {
        const conversationId = existing[0].id;
        this.conversationUuidCache.set(telegramChatIdentifier, conversationId);
        return conversationId;
      }

      // Create new conversation with UUID
      const newUuid = crypto.randomUUID();
      const conversation: Conversation = {
        id: newUuid,
        type: 'direct',
        name: telegramChatIdentifier === 'system' ? 'System Messages' : `${senderName} & ${recipientName}`,
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
          allowedFileTypes: [
            'image/*', 'application/pdf', 'text/*',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation'
          ]
        },
        telegramChatIdentifier
      };

      await this.storeConversation(conversation);
      this.conversationUuidCache.set(telegramChatIdentifier, newUuid);
      return newUuid;
    } catch (error) {
      console.error('Failed to get or create conversation UUID:', error);
      throw error;
    }
  }

  /**
   * Store a new message
   */
  async storeMessage(message: ChatMessage): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    try {
      const messageData: MessageInsert = {
        id: message.id,
        conversation_id: message.conversationId,
        sender_id: message.senderId,
        sender_name: message.senderName,
        recipient_id: message.recipientId,
        recipient_name: message.recipientName,
        content: message.content,
        message_type: message.messageType,
        timestamp: message.timestamp.toISOString(),
        edited_at: message.editedAt?.toISOString() || null,
        is_edited: message.isEdited,
        status: message.status,
        attachments: message.attachments || [],
        metadata: {
          ...message.metadata,
          telegramMessageId: message.telegramMessageId
        },
        thread_id: message.threadId || null,
        reply_to_id: message.replyToId || null,
        is_deleted: message.isDeleted,
        deleted_at: message.deletedAt?.toISOString() || null,
        telegram_message_id: message.telegramMessageId || null
      };

      const { error } = await supabase
        .from('messages')
        .upsert(messageData, { onConflict: 'id' });

      if (error) {
        throw error;
      }

      // Update conversation's last message
      await this.updateConversationLastMessage(message.conversationId, message.id);
    } catch (error) {
      console.error('Failed to store message:', error);
      throw error;
    }
  }

  /**
   * Get message by Telegram message ID and conversation ID
   */
  async getMessageByTelegramId(
    conversationId: string,
    telegramMessageId: number
  ): Promise<ChatMessage | null> {
    if (!supabase) {
      console.error('Supabase not configured - cannot get message by Telegram ID');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('telegram_message_id', telegramMessageId)
        .eq('is_deleted', false)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data ? this.mapMessageRowToChatMessage(data) : null;
    } catch (error) {
      console.error('Failed to get message by Telegram ID:', error);
      return null;
    }
  }

  /**
   * Update existing message (for edits)
   */
  async updateMessage(messageId: string, updates: Partial<ChatMessage>): Promise<boolean> {
    if (!supabase) {
      console.error('Supabase not configured - cannot update message');
      return false;
    }

    try {
      const updateData: MessageUpdate = {};

      if (updates.content !== undefined) updateData.content = updates.content;
      if (updates.editedAt !== undefined) updateData.edited_at = updates.editedAt.toISOString();
      if (updates.isEdited !== undefined) updateData.is_edited = updates.isEdited;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.senderName !== undefined) updateData.sender_name = updates.senderName;
      if (updates.timestamp !== undefined) updateData.timestamp = updates.timestamp.toISOString();

      const { error } = await supabase
        .from('messages')
        .update(updateData)
        .eq('id', messageId);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Failed to update message:', error);
      return false;
    }
  }

  /**
   * Get conversation history with role-based access control
   */
  async getConversationHistory(
    conversationUuid: string,
    limit: number = 50,
    offset: number = 0,
    includeDeleted: boolean = false,
    userRole?: User['role'],
    userId?: string
  ): Promise<ChatMessage[]> {
    // For now, we'll use the existing method
    // In a production system, you might want to add additional access controls here
    return this._fetchConversationHistory(
      conversationUuid,
      limit,
      offset,
      includeDeleted
    );
  }

  /**
   * Private method to fetch conversation history with pagination
   */
  private async _fetchConversationHistory(
    conversationUuid: string,
    limit: number = 50,
    offset: number = 0,
    includeDeleted: boolean = false
  ): Promise<ChatMessage[]> {
    if (!supabase) {
      console.warn('⚠️ Supabase not configured - returning empty conversation history');
      return [];
    }

    try {
      let query = supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationUuid)
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);

      if (!includeDeleted) {
        query = query.eq('is_deleted', false);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return (data || []).map(this.mapMessageRowToChatMessage);
    } catch (error: any) {
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        console.warn('⚠️ Cannot load conversation history - running in offline mode');
      } else {
        console.error('Failed to get conversation history:', {
          error: error.message,
          conversationUuid,
          supabaseConfigured: supabaseConfig.isConfigured
        });
      }
      return [];
    }
  }

  /**
   * Get all conversations
   */
  async getConversations(includeArchived: boolean = false): Promise<Conversation[]> {
    // Check network connectivity first
    if (!networkService.getConnectionStatus() || offlineService.getOfflineMode()) {
      console.warn('⚠️ Offline mode: returning cached conversations');
      return offlineService.getOfflineData('conversations');
    }

    if (!supabase) {
      console.warn('⚠️ Supabase not configured - returning empty conversations list');
      return offlineService.getOfflineData('conversations');
    }

    try {
      let query = supabase
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false });

      if (!includeArchived) {
        query = query.eq('is_archived', false);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const conversations = (data || []).map(this.mapConversationRowToConversation);

      // Cache conversations for offline use
      offlineService.setOfflineData('conversations', conversations);

      return conversations;
    } catch (error: any) {
      // If this is a fetch error, provide helpful guidance
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        console.warn('⚠️ Supabase connection failed - running in offline mode. Check your .env configuration and internet connection.');
        // Set offline mode
        offlineService.setOfflineMode(true);
      } else {
        console.error('Failed to get conversations:', {
          error: error.message,
          supabaseConfigured: supabaseConfig.isConfigured
        });
      }

      return offlineService.getOfflineData('conversations');
    }
  }

  /**
   * Get conversations filtered by user role and permissions with optional restriction to specific conversation
   */
  async getConversationsForUser(
    userId: string,
    userRole: User['role'],
    includeArchived: boolean = false,
    restrictToConversation?: string
  ): Promise<Conversation[]> {
    try {
      const conversations = await this._fetchConversationsForUser(userId, userRole, includeArchived);

      if (restrictToConversation) {
        return conversations.filter(conv =>
          conv.id === restrictToConversation ||
          conv.telegramChatIdentifier === restrictToConversation
        );
      }

      return conversations;
    } catch (error) {
      console.warn('⚠️ Could not load user conversations - running in offline mode');
      return [];
    }
  }

  /**
   * Private method to get conversations filtered by user role and permissions
   */
  private async _fetchConversationsForUser(
    userId: string,
    userRole: User['role'],
    includeArchived: boolean = false
  ): Promise<Conversation[]> {
    if (!supabase) {
      console.warn('⚠️ Supabase not configured - returning empty conversations list');
      return offlineService.getOfflineData('conversations');
    }

    // Admin users can see all conversations
    if (userRole === 'admin') {
      return this.getConversations(includeArchived);
    }

    // For lawyer role, only show conversations for cases assigned to them
    if (userRole === 'lawyer') {
      try {
        // First, get all conversation IDs for cases assigned to this lawyer
        const { data: assignedCases, error: casesError } = await supabase
          .from('cases')
          .select('conversation_id')
          .eq('assigned_lawyer_id', userId)
          .not('conversation_id', 'is', null);

        if (casesError) {
          console.error('Failed to get assigned cases:', casesError);
          return [];
        }

        const conversationIds = (assignedCases || [])
          .map(case_ => case_.conversation_id)
          .filter(id => id !== null);

        // If no assigned cases, return empty array
        if (conversationIds.length === 0) {
          console.log(`🔒 Lawyer ${userId} has no assigned cases, returning empty conversation list`);
          return [];
        }

        // Now get the conversations for these cases
        let query = supabase
          .from('conversations')
          .select('*')
          .in('id', conversationIds)
          .order('updated_at', { ascending: false });

        if (!includeArchived) {
          query = query.eq('is_archived', false);
        }

        const { data, error } = await query;

        if (error) {
          throw error;
        }

        console.log(`🔒 Lawyer ${userId} can access ${(data || []).length} conversations for their assigned cases`);
        return (data || []).map(this.mapConversationRowToConversation);
      } catch (error: any) {
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          console.warn('⚠️ Cannot load lawyer conversations - running in offline mode');
        } else {
          console.error('Failed to get conversations for lawyer:', error);
        }
        return offlineService.getOfflineData('conversations');
      }
    }

    // For other roles (client, etc.), return empty array
    console.log(`🔒 User ${userId} with role ${userRole} has no conversation access`);
    return offlineService.getOfflineData('conversations');
  }

  /**
   * Get all conversations (legacy method - kept for background bot instance)
   * @deprecated Use getConversationsForUser for role-based access control
   */
  async getAllConversations(includeArchived: boolean = false): Promise<Conversation[]> {
    // Check network connectivity first
    if (!networkService.getConnectionStatus() || offlineService.getOfflineMode()) {
      console.warn('⚠️ Offline mode: returning cached conversations');
      return offlineService.getOfflineData('conversations');
    }

    if (!supabase) {
      console.warn('⚠️ Supabase not configured - returning empty conversations list');
      return offlineService.getOfflineData('conversations');
    }

    try {
      let query = supabase
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false });

      if (!includeArchived) {
        query = query.eq('is_archived', false);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return (data || []).map(this.mapConversationRowToConversation);
    } catch (error: any) {
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        console.warn('⚠️ Supabase connection failed - running in offline mode');
        offlineService.setOfflineMode(true);
      } else {
        console.error('Failed to get conversations:', {
          error: error.message,
          supabaseConfigured: supabaseConfig.isConfigured
        });
      }

      return offlineService.getOfflineData('conversations');
    }
  }

  /**
   * Create or update conversation
   */
  async storeConversation(conversation: Conversation): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    try {
      const conversationData: ConversationInsert = {
        id: conversation.id,
        type: conversation.type,
        name: conversation.name,
        created_at: conversation.createdAt.toISOString(),
        updated_at: conversation.updatedAt.toISOString(),
        last_message_id: conversation.lastMessageId || null,
        unread_count: conversation.unreadCount,
        is_archived: conversation.isArchived,
        is_muted: conversation.isMuted,
        settings: conversation.settings,
        metadata: conversation.metadata || {},
        telegram_chat_identifier: conversation.telegramChatIdentifier || null
      };

      const { error } = await supabase
        .from('conversations')
        .upsert(conversationData, { onConflict: 'id' });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Failed to store conversation:', error);
      throw error;
    }
  }

  /**
   * Search messages
   */
  async searchMessages(query: string, conversationId?: string): Promise<ChatMessage[]> {
    if (!supabase) {
      console.warn('⚠️ Supabase not configured - returning empty search results');
      return [];
    }

    try {
      let searchQuery = supabase
        .from('messages')
        .select('*')
        .textSearch('content', query)
        .eq('is_deleted', false)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (conversationId) {
        searchQuery = searchQuery.eq('conversation_id', conversationId);
      }

      const { data, error } = await searchQuery;

      if (error) {
        throw error;
      }

      return (data || []).map(this.mapMessageRowToChatMessage);
    } catch (error) {
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        console.warn('⚠️ Cannot search messages - running in offline mode');
      } else {
        console.error('Failed to search messages:', error);
      }
      return [];
    }
  }

  /**
   * Delete conversation
   */
  async deleteConversation(conversationId: string, hardDelete: boolean = false): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    try {
      if (hardDelete) {
        // First delete all messages in the conversation
        const { error: messagesError } = await supabase
          .from('messages')
          .delete()
          .eq('conversation_id', conversationId);

        if (messagesError) {
          console.warn('Failed to delete messages:', messagesError);
        }

        // Then delete the conversation
        const { error } = await supabase
          .from('conversations')
          .delete()
          .eq('id', conversationId);

        if (error) {
          throw error;
        }
      } else {
        const { error } = await supabase
          .from('conversations')
          .update({ is_archived: true, updated_at: new Date().toISOString() })
          .eq('id', conversationId);

        if (error) {
          throw error;
        }
      }

      // Clear from cache
      this.conversationUuidCache.forEach((uuid, telegramId) => {
        if (uuid === conversationId) {
          this.conversationUuidCache.delete(telegramId);
        }
      });
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      throw error;
    }
  }

  /**
   * Clear conversation cache (for browser mode)
   */
  clearConversationCache(): void {
    this.conversationUuidCache.clear();
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalConversations: number;
    totalMessages: number;
    storageSize: number;
    oldestMessage: Date | null;
    newestMessage: Date | null;
  }> {
    if (!supabase) {
      return {
        totalConversations: 0,
        totalMessages: 0,
        storageSize: 0,
        oldestMessage: null,
        newestMessage: null
      };
    }

    try {
      const [conversationsResult, messagesResult, oldestResult, newestResult] = await Promise.all([
        supabase.from('conversations').select('id', { count: 'exact', head: true }),
        supabase.from('messages').select('id', { count: 'exact', head: true }),
        supabase.from('messages').select('timestamp').order('timestamp', { ascending: true }).limit(1),
        supabase.from('messages').select('timestamp').order('timestamp', { ascending: false }).limit(1)
      ]);

      return {
        totalConversations: conversationsResult.count || 0,
        totalMessages: messagesResult.count || 0,
        storageSize: 0, // Would need to calculate actual storage size
        oldestMessage: oldestResult.data?.[0]?.timestamp ? new Date(oldestResult.data[0].timestamp) : null,
        newestMessage: newestResult.data?.[0]?.timestamp ? new Date(newestResult.data[0].timestamp) : null
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {
        totalConversations: 0,
        totalMessages: 0,
        storageSize: 0,
        oldestMessage: null,
        newestMessage: null
      };
    }
  }

  // Private helper methods

  private async updateConversationLastMessage(conversationId: string, messageId: string): Promise<void> {
    const { error } = await supabase
      .from('conversations')
      .update({
        last_message_id: messageId,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    if (error) {
      console.error('Failed to update conversation last message:', error);
    }
  }

  private mapMessageRowToChatMessage(row: MessageRow): ChatMessage {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      senderId: row.sender_id,
      senderName: row.sender_name,
      recipientId: row.recipient_id,
      recipientName: row.recipient_name,
      content: row.content,
      messageType: row.message_type as ChatMessage['messageType'],
      timestamp: new Date(row.timestamp),
      editedAt: row.edited_at ? new Date(row.edited_at) : undefined,
      isEdited: row.is_edited,
      status: row.status as ChatMessage['status'],
      attachments: row.attachments || [],
      metadata: row.metadata || {},
      threadId: row.thread_id || undefined,
      replyToId: row.reply_to_id || undefined,
      isDeleted: row.is_deleted,
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
      telegramMessageId: row.telegram_message_id || undefined
    };
  }

  private mapConversationRowToConversation(row: ConversationRow): Conversation {
    return {
      id: row.id,
      type: row.type as Conversation['type'],
      name: row.name,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      lastMessageId: row.last_message_id || undefined,
      unreadCount: row.unread_count,
      isArchived: row.is_archived,
      isMuted: row.is_muted,
      settings: row.settings || {
        retentionDays: 365,
        autoBackup: true,
        encryptionEnabled: false,
        allowFileSharing: true,
        maxFileSize: 50 * 1024 * 1024,
        allowedFileTypes: ['image/*', 'application/pdf', 'text/*']
      },
      metadata: row.metadata || {},
      telegramChatIdentifier: row.telegram_chat_identifier || undefined
    };
  }
}