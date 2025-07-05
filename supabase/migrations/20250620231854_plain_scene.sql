/*
  # Chat System Database Schema

  1. New Tables
    - `conversations`
      - `id` (uuid, primary key)
      - `type` (text) - 'direct', 'group', 'channel'
      - `name` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `last_message_id` (uuid, foreign key)
      - `unread_count` (integer)
      - `is_archived` (boolean)
      - `is_muted` (boolean)
      - `settings` (jsonb)
      - `metadata` (jsonb)

    - `messages`
      - `id` (uuid, primary key)
      - `conversation_id` (uuid, foreign key)
      - `sender_id` (text)
      - `sender_name` (text)
      - `recipient_id` (text)
      - `recipient_name` (text)
      - `content` (text)
      - `message_type` (text)
      - `timestamp` (timestamp)
      - `edited_at` (timestamp)
      - `is_edited` (boolean)
      - `status` (text)
      - `attachments` (jsonb)
      - `metadata` (jsonb)
      - `thread_id` (uuid)
      - `reply_to_id` (uuid)
      - `is_deleted` (boolean)
      - `deleted_at` (timestamp)
      - `telegram_message_id` (integer)

    - `conversation_participants`
      - `id` (uuid, primary key)
      - `conversation_id` (uuid, foreign key)
      - `user_id` (text)
      - `user_name` (text)
      - `role` (text)
      - `joined_at` (timestamp)
      - `last_seen_at` (timestamp)
      - `is_active` (boolean)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'direct',
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_message_id uuid,
  unread_count integer DEFAULT 0,
  is_archived boolean DEFAULT false,
  is_muted boolean DEFAULT false,
  settings jsonb DEFAULT '{}',
  metadata jsonb DEFAULT '{}'
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id text NOT NULL,
  sender_name text NOT NULL,
  recipient_id text NOT NULL,
  recipient_name text NOT NULL,
  content text NOT NULL,
  message_type text DEFAULT 'text',
  timestamp timestamptz DEFAULT now(),
  edited_at timestamptz,
  is_edited boolean DEFAULT false,
  status text DEFAULT 'delivered',
  attachments jsonb DEFAULT '[]',
  metadata jsonb DEFAULT '{}',
  thread_id uuid,
  reply_to_id uuid REFERENCES messages(id),
  is_deleted boolean DEFAULT false,
  deleted_at timestamptz,
  telegram_message_id integer
);

-- Create conversation_participants table
CREATE TABLE IF NOT EXISTS conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  user_name text NOT NULL,
  role text DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  last_seen_at timestamptz,
  is_active boolean DEFAULT true
);

-- Add foreign key constraint for last_message_id
ALTER TABLE conversations 
ADD CONSTRAINT fk_conversations_last_message 
FOREIGN KEY (last_message_id) REFERENCES messages(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_telegram_id ON messages(telegram_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_is_deleted ON messages(is_deleted);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);

-- Enable Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

-- Create policies for conversations
CREATE POLICY "Users can read all conversations"
  ON conversations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create conversations"
  ON conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update conversations"
  ON conversations
  FOR UPDATE
  TO authenticated
  USING (true);

-- Create policies for messages
CREATE POLICY "Users can read all messages"
  ON messages
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create messages"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update messages"
  ON messages
  FOR UPDATE
  TO authenticated
  USING (true);

-- Create policies for conversation_participants
CREATE POLICY "Users can read all participants"
  ON conversation_participants
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create participants"
  ON conversation_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update participants"
  ON conversation_participants
  FOR UPDATE
  TO authenticated
  USING (true);

-- Create function to update conversation updated_at timestamp
CREATE OR REPLACE FUNCTION update_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations 
  SET updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update conversation timestamp when messages are added
CREATE TRIGGER trigger_update_conversation_updated_at
  AFTER INSERT OR UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_updated_at();