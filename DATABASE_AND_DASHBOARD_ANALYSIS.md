# Database Models & Admin Dashboard Analysis

## 1. DATABASE MODELS IN models.py

### MissingPerson Model (`missing_persons` table)

**Primary Key:**
- `id` (Integer, auto-increment)

**Personal Information:**
- `full_name` (String(200), required)
- `age` (Integer, required)
- `gender` (String(20), required) - e.g., "Male", "Female"
- `category` (String(50), required) - Values: "child", "alzheimer", "other"

**Physical Description:**
- `height` (Integer) - in cm
- `weight` (Integer) - in kg
- `eye_color` (String(50))
- `hair_color` (String(50))
- `distinguishing_features` (Text)

**Last Seen Information:**
- `last_seen_location` (String(500), required)
- `last_seen_date` (Date, required)
- `last_seen_time` (Time, required)
- `last_seen_wearing` (Text)

**Reporter Information:**
- `reporter_name` (String(200), required)
- `reporter_relationship` (String(100))
- `reporter_phone` (String(20), required)
- `reporter_email` (String(200), required)

**Photo Information:**
- `photo_paths` (Text) - JSON string of comma-separated file paths

**Status & Metadata:**
- `status` (String(50), default='active') - Values: "active", "resolved", "closed"
- `match_score` (Float, default=0.0) - Face matching confidence score
- `created_at` (DateTime, default=datetime.utcnow) - When case was reported
- `updated_at` (DateTime, auto-update) - Last modification time
- `resolved_at` (DateTime, nullable) - **⚠️ NOT SET when marking cases resolved (BUG)**

**Relationships:**
- `alerts` - One-to-many with Alert model (cascade delete)
- `found_reports` - One-to-many with FoundPerson model

---

### FoundPerson Model (`found_persons` table)

**Primary Key:**
- `id` (Integer, auto-increment)

**Found Information:**
- `found_location` (String(500), required)
- `found_date` (Date, required)
- `found_time` (Time, required)
- `found_condition` (Text)

**Person Description:**
- `approx_age` (Integer)
- `approx_gender` (String(20))
- `physical_description` (Text)
- `clothing_description` (Text)

**Current Location:**
- `current_location` (String(200)) - Values: "with-me", "safe-place", "other"
- `location_details` (String(500))

**Finder Information:**
- `finder_name` (String(200), required)
- `finder_phone` (String(20), required)
- `finder_email` (String(200), nullable)

**Photo Information:**
- `photo_paths` (Text) - JSON string of comma-separated file paths

**Matching Information:**
- `matched_missing_person_id` (Integer, FK to MissingPerson) - Matched case ID
- `match_confidence` (Float, default=0.0) - AI face match confidence score
- `match_status` (String(50), default='pending') - Values: "pending", "confirmed", "rejected"

**Metadata:**
- `created_at` (DateTime, default=datetime.utcnow)
- `verified_at` (DateTime, nullable) - When admin verified/confirmed match

---

### Alert Model (`alerts` table)

**Primary Key:**
- `id` (Integer, auto-increment)

**Alert Information:**
- `alert_type` (String(50), required) - Values: "emergency", "match", "sighting", "resolved"
- `title` (String(200), required)
- `message` (Text, required)
- `location` (String(200))

**Related Records:**
- `missing_person_id` (Integer, FK to MissingPerson)
- `found_person_id` (Integer, FK to FoundPerson)

**Status:**
- `is_read` (Boolean, default=False) - Admin has viewed alert
- `is_active` (Boolean, default=True) - Alert still relevant

**Metadata:**
- `created_at` (DateTime, lambda=datetime.utcnow)
- `updated_at` (DateTime, auto-update)

**Purpose:** Tracks face match alerts, emergency alerts, case resolutions, and sightings

---

### Admin Model (`admins` table)

**Primary Key:**
- `id` (Integer, auto-increment)

**Credentials:**
- `username` (String(100), unique, required)
- `password_hash` (String(255), required)
- `email` (String(200), unique, required)
- `full_name` (String(200))

**Role & Status:**
- `role` (String(50), default='admin') - Values: "admin", "super_admin", "moderator"
- `is_active` (Boolean, default=True)

**Metadata:**
- `created_at` (DateTime, default=datetime.utcnow)
- `last_login` (DateTime) - Last login timestamp

---

### Contact Model (`contacts` table)

**Primary Key:**
- `id` (Integer, auto-increment)

**Contact Information:**
- `name` (String(200), required)
- `email` (String(200), required)
- `phone` (String(20))
- `subject` (String(200))
- `message` (Text, required)

**Status:**
- `status` (String(50), default='new') - Values: "new", "in_progress", "resolved"

**Metadata:**
- `created_at` (DateTime, default=datetime.utcnow)

---

## 2. CURRENT ADMIN DASHBOARD STRUCTURE

### Dashboard Route: `/admin-dashboard`

**Location:** [app.py](app.py#L848-L877)

**Access Control:**
- Requires `session['admin']` to be True
- Redirects to login if not authenticated

**Current Stats Calculation (Line 858-865):**

```python
stats = {
    'active_cases': MissingPerson.query.filter_by(status='active').count(),
    'resolved_today': MissingPerson.query.filter(
        MissingPerson.status == 'resolved',
        MissingPerson.resolved_at >= today_start  # ⚠️ BUG: resolved_at never set
    ).count(),
    'total_reports': FoundPerson.query.count(),
    'pending_matches': FoundPerson.query.filter_by(match_status='pending').count()
}
```

**Recent Cases (Line 868):**
- Retrieves last 10 cases ordered by creation date (newest first)
- Query: `MissingPerson.query.order_by(MissingPerson.created_at.desc()).limit(10)`

**Pending Verifications (Line 871-873):**
- Retrieves pending found person matches
- Ordered by match confidence (highest first)
- Query: `FoundPerson.query.filter_by(match_status='pending').order_by(FoundPerson.match_confidence.desc()).limit(5)`

**Template:** [admin_dashboard.html](templates/admin_dashboard.html#L1-L100)

---

## 3. ADMIN ROUTES & CAPABILITIES

### Case Management Routes:

| Route | Method | Purpose |
|-------|--------|---------|
| `/admin/all-cases` | GET | List all missing person cases with filters (status, category, search) |
| `/api/admin/delete-case/<id>` | DELETE | Delete case and associated photos |
| `/api/admin/resolve-case/<id>` | POST | Mark case as resolved ⚠️ BUG: doesn't set `resolved_at` |

### Found Person Routes:

| Route | Method | Purpose |
|-------|--------|---------|
| `/admin-all-found` | GET | List all found person reports with match status filters |
| `/api/admin/found/<id>/confirm-match` | POST | Confirm a face match as valid |
| `/api/admin/found/<id>/reject-match` | POST | Reject a face match |
| `/api/admin/delete-found/<id>` | DELETE | Delete found person report and photos |

### Contact Management Routes:

| Route | Method | Purpose |
|-------|--------|---------|
| `/admin/contacts` | GET | View contact form submissions with status filters |
| `/api/admin/contact/<id>/status` | POST | Update contact message status |
| `/api/admin/contact/<id>` | DELETE | Delete contact message |

---

## 4. DATABASE QUERY CAPABILITIES FOR ANALYTICS

### Date Range Filtering Pattern (from search_results route, Line 1705-1720)

```python
from datetime import datetime, timedelta

now = datetime.now()

# Last 24 hours
cutoff_24h = now - timedelta(days=1)
query = MissingPerson.query.filter(MissingPerson.created_at >= cutoff_24h)

# Last 7 days
cutoff_7d = now - timedelta(days=7)
query = MissingPerson.query.filter(MissingPerson.created_at >= cutoff_7d)

# Last 30 days
cutoff_30d = now - timedelta(days=30)
query = MissingPerson.query.filter(MissingPerson.created_at >= cutoff_30d)

# Last 3 months (90 days)
cutoff_90d = now - timedelta(days=90)
query = MissingPerson.query.filter(MissingPerson.created_at >= cutoff_90d)

# Last 1 year (365 days)
cutoff_1y = now - timedelta(days=365)
query = MissingPerson.query.filter(MissingPerson.created_at >= cutoff_1y)
```

### Filtering by Category

```python
# Count by category
child_cases = MissingPerson.query.filter_by(category='child').count()
alzheimer_cases = MissingPerson.query.filter_by(category='alzheimer').count()
other_cases = MissingPerson.query.filter_by(category='other').count()

# Get all cases of specific category
query = MissingPerson.query.filter_by(category='child')
```

### Filtering by Gender

```python
# Count by gender
male_cases = MissingPerson.query.filter_by(gender='male').count()
female_cases = MissingPerson.query.filter_by(gender='female').count()

# Get all cases of specific gender
query = MissingPerson.query.filter_by(gender='Male')
```

### Missing vs Found Reports

```python
# Count missing person reports
missing_count = MissingPerson.query.count()

# Count found person reports
found_count = FoundPerson.query.count()

# Found reports with confirmed matches
confirmed_matches = FoundPerson.query.filter_by(match_status='confirmed').count()

# Match success rate (percentage)
if found_count > 0:
    success_rate = (confirmed_matches / found_count) * 100
```

### Match Tracking from Alert Model

```python
# Count match alerts generated
match_alerts = Alert.query.filter_by(alert_type='match').count()

# Active match alerts
active_match_alerts = Alert.query.filter(
    Alert.alert_type == 'match',
    Alert.is_active == True
).count()

# Resolved cases from alerts
resolved_alerts = Alert.query.filter_by(alert_type='resolved').count()

# Match alerts grouped by missing person
from sqlalchemy import func
match_breakdown = db.session.query(
    MissingPerson.full_name,
    func.count(Alert.id).label('match_count')
).join(
    Alert, Alert.missing_person_id == MissingPerson.id
).filter(
    Alert.alert_type == 'match'
).group_by(
    MissingPerson.id
).all()
```

### Advanced Filtering Examples

```python
# Cases resolved in last 7 days
from datetime import datetime, timedelta
cutoff = datetime.now() - timedelta(days=7)
recent_resolved = MissingPerson.query.filter(
    MissingPerson.status == 'resolved',
    MissingPerson.resolved_at >= cutoff  # ⚠️ Currently broken - resolved_at not set
).all()

# Cases by age range
young_cases = MissingPerson.query.filter(MissingPerson.age < 18).count()
adult_cases = MissingPerson.query.filter(MissingPerson.age >= 18).count()

# Combined filters: child cases still active
active_children = MissingPerson.query.filter(
    MissingPerson.category == 'child',
    MissingPerson.status == 'active'
).count()

# Found persons with high match confidence
high_confidence_matches = FoundPerson.query.filter(
    FoundPerson.match_confidence > 0.85
).all()
```

---

## 5. DATE HANDLING IN THE SYSTEM

### Date Storage Format

| Field | Type | Format | Example | Timezone |
|-------|------|--------|---------|----------|
| `created_at` | DateTime | ISO 8601 | 2024-04-15 14:30:45.123456 | DB: UTC |
| `updated_at` | DateTime | ISO 8601 | 2024-04-15 14:30:45.123456 | DB: UTC |
| `resolved_at` | DateTime (nullable) | ISO 8601 | 2024-04-15 14:30:45.123456 | DB: UTC |
| `last_seen_date` | Date | YYYY-MM-DD | 2024-04-14 | Date only (no timezone) |
| `last_seen_time` | Time | HH:MM:SS | 14:30:00 | Time only (no timezone) |
| `found_date` | Date | YYYY-MM-DD | 2024-04-14 | Date only (no timezone) |
| `found_time` | Time | HH:MM:SS | 14:30:00 | Time only (no timezone) |
| `verified_at` | DateTime (nullable) | ISO 8601 | 2024-04-15 14:30:45.123456 | DB: UTC |
| `last_login` | DateTime (nullable) | ISO 8601 | 2024-04-15 14:30:45.123456 | DB: UTC |

### Timezone Considerations

**Current Implementation:**
- Uses `datetime.utcnow()` for all timestamp defaults (UTC-based)
- Uses `datetime.now()` in some places (local system time) - **⚠️ INCONSISTENCY**
- Date/Time fields are separated (no timezone info in date/time fields)

**Timezone Issues Found:**
1. **Inconsistency:** Some places use `datetime.now()` (local) and some use `datetime.utcnow()` (UTC)
   - Example: Line 838 uses `datetime.now()` for last_login
   - Example: Line 862 uses `datetime.now()` for today_start calculation

2. **Missing Timezone Context:** The `last_seen_date` and `last_seen_time` are stored separately without timezone info
   - When calculating "missing duration", assumes local system time

3. **Database Default:** SQLite stores all dates as UTC strings

### Duration Calculation Methods

MissingPerson has two methods for calculating time missing:

```python
def get_missing_duration(self):
    """Calculate how long person has been missing"""
    if self.last_seen_date:
        missing_datetime = datetime.combine(self.last_seen_date, 
                                           self.last_seen_time or datetime.min.time())
        duration = datetime.now() - missing_datetime  # ⚠️ Uses local time
        
        if duration.days > 0:
            return f"{duration.days} day{'s' if duration.days > 1 else ''} ago"
        else:
            hours = duration.seconds // 3600
            if hours > 0:
                return f"{hours} hour{'s' if hours > 1 else ''} ago"
            else:
                minutes = duration.seconds // 60
                return f"{minutes} minute{'s' if minutes > 1 else ''} ago"
    return "Unknown"
```

---

## 6. IDENTIFIED ISSUES & BUGS

### 🔴 Critical Issues:

1. **`resolved_at` Field Not Set**
   - Location: [app.py line 1840](app.py#L1840)
   - Issue: When marking case as resolved, the `resolved_at` field is never set
   - Impact: Dashboard's "resolved_today" calculation doesn't work correctly
   - **Fix Required:** Add `case.resolved_at = datetime.now()` when setting `status='resolved'`

2. **Inconsistent Timezone Usage**
   - Location: Multiple places in [app.py](app.py)
   - Issue: Mix of `datetime.now()` (local) and `datetime.utcnow()` (UTC)
   - Impact: Date calculations may be incorrect in non-UTC timezones
   - **Recommendation:** Standardize to UTC throughout

### ⚠️ Medium Issues:

1. **No Alert for Case Resolution**
   - When case is marked resolved, no Alert record is created
   - Missing "resolved" alert type tracking

2. **Match Success Rate Not Tracked**
   - No aggregate stats on match success rate
   - Would need: confirmed_matches / found_count

3. **No Time-Range Analytics**
   - Dashboard shows current stats but no historical trends
   - Hard to see if cases are resolving faster/slower over time

### 💡 Observations:

1. **Search Time Filtering Works** - Time range filtering is implemented for search (line 1705-1720)
2. **Face Matching Confidence Tracked** - Both MissingPerson and FoundPerson have match_score/confidence fields
3. **Alert System Ready** - Alert model is set up for notifications but not fully utilized in dashboard

---

## 7. RECOMMENDED ANALYTICS SCHEMA

For building comprehensive analytics, recommended query patterns:

```python
# Dashboard Stats Query
def get_dashboard_stats(date_range='all'):
    """Get comprehensive dashboard statistics"""
    now = datetime.now()
    
    if date_range == '7days':
        cutoff = now - timedelta(days=7)
    elif date_range == '30days':
        cutoff = now - timedelta(days=30)
    else:
        cutoff = None
    
    query = MissingPerson.query
    if cutoff:
        query = query.filter(MissingPerson.created_at >= cutoff)
    
    return {
        'active_cases': query.filter_by(status='active').count(),
        'resolved_cases': query.filter_by(status='resolved').count(),
        'closed_cases': query.filter_by(status='closed').count(),
        'by_category': {
            'child': query.filter_by(category='child').count(),
            'alzheimer': query.filter_by(category='alzheimer').count(),
            'other': query.filter_by(category='other').count(),
        },
        'by_gender': {
            'male': query.filter_by(gender='Male').count(),
            'female': query.filter_by(gender='Female').count(),
        },
        'found_reports': FoundPerson.query.filter(
            FoundPerson.created_at >= cutoff
        ).count() if cutoff else FoundPerson.query.count(),
        'confirmed_matches': FoundPerson.query.filter_by(
            match_status='confirmed'
        ).count(),
        'pending_matches': FoundPerson.query.filter_by(
            match_status='pending'
        ).count(),
    }
```

---

## 8. SUMMARY TABLE

| Aspect | Current State | Notes |
|--------|---------------|-------|
| **Models** | 6 models (MissingPerson, FoundPerson, Alert, Admin, Contact) | Complete |
| **Missing Person Fields** | 20+ fields covering details, location, status | Comprehensive |
| **Found Person Fields** | 16+ fields with matching confidence tracking | Good |
| **Alert Tracking** | Full model with type-based categorization | Underutilized |
| **Current Dashboard Stats** | 4 metrics (active, resolved today, reports, pending) | Basic |
| **Date Filtering** | Available in search, not in dashboard | Inconsistent |
| **Timezone Handling** | Mixed UTC/local time - **INCONSISTENT** | Needs standardization |
| **Analytics Ready** | Partial - missing resolved_at setter | Needs fixes |

---

## 9. NEXT STEPS FOR COMPLETE ANALYTICS

To build a comprehensive analytics dashboard, you need to:

1. **Fix the `resolved_at` bug** - Set it when resolving cases
2. **Standardize timezone handling** - Use UTC throughout
3. **Create analytics endpoint** - `/api/admin/analytics` for time-range stats
4. **Add Alert on resolution** - Create Alert record when case is resolved
5. **Build trend graphs** - Track resolution rate over time
6. **Add category breakdowns** - Show case distribution by type
7. **Track match performance** - Monitor success rate of face matching

