/*
  # Real-Time Chat System with File Storage

  1. New Tables
    - `chat_rooms` - Chat rooms/conversations
    - `chat_messages` - Real-time messages with file support
    - `chat_files` - File metadata and storage info
    - `user_presence` - Online/offline status
    - `typing_indicators` - Real-time typing status

  2. Security
    - Enable RLS on all tables
    - Role-based access policies
    - File access controls

  3. Performance
    - Optimized indexes for real-time queries
    - Efficient pagination support
*/

-- Enable real-time for existing tables
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Create chat_rooms table for enhanced real-time chat
CREATE TABLE IF NOT EXISTS chat_rooms (
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
  
  -- For legal case integration
  case_id uuid REFERENCES cases(id),
  telegram_chat_id text UNIQUE
);

-- Create chat_messages table optimized for real-time
CREATE TABLE IF NOT EXISTS chat_messages (
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
  
  -- Message status
  status text DEFAULT 'sent' CHECK (status IN ('sending', 'sent', 'delivered', 'read', 'failed')),
  
  -- Reply functionality
  reply_to_id uuid REFERENCES chat_messages(id),
  
  -- File attachment
  file_id uuid,
  
  -- Search and metadata
  search_vector tsvector,
  metadata jsonb DEFAULT '{}'
);

-- Create chat_files table for file management
CREATE TABLE IF NOT EXISTS chat_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES chat_messages(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  uploader_id uuid REFERENCES users(id),
  
  -- File information
  filename text NOT NULL,
  original_filename text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  file_extension text,
  
  -- Supabase Storage information
  storage_path text NOT NULL,
  bucket_name text NOT NULL DEFAULT 'chat-files',
  public_url text,
  
  -- File processing
  is_processed boolean DEFAULT false,
  preview_url text,
  thumbnail_url text,
  
  -- Security and metadata
  upload_completed_at timestamptz,
  is_deleted boolean DEFAULT false,
  deleted_at timestamptz,
  metadata jsonb DEFAULT '{}',
  
  created_at timestamptz DEFAULT now()
);

-- Create user_presence table for online status
CREATE TABLE IF NOT EXISTS user_presence (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  is_online boolean DEFAULT false,
  last_seen_at timestamptz DEFAULT now(),
  status text DEFAULT 'offline' CHECK (status IN ('online', 'away', 'busy', 'offline')),
  updated_at timestamptz DEFAULT now()
);

-- Create typing_indicators table for real-time typing
CREATE TABLE IF NOT EXISTS typing_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_typing boolean DEFAULT false,
  started_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(room_id, user_id)
);

-- Create room_participants table for room membership
CREATE TABLE IF NOT EXISTS room_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at timestamptz DEFAULT now(),
  last_read_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  
  UNIQUE(room_id, user_id)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_chat_rooms_updated_at ON chat_rooms(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_case_id ON chat_rooms(case_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_telegram_id ON chat_rooms(telegram_chat_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id_created ON chat_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_search ON chat_messages USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_chat_messages_reply_to ON chat_messages(reply_to_id);

CREATE INDEX IF NOT EXISTS idx_chat_files_room_id ON chat_files(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_files_message_id ON chat_files(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_files_uploader_id ON chat_files(uploader_id);

CREATE INDEX IF NOT EXISTS idx_user_presence_online ON user_presence(is_online, updated_at);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_room ON typing_indicators(room_id, is_typing);

CREATE INDEX IF NOT EXISTS idx_room_participants_room_id ON room_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_room_participants_user_id ON room_participants(user_id);

-- Enable real-time on new tables
ALTER PUBLICATION supabase_realtime ADD TABLE chat_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_files;
ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE typing_indicators;
ALTER PUBLICATION supabase_realtime ADD TABLE room_participants;

-- Enable Row Level Security
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_rooms
CREATE POLICY "Users can view rooms they participate in"
  ON chat_rooms
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT room_id FROM room_participants 
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR created_by = auth.uid()
  );

CREATE POLICY "Users can create rooms"
  ON chat_rooms
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Room owners can update rooms"
  ON chat_rooms
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages in their rooms"
  ON chat_messages
  FOR SELECT
  TO authenticated
  USING (
    room_id IN (
      SELECT room_id FROM room_participants 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can send messages to their rooms"
  ON chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    room_id IN (
      SELECT room_id FROM room_participants 
      WHERE user_id = auth.uid() AND is_active = true
    )
    AND sender_id = auth.uid()
  );

CREATE POLICY "Users can edit their own messages"
  ON chat_messages
  FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- RLS Policies for chat_files
CREATE POLICY "Users can view files in their rooms"
  ON chat_files
  FOR SELECT
  TO authenticated
  USING (
    room_id IN (
      SELECT room_id FROM room_participants 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can upload files to their rooms"
  ON chat_files
  FOR INSERT
  TO authenticated
  WITH CHECK (
    room_id IN (
      SELECT room_id FROM room_participants 
      WHERE user_id = auth.uid() AND is_active = true
    )
    AND uploader_id = auth.uid()
  );

-- RLS Policies for user_presence
CREATE POLICY "Users can view all presence"
  ON user_presence
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own presence"
  ON user_presence
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for typing_indicators
CREATE POLICY "Users can view typing in their rooms"
  ON typing_indicators
  FOR SELECT
  TO authenticated
  USING (
    room_id IN (
      SELECT room_id FROM room_participants 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can manage their typing status"
  ON typing_indicators
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for room_participants
CREATE POLICY "Users can view participants in their rooms"
  ON room_participants
  FOR SELECT
  TO authenticated
  USING (
    room_id IN (
      SELECT room_id FROM room_participants 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Room owners can manage participants"
  ON room_participants
  FOR ALL
  TO authenticated
  USING (
    room_id IN (
      SELECT id FROM chat_rooms 
      WHERE created_by = auth.uid()
    )
  );

-- Functions for maintaining data integrity

-- Update room participant count
CREATE OR REPLACE FUNCTION update_room_participant_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_rooms 
  SET participant_count = (
    SELECT COUNT(*) FROM room_participants 
    WHERE room_id = COALESCE(NEW.room_id, OLD.room_id) 
    AND is_active = true
  )
  WHERE id = COALESCE(NEW.room_id, OLD.room_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_participant_count
  AFTER INSERT OR UPDATE OR DELETE ON room_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_room_participant_count();

-- Update room last message timestamp
CREATE OR REPLACE FUNCTION update_room_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_rooms 
  SET 
    last_message_at = NEW.created_at,
    updated_at = NEW.created_at
  WHERE id = NEW.room_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_room_last_message
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_room_last_message();

-- Update search vector for messages
CREATE OR REPLACE FUNCTION update_message_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector = to_tsvector('english', COALESCE(NEW.content, '') || ' ' || COALESCE(NEW.sender_name, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_message_search
  BEFORE INSERT OR UPDATE ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_message_search_vector();

-- Clean up expired typing indicators
CREATE OR REPLACE FUNCTION cleanup_typing_indicators()
RETURNS void AS $$
BEGIN
  DELETE FROM typing_indicators 
  WHERE updated_at < now() - interval '10 seconds';
END;
$$ LANGUAGE plpgsql;

-- Create storage bucket for chat files
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-files', 'chat-files', false);

-- Storage RLS policies
CREATE POLICY "Users can view files in their rooms"
  ON storage.objects FOR SELECT
  TO authenticated
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

CREATE POLICY "Users can upload files to their rooms"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'chat-files');