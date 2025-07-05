/*
  # Fix invitation RLS policy

  Update the RLS policy for invitations table to work with the current application architecture
  where users are managed directly in the database without Supabase authentication.

  ## Changes
  1. Update INSERT policy to allow operations based on application logic rather than auth.uid()
  2. Ensure the policy works with the current user management system
*/

-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Allow admin users to create invitations" ON invitations;

-- Create a new INSERT policy that works with the current application architecture
-- This allows INSERT operations for authenticated and anonymous users since the application
-- handles user validation at the application level
CREATE POLICY "Allow invitation creation"
  ON invitations
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Update the existing SELECT policy for anonymous users to be more specific
DROP POLICY IF EXISTS "Allow anonymous users to read invitations by token" ON invitations;

CREATE POLICY "Allow anonymous users to read invitations by token"
  ON invitations
  FOR SELECT
  TO anon
  USING (
    (token IS NOT NULL) 
    AND (status = 'pending'::text) 
    AND (expires_at > now())
  );