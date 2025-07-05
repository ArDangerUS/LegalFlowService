# LegalFlow Authentication System Documentation

## Overview

LegalFlow implements a secure, invite-only authentication system using Supabase Auth with role-based access control. The system is designed to prevent unauthorized registration while maintaining a smooth user experience for invited users.

## Architecture

### Core Components

1. **AuthService** (`src/services/AuthService.ts`)
   - Singleton service managing all authentication operations
   - Handles Supabase Auth integration
   - Manages user sessions and state
   - Provides role-based access utilities

2. **useAuth Hook** (`src/hooks/useAuth.ts`)
   - React hook providing authentication state and methods
   - Integrates with AuthService
   - Provides role checking utilities

3. **ProtectedRoute Component** (`src/components/auth/ProtectedRoute.tsx`)
   - Route protection based on authentication status
   - Role-based access control
   - Graceful error handling and loading states

4. **Login Component** (`src/components/auth/Login.tsx`)
   - Secure login form with validation
   - Error handling and user feedback
   - Invite-only messaging

## Authentication Flow

### 0. First Time Setup (Space Creation)

```
No users exist → User accesses app → Registration form shown → First admin created
```

**Steps:**
1. System checks if any users exist in database
2. If no users exist, login form becomes registration form
3. User provides name, email, and password
4. System creates Supabase Auth user and database record with 'admin' role
5. User is automatically signed in as space owner
6. System switches to invite-only mode for subsequent users

### 1. User Invitation Process

```
Admin creates invitation → Invitation stored in database → Invitation link shared manually
```

**Steps:**
1. Admin user creates invitation through User Management interface
2. System generates unique token and stores invitation in `invitations` table
3. Invitation link is displayed to admin for manual sharing
4. No automatic email sending (removed email dependencies)

### 2. User Registration Process

```
User clicks invitation link → Validates token → User completes registration → Account created
```

**Steps:**
1. User accesses invitation link (`/invite/{token}`)
2. System validates token (not expired, status = 'pending')
3. User provides name and password
4. System creates Supabase Auth user and database record
5. Invitation marked as 'accepted'

### 3. User Login Process

```
User enters credentials → Supabase Auth validation → Load user profile → Session established
```

**Steps:**
1. User submits email and password
2. Supabase Auth validates credentials
3. System loads user profile from database
4. Validates user is active
5. Updates last login timestamp
6. Establishes authenticated session

### 4. Session Management

```
Page load → Check existing session → Validate user profile → Update auth state
```

**Features:**
- Automatic session restoration on page reload
- Token refresh handling
- User profile synchronization
- Graceful error handling

## Security Features

### Row Level Security (RLS)

All database tables implement RLS policies:

```sql
-- Users table - allow authenticated access
CREATE POLICY "Allow authenticated users to read users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

-- Invitations table - token-based access for registration
CREATE POLICY "Allow anonymous users to read invitations by token"
  ON invitations FOR SELECT
  TO anon
  USING (token IS NOT NULL AND status = 'pending' AND expires_at > now());
```

### Role-Based Access Control

Three user roles with different permissions:

1. **Admin**
   - Full system access
   - User management
   - All case visibility
   - Analytics access

2. **Lawyer**
   - Assigned cases only
   - Limited user visibility
   - Case management for assigned cases

3. **Client**
   - Restricted access
   - Own data only

### Authentication Validation

- Email format validation
- Password strength requirements
- Token expiration checking
- User activation status verification
- Session integrity validation

## Error Handling

### Authentication Errors

```typescript
// Mapped error messages for user-friendly feedback
private mapAuthError(error: any): Error {
  if (error.message.includes('Invalid login credentials')) {
    return new Error('Invalid email or password. Please check your credentials and try again.');
  }
  // ... other error mappings
}
```

### Common Error Scenarios

1. **Invalid Credentials**
   - Clear error message
   - No account enumeration
   - Rate limiting protection

2. **Expired Invitations**
   - Token validation
   - Clear expiration messaging
   - Admin notification

3. **Inactive Users**
   - Account status checking
   - Admin contact information
   - Graceful degradation

## Usage Examples

### Protecting Routes

```typescript
// Require authentication
<ProtectedRoute>
  <Dashboard />
</ProtectedRoute>

// Require specific roles
<ProtectedRoute requiredRoles={['admin']}>
  <UserManagement />
</ProtectedRoute>

// Custom fallback
<ProtectedRoute fallback={<CustomLogin />}>
  <ProtectedContent />
</ProtectedRoute>
```

### Using Authentication State

```typescript
const { user, loading, error, signIn, signOut, isAdmin } = useAuth();

// Check authentication status
if (loading) return <LoadingSpinner />;
if (!user) return <Login />;

// Role-based rendering
if (isAdmin()) {
  return <AdminPanel />;
}
```

### Creating Invitations

```typescript
// Admin creates invitation
const invitation = await caseService.createInvitation(
  'user@example.com',
  'lawyer',
  officeId,
  currentUser.id
);

// Share invitation link manually
const invitationUrl = `${window.location.origin}/invite/${invitation.token}`;
```

## Configuration

### Environment Variables

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Supabase Auth Settings

- Email confirmation: **Disabled** (invite-only system)
- Sign up: **Disabled** (admin-only user creation)
- Password requirements: Minimum 6 characters
- Session timeout: Default Supabase settings

## Security Considerations

### Best Practices Implemented

1. **Invite-Only Registration**
   - No public registration endpoints
   - Token-based invitation system
   - Admin-controlled user creation

2. **Secure Token Handling**
   - Cryptographically secure token generation
   - Time-based expiration
   - Single-use tokens

3. **Session Security**
   - Automatic session validation
   - Secure token storage
   - Proper logout handling

4. **Role Enforcement**
   - Database-level RLS policies
   - Application-level role checking
   - UI-level access control

### Potential Vulnerabilities

1. **Token Sharing**
   - Mitigation: Short expiration times
   - Monitoring: Track invitation usage

2. **Session Hijacking**
   - Mitigation: HTTPS enforcement
   - Monitoring: Unusual login patterns

3. **Privilege Escalation**
   - Mitigation: Strict role validation
   - Monitoring: Role change auditing

## Maintenance

### Regular Tasks

1. **Clean up expired invitations**
2. **Monitor failed login attempts**
3. **Review user access patterns**
4. **Update security policies**

### Monitoring

- Authentication success/failure rates
- Invitation usage patterns
- Session duration analytics
- Role-based access patterns

## Troubleshooting

### Common Issues

1. **User can't log in**
   - Check user active status
   - Verify email/password
   - Check Supabase Auth logs

2. **Invitation not working**
   - Verify token not expired
   - Check invitation status
   - Validate database policies

3. **Role access denied**
   - Verify user role assignment
   - Check RLS policies
   - Validate component permissions

### Debug Tools

- Browser developer tools
- Supabase Auth logs
- Application console logs
- Network request inspection

This authentication system provides a secure, scalable foundation for the LegalFlow application while maintaining ease of use for administrators and end users.