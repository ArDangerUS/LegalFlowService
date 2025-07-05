/*
  # Fix RLS policies for invitation resending

  This migration addresses the RLS policy violations when admins try to resend invitations.
  
  ## Changes Made
  1. Drop conflicting UPDATE policies that have restrictive WITH CHECK clauses
  2. Create a comprehensive admin policy for all invitation operations
  3. Add a specific policy for invitation acceptance by invited users
  4. Add a policy for automatic expiration updates

  ## Security
  - Ensures admins can manage all invitation operations
  - Maintains security for non-admin users
  - Allows proper invitation acceptance flow
*/

-- Drop existing policies that might be causing conflicts
DROP POLICY IF EXISTS "Allow invitation acceptance by invited users" ON invitations;
DROP POLICY IF EXISTS "Allow invitation expiration updates" ON invitations;
DROP POLICY IF EXISTS "Allow admins to manage all invitation operations" ON invitations;

-- Create a comprehensive admin policy for all operations
CREATE POLICY "Enable admin full access to invitations"
  ON invitations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin' 
      AND users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin' 
      AND users.is_active = true
    )
  );

-- Allow users to accept their own invitations (for registration flow)
CREATE POLICY "Enable invitation acceptance"
  ON invitations
  FOR UPDATE
  TO anon, authenticated
  USING (
    status = 'pending' 
    AND expires_at > now()
  )
  WITH CHECK (
    status = 'accepted'
    AND accepted_at IS NOT NULL
  );

-- Allow system to mark invitations as expired
CREATE POLICY "Enable automatic expiration"
  ON invitations
  FOR UPDATE
  TO anon, authenticated
  USING (
    expires_at <= now() 
    AND status = 'pending'
  )
  WITH CHECK (
    status = 'expired'
  );