/*
  # Fix DELETE policies for conversations and messages

  1. Problem
    - Missing DELETE policies for conversations and messages tables
    - This prevents the delete conversation functionality from working
    - Only INSERT, SELECT, and UPDATE policies exist

  2. Solution
    - Add DELETE policies for both conversations and messages tables
    - Allow anonymous and authenticated users to delete records
    - This enables the conversation deletion feature in the Telegram bot interface

  3. Security
    - These policies allow full CRUD operations for anonymous users
    - Suitable for bot applications where anonymous access is required
    - For production with user authentication, consider more restrictive policies
*/

-- Add DELETE policies for conversations table
CREATE POLICY "Allow anonymous and authenticated users to delete conversations"
  ON conversations
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- Add DELETE policies for messages table
CREATE POLICY "Allow anonymous and authenticated users to delete messages"
  ON messages
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- Add DELETE policies for conversation_participants table (for completeness)
CREATE POLICY "Allow anonymous and authenticated users to delete participants"
  ON conversation_participants
  FOR DELETE
  TO anon, authenticated
  USING (true); 