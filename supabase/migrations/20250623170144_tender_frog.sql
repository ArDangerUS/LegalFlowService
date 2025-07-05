/*
  # Fix invitation RLS policies for resending invitations

  1. Policy Updates
    - Update the admin policy to properly allow all invitation management operations
    - Update the user status update policy to allow admins to reset status to 'pending'
    - Ensure admins can update expires_at field when resending invitations
  
  2. Security
    - Maintain security by ensuring only admins can perform resend operations
    - Keep existing restrictions for non-admin users
*/

-- Drop existing policies that are causing conflicts
DROP POLICY IF EXISTS "Allow users to update invitation status" ON invitations;
DROP POLICY IF EXISTS "Allow admins to manage invitations" ON invitations;

-- Create a comprehensive admin policy for all invitation management
CREATE POLICY "Allow admins to manage all invitation operations"
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

-- Create a policy for non-admin users to update invitation status (for accepting invitations)
CREATE POLICY "Allow invitation acceptance by invited users"
  ON invitations
  FOR UPDATE
  TO anon, authenticated
  USING (
    status = 'pending' 
    AND expires_at > now()
  )
  WITH CHECK (
    status = 'accepted'
  );

-- Create a policy for expired invitation updates (automated cleanup)
CREATE POLICY "Allow invitation expiration updates"
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