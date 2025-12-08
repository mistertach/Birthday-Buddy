# Email Testing & Cron Job Guide

## Test Email Buttons Added ✅

### Admin Panel
Location: `/admin` → Email Configuration section

**New Buttons:**
1. **Test Connection** (Green) - Tests basic Resend API connectivity
2. **Test Daily Email** (Blue) - Sends sample "Today's Birthdays" email
3. **Test Weekly Email** (Purple) - Sends sample "Week Ahead" email

All test emails are sent to your own email address and marked with [TEST] prefix.

---

## Email Templates

### Daily Email (🎂 Birthdays to celebrate today)
**When sent:** Every day at 6:00 AM UTC
**Who receives it:** Users with `wantsEmailNotifications = true` who have birthdays TODAY
**Content:**
- Greeting with user's name
- List of contacts with birthdays today
- Relationship tags
- Link to dashboard

**Sample:**
```
Good morning [Name],

It's time to celebrate these friends today:
• John Doe (Friend) – 8/12
• Jane Smith (Family) – 8/12

Open Birthday Buddy to send wishes and log that you reached out.
```

### Weekly Email (🎉 Your Birthday Buddy week ahead)
**When sent:** Every Monday at 6:00 AM UTC
**Who receives it:** Users with `wantsEmailNotifications = true` who have birthdays in the NEXT 7 DAYS
**Content:**
- Greeting with user's name
- List of upcoming birthdays with countdown
- Relationship tags and birth years (if available)
- Link to dashboard

**Sample:**
```
Hi [Name],

Here are the birthdays coming up in the next 7 days:

• Alice Johnson (Friend)
  🎉 Today! • 8/12/1985

• Bob Williams (Work)
  In 2 days • 10/12/1992

• Carol Martinez (Family)
  In 5 days • 13/12

You can mark wishes or add notes anytime in your Birthday Buddy dashboard.
```

---

## Cron Job Configuration

### Current Setup
- **File:** `vercel.json`
- **Endpoint:** `/api/cron/birthday-reminders`
- **Schedule:** `0 6 * * *` (Every day at 6:00 AM UTC)
- **Logic:**
  - **Daily:** Runs every day, sends to users with birthdays TODAY
  - **Weekly:** Runs only on Mondays, sends to users with birthdays in next 7 days

### Why Cron Jobs Don't Work Locally

**Important:** Vercel Cron Jobs ONLY work in production deployments, not in local development (`npm run dev`).

**Reasons:**
1. Cron jobs are a Vercel platform feature
2. They require Vercel's infrastructure to schedule and trigger
3. Local development doesn't have access to Vercel's cron scheduler

### Testing Cron Jobs

**Option 1: Manual Trigger (Admin Panel)**
- Go to Admin Panel → Cron Job Control
- Click "Trigger Cron Job Manually"
- This runs the same code that the cron job would run

**Option 2: Direct API Call (Local)**
```bash
curl http://localhost:3000/api/cron/birthday-reminders
```

**Option 3: Test in Production**
1. Deploy to Vercel
2. Wait for scheduled time (6:00 AM UTC)
3. Or use Vercel Dashboard to trigger manually:
   - Go to your project in Vercel
   - Navigate to "Cron Jobs" tab
   - Click "Run" next to your cron job

---

## Troubleshooting Email Issues

### Emails Not Being Received

**Check 1: Resend Configuration**
- Admin Panel → Email Configuration
- Verify API key is set
- Verify "From Email" is a verified domain in Resend
- Click "Test Connection" to verify

**Check 2: User Notification Settings**
- Each user must have `wantsEmailNotifications = true`
- Check in Admin Panel → User Management
- Toggle the bell icon to enable notifications

**Check 3: Birthday Data**
- Ensure contacts have correct day/month values
- Check that contacts have appropriate `reminderType`:
  - `MORNING` = gets daily email on birthday
  - `DAY_BEFORE` = gets daily email on birthday
  - `WEEK_BEFORE` = gets weekly email only
  - `NONE` = no emails

**Check 4: Resend Dashboard**
- Log into Resend.com
- Check "Logs" section for delivery status
- Look for bounces or errors

**Check 5: Spam Folder**
- Check spam/junk folder
- Add sender to contacts/safe senders

### Common Issues

**Issue:** "Resend API key is not configured"
**Solution:** Admin must set API key in Admin Panel

**Issue:** "From email address is missing"
**Solution:** Admin must set verified email in Admin Panel

**Issue:** Emails sent but not received
**Solution:** 
- Check Resend logs
- Verify email domain is verified in Resend
- Check SPF/DKIM records

**Issue:** Cron job not running
**Solution:**
- Verify `vercel.json` is in root directory
- Check Vercel Dashboard → Cron Jobs tab
- Ensure app is deployed (crons don't work locally)

---

## Deployment Checklist

Before deploying to production:

- [ ] Set `RESEND_API_KEY` in Vercel environment variables
- [ ] Configure Resend settings in Admin Panel (after deployment)
- [ ] Verify domain in Resend dashboard
- [ ] Set up SPF and DKIM records for email domain
- [ ] Test email sending with "Test Connection" button
- [ ] Preview email templates with test buttons
- [ ] Enable email notifications for test users
- [ ] Verify cron job appears in Vercel Dashboard
- [ ] Manually trigger cron job to test
- [ ] Wait for scheduled run (6:00 AM UTC next day)

---

## Email Best Practices

1. **Domain Verification:** Use a verified domain in Resend (not Gmail/Yahoo)
2. **SPF/DKIM:** Set up proper email authentication
3. **From Name:** Use "Birthday Buddy" for brand recognition
4. **Subject Lines:** Clear and emoji-enhanced for visibility
5. **Testing:** Always test with real email addresses before production
6. **Monitoring:** Check Resend logs regularly for delivery issues

---

## API Endpoints

### Cron Job
- **URL:** `/api/cron/birthday-reminders`
- **Method:** GET
- **Auth:** None (Vercel cron jobs are authenticated automatically)
- **Response:**
```json
{
  "ok": true,
  "startedAt": "2025-12-08T06:00:00.000Z",
  "dayOf": {
    "ok": true,
    "results": [...]
  },
  "weekly": {
    "ok": true,
    "results": [...]
  }
}
```

### Test Emails
- **Functions:** `sendTestDailyEmail()`, `sendTestWeeklyEmail()`
- **Access:** Admin Panel or any authenticated user
- **Purpose:** Preview email templates with sample data
