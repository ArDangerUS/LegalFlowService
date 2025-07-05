/*
  # User Invitation System

  1. New Tables
    - `invitations`
      - `id` (uuid, primary key)
      - `email` (text, unique, not null)
      - `token` (text, unique, not null)
      - `role` (text, not null)
      - `office_id` (uuid, foreign key, nullable)
      - `created_by` (uuid, foreign key, not null)
      - `expires_at` (timestamp, not null)
      - `status` (text, default 'pending')
      - `created_at` (timestamp, default now())
      - `accepted_at` (timestamp, nullable)

  2. Security
    - Enable RLS on `invitations` table
    - Add policies for invitation access
    - Add constraints for status validation

  3. Indexes
    - Add indexes for performance optimization
*/

-- Create invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  token text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'lawyer', 'client')),
  office_id uuid REFERENCES offices(id),
  created_by uuid NOT NULL REFERENCES users(id),
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at timestamptz DEFAULT now(),
  accepted_at timestamptz
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_invitations_created_by ON invitations(created_by);

-- Enable Row Level Security
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invitations

-- Allow anonymous users to read invitations by token (for registration)
CREATE POLICY "Allow anonymous users to read invitations by token"
  ON invitations
  FOR SELECT
  TO anon
  USING (token IS NOT NULL AND status = 'pending' AND expires_at > now());

-- Allow authenticated users to read invitations by token
CREATE POLICY "Allow authenticated users to read invitations by token"
  ON invitations
  FOR SELECT
  TO authenticated
  USING (token IS NOT NULL);

-- Allow admin users to create invitations
CREATE POLICY "Allow admin users to create invitations"
  ON invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin' 
      AND users.is_active = true
    )
  );

-- Allow admin users to view all invitations
CREATE POLICY "Allow admin users to view all invitations"
  ON invitations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin' 
      AND users.is_active = true
    )
  );

-- Allow anonymous and authenticated users to update invitation status (for acceptance)
CREATE POLICY "Allow users to update invitation status"
  ON invitations
  FOR UPDATE
  TO anon, authenticated
  USING (status = 'pending' AND expires_at > now())
  WITH CHECK (status IN ('accepted', 'expired'));

-- Function to automatically expire old invitations
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE invitations 
  SET status = 'expired' 
  WHERE expires_at <= now() AND status = 'pending';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to expire old invitations periodically
-- Note: In a real application, you'd want to run this via a scheduled job
CREATE OR REPLACE FUNCTION check_invitation_expiry()
RETURNS void AS $$
BEGIN
  UPDATE invitations 
  SET status = 'expired' 
  WHERE expires_at <= now() AND status = 'pending';
END;
$$ LANGUAGE plpgsql;

-- Add comment to document the table
COMMENT ON TABLE invitations IS 'User invitation system for secure user registration with role-based access';
COMMENT ON COLUMN invitations.token IS 'Unique token for invitation link validation';
COMMENT ON COLUMN invitations.expires_at IS 'Invitation expiration timestamp (typically 24-48 hours from creation)';
COMMENT ON COLUMN invitations.status IS 'Current status: pending, accepted, or expired';