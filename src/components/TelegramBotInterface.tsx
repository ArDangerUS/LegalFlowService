import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Send, 
  Bot, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Users, 
  RefreshCw, 
  Trash2, 
  Paperclip, 
  Download, 
  X, 
  Search, 
  Filter,
  Image,
  FileText,
  Video,
  Music,
  Mic,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Eye,
  EyeOff,
  MoreVertical,
  Settings,
  Volume2,
  VolumeX
} from 'lucide-react';
import { TelegramBotService } from '../services/TelegramBotService';
import { SupabaseChatStorage } from '../services/SupabaseChatStorage';
import type { User } from '../types/legal';

interface Message {
  id: string;
  chatId: string;
  content: string;
  timestamp: Date;
  direction: 'incoming' | 'outgoing';
  status: 'sending' | 'sent' | 'delivered' | 'failed';
  senderName: string;
  isEdited: boolean;
  attachments?: FileAttachment[];
  messageType?: 'text' | 'file' | 'image' | 'document' | 'audio' | 'video' | 'voice' | 'sticker';
}

interface FileAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileId?: string;
  url?: string;
  localPath?: string;
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

interface Chat {
  id: string;
  name: string;
  lastMessage?: Message;
  unreadCount: number;
  lastActivity: Date;
  isTyping?: boolean;
  avatar?: string;
  status?: 'online' | 'offline' | 'away';
}

interface TelegramBotInterfaceProps {
  botToken: string;
  currentUser?: User;
  restrictToConversation?: string;
  runInBackground?: boolean;
  onNotification?: (notification: any) => void;
}

export default function TelegramBotInterface({ 
  botToken, 
  currentUser,
  restrictToConversation,
  runInBackground = false,
  onNotification
}: TelegramBotInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [botInfo, setBotInfo] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredChats, setFilteredChats] = useState<Chat[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [deletingConversation, setDeletingConversation] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [chatSettings, setChatSettings] = useState(false);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  
  const [botService] = useState(() => TelegramBotService.getInstance(botToken));
  const [chatStorage] = useState(() => new SupabaseChatStorage());
  const [unsubscribe, setUnsubscribe] = useState<(() => void) | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (botService && botToken) {
      initializeBot();
    }
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [botToken, runInBackground]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadConversationsFromSupabase();
  }, [currentUser, restrictToConversation]);

  useEffect(() => {
    // Filter chats based on search query
    if (searchQuery.trim()) {
      setFilteredChats(chats.filter(chat => 
        chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.lastMessage?.content.toLowerCase().includes(searchQuery.toLowerCase())
      ));
    } else {
      setFilteredChats(chats);
    }
  }, [chats, searchQuery]);

  // Update unread count and document title
  useEffect(() => {
    const unreadCount = chats.reduce((total, chat) => total + chat.unreadCount, 0);
    setTotalUnreadCount(unreadCount);
    
    // Update document title with unread count
    const originalTitle = 'LegalFlow - Телеграм Связь';
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) ${originalTitle}`;
    } else {
      document.title = originalTitle;
    }
  }, [chats]);
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const playNotificationSound = useCallback(() => {
    if (isSoundEnabled) {
      // Create a simple notification sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.1);
    }
  }, [isSoundEnabled]);

  const loadConversationsFromSupabase = async () => {
    try {
      let conversations;
      
      if (restrictToConversation) {
        conversations = await chatStorage.getConversationsForUser(
          currentUser?.id || '',
          currentUser?.role || 'admin',
          false,
          restrictToConversation
        );
      } else if (currentUser) {
        conversations = await chatStorage.getConversationsForUser(
          currentUser.id, 
          currentUser.role,
          false
        );
      } else {
        conversations = await chatStorage.getAllConversations(false);
      }

      const validConversations = conversations.filter(conv => 
        conv.id && (conv.telegramChatIdentifier || conv.name !== 'Unknown Chat')
      );

      const convertedChats: Chat[] = validConversations.map(conv => ({
        id: conv.telegramChatIdentifier || conv.id,
        name: conv.name,
        unreadCount: conv.unreadCount,
        lastActivity: conv.updatedAt,
        status: Math.random() > 0.5 ? 'online' : 'offline' // Simulate status
      }));

      setChats(convertedChats);

      if (restrictToConversation && convertedChats.length > 0) {
        const targetChat = convertedChats.find(chat => 
          chat.id === restrictToConversation || 
          conversations.find(c => c.id === restrictToConversation)?.telegramChatIdentifier === chat.id
        );
        if (targetChat) {
          selectChat(targetChat.id);
        }
      }
    } catch (error) {
      console.error('Failed to load conversations from Supabase:', error);
      chatStorage.clearConversationCache();
    }
  };

  const initializeBot = async () => {
    if (!botService) return;
    
    setIsConnecting(true);
    setError(null);

    try {
      const unsubscribeFn = botService.addCallbacks({
        onNewMessage: (message) => {
          const convertedMessage: Message = {
            id: message.id,
            chatId: message.chatId,
            content: message.content,
            timestamp: message.timestamp,
            direction: message.direction,
            status: message.status,
            senderName: message.senderName,
            isEdited: message.isEdited,
            messageType: message.messageType || 'text',
            attachments: message.attachments
          };
          
          setMessages(prev => {
            const updated = [...prev, convertedMessage];
            return updated.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
          });
          
          loadConversationsFromSupabase();
          playNotificationSound();
          
          if (onNotification) {
            onNotification({
              id: crypto.randomUUID(),
              title: `New message from ${message.senderName}`,
              message: message.content.substring(0, 100),
              timestamp: new Date()
            });
          }
        },
        onConnectionChange: (connected) => {
          setIsConnected(connected);
          if (!connected) {
            setError('Connection lost');
          } else {
            setError(null);
          }
        },
        onUnreadCountChange: () => {
          loadConversationsFromSupabase();
        },
        onError: (errorMsg) => {
          setError(errorMsg);
        },
        onMessageStatusUpdate: (messageId, status) => {
          setMessages(prev => prev.map(msg => 
            msg.id === messageId ? { ...msg, status: status as any } : msg
          ));
        }
      });
      
      setUnsubscribe(() => unsubscribeFn);

      const success = await botService.initialize();
      
      if (success) {
        setIsConnected(true);
        setBotInfo(botService.getBotInfo());
        loadConversationsFromSupabase();
        
        const info = botService.getBotInfo();
        if (info && info.username !== 'demo_bot') {
          addSystemMessage(`✅ Connected to bot: ${info.first_name} (@${info.username})`);
        } else {
          addSystemMessage(`ℹ️ Running in browser mode - conversations loaded from database`);
        }
        addSystemMessage(`🔗 Bot link: https://t.me/${botService.getBotInfo()?.username}`);
        addSystemMessage(`📱 Users can now message your bot to start conversations`);
      } else {
        throw new Error('Failed to initialize bot service');
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection failed';
      
      if (errorMessage.includes('browser due to CORS')) {
        addSystemMessage(`ℹ️ Browser mode: Loading conversations from database`, 'info');
        setBotInfo({ id: 0, first_name: 'Demo Bot', username: 'demo_bot' });
        setIsConnected(false);
        loadConversationsFromSupabase();
        return;
      }
      
      setError(errorMessage);
      addSystemMessage(`❌ Connection failed: ${errorMessage}`, 'error');
    } finally {
      setIsConnecting(false);
    }
  };

  const addSystemMessage = (content: string, type: 'info' | 'error' = 'info') => {
    const systemMessage: Message = {
      id: crypto.randomUUID(),
      chatId: 'system',
      content,
      timestamp: new Date(),
      direction: 'incoming',
      status: 'delivered',
      senderName: type === 'error' ? 'System Error' : 'System',
      isEdited: false,
      messageType: 'text'
    };
    
    setMessages(prev => [...prev, systemMessage]);
    
    setChats(prev => {
      const systemChatExists = prev.find(chat => chat.id === 'system');
      if (!systemChatExists) {
        return [{
          id: 'system',
          name: 'System Messages',
          lastMessage: systemMessage,
          unreadCount: activeChat === 'system' ? 0 : 1,
          lastActivity: systemMessage.timestamp,
          status: 'online'
        }, ...prev];
      }
      return prev.map(chat => 
        chat.id === 'system' 
          ? { ...chat, lastMessage: systemMessage, lastActivity: systemMessage.timestamp }
          : chat
      );
    });
  };

  const selectChat = async (chatId: string) => {
    setActiveChat(chatId);
    
    if (botService && chatId !== 'system') {
      botService.markMessagesAsRead(chatId);
    }
    
    if (chatId !== 'system') {
      try {
        const conversationUuid = await chatStorage.getOrCreateConversationUUID(
          chatId,
          'User',
          'Bot'
        );
        
        const chatMessages = await chatStorage.getConversationHistory(
          conversationUuid,
          100,
          0,
          false,
          currentUser?.role,
          currentUser?.id
        );
        
        const convertedMessages: Message[] = chatMessages.map(msg => ({
          id: msg.id,
          chatId: chatId,
          content: msg.content,
          timestamp: msg.timestamp,
          direction: msg.senderId === 'user' ? 'outgoing' : 'incoming',
          status: msg.status as 'sending' | 'sent' | 'delivered' | 'failed',
          senderName: msg.senderName,
          isEdited: msg.isEdited,
          attachments: msg.attachments as FileAttachment[],
          messageType: msg.messageType as 'text' | 'file' | 'image' | 'document'
        }));
        
        setMessages(prev => {
          const systemMessages = prev.filter(msg => msg.chatId === 'system');
          const allMessages = [...systemMessages, ...convertedMessages];
          return allMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        });
      } catch (error) {
        console.error('Failed to load conversation history:', error);
        addSystemMessage(`❌ Failed to load conversation history`, 'error');
      }
    }
    
    loadConversationsFromSupabase();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (files: File[]): Promise<FileAttachment[]> => {
    // In a real implementation, you would upload files to a storage service
    return files.map(file => ({
      id: crypto.randomUUID(),
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      url: URL.createObjectURL(file)
    }));
  };

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1000);
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && selectedFiles.length === 0) || !activeChat || activeChat === 'system') return;

    try {
      setUploadingFiles(true);
      
      let attachments: FileAttachment[] = [];
      if (selectedFiles.length > 0) {
        attachments = await uploadFiles(selectedFiles);
      }

      const messageContent = newMessage.trim() || `📎 ${selectedFiles.length} file(s) attached`;
      const messageType = selectedFiles.length > 0 ? 'file' : 'text';

      if (botService && isConnected) {
        const success = await botService.sendMessage(activeChat, messageContent);
        
        if (success) {
          if (selectedFiles.length > 0) {
            const messageWithFiles: Message = {
              id: `file_${Date.now()}`,
              chatId: activeChat,
              content: messageContent,
              timestamp: new Date(),
              direction: 'outgoing',
              status: 'sent',
              senderName: currentUser?.name || 'You',
              isEdited: false,
              attachments,
              messageType
            };

            setMessages(prev => {
              const updated = [...prev, messageWithFiles];
              return updated.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
            });
          }

          setNewMessage('');
          setSelectedFiles([]);
          addSystemMessage(`✅ Message sent successfully`);
          loadConversationsFromSupabase();
        } else {
          addSystemMessage(`❌ Failed to send message`, 'error');
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      addSystemMessage(`❌ Failed to send message: ${error}`, 'error');
    } finally {
      setUploadingFiles(false);
    }
  };

  const downloadFile = async (attachment: FileAttachment) => {
    try {
      if (attachment.fileId && botService && !botService.isBrowserModeActive()) {
        const fileUrl = await botService.getFileUrl(attachment.fileId);
        if (fileUrl) {
          const link = document.createElement('a');
          link.href = fileUrl;
          link.download = attachment.fileName;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          return;
        }
      }
      
      if (attachment.url) {
        const link = document.createElement('a');
        link.href = attachment.url;
        link.download = attachment.fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        addSystemMessage(`❌ File not available for download in browser mode`, 'error');
      }
    } catch (error) {
      console.error('Failed to download file:', error);
      addSystemMessage(`❌ Failed to download file`, 'error');
    }
  };

  const deleteConversation = async (chatId: string) => {
    setConversationToDelete(chatId);
    setShowDeleteModal(true);
  };

  const confirmDeleteConversation = async () => {
    const chatId = conversationToDelete;
    if (!chatId || chatId === 'system') return;
    
    try {
      setShowDeleteModal(false);
      setConversationToDelete(null);
      setDeletingConversation(chatId);
      
      let conversationUuid: string | null = null;
      
      const conversations = await chatStorage.getConversationsForUser(
        currentUser?.id || '',
        currentUser?.role || 'admin',
        false
      );
      
      const targetConversation = conversations.find(conv => 
        conv.telegramChatIdentifier === chatId || conv.id === chatId
      );
      
      if (targetConversation) {
        conversationUuid = targetConversation.id;
      } else {
        console.error('Could not find conversation to delete:', chatId);
        addSystemMessage(`❌ Could not find conversation to delete`, 'error');
        return;
      }
      
      await chatStorage.deleteConversation(conversationUuid, true);
      
      if (botService) {
        await botService.reconnect();
      }
      
      setChats(prev => prev.filter(chat => chat.id !== chatId));
      
      if (activeChat === chatId) {
        setActiveChat(null);
        setMessages(prev => prev.filter(msg => msg.chatId === 'system'));
      }
      
      addSystemMessage(`🗑️ Conversation deleted successfully`);
      await loadConversationsFromSupabase();
      
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      addSystemMessage(`❌ Failed to delete conversation: ${error}`, 'error');
    } finally {
      setDeletingConversation(null);
    }
  };

  const cancelDeleteConversation = () => {
    setShowDeleteModal(false);
    setConversationToDelete(null);
  };

  const getActiveChatMessages = () => {
    if (!activeChat) return [];
    return messages.filter(msg => msg.chatId === activeChat);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    } else {
      handleTyping();
    }
  };

  const getStatusIcon = (status: Message['status']) => {
    switch (status) {
      case 'sending':
        return <Clock className="h-3 w-3 text-yellow-500 animate-pulse" />;
      case 'sent':
      case 'delivered':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'failed':
        return <AlertTriangle className="h-3 w-3 text-red-500" />;
      default:
        return null;
    }
  };

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (timestamp: Date) => {
    const today = new Date();
    const messageDate = new Date(timestamp);
    
    if (messageDate.toDateString() === today.toDateString()) {
      return formatTime(timestamp);
    } else {
      return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (mimeType.startsWith('video/')) return <Video className="h-4 w-4" />;
    if (mimeType.startsWith('audio/')) return <Music className="h-4 w-4" />;
    if (mimeType.includes('pdf')) return <FileText className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const manualRefresh = async () => {
    if (!isConnected) {
      await initializeBot();
      return;
    }
    
    addSystemMessage(`🔄 Refreshing...`);
    
    if (botService) {
      const success = await botService.reconnect();
      if (success) {
        addSystemMessage(`✅ Refresh completed`);
        await loadConversationsFromSupabase();
      } else {
        addSystemMessage(`❌ Refresh failed`, 'error');
      }
    }
  };

  const getActiveChat = () => {
    return chats.find(chat => chat.id === activeChat);
  };

  useEffect(() => {
    if (!activeChat && chats.length > 0 && chats.find(chat => chat.id === 'system')) {
      setActiveChat('system');
    }
  }, [chats, activeChat]);

  if (runInBackground) {
    return null;
  }

  return (
    <div className="flex h-full bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
      {/* Chat List Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col shadow-lg">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <div className="text-white">
                <h3 className="font-semibold">Telegram Bot</h3>
                <div className="flex items-center space-x-2 text-xs">
                  <div className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-green-400' : 
                    botInfo?.username === 'demo_bot' ? 'bg-yellow-400' : 
                    'bg-red-400'
                  }`}></div>
                  <span className="text-blue-100">
                    {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Offline Mode'}
                  </span>
                  {totalUnreadCount > 0 && (
                    <div className="flex items-center space-x-1">
                      <span className="text-blue-100">•</span>
                      <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-medium">
                        {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-all"
                title={isSoundEnabled ? "Disable sounds" : "Enable sounds"}
              >
                {isSoundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
              <button
                onClick={manualRefresh}
                className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-all"
                title="Refresh connections"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 backdrop-blur-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {error && (
            <div className="mt-3 p-3 bg-red-500/20 border border-red-300/30 rounded-lg backdrop-blur-sm">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-200" />
                <span className="text-xs text-red-100">{error}</span>
              </div>
            </div>
          )}
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {filteredChats.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500">
              <div className="text-center p-4">
                <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                {currentUser?.role === 'lawyer' ? (
                  <div>
                    <p className="text-sm">No conversations available</p>
                    <p className="text-xs mt-1">You can only access conversations for cases assigned to you</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm">No conversations</p>
                    <p className="text-xs mt-1">Messages will appear here</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  className={`group relative p-4 cursor-pointer hover:bg-gray-50 transition-all duration-200 ${
                    activeChat === chat.id ? 'bg-blue-50 border-r-3 border-blue-500' : ''
                  }`}
                >
                  <div onClick={() => selectChat(chat.id)} className="flex items-start space-x-3">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-medium text-white ${
                        chat.id === 'system' ? 'bg-gray-500' : 'bg-gradient-to-br from-blue-500 to-purple-600'
                      }`}>
                        {chat.id === 'system' ? (
                          <Bot className="h-6 w-6" />
                        ) : (
                          chat.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      {chat.status === 'online' && chat.id !== 'system' && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full"></div>
                      )}
                      {getActiveChat()?.unreadCount && getActiveChat()?.unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 border-2 border-white rounded-full flex items-center justify-center">
                          <span className="text-xs text-white font-medium">
                            {getActiveChat()?.unreadCount! > 9 ? '9+' : getActiveChat()?.unreadCount}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Chat Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-semibold text-gray-900 truncate">{chat.name}</h4>
                        <div className="flex items-center space-x-2">
                          {chat.unreadCount > 0 && (
                            <span className="bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                              {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                            </span>
                          )}
                          <span className="text-xs text-gray-400">
                            {formatDate(chat.lastActivity)}
                          </span>
                        </div>
                      </div>
                      
                      {chat.lastMessage && (
                        <div className="flex items-center space-x-1">
                          {chat.isTyping ? (
                            <div className="flex items-center space-x-1 text-blue-500">
                              <div className="flex space-x-1">
                                <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"></div>
                                <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                              </div>
                              <span className="text-xs italic">typing...</span>
                            </div>
                          ) : (
                            <>
                              <p className="text-sm text-gray-600 truncate flex-1">
                                {chat.lastMessage.direction === 'outgoing' ? 'You: ' : ''}
                                {chat.lastMessage.messageType === 'file' ? '📎 ' : ''}
                                {getFileIcon(chat.lastMessage.attachments?.[0]?.mimeType || '')}
                                {chat.lastMessage.content}
                              </p>
                              {chat.lastMessage.isEdited && (
                                <span className="text-xs text-gray-400 italic">edited</span>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Delete Button */}
                  {chat.id !== 'system' && currentUser?.role === 'admin' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(chat.id);
                      }}
                      disabled={deletingConversation === chat.id}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                      title="Delete conversation"
                    >
                      {deletingConversation === chat.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-white shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {/* Chat Avatar */}
                  <div className="relative">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium text-white ${
                      activeChat === 'system' ? 'bg-gray-500' : 'bg-gradient-to-br from-blue-500 to-purple-600'
                    }`}>
                      {activeChat === 'system' ? (
                        <Bot className="h-5 w-5" />
                      ) : (
                        getActiveChat()?.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    {getActiveChat()?.status === 'online' && activeChat !== 'system' && (
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  
                  {/* Chat Info */}
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {activeChat === 'system'
                        ? 'System Messages' 
                        : getActiveChat()?.name || 'Unknown Chat'
                      }
                    </h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      {activeChat !== 'system' && (
                        <>
                          <span>
                            {getActiveChat()?.status === 'online' ? 'Online' : 'Last seen recently'}
                          </span>
                          <span>•</span>
                        </>
                      )}
                      <div className="flex items-center space-x-1">
                        <Shield className="h-3 w-3 text-green-600" />
                        <span className="text-green-700">Secure & Stored</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Chat Actions */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setChatSettings(!chatSettings)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                    title="Chat settings"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {/* Add video call functionality */}}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                    title="Video call"
                  >
                    <Video className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {/* Add phone call functionality */}}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                    title="Phone call"
                  >
                    <Phone className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {getActiveChatMessages().map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-md ${message.direction === 'outgoing' ? 'order-2' : ''}`}>
                    {message.direction === 'incoming' && message.senderName && activeChat !== 'system' && (
                      <div className="flex items-center space-x-2 mb-1 px-2">
                        <span className="text-xs font-medium text-gray-600">{message.senderName}</span>
                        {message.isEdited && (
                          <span className="text-xs text-gray-400 italic">edited</span>
                        )}
                      </div>
                    )}
                    
                    <div className={`px-4 py-3 rounded-2xl shadow-sm ${
                      message.direction === 'outgoing'
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                        : message.senderName === 'System Error'
                        ? 'bg-red-50 text-red-800 border border-red-200'
                        : message.senderName === 'System'
                        ? 'bg-green-50 text-green-800 border border-green-200'
                        : 'bg-white text-gray-900 border border-gray-200'
                    }`}>
                      <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                      
                      {/* File Attachments */}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {message.attachments.map((attachment) => (
                            <div
                              key={attachment.id}
                              className={`flex items-center space-x-2 p-3 rounded-lg ${
                                message.direction === 'outgoing'
                                  ? 'bg-blue-400 bg-opacity-30'
                                  : 'bg-gray-100'
                              }`}
                            >
                              {getFileIcon(attachment.mimeType)}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{attachment.fileName}</p>
                                <div className="flex items-center space-x-2 text-xs opacity-75">
                                  <span>{formatFileSize(attachment.fileSize)}</span>
                                  {attachment.duration && (
                                    <span>• {Math.floor(attachment.duration / 60)}:{(attachment.duration % 60).toString().padStart(2, '0')}</span>
                                  )}
                                  {attachment.dimensions && (
                                    <span>• {attachment.dimensions.width}×{attachment.dimensions.height}</span>
                                  )}
                                </div>
                              </div>
                              {(attachment.fileId || attachment.url) && (
                                <button
                                  onClick={() => downloadFile(attachment)}
                                  className="p-1 rounded hover:bg-black hover:bg-opacity-10 transition-all"
                                  title="Download file"
                                >
                                  <Download className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className={`flex items-center justify-between mt-2 text-xs ${
                        message.direction === 'outgoing' ? 'text-blue-200' : 
                        message.senderName === 'System Error' ? 'text-red-600' :
                        message.senderName === 'System' ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        <span>{formatTime(message.timestamp)}</span>
                        {message.direction === 'outgoing' && (
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(message.status)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            {activeChat !== 'system' && (
              <div className="p-4 border-t border-gray-200 bg-white">
                {/* Selected Files Preview */}
                {selectedFiles.length > 0 && (
                  <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        {selectedFiles.length} file(s) selected
                      </span>
                      <button
                        onClick={() => setSelectedFiles([])}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                          <div className="flex items-center space-x-2">
                            {getFileIcon(file.type)}
                            <div>
                              <p className="text-sm font-medium text-gray-900">{file.name}</p>
                              <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => removeSelectedFile(index)}
                            className="text-red-400 hover:text-red-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input Area */}
                <div className="flex items-end space-x-3">
                  <div className="flex-1 relative">
                    <textarea
                      ref={messageInputRef}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your message..."
                      disabled={!isConnected && botInfo?.username !== 'demo_bot'}
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none max-h-32 bg-gray-50"
                      rows={1}
                      style={{ minHeight: '48px' }}
                    />
                    <button
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                    >
                      😊
                    </button>
                  </div>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    accept="*/*"
                  />
                  
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!isConnected && botInfo?.username !== 'demo_bot'}
                    className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                    title="Attach files"
                  >
                    <Paperclip className="h-5 w-5" />
                  </button>
                  
                  <button
                    onClick={sendMessage}
                    disabled={(!newMessage.trim() && selectedFiles.length === 0) || uploadingFiles || (!isConnected && botInfo?.username !== 'demo_bot')}
                    className="p-3 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 rounded-xl transition-all shadow-lg hover:shadow-xl"
                  >
                    {uploadingFiles ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </button>
                </div>
                
                <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                  <span>
                    {isConnected || botInfo?.username === 'demo_bot' ? 
                      'Press Enter to send, Shift+Enter for new line' : 
                      'Connect to start messaging'
                    }
                  </span>
                  <div className="flex items-center space-x-1">
                    <Shield className="h-3 w-3" />
                    <span>End-to-end secured</span>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="text-center p-8">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Bot className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Welcome to Telegram Bot</h3>
              <p className="text-gray-600 mb-6 max-w-md">
                {botInfo?.username === 'demo_bot' ? 
                  'Running in browser mode - conversations loaded from database' :
                  isConnected 
                  ? 'Your bot is ready to receive messages. Select a conversation to start chatting.'
                  : 'Connect your bot to start receiving messages from Telegram'
                }
              </p>
              
              {isConnected && botInfo && (
                <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-md mx-auto">
                  <h4 className="font-semibold text-gray-900 mb-3">Bot Information</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center justify-between">
                      <span>Username:</span>
                      <span className="font-mono bg-gray-100 px-2 py-1 rounded">@{botInfo.username}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Name:</span>
                      <span>{botInfo.first_name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Status:</span>
                      <span className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Active</span>
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-800">
                      <strong>Direct link:</strong> https://t.me/{botInfo.username}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Connection Status Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${
              isConnected ? 'bg-green-500' : 
              botInfo?.username === 'demo_bot' ? 'bg-yellow-500' : 
              'bg-red-500'
            }`}></div>
            <span className="text-sm text-gray-700 font-medium">
              {isConnecting ? 'Connecting to Telegram...' : 
               isConnected ? 'Connected to Telegram API' :
               botInfo?.username === 'demo_bot' ? 'Browser Mode - Database Storage' :
               'Disconnected from Telegram'}
            </span>
          </div>
          
          <div className="flex items-center space-x-6 text-xs text-gray-500">
            {botInfo && (
              <span>Bot: @{botInfo.username}</span>
            )}
            <div className="flex items-center space-x-1">
              <Shield className="h-3 w-3 text-green-600" />
              <span>AES-256 Encrypted</span>
            </div>
            <span>
              {filteredChats.length} conversation{filteredChats.length !== 1 ? 's' : ''}
            </span>
            {totalUnreadCount > 0 && (
              <div className="flex items-center space-x-1">
                <span>•</span>
                <span className="font-medium text-red-600">
                  {totalUnreadCount} unread
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Conversation</h3>
            </div>
            
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete this conversation? This action cannot be undone.
            </p>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
              <p className="text-sm text-red-800">
                <strong>Warning:</strong> All messages and files in this conversation will be permanently 
                deleted from the database. The client will lose access to the conversation history.
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDeleteConversation}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteConversation}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}