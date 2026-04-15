# Anveshan Database Setup Guide

## Database Structure

The application now uses SQLAlchemy ORM with SQLite database (can be migrated to PostgreSQL/MySQL).

### Database Models

1. **MissingPerson** - Stores information about missing persons
   - Personal info (name, age, gender, category)
   - Physical description (height, weight, eye color, hair color, features)
   - Last seen information (location, date, time, clothing)
   - Reporter information (name, relationship, phone, email)
   - Photo paths and status

2. **FoundPerson** - Stores information about found persons
   - Found location, date, time
   - Physical description
   - Finder information
   - Match information (linked to missing persons)

3. **Alert** - Stores alerts and notifications
   - Alert type (emergency, match, sighting, resolved)
   - Title, message, location
   - Read/unread status
   - Linked to missing persons

4. **Admin** - Stores admin user accounts
   - Username, password hash, email
   - Role and status

5. **Contact** - Stores contact form submissions
   - Name, email, phone, subject, message
   - Status tracking

## Installation Steps

### 1. Install Required Packages

```bash
pip install -r requirements.txt
```

### 2. Initialize the Database

Run the initialization script to create tables and add sample data:

```bash
python init_db.py
```

This will:
- Create all database tables
- Add sample missing persons (3 records)
- Add sample alerts (3 records)
- Add a sample found person
- Create an admin user

### 3. Admin Credentials

After initialization, you can login to the admin panel with:
- **Username:** admin
- **Password:** admin123

### 4. Run the Application

```bash
python app.py
```

The application will be available at: http://localhost:5000

## Database File Location

The SQLite database file will be created at:
```
anveshan/anveshan.db
```

## Features Implemented

✅ **Report Missing Person** - Saves to database with photo uploads
✅ **Report Found Person** - Saves to database with matching capability
✅ **Search & Filter** - Real-time database queries
✅ **Alerts System** - Stored in database, linked to cases
✅ **Admin Authentication** - Database-backed user system
✅ **Contact Form** - Messages saved to database

## File Upload Directory

Photos are uploaded to:
```
anveshan/static/uploads/
```

Make sure this directory has write permissions.

## Configuration

Database settings can be modified in `config.py`:

- **Development:** SQLite database (default)
- **Production:** Set `DATABASE_URL` environment variable
- **Upload folder:** `static/uploads/`
- **Max file size:** 16 MB
- **Allowed extensions:** png, jpg, jpeg, gif

## API Endpoints

### POST /api/report-missing
Submit a missing person report
- Saves to `MissingPerson` table
- Creates alert in `Alert` table
- Uploads photos to server

### POST /api/report-found
Submit a found person report
- Saves to `FoundPerson` table
- Ready for AI matching implementation

### GET /api/search
Search missing persons with filters
- Query: `?q=name&category=child&time=24h`
- Returns filtered results from database

### POST /api/contact
Submit contact form
- Saves to `Contact` table

## Next Steps

1. **AI Matching Implementation**
   - Integrate facial recognition (RetinaFace + FaceNet)
   - Match found persons with missing persons
   - Update match_confidence scores

2. **Email Notifications**
   - Send alerts to reporters
   - Send confirmation emails

3. **SMS Integration**
   - Emergency alerts via SMS

4. **Advanced Search**
   - Geolocation-based search
   - Image-based search

5. **Database Migration**
   - For production, migrate to PostgreSQL
   - Update `DATABASE_URL` in config

## Troubleshooting

### Database Locked Error
If you get a "database is locked" error:
- Close all connections to the database
- Restart the application

### Permission Errors
Make sure the `static/uploads/` directory exists and has write permissions:
```bash
mkdir -p static/uploads
chmod 755 static/uploads
```

### Re-initialize Database
To reset the database (WARNING: deletes all data):
```bash
python init_db.py
```

## Security Notes

⚠️ **Important for Production:**
1. Change `SECRET_KEY` in config.py
2. Use environment variables for sensitive data
3. Enable CSRF protection
4. Use HTTPS for all requests
5. Implement rate limiting
6. Add input validation and sanitization
7. Use proper password policies for admins
