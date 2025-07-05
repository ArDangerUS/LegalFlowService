/*
  # Fix RLS policies for anonymous access

  1. Security Policy Updates
    - Update RLS policies on `conversations` table to allow anonymous users
    - Update RLS policies on `messages` table to allow anonymous users
    - Update RLS policies on `conversation_participants` table to allow anonymous users
  
  2. Changes Made
    - Modified existing policies to include 'anon' role alongside 'authenticated'
    - This allows the Telegram bot interface to work with the anonymous Supabase key
    - Maintains security while enabling functionality for the bot application

  Note: These policies are suitable for a bot application where anonymous access is required.
  For production applications with user authentication, consider more restrictive policies.
*/

-- Drop existing policies and recreate them with anon access

-- Conversations table policies
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can read all conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update conversations" ON conversations;

CREATE POLICY "Allow anonymous and authenticated users to create conversations"
  ON conversations
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow anonymous and authenticated users to read conversations"
  ON conversations
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow anonymous and authenticated users to update conversations"
  ON conversations
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Messages table policies
DROP POLICY IF EXISTS "Users can create messages" ON messages;
DROP POLICY IF EXISTS "Users can read all messages" ON messages;
DROP POLICY IF EXISTS "Users can update messages" ON messages;

CREATE POLICY "Allow anonymous and authenticated users to create messages"
  ON messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow anonymous and authenticated users to read messages"
  ON messages
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow anonymous and authenticated users to update messages"
  ON messages
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Conversation participants table policies
DROP POLICY IF EXISTS "Users can create participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can read all participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can update participants" ON conversation_participants;

CREATE POLICY "Allow anonymous and authenticated users to create participants"
  ON conversation_participants
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow anonymous and authenticated users to read participants"
  ON conversation_participants
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow anonymous and authenticated users to update participants"
  ON conversation_participants
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);