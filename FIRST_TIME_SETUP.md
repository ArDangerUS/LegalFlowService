# LegalFlow - First Time Setup Guide

## Automatic First User Setup

LegalFlow now features automatic first-time setup! When you first access the application with no existing users, you'll be prompted to create the initial admin account.

## Setup Steps

### 1. Access LegalFlow Application

1. Open your LegalFlow application in a web browser
2. If no users exist in the system, you'll see a **"Create Admin Account"** form instead of a login form
3. This indicates you're setting up the first admin account for your workspace

### 2. Create Your Admin Account

1. Fill in the registration form:
   - **Full Name:** Your name (will be displayed in the system)
   - **Email Address:** Your email (will be your login username)
   - **Password:** Choose a secure password (minimum 6 characters)
2. Click **"Create Admin Account"**
3. The system will:
   - Create your account in Supabase Authentication
   - Create your user profile in the database with 'admin' role
   - Automatically sign you in
   - Switch the system to invite-only mode

### 3. You're Now the Space Owner!

Congratulations! You now have full admin access to your LegalFlow workspace:

- ✅ **Full system access** - All features and settings
- ✅ **User management** - Invite and manage team members  
- ✅ **Case management** - View and manage all cases
- ✅ **Analytics access** - Performance insights and reports
- ✅ **System configuration** - Offices, settings, and more

### 4. Invite Your Team Members

Now that you're set up, you can invite team members:

1. Go to **Users** tab in the navigation
2. Click **"Invite User"**
3. Fill in the user details:
   - **Email:** The user's email address
   - **Role:** Choose from Admin, Lawyer, or Client
   - **Office:** Assign to an office (optional)
4. Click **"Create Invitation"**
5. Copy the invitation link and share it with the user manually
6. The user can then register using the invitation link

## Security Notes

- ✅ **Secure by default** - Only you can create the first account
- ✅ **Invite-only system** - No public registration after initial setup
- ✅ **Role-based access** - Control what each user can see and do
- ✅ **Encrypted data** - All data is securely stored and transmitted

## Troubleshooting

### Still Seeing Login Form?
This means users already exist in the system:
- Someone else may have already set up the workspace
- Contact the existing admin for an invitation
- Check if you have the correct application URL

### Registration Failed?
- Check your internet connection
- Ensure your email format is valid
- Try a different password (minimum 6 characters)
- Check browser console for detailed error messages

### Can't Access Features?
- Refresh the page after registration
- Check that you're logged in (your name should appear in the header)
- Verify you have admin role (should see all navigation options)

### Database Issues?
- Ensure all migrations have run successfully
- Check Supabase connection settings
- Verify RLS policies are properly configured

## Next Steps

1. ✅ Create your admin account (first-time setup)
2. ✅ Explore the dashboard and features
3. ✅ Set up offices and organizational structure
4. ✅ Create additional users via invitations
5. ✅ Configure case management workflows
6. ✅ Set up Telegram bot integration
7. ✅ Begin using the system

## What Makes This Secure?

### First User Registration
- ✅ **One-time only** - Registration is automatically disabled after first user
- ✅ **Admin by default** - First user always gets admin privileges
- ✅ **No backdoors** - No way to bypass the invite system after setup

### Invite-Only System
- ✅ **Admin controlled** - Only admins can create invitations
- ✅ **Time-limited** - Invitations expire after 24 hours
- ✅ **Single use** - Each invitation can only be used once
- ✅ **Role-based** - Admins control what role each user gets

### Data Protection
- ✅ **Encrypted storage** - All data encrypted at rest and in transit
- ✅ **Secure authentication** - Powered by Supabase Auth
- ✅ **Row-level security** - Database-level access controls
- ✅ **Session management** - Automatic session validation and refresh

Your LegalFlow workspace is now secure and ready for your team!