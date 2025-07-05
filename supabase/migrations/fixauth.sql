/*
  # Fix Authentication Issues - LegalFlow

  This migration fixes the authentication problems by:
  1. Creating a trigger to auto-create users in the users table when auth users are created
  2. Updating RLS policies to work properly with the authentication flow
  3. Ensuring first user creation works correctly
*/

-- ============================================================================
-- STEP 1: Create function to handle new user creation
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
  default_office_id UUID;
BEGIN
  -- Count existing users to determine if this is the first user
  SELECT COUNT(*) INTO user_count FROM public.users;

  -- Get default office ID
  SELECT id INTO default_office_id FROM public.offices ORDER BY created_at LIMIT 1;

  -- Insert new user into users table
  INSERT INTO public.users (
    id,
    email,
    name,
    role,
    office_id,
    is_active,
    created_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'New User'),
    CASE
      WHEN user_count = 0 THEN 'admin'  -- First user is admin
      ELSE COALESCE(NEW.raw_user_meta_data->>'role', 'lawyer')
    END,
    default_office_id,
    true,
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 2: Create trigger for new users
-- ============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create new trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- STEP 3: Fix RLS Policies
-- ============================================================================

-- Fix policies for users table
DROP POLICY IF EXISTS "Allow anonymous and authenticated users to read users" ON users;
DROP POLICY IF EXISTS "Allow anonymous and authenticated users to manage users" ON users;

CREATE POLICY "Enable user read access"
  ON users FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Enable user write access"
  ON users FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Enable user update access"
  ON users FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- Fix policies for invitations table
DROP POLICY IF EXISTS "Allow admin users to create invitations" ON invitations;
DROP POLICY IF EXISTS "Allow invitation creation" ON invitations;
DROP POLICY IF EXISTS "Enable admin full access to invitations" ON invitations;
DROP POLICY IF EXISTS "Enable invitation acceptance" ON invitations;
DROP POLICY IF EXISTS "Enable automatic expiration" ON invitations;

-- Create simplified invitation policies
CREATE POLICY "Enable invitation management"
  ON invitations FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- Fix policies for cases table
DROP POLICY IF EXISTS "Allow anonymous and authenticated users to read cases" ON cases;
DROP POLICY IF EXISTS "Allow anonymous and authenticated users to manage cases" ON cases;

CREATE POLICY "Enable case access"
  ON cases FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- Fix policies for offices table
DROP POLICY IF EXISTS "Allow anonymous and authenticated users to read offices" ON offices;
DROP POLICY IF EXISTS "Allow anonymous and authenticated users to manage offices" ON offices;

CREATE POLICY "Enable office access"
  ON offices FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- Fix policies for case_activities table
DROP POLICY IF EXISTS "Allow anonymous and authenticated users to read case activities" ON case_activities;
DROP POLICY IF EXISTS "Allow anonymous and authenticated users to create case activities" ON case_activities;
DROP POLICY IF EXISTS "Allow anonymous and authenticated users to update case activities" ON case_activities;

CREATE POLICY "Enable case activities access"
  ON case_activities FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- STEP 4: Update existing functions for compatibility
-- ============================================================================

-- Update the first user assignment function to work with the new trigger
CREATE OR REPLACE FUNCTION assign_first_user_as_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- This function is now handled by handle_new_user trigger
  -- Keep for backward compatibility but make it a no-op
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 5: Add helpful comments
-- ============================================================================

COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates a user record in the users table when a new auth user is created. First user becomes admin.';
COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 'Triggers user creation in users table when auth user is created';

-- ============================================================================
-- VERIFICATION QUERIES (for debugging)
-- ============================================================================

-- Check if trigger exists
-- SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Check policies
-- SELECT schemaname, tablename, policyname, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename IN ('users', 'invitations', 'cases', 'offices');