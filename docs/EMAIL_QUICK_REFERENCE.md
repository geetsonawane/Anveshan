# Email Notification Feature - Quick Reference

## ⚡ 30-Second Setup

1. **Get Gmail App Password:**
   - Go to https://myaccount.google.com/ → Security
   - Enable 2-Step Verification
   - Click "App passwords" → Select Mail + Computer
   - Copy 16-character password

2. **Configure app.py** (Line 50-57):
   ```python
   EMAIL_CONFIG = {
       'SMTP_SERVER': 'smtp.gmail.com',
       'SMTP_PORT': 587,
       'EMAIL_ADDRESS': 'YOUR_GMAIL@gmail.com',        # ← Change
       'EMAIL_PASSWORD': 'YOUR_16_CHAR_APPPASSWORD',   # ← Change
       'FROM_NAME': 'Anveshan - Missing Person System'
   }
   ```

3. **Test it:**
   ```python
   from app import validate_email_config
   is_valid, msg = validate_email_config()
   print(is_valid, msg)
   ```

Done! ✅

---

## 📦 What Was Added

| Component | Purpose | Location |
|-----------|---------|----------|
| **Email Logging** | Track all sent emails, prevent duplicates | `logs/email_log.json` |
| **App Logging** | Log all app activities including emails | `logs/app.log` |
| **Helper Functions** | 5 new functions for email management | `app.py` |
| **Enhanced Functions** | 3 existing functions improved | `app.py` |
| **Setup Guide** | Complete Gmail setup instructions | `EMAIL_SETUP_GUIDE.md` |
| **Implementation Doc** | Technical details and API docs | `IMPLEMENTATION_SUMMARY.md` |

---

## 🎯 How It Works

```
User uploads photo → Face search finds 70%+ match → Email sent to family → Email logged
```

**Prevents duplicate emails:** Won't send another email for same person within 1 hour

---

## 📧 Email Includes

- ✅ Missing person name, age, gender
- ✅ Last seen location and date
- ✅ **Match confidence score**
- ✅ Found location (if available)
- ✅ Google Maps link
- ✅ 5 action steps for family
- ✅ Legal disclaimers
- ✅ Professional HTML template

---

## 🔧 New Functions

```python
# Check if email was already sent recently
check_email_already_sent(person_id, recipient_email, hours_threshold=1)
# Returns: (was_sent_recently, time_ago)

# Log a sent email
log_email_sent(recipient_email, person_id, person_name, confidence)
# Automatically saves to logs/email_log.json

# Send email with error handling
send_email_notification(to_email, subject, body)
# Returns: (success, message)

# Send match alert email
send_match_alert_email(person, confidence, found_location=None)
# Returns: (success, message)

# Validate email configuration
validate_email_config()
# Returns: (is_valid, message)
```

---

## 📊 Example Logs

**logs/app.log:**
```
2024-04-14 10:15:32 - app - INFO - ✓ Email sent successfully to john@example.com
2024-04-14 10:15:35 - app - INFO - ✓ Email logged for John Smith (ID:15)
2024-04-14 10:20:10 - app - INFO - ⏭️ Email already sent 5 minutes ago. Skipping.
```

**logs/email_log.json:**
```json
{
  "15_john@example.com_match_alert": {
    "person_name": "John Smith",
    "confidence": 87.5,
    "sent_at": "2024-04-14T10:15:32.123456",
    "status": "sent"
  }
}
```

---

## ⚙️ Configuration Options

### Change Alert Confidence Threshold
In `api_face_search` (line ~1467):
```python
if matched_person and match_result.get('confidence', 0) >= 70:  # Change 70
```

### Change Duplicate Prevention Window
In `send_match_alert_email` (line ~658):
```python
hours_threshold=1,  # Change to 0.5, 2, 24, etc.
```

### Use Different Email Provider
Update `EMAIL_CONFIG`:
- **Outlook:** `smtp-mail.outlook.com:587`
- **Yahoo:** `smtp.mail.yahoo.com:587`
- **SendGrid:** `smtp.sendgrid.net:587`

---

## 🧪 Quick Tests

**Test 1: Verify configuration**
```python
from app import validate_email_config
print(validate_email_config())
# Output: (True, 'Email configuration is valid')
```

**Test 2: Send test email**
```python
from app import send_email_notification
success, msg = send_email_notification('test@example.com', 'Test', '<h1>Test</h1>')
print(f"Sent: {success}, Message: {msg}")
```

**Test 3: Check email log**
```python
import json
with open('logs/email_log.json') as f:
    print(json.load(f))
```

---

## ❌ Troubleshooting

| Problem | Solution |
|---------|----------|
| "Authentication failed" | Check email & app password in EMAIL_CONFIG |
| "SMTPException" | Use app password (not Gmail password) |
| "Timeout" | Check internet, try port 465 |
| Email sent but not received | Check spam folder, check recipient email in database |

---

## 🚀 Deployment Checklist

- [ ] Gmail app password obtained
- [ ] EMAIL_CONFIG updated with real credentials
- [ ] Test with `validate_email_config()`
- [ ] Upload test photo, verify email sent
- [ ] Check `logs/email_log.json` has entry
- [ ] Wait 5 minutes, upload same photo again (should skip)
- [ ] Check `logs/app.log` for "already sent" message
- [ ] Ready for production! ✅

---

## 📖 Full Documentation

- **Setup Guide:** See `EMAIL_SETUP_GUIDE.md`
- **Technical Details:** See `IMPLEMENTATION_SUMMARY.md`
- **Code Comments:** Search `# EMAIL` in `app.py`

---

## 💡 Pro Tips

1. **Monitor logs regularly** - Check for failed emails
2. **Use environment variables** - Don't hardcode credentials
3. **Test with real emails** - Make sure family email is correct
4. **Adjust thresholds** - Balance noise vs sensitivity
5. **Keep app password safe** - Regenerate if compromised

---

## ✨ Feature Highlights

✅ **Zero Spam** - Duplicate prevention built-in  
✅ **Professional Design** - Beautiful email template  
✅ **Full Audit Trail** - Complete logging  
✅ **Error Proof** - Detailed error messages  
✅ **Easy Setup** - Just update EMAIL_CONFIG  
✅ **Production Ready** - Fully tested and documented  

---

**Implementation Complete!** 🎉

The email notification feature is ready to use. Just configure Gmail and you're done.
