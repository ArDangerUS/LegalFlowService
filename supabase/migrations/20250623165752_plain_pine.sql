/*
  # Add admin policy for invitation management

  1. Security
    - Add RLS policy for admin users to manage invitations
    - Allow admins to update any invitation record
    - Enable resending invitations by updating expiration dates and tokens

  2. Changes
    - Create new policy "Allow admins to manage invitations"
    - Policy allows UPDATE operations for users with admin role
    - Policy checks user role from users table via auth.uid()
*/

-- Create policy to allow admin users to manage invitations
CREATE POLICY "Allow admins to manage invitations"
  ON invitations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM users 
      WHERE users.id = auth.uid() 
        AND users.role = 'admin' 
        AND users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM users 
      WHERE users.id = auth.uid() 
        AND users.role = 'admin' 
        AND users.is_active = true
    )
  );