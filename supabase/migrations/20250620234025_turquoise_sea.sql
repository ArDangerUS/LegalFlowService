/*
  # Add telegram_chat_identifier column to conversations table

  1. Changes
    - Add `telegram_chat_identifier` column to `conversations` table
    - This column will store the original Telegram chat ID for mapping purposes
    - Column is nullable to support existing conversations and system messages

  2. Notes
    - This resolves the database schema mismatch causing the application errors
    - Existing conversations will have NULL values for this column initially
    - New conversations will populate this field appropriately
*/

-- Add the missing telegram_chat_identifier column
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS telegram_chat_identifier TEXT;

-- Add an index for better query performance on this column
CREATE INDEX IF NOT EXISTS idx_conversations_telegram_chat_identifier 
ON conversations (telegram_chat_identifier);

-- Add a comment to document the column purpose
COMMENT ON COLUMN conversations.telegram_chat_identifier IS 'Original Telegram chat ID for mapping between Telegram chats and conversation UUIDs';