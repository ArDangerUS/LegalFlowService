# EmailJS Setup Instructions for Gmail (misha.okunsiy@gmail.com)

This application is configured to send emails from **misha.okunsiy@gmail.com** using EmailJS. Follow these steps to set up email sending:

## 1. Create EmailJS Account

1. Go to [https://www.emailjs.com/](https://www.emailjs.com/)
2. Sign up for a free account (200 emails/month free)
3. Verify your email address

## 2. Add Gmail Service

1. In EmailJS dashboard, go to **Email Services**
2. Click **Add Service**
3. Choose **Gmail**
4. **Important**: Use the email `misha.okunsiy@gmail.com`
5. Follow Gmail authentication:
   - Click "Connect Account" 
   - Sign in with misha.okunsiy@gmail.com
   - Grant permissions to EmailJS
6. Note down the **Service ID** (something like `service_xxxxxxx`)

## 3. Create Email Template

1. Go to **Email Templates** in EmailJS dashboard
2. Click **Create New Template**
3. Use this template structure:

```html
Subject: {{subject}}

From: {{from_name}} <{{from_email}}>
To: {{to_email}}
Reply-To: {{reply_to}}

{{{message_html}}}

---
Plain text version:
{{{message_text}}}
```

4. **Important**: Make sure these variables are exactly as shown:
   - `{{subject}}`
   - `{{to_email}}`
   - `{{from_name}}`
   - `{{from_email}}`
   - `{{message_html}}`
   - `{{message_text}}`
   - `{{reply_to}}`

5. Save the template and note down the **Template ID** (something like `template_xxxxxxx`)

## 4. Get Public Key

1. Go to **Account** > **General**
2. Find your **Public Key** (something like `xxxxxxxxxxxxxxx`)
3. Copy it for the environment variables

## 5. Configure Environment Variables

Create or update your `.env` file in the project root:

```bash
# EmailJS Configuration
VITE_EMAILJS_SERVICE_ID=service_xxxxxxx
VITE_EMAILJS_TEMPLATE_ID=template_xxxxxxx  
VITE_EMAILJS_PUBLIC_KEY=xxxxxxxxxxxxxxx
```

**Replace the `xxxxxxx` values with your actual EmailJS credentials.**

## 6. Restart and Test

1. Restart your development server: `npm run dev`
2. Try sending an invitation from the User Management section
3. Check the console for setup status and any error messages

## Gmail Security Settings

If you encounter authentication issues:

1. **Enable 2-Factor Authentication** on misha.okunsiy@gmail.com
2. **App Passwords**: If 2FA is enabled, you might need to generate an app password
3. **Less Secure Apps**: This is usually not needed with EmailJS

## Troubleshooting

### ❌ "EmailJS not configured" message
- Check that all three environment variables are set in `.env`
- Verify the values are correct (no quotes needed in .env file)
- Restart the development server

### ❌ Emails not sending
- Check browser console for error messages
- Verify your Gmail account is properly connected in EmailJS dashboard
- Test the template directly in EmailJS dashboard
- Make sure you haven't exceeded the 200 email/month limit

### ❌ "Invalid template" errors
- Ensure template variables match exactly: `{{subject}}`, `{{message_html}}`, etc.
- Test the template in EmailJS dashboard before using it

### ❌ Gmail authentication issues
- Re-authenticate the Gmail service in EmailJS dashboard
- Check that misha.okunsiy@gmail.com account is accessible
- Verify 2-factor authentication settings

## Current Status

The application will show you the current configuration status:
- ✅ **Configured**: All three environment variables are set
- ❌ **Not configured**: Missing environment variables

When not configured, the system will:
- Show email preview in console
- Display invitation links that can be shared manually
- Provide setup instructions

## Free Tier Limits

EmailJS free tier includes:
- **200 emails per month**
- Up to 2 email services
- Up to 2 email templates
- Basic support

For production use with higher volume, consider upgrading to a paid plan.

## Alternative Solutions

If you prefer not to use EmailJS, you can:

1. **Backend Email Service**: Implement a backend API with Nodemailer + Gmail SMTP
2. **Serverless Functions**: Use Vercel/Netlify Functions with email service
3. **Direct SMTP**: Use SendGrid, Mailgun, or Amazon SES

The current implementation will work well for development and moderate production use with EmailJS.