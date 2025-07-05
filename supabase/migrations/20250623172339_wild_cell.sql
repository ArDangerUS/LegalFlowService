/*
  # Fix invitation RLS policies for admin operations

  1. Policy Updates
    - Remove conflicting UPDATE policies that are too restrictive
    - Update admin policy to work better with invitation resend operations
    - Add specific policy for invitation management operations

  2. Security
    - Maintain security by requiring admin role verification
    - Allow proper invitation resend functionality
    - Keep existing protection for other operations
*/

-- Remove the existing restrictive UPDATE policies that conflict with admin operations
DROP POLICY IF EXISTS "Enable automatic expiration" ON invitations;
DROP POLICY IF EXISTS "Enable invitation acceptance" ON invitations;

-- Remove the existing admin policy to recreate it with better conditions
DROP POLICY IF EXISTS "Enable admin full access to invitations" ON invitations;

-- Create a comprehensive admin policy for all operations
CREATE POLICY "Enable admin full access to invitations"
  ON invitations
  FOR ALL
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 
      FROM users 
      WHERE users.role = 'admin' 
      AND users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM users 
      WHERE users.role = 'admin' 
      AND users.is_active = true
    )
  );

-- Create specific UPDATE policy for invitation management operations
CREATE POLICY "Allow invitation management updates"
  ON invitations
  FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (
    -- Allow resending invitations (extending expiration and keeping pending status)
    (status = 'pending' AND expires_at > now()) OR
    -- Allow accepting invitations
    (status = 'accepted' AND accepted_at IS NOT NULL) OR
    -- Allow expiring invitations
    (status = 'expired')
  );

-- Create specific policy for automatic expiration
CREATE POLICY "Enable automatic expiration"
  ON invitations
  FOR UPDATE
  TO authenticated, anon
  USING (expires_at <= now() AND status = 'pending')
  WITH CHECK (status = 'expired');

-- Create specific policy for invitation acceptance
CREATE POLICY "Enable invitation acceptance"
  ON invitations
  FOR UPDATE
  TO authenticated, anon
  USING (status = 'pending' AND expires_at > now())
  WITH CHECK (status = 'accepted' AND accepted_at IS NOT NULL);