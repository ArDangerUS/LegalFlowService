# Real-Time Chat System Documentation

## Overview

This documentation covers the implementation of a comprehensive real-time chat interface using Supabase as the backend. The system provides secure messaging, file sharing, user presence tracking, and typing indicators with role-based access control.

## Database Schema

### Core Tables

#### `chat_rooms`
Manages chat rooms/conversations with support for different types:

```sql
CREATE TABLE chat_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  room_type text NOT NULL DEFAULT 'direct' CHECK (room_type IN ('direct', 'group', 'support')),
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_message_at timestamptz DEFAULT now(),
  participant_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  case_id uuid REFERENCES cases(id),
  telegram_chat_id text UNIQUE
);
```

#### `chat_messages`
Stores messages with real-time optimization and full-text search:

```sql
CREATE TABLE chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES users(id),
  sender_name text NOT NULL,
  sender_type text NOT NULL DEFAULT 'user' CHECK (sender_type IN ('user', 'bot', 'system')),
  content text NOT NULL,
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'image', 'system')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  edited_at timestamptz,
  is_edited boolean DEFAULT false,
  is_deleted boolean DEFAULT false,
  deleted_at timestamptz,
  status text DEFAULT 'sent' CHECK (status IN ('sending', 'sent', 'delivered', 'read', 'failed')),
  reply_to_id uuid REFERENCES chat_messages(id),
  file_id uuid,
  search_vector tsvector,
  metadata jsonb DEFAULT '{}'
);
```

#### `chat_files`
Handles file attachments with Supabase Storage integration:

```sql
CREATE TABLE chat_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES chat_messages(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  uploader_id uuid REFERENCES users(id),
  filename text NOT NULL,
  original_filename text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  file_extension text,
  storage_path text NOT NULL,
  bucket_name text NOT NULL DEFAULT 'chat-files',
  public_url text,
  is_processed boolean DEFAULT false,
  preview_url text,
  thumbnail_url text,
  upload_completed_at timestamptz,
  is_deleted boolean DEFAULT false,
  deleted_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
```

#### `user_presence`
Tracks online/offline status:

```sql
CREATE TABLE user_presence (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  is_online boolean DEFAULT false,
  last_seen_at timestamptz DEFAULT now(),
  status text DEFAULT 'offline' CHECK (status IN ('online', 'away', 'busy', 'offline')),
  updated_at timestamptz DEFAULT now()
);
```

#### `typing_indicators`
Real-time typing indicators:

```sql
CREATE TABLE typing_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_typing boolean DEFAULT false,
  started_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(room_id, user_id)
);
```

#### `room_participants`
Manages room membership:

```sql
CREATE TABLE room_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at timestamptz DEFAULT now(),
  last_read_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  UNIQUE(room_id, user_id)
);
```

## Security Policies (RLS)

### Chat Rooms
```sql
-- Users can view rooms they participate in
CREATE POLICY "Users can view rooms they participate in"
  ON chat_rooms FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT room_id FROM room_participants 
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR created_by = auth.uid()
  );
```

### Chat Messages
```sql
-- Users can view messages in their rooms
CREATE POLICY "Users can view messages in their rooms"
  ON chat_messages FOR SELECT TO authenticated
  USING (
    room_id IN (
      SELECT room_id FROM room_participants 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Users can send messages to their rooms
CREATE POLICY "Users can send messages to their rooms"
  ON chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    room_id IN (
      SELECT room_id FROM room_participants 
      WHERE user_id = auth.uid() AND is_active = true
    )
    AND sender_id = auth.uid()
  );
```

### File Access
```sql
-- Users can view files in their rooms
CREATE POLICY "Users can view files in their rooms"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-files' AND
    name IN (
      SELECT storage_path FROM chat_files 
      WHERE room_id IN (
        SELECT room_id FROM room_participants 
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );
```

## Real-Time Subscriptions

### Setting Up Subscriptions

```typescript
// Enable real-time on tables
ALTER PUBLICATION supabase_realtime ADD TABLE chat_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE typing_indicators;
```

### Frontend Integration

```typescript
// Subscribe to room messages
const subscribeToRoom = (roomId: string) => {
  const channel = supabase
    .channel(`room:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${roomId}`
      },
      (payload) => {
        // Handle real-time message updates
        handleMessageUpdate(payload);
      }
    )
    .subscribe();
    
  return channel;
};
```

## File Upload Implementation

### Frontend File Upload

```typescript
const handleFileUpload = async (files: File[]) => {
  for (const file of files) {
    // Upload to Supabase Storage
    const fileName = `${roomId}/${Date.now()}-${file.name}`;
    const { data: uploadData, error } = await supabase.storage
      .from('chat-files')
      .upload(fileName, file);

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('chat-files')
      .getPublicUrl(fileName);

    // Create file record
    const { data: fileRecord } = await supabase
      .from('chat_files')
      .insert({
        room_id: roomId,
        uploader_id: userId,
        filename: fileName,
        original_filename: file.name,
        file_size: file.size,
        mime_type: file.type,
        storage_path: fileName,
        public_url: publicUrl
      })
      .select()
      .single();

    // Send message with file attachment
    await supabase
      .from('chat_messages')
      .insert({
        room_id: roomId,
        sender_id: userId,
        sender_name: userName,
        content: `📎 ${file.name}`,
        message_type: file.type.startsWith('image/') ? 'image' : 'file',
        file_id: fileRecord.id
      });
  }
};
```

## Performance Optimizations

### Database Indexes

```sql
-- Message queries optimization
CREATE INDEX idx_chat_messages_room_id_created ON chat_messages(room_id, created_at DESC);
CREATE INDEX idx_chat_messages_search ON chat_messages USING gin(search_vector);

-- Presence queries optimization
CREATE INDEX idx_user_presence_online ON user_presence(is_online, updated_at);
CREATE INDEX idx_typing_indicators_room ON typing_indicators(room_id, is_typing);
```

### Frontend Caching

```typescript
// Implement message caching
const useMessageCache = (roomId: string) => {
  const [messages, setMessages] = useState<Map<string, ChatMessage[]>>(new Map());
  
  const getCachedMessages = useCallback((roomId: string) => {
    return messages.get(roomId) || [];
  }, [messages]);

  const setCachedMessages = useCallback((roomId: string, newMessages: ChatMessage[]) => {
    setMessages(prev => new Map(prev).set(roomId, newMessages));
  }, []);

  return { getCachedMessages, setCachedMessages };
};
```

### Infinite Scroll Implementation

```typescript
const useInfiniteMessages = (roomId: string) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .lt('created_at', messages[0]?.created_at || new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      if (data.length < 20) {
        setHasMore(false);
      }

      setMessages(prev => [...data.reverse(), ...prev]);
    } finally {
      setLoading(false);
    }
  }, [roomId, messages, loading, hasMore]);

  return { messages, loadMore, hasMore, loading };
};
```

## Search Implementation

### Full-Text Search Setup

```sql
-- Create search vector update function
CREATE OR REPLACE FUNCTION update_message_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector = to_tsvector('english', 
    COALESCE(NEW.content, '') || ' ' || COALESCE(NEW.sender_name, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_update_message_search
  BEFORE INSERT OR UPDATE ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_message_search_vector();
```

### Search Query Implementation

```typescript
const searchMessages = async (query: string, filters?: SearchFilters) => {
  let supabaseQuery = supabase
    .from('chat_messages')
    .select(`
      *,
      chat_rooms!inner(*)
    `)
    .textSearch('search_vector', query)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(50);

  // Apply filters
  if (filters?.messageType) {
    supabaseQuery = supabaseQuery.eq('message_type', filters.messageType);
  }

  if (filters?.roomId) {
    supabaseQuery = supabaseQuery.eq('room_id', filters.roomId);
  }

  const { data, error } = await supabaseQuery;
  return { data, error };
};
```

## Error Handling & Offline Support

### Connection Status Management

```typescript
const useConnectionStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, isSupabaseConnected };
};
```

### Optimistic Updates

```typescript
const sendMessageWithOptimisticUpdate = async (content: string, roomId: string) => {
  const tempId = crypto.randomUUID();
  const optimisticMessage: ChatMessage = {
    id: tempId,
    room_id: roomId,
    content,
    status: 'sending',
    created_at: new Date().toISOString(),
    // ... other fields
  };

  // Add optimistic message
  setMessages(prev => [...prev, optimisticMessage]);

  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        room_id: roomId,
        content,
        // ... other fields
      })
      .select()
      .single();

    if (error) throw error;

    // Remove optimistic message, real one will come via subscription
    setMessages(prev => prev.filter(m => m.id !== tempId));
  } catch (error) {
    // Update optimistic message to show error
    setMessages(prev => 
      prev.map(m => 
        m.id === tempId ? { ...m, status: 'failed' } : m
      )
    );
  }
};
```

## Rate Limiting

### Database-Level Rate Limiting

```sql
-- Create rate limiting function
CREATE OR REPLACE FUNCTION check_message_rate_limit(user_id uuid)
RETURNS boolean AS $$
DECLARE
  message_count integer;
BEGIN
  SELECT COUNT(*) INTO message_count
  FROM chat_messages
  WHERE sender_id = user_id
    AND created_at > now() - interval '1 minute';
  
  RETURN message_count < 60; -- Max 60 messages per minute
END;
$$ LANGUAGE plpgsql;

-- Add rate limiting check
CREATE POLICY "Rate limit message creation"
  ON chat_messages FOR INSERT TO authenticated
  WITH CHECK (check_message_rate_limit(auth.uid()));
```

## Monitoring & Analytics

### Performance Monitoring

```typescript
const usePerformanceMonitoring = () => {
  const trackMessageSend = (startTime: number) => {
    const duration = Date.now() - startTime;
    console.log(`Message send took ${duration}ms`);
    
    // Send to analytics service
    analytics.track('message_send_duration', { duration });
  };

  const trackFileUpload = (fileSize: number, duration: number) => {
    const speed = fileSize / duration; // bytes per ms
    console.log(`File upload speed: ${speed} bytes/ms`);
    
    analytics.track('file_upload_performance', { fileSize, duration, speed });
  };

  return { trackMessageSend, trackFileUpload };
};
```

## Testing Strategy

### Unit Tests

```typescript
// Message component test
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatMessage } from './ChatMessage';

describe('ChatMessage', () => {
  it('renders message content correctly', () => {
    const message = {
      id: '1',
      content: 'Hello world',
      sender_name: 'John Doe',
      created_at: new Date().toISOString(),
      // ... other required fields
    };

    render(<ChatMessage message={message} currentUser={{ id: '1' }} />);
    
    expect(screen.getByText('Hello world')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});
```

### Integration Tests

```typescript
// Real-time subscription test
describe('Chat Subscriptions', () => {
  it('should receive new messages in real-time', async () => {
    const { result } = renderHook(() => useChatSubscriptions());
    
    // Subscribe to room
    act(() => {
      result.current.subscribeToRoom('room-1');
    });

    // Simulate incoming message
    const newMessage = await createTestMessage('room-1');
    
    // Wait for subscription to update
    await waitFor(() => {
      expect(result.current.messages.get('room-1')).toContainEqual(
        expect.objectContaining({ id: newMessage.id })
      );
    });
  });
});
```

## Deployment Considerations

### Environment Configuration

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# File Upload Settings
VITE_MAX_FILE_SIZE=10485760  # 10MB
VITE_ALLOWED_FILE_TYPES=.pdf,.doc,.docx,image/*

# Real-time Settings
VITE_REALTIME_ENABLED=true
VITE_PRESENCE_TIMEOUT=30000  # 30 seconds
```

### Production Optimizations

1. **Enable CDN for file storage**
2. **Configure Supabase Edge Functions for processing**
3. **Set up monitoring and alerting**
4. **Implement proper backup strategies**
5. **Configure rate limiting at API Gateway level**

This documentation provides a comprehensive guide for implementing, maintaining, and scaling the real-time chat system with Supabase.