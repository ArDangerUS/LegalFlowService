/*
  # Legal Case Management System

  1. New Tables
    - `offices` - Law firm offices/branches
    - `users` - System users (admins, lawyers, clients)
    - `cases` - Legal cases linked to conversations
    - `notifications` - User notifications
    - `case_activities` - Case activity logs

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated and anonymous users
    - Secure functions with proper permissions

  3. Features
    - Automatic case creation from conversations
    - Response time tracking
    - User role management
    - Analytics functions
*/

-- Create offices table
CREATE TABLE offices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  phone text,
  email text,
  created_at timestamptz DEFAULT now()
);

-- Create users table
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'lawyer' CHECK (role IN ('admin', 'lawyer', 'client')),
  office_id uuid REFERENCES offices(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  last_login timestamptz
);

-- Create cases table
CREATE TABLE cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid UNIQUE REFERENCES conversations(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  client_contact text,
  case_type text,
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text DEFAULT 'new' CHECK (status IN ('new', 'assigned', 'in-progress', 'closed', 'rejected')),
  assigned_lawyer_id uuid REFERENCES users(id),
  office_id uuid REFERENCES offices(id),
  created_at timestamptz DEFAULT now(),
  assigned_at timestamptz,
  closed_at timestamptz,
  response_time_minutes integer,
  closure_reason text,
  rejection_reason text,
  satisfaction_rating integer CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
  notes text
);

-- Create notifications table
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  case_id uuid REFERENCES cases(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('new_request', 'assignment', 'escalation', 'status_change')),
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create case_activities table
CREATE TABLE case_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES cases(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id),
  activity_type text NOT NULL CHECK (activity_type IN ('created', 'assigned', 'status_changed', 'note_added', 'closed', 'rejected')),
  description text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_office_id ON users(office_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);

CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_priority ON cases(priority);
CREATE INDEX idx_cases_assigned_lawyer_id ON cases(assigned_lawyer_id);
CREATE INDEX idx_cases_office_id ON cases(office_id);
CREATE INDEX idx_cases_conversation_id ON cases(conversation_id);
CREATE INDEX idx_cases_created_at ON cases(created_at);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_case_id ON notifications(case_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_type ON notifications(type);

CREATE INDEX idx_case_activities_case_id ON case_activities(case_id);
CREATE INDEX idx_case_activities_user_id ON case_activities(user_id);
CREATE INDEX idx_case_activities_type ON case_activities(activity_type);

-- Enable Row Level Security
ALTER TABLE offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for offices
CREATE POLICY "Allow anonymous and authenticated users to read offices"
  ON offices FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow anonymous and authenticated users to manage offices"
  ON offices FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for users
CREATE POLICY "Allow anonymous and authenticated users to read users"
  ON users FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow anonymous and authenticated users to manage users"
  ON users FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for cases
CREATE POLICY "Allow anonymous and authenticated users to read cases"
  ON cases FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow anonymous and authenticated users to manage cases"
  ON cases FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for notifications
CREATE POLICY "Allow anonymous and authenticated users to read notifications"
  ON notifications FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow anonymous and authenticated users to manage notifications"
  ON notifications FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for case_activities
CREATE POLICY "Allow anonymous and authenticated users to read case activities"
  ON case_activities FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow anonymous and authenticated users to create case activities"
  ON case_activities FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow anonymous and authenticated users to update case activities"
  ON case_activities FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default office
INSERT INTO offices (name, address, phone, email) 
VALUES ('Main Office', '123 Legal Street, Law City', '+1-555-0123', 'info@legalfirm.com');

-- Function to assign first user as admin
CREATE OR REPLACE FUNCTION assign_first_user_as_admin()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM users) = 0 THEN
    NEW.role = 'admin';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for first user admin assignment
CREATE TRIGGER trigger_assign_first_user_as_admin
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION assign_first_user_as_admin();

-- Function to create case from conversation
CREATE OR REPLACE FUNCTION create_case_from_conversation()
RETURNS TRIGGER AS $$
DECLARE
  default_office_id uuid;
BEGIN
  -- Skip system conversations
  IF NEW.telegram_chat_identifier IS NULL OR NEW.telegram_chat_identifier = 'system' THEN
    RETURN NEW;
  END IF;
  
  -- Get default office
  SELECT id INTO default_office_id FROM offices ORDER BY created_at LIMIT 1;
  
  -- Create case
  INSERT INTO cases (
    conversation_id,
    client_name,
    client_contact,
    case_type,
    office_id,
    status,
    priority
  ) VALUES (
    NEW.id,
    COALESCE(NEW.name, 'Unknown Client'),
    NEW.telegram_chat_identifier,
    'General Inquiry',
    default_office_id,
    'new',
    'medium'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create cases from conversations
CREATE TRIGGER trigger_create_case_from_conversation
  AFTER INSERT ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION create_case_from_conversation();

-- Function to track response times
CREATE OR REPLACE FUNCTION update_case_response_time()
RETURNS TRIGGER AS $$
DECLARE
  case_record RECORD;
  response_minutes integer;
BEGIN
  -- Only process bot messages
  IF NEW.sender_id != 'bot' THEN
    RETURN NEW;
  END IF;
  
  -- Find new case for this conversation
  SELECT * INTO case_record 
  FROM cases 
  WHERE conversation_id = NEW.conversation_id 
  AND status = 'new'
  AND response_time_minutes IS NULL
  LIMIT 1;
  
  -- Update case with response time
  IF case_record.id IS NOT NULL THEN
    response_minutes := EXTRACT(EPOCH FROM (NEW.timestamp - case_record.created_at)) / 60;
    
    UPDATE cases 
    SET 
      response_time_minutes = response_minutes,
      status = 'in-progress'
    WHERE id = case_record.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to track response times
CREATE TRIGGER trigger_update_case_response_time
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_case_response_time();

-- Function for office statistics
CREATE OR REPLACE FUNCTION get_office_statistics()
RETURNS TABLE (
  office_id uuid,
  office_name text,
  total_cases bigint,
  closed_cases bigint,
  rejected_cases bigint,
  new_requests bigint,
  in_progress_cases bigint,
  average_response_time numeric,
  average_satisfaction_rating numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    COUNT(c.id),
    COUNT(CASE WHEN c.status = 'closed' THEN 1 END),
    COUNT(CASE WHEN c.status = 'rejected' THEN 1 END),
    COUNT(CASE WHEN c.status = 'new' THEN 1 END),
    COUNT(CASE WHEN c.status = 'in-progress' THEN 1 END),
    COALESCE(AVG(c.response_time_minutes), 0),
    COALESCE(AVG(c.satisfaction_rating), 0)
  FROM offices o
  LEFT JOIN cases c ON o.id = c.office_id
  GROUP BY o.id, o.name
  ORDER BY o.name;
END;
$$ LANGUAGE plpgsql;

-- Function for lawyer statistics
CREATE OR REPLACE FUNCTION get_lawyer_statistics(office_filter uuid DEFAULT NULL)
RETURNS TABLE (
  lawyer_id uuid,
  lawyer_name text,
  total_cases bigint,
  closed_cases bigint,
  rejected_cases bigint,
  active_cases bigint,
  average_response_time numeric,
  average_satisfaction_rating numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.name,
    COUNT(c.id),
    COUNT(CASE WHEN c.status = 'closed' THEN 1 END),
    COUNT(CASE WHEN c.status = 'rejected' THEN 1 END),
    COUNT(CASE WHEN c.status IN ('assigned', 'in-progress') THEN 1 END),
    COALESCE(AVG(c.response_time_minutes), 0),
    COALESCE(AVG(c.satisfaction_rating), 0)
  FROM users u
  LEFT JOIN cases c ON u.id = c.assigned_lawyer_id
  WHERE u.role IN ('lawyer', 'admin')
  AND (office_filter IS NULL OR u.office_id = office_filter)
  GROUP BY u.id, u.name
  ORDER BY u.name;
END;
$$ LANGUAGE plpgsql;