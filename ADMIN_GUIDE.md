# Birthday Buddy - Admin Guide

## Admin Panel Features

The admin panel provides comprehensive user management and system monitoring capabilities.

### Accessing the Admin Panel

1. **Login as Admin**: Only users with admin privileges can access `/admin`
2. **Admin Icon**: Admin users will see a purple shield icon in the dashboard header
3. **Direct URL**: Navigate to `http://localhost:3000/admin` (or your production URL)

### Creating an Admin User

#### Method 1: Using the Script (Recommended)
```bash
npm run create-admin <email> <password> [name]
```

Example:
```bash
npm run create-admin admin@example.com SecurePassword123 "Admin User"
```

This script will:
- Create a new admin user if the email doesn't exist
- Promote an existing user to admin if they already exist

#### Method 2: Direct Database Update
If you already have a user account, you can promote it to admin:

```sql
UPDATE "User" SET "isAdmin" = true WHERE email = 'your@email.com';
```

### Admin Panel Features

#### 1. **System Statistics Dashboard**
- **Total Users**: View the total number of registered users
- **Total Contacts**: See how many birthday contacts are in the system
- **Active Users**: Count of users with email notifications enabled
- **Email Status**: Check if Resend email integration is configured

#### 2. **User Management**
- **View All Users**: See a comprehensive list of all registered users
- **Contact Count**: See how many contacts each user has
- **Toggle Admin Status**: Promote or demote users to/from admin (cannot modify your own status)
- **Toggle Notifications**: Enable or disable email notifications for users
- **Delete Users**: Remove users from the system (cannot delete yourself)
- **Email Verification Status**: See which users have verified their email

#### 3. **Cron Job Control**
- **Manual Trigger**: Run the birthday reminder cron job manually for testing
- **View Results**: See detailed output of cron job execution
- **Schedule Info**: The cron runs daily at 6 AM UTC on Vercel

### Cron Job Configuration

The birthday reminder system runs automatically on Vercel:

**Schedule**: Daily at 6:00 AM UTC (`0 6 * * *`)

**What it does**:
1. **Daily Reminders**: Sends emails for birthdays happening today
2. **Weekly Roundup**: On Mondays, sends a preview of birthdays in the next 7 days

**Configuration File**: `vercel.json`
```json
{
  "crons": [
    {
      "path": "/api/cron/birthday-reminders",
      "schedule": "0 6 * * *"
    }
  ]
}
```

### Email Configuration

Before the cron jobs can send emails, you need to configure Resend:

1. **Get Resend API Key**: Sign up at [resend.com](https://resend.com)
2. **Configure in Settings**: 
   - Go to Dashboard → Settings (gear icon)
   - Enter your Resend API key
   - Enter your verified sender email
   - Click "Save Settings"
3. **Test Email**: Use the "Send Test Email" button to verify configuration

### Environment Variables

Make sure these are set in your `.env` file:

```bash
DATABASE_URL="your-postgres-connection-string"
AUTH_SECRET="your-secret-key"
AUTH_URL="http://localhost:3000"  # or your production URL
GEMINI_API_KEY="your-gemini-api-key"
RESEND_API_KEY="your-resend-api-key"
```

### Deployment to Vercel

1. **Push to GitHub**: Commit all changes
2. **Connect to Vercel**: Import your repository
3. **Set Environment Variables**: Add all required env vars in Vercel dashboard
4. **Deploy**: Vercel will automatically deploy
5. **Cron Jobs**: Vercel will automatically set up the cron job from `vercel.json`

### Security Notes

- Admin status is required to access `/admin`
- Non-admin users are automatically redirected to dashboard
- Admins cannot delete or demote themselves
- All admin actions are server-side validated

### Troubleshooting

#### Cron Jobs Not Running
1. Check that `RESEND_API_KEY` is set in environment variables
2. Verify email configuration in admin panel
3. Check Vercel logs for cron execution
4. Use manual trigger in admin panel to test

#### Cannot Access Admin Panel
1. Verify your user has `isAdmin: true` in database
2. Check that you're logged in
3. Try logging out and back in

#### Emails Not Sending
1. Verify Resend API key is valid
2. Check that sender email is verified in Resend
3. Ensure users have `wantsEmailNotifications: true`
4. Check that contacts have proper reminder types set

### API Endpoints

- **Cron Endpoint**: `GET /api/cron/birthday-reminders`
  - Runs birthday reminder logic
  - Returns JSON with execution results
  - Can be triggered manually by admins

### Database Schema

Key tables for admin functionality:

**User**
- `isAdmin`: Boolean flag for admin access
- `wantsEmailNotifications`: Controls email delivery

**AppSettings**
- `resendApiKey`: Shared Resend API key
- `resendFromEmail`: Sender email address

**Contact**
- `reminderType`: Controls when reminders are sent
- `lastWishedYear`: Tracks if birthday was acknowledged

## Support

For issues or questions, check the main README.md or create an issue in the repository.
