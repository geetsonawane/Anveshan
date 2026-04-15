# Email Notification Configuration Guide

## Overview

The Anveshan system now includes automatic email notifications that alert families when a match is found through the face search feature. This guide explains how to set up and configure the email system.

## 🚀 Quick Setup

### Step 1: Get Gmail App Password

1. Go to your Google Account: https://myaccount.google.com/
2. Click "Security" in the left menu
3. Enable "2-Step Verification" (if not already enabled)
4. After 2-Step is enabled, you'll see "App passwords" option
5. Select "Mail" and "Windows Computer" (or your device)
6. Copy the generated 16-character app password

### Step 2: Configure in app.py

Open `app.py` and find the `EMAIL_CONFIG` section (around line 50-57):

```python
EMAIL_CONFIG = {
    'SMTP_SERVER': 'smtp.gmail.com',
    'SMTP_PORT': 587,
    'EMAIL_ADDRESS': 'your.email@gmail.com',      # <- Change this to your Gmail address
    'EMAIL_PASSWORD': 'your_app_password',         # <- Paste your app password here
    'FROM_NAME': 'Anveshan - Missing Person System'
}
```

Replace:
- `your.email@gmail.com` with your actual Gmail address
- `your_app_password` with the 16-character app password from Step 1

**Example:**
```python
EMAIL_CONFIG = {
    'SMTP_SERVER': 'smtp.gmail.com',
    'SMTP_PORT': 587,
    'EMAIL_ADDRESS': 'anveshan.alerts@gmail.com',
    'EMAIL_PASSWORD': 'abcd efgh ijkl mnop',  # Your app password (without spaces in actual use)
    'FROM_NAME': 'Anveshan - Missing Person Recovery'
}
```

### Step 3: Test Email Configuration

Run this Python script to test your configuration:

```python
from app import validate_email_config

is_valid, message = validate_email_config()
print(f"Configuration Valid: {is_valid}")
print(f"Message: {message}")
```

## 📧 Email Features

### Feature 1: Automatic Match Alerts

When face search finds a high-confidence match (≥70%), an automatic email is sent to the missing person's registered email address with:
- ✅ Missing person details
- ✅ Match confidence percentage
- ✅ Date and time of match
- ✅ Location (if EXIF data available)
- ✅ Google Maps link to location
- ✅ Action steps for the family
- ✅ Professional HTML template

### Feature 2: Duplicate Prevention

To prevent email spam, the system:
- ✅ Tracks all sent emails in `logs/email_log.json`
- ✅ Won't send another email for the same person within 1 hour
- ✅ Logs duplicate attempts

### Feature 3: Comprehensive Logging

All email activities are logged:
- ✅ Send location: `logs/app.log` (general app logs)
- ✅ Email tracking: `logs/email_log.json` (detailed email history)
- ✅ Includes timestamps, recipient, confidence score

## 🔧 Email Configuration Options

### Change SMTP Server (Advanced)

If not using Gmail, you can configure other email providers:

**For Outlook/Microsoft:**
```python
'SMTP_SERVER': 'smtp-mail.outlook.com',
'SMTP_PORT': 587,
```

**For Yahoo:**
```python
'SMTP_SERVER': 'smtp.mail.yahoo.com',
'SMTP_PORT': 587,
```

**For SendGrid:**
```python
'SMTP_SERVER': 'smtp.sendgrid.net',
'SMTP_PORT': 587,
'EMAIL_ADDRESS': 'apikey',  # literal string
'EMAIL_PASSWORD': 'SG.xxxxxxxxx',  # Your SendGrid API key
```

### Change Alert Threshold

Edit the face search endpoint to change when emails are sent:

```python
# Current: sends email if confidence >= 70%
if matched_person and match_result.get('confidence', 0) >= 70:
    # Change 70 to your desired threshold (0-100)
```

### Modify Duplicate Prevention Window

Change the time window in `check_email_already_sent()`:

```python
# Current: 1 hour
was_sent_recently, time_since_last = check_email_already_sent(
    person_id=person_id,
    recipient_email=reporter_email,
    hours_threshold=1,  # <- Change this value
    email_type='match_alert'
)
```

## 📊 Logs Explanation

### App Logs (`logs/app.log`)

```
2024-04-14 10:15:32,456 - app - INFO - ✓ Email sent successfully to john@example.com
2024-04-14 10:15:35,123 - app - INFO - ✓ Email logged for John Smith (15) to john@example.com
2024-04-14 10:16:12,789 - app - INFO - ⏭️ Email for Jane Doe was already sent 5 minutes ago
```

### Email Log (`logs/email_log.json`)

```json
{
  "15_john@example.com_match_alert": {
    "recipient_email": "john@example.com",
    "person_id": 15,
    "person_name": "John Smith",
    "confidence": 89.5,
    "email_type": "match_alert",
    "sent_at": "2024-04-14T10:15:32.456789",
    "status": "sent"
  }
}
```

## 🛡️ Security Best Practices

1. **Never commit credentials to Git:**
   - Keep `EMAIL_CONFIG` with dummy values in version control
   - Locally override with real values
   - Consider using environment variables:
     ```python
     import os
     EMAIL_CONFIG = {
         'EMAIL_ADDRESS': os.environ.get('ANVESHAN_EMAIL'),
         'EMAIL_PASSWORD': os.environ.get('ANVESHAN_PASSWORD'),
         ...
     }
     ```

2. **Use App Passwords, Not Regular Password:**
   - Never put your actual Gmail password in code
   - Always use Gmail App Passwords
   - If password is leaked, regenerate app password from Google Account

3. **Monitor Logs Regularly:**
   - Check `logs/email_log.json` periodically
   - Review failed email attempts in `logs/app.log`
   - Check for suspicious patterns

## ❌ Troubleshooting

### Issue: "Email authentication failed"
**Solution:** Check that:
- Gmail address is correct in `EMAIL_ADDRESS`
- App password is correct (16 characters, no spaces)
- 2-Step Verification is enabled in Google Account

### Issue: "SMTPException: 530 5.7.0"
**Solution:** 
- Gmail requires app passwords, not regular passwords
- Enable 2-Step Verification first
- Generate app password from Google Account

### Issue: "Connection timeout"
**Solution:**
- Check internet connection
- SMTP server might be down
- Try using a different port (465 instead of 587)
- Check firewall settings

### Issue: Email sent but no email received
**Solution:**
- Check spam folder
- Verify recipient email address is correct
- Check that person's email is saved in database
- Review logs for any errors

## 📝 Testing the Email System

### Manual Test

```python
from app import send_email_notification

success, message = send_email_notification(
    to_email='your-test-email@example.com',
    subject='Test Email from Anveshan',
    body='<h1>Test</h1><p>If you see this, email is working!</p>'
)

print(f"Success: {success}")
print(f"Message: {message}")
```

### Test with Mock Data

```python
from datetime import datetime, date, time
from models import MissingPerson
from app import send_match_alert_email

# Create test missing person
test_person = MissingPerson(
    full_name="Test Person",
    age=25,
    gender="Male",
    category="other",
    last_seen_location="Test Location",
    last_seen_date=date.today(),
    last_seen_time=datetime.now().time(),
    reporter_name="Test reporter",
    reporter_phone="9999999999",
    reporter_email="your-test-email@example.com",
    status="active"
)

# Send test email
success, message = send_match_alert_email(
    person=test_person,
    confidence=85.5,
    found_location="Test GPS: 40.7128, -74.0060"
)

print(f"Email sent: {success}")
print(f"Status: {message}")
```

## 📞 Support

If you encounter issues:

1. Check logs: `logs/app.log` and `logs/email_log.json`
2. Verify Gmail configuration
3. Test with the manual test script above
4. Check firewall/network settings
5. Review code comments in `app.py` for EMAIL_SETUP_GUIDE

## 📋 Email Template Details

The email sent includes:

- **Header:** Professional gradient design with Anveshan branding
- **Alert Section:** Match details in easy-to-read format
  - Missing person name and age
  - Last seen location and date
  - **AI Confidence percentage** (highlighted)
  - Found location (if available)
  - Match timestamp
- **Action Items:** Clear next steps numbered list
- **Legal Disclaimer:** Warning about AI limitations
- **Footer:** Contact information and helpline

All styling is inline CSS for compatibility across email clients.
