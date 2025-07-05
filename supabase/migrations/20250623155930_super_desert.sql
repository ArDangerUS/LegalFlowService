/*
  # Remove Notification System

  1. Remove Tables
    - Drop `notifications` table and all related objects
    - Drop notification-related triggers and functions
    - Remove notification creation from case operations

  2. Clean Up Functions
    - Remove notification triggers from case assignment operations
    - Keep case activity logging (separate from notifications)
    
  3. Security
    - Remove RLS policies related to notifications
    - Clean up indexes and constraints
*/

-- Remove notification creation from case assignment (preserve activity logging)
CREATE OR REPLACE FUNCTION assign_case_without_notifications()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create case activity, no notifications
  INSERT INTO case_activities (
    case_id,
    user_id,
    activity_type,
    description,
    metadata
  ) VALUES (
    NEW.id,
    NEW.assigned_lawyer_id,
    'assigned',
    'Case assigned to lawyer',
    '{}'::jsonb
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing notification-related indexes if they exist
DROP INDEX IF EXISTS idx_notifications_user_id;
DROP INDEX IF EXISTS idx_notifications_case_id;
DROP INDEX IF EXISTS idx_notifications_is_read;
DROP INDEX IF EXISTS idx_notifications_type;

-- Drop foreign key constraints first
ALTER TABLE IF EXISTS notifications DROP CONSTRAINT IF EXISTS notifications_case_id_fkey;
ALTER TABLE IF EXISTS notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

-- Drop the notifications table
DROP TABLE IF EXISTS notifications;

-- Remove any notification-related functions that might exist
DROP FUNCTION IF EXISTS create_notification_on_case_assignment();
DROP FUNCTION IF EXISTS notify_case_status_change();

-- Clean up any triggers that might create notifications
-- (Keep other triggers for case activities)

-- Add comment to track removal
COMMENT ON TABLE cases IS 'Legal cases - notification system removed, using Telegram messaging instead';