from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class MissingPerson(db.Model):
    __tablename__ = 'missing_persons'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Personal Information
    full_name = db.Column(db.String(200), nullable=False)
    age = db.Column(db.Integer, nullable=False)
    gender = db.Column(db.String(20), nullable=False)
    category = db.Column(db.String(50), nullable=False)  # child, alzheimer, other
    
    # Physical Description
    height = db.Column(db.Integer)  # in cm
    weight = db.Column(db.Integer)  # in kg
    eye_color = db.Column(db.String(50))
    hair_color = db.Column(db.String(50))
    distinguishing_features = db.Column(db.Text)
    
    # Last Seen Information
    last_seen_location = db.Column(db.String(500), nullable=False)
    last_seen_date = db.Column(db.Date, nullable=False)
    last_seen_time = db.Column(db.Time, nullable=False)
    last_seen_wearing = db.Column(db.Text)
    
    # Reporter Information
    reporter_name = db.Column(db.String(200), nullable=False)
    reporter_relationship = db.Column(db.String(100))
    reporter_phone = db.Column(db.String(20), nullable=False)
    reporter_email = db.Column(db.String(200), nullable=False)
    
    # Photo Information
    photo_paths = db.Column(db.Text)  # JSON string of photo paths
    
    # Status and Metadata
    status = db.Column(db.String(50), default='active')  # active, resolved, closed
    match_score = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at = db.Column(db.DateTime)
    
    # Relationships
    alerts = db.relationship('Alert', backref='missing_person', lazy=True, cascade='all, delete-orphan')
    found_reports = db.relationship('FoundPerson', backref='related_missing_person', lazy=True)
    
    def __repr__(self):
        return f'<MissingPerson {self.full_name}>'
    
    def to_dict(self):
        """Convert model to dictionary for JSON serialization"""
        # Fix photo paths to include /static/ prefix
        photo_paths = []
        if self.photo_paths:
            photo_paths = [f"/static/{path.strip()}" if not path.strip().startswith('/static') else path.strip() 
                          for path in self.photo_paths.split(',')]
        
        return {
            'id': self.id,
            'name': self.full_name,
            'age': self.age,
            'gender': self.gender,
            'category': self.category,
            'height': self.height,
            'weight': self.weight,
            'eye_color': self.eye_color,
            'hair_color': self.hair_color,
            'distinguishing_features': self.distinguishing_features,
            'last_seen': self.last_seen_location,
            'last_seen_date': self.last_seen_date.strftime('%Y-%m-%d') if self.last_seen_date else None,
            'last_seen_time': self.last_seen_time.strftime('%H:%M') if self.last_seen_time else None,
            'last_seen_wearing': self.last_seen_wearing,
            'missing_since': self.get_missing_duration(),
            'status': self.status,
            'match_score': self.match_score,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'photo_paths': photo_paths
        }
    
    def get_missing_duration(self):
        """Calculate how long the person has been missing"""
        if self.last_seen_date:
            missing_datetime = datetime.combine(self.last_seen_date, self.last_seen_time or datetime.min.time())
            duration = datetime.now() - missing_datetime
            
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
    
    def get_time_missing(self):
        """Alias for get_missing_duration for template compatibility"""
        return self.get_missing_duration()


class FoundPerson(db.Model):
    __tablename__ = 'found_persons'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Found Information
    found_location = db.Column(db.String(500), nullable=False)
    found_date = db.Column(db.Date, nullable=False)
    found_time = db.Column(db.Time, nullable=False)
    found_condition = db.Column(db.Text)
    
    # Person Description
    approx_age = db.Column(db.Integer)
    approx_gender = db.Column(db.String(20))
    physical_description = db.Column(db.Text)
    clothing_description = db.Column(db.Text)
    
    # Current Location
    current_location = db.Column(db.String(200))  # with-me, safe-place, other
    location_details = db.Column(db.String(500))
    
    # Finder Information
    finder_name = db.Column(db.String(200), nullable=False)
    finder_phone = db.Column(db.String(20), nullable=False)
    finder_email = db.Column(db.String(200))
    
    # Photo Information
    photo_paths = db.Column(db.Text)  # JSON string of photo paths
    
    # Matching Information
    matched_missing_person_id = db.Column(db.Integer, db.ForeignKey('missing_persons.id'))
    match_confidence = db.Column(db.Float, default=0.0)
    match_status = db.Column(db.String(50), default='pending')  # pending, confirmed, rejected
    
    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    verified_at = db.Column(db.DateTime)
    
    def __repr__(self):
        return f'<FoundPerson {self.id}>'
    
    def to_dict(self):
        """Convert model to dictionary for JSON serialization"""
        return {
            'id': self.id,
            'found_location': self.found_location,
            'found_date': self.found_date.strftime('%Y-%m-%d') if self.found_date else None,
            'found_time': self.found_time.strftime('%H:%M') if self.found_time else None,
            'approx_age': self.approx_age,
            'approx_gender': self.approx_gender,
            'physical_description': self.physical_description,
            'current_location': self.current_location,
            'finder_name': self.finder_name,
            'finder_phone': self.finder_phone,
            'match_confidence': self.match_confidence,
            'match_status': self.match_status,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S')
        }


class Alert(db.Model):
    __tablename__ = 'alerts'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Alert Information
    alert_type = db.Column(db.String(50), nullable=False)  # emergency, match, sighting, resolved
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    location = db.Column(db.String(200))
    
    # Related Missing Person
    missing_person_id = db.Column(db.Integer, db.ForeignKey('missing_persons.id'))
    
    # Related Found Person
    found_person_id = db.Column(db.Integer, db.ForeignKey('found_persons.id'))
    
    # Status
    is_read = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    
    # Metadata
    created_at = db.Column(db.DateTime, default=lambda: datetime.utcnow())
    updated_at = db.Column(db.DateTime, default=lambda: datetime.utcnow(), onupdate=lambda: datetime.utcnow())
    
    def __repr__(self):
        return f'<Alert {self.title}>'
    
    def to_dict(self):
        """Convert model to dictionary for JSON serialization"""
        time_diff = datetime.utcnow() - self.created_at
        if time_diff.days > 0:
            time_ago = f"{time_diff.days} day{'s' if time_diff.days > 1 else ''} ago"
        else:
            hours = time_diff.seconds // 3600
            if hours > 0:
                time_ago = f"{hours} hour{'s' if hours > 1 else ''} ago"
            else:
                minutes = time_diff.seconds // 60
                time_ago = f"{minutes} minute{'s' if minutes > 1 else ''} ago"
        
        return {
            'id': self.id,
            'type': self.alert_type,
            'title': self.title,
            'message': self.message,
            'location': self.location,
            'time': time_ago,
            'unread': not self.is_read,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S')
        }


class Admin(db.Model):
    __tablename__ = 'admins'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(200), unique=True, nullable=False)
    full_name = db.Column(db.String(200))
    
    # Role and Status
    role = db.Column(db.String(50), default='admin')  # admin, super_admin, moderator
    is_active = db.Column(db.Boolean, default=True)
    
    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    
    def __repr__(self):
        return f'<Admin {self.username}>'


class Contact(db.Model):
    __tablename__ = 'contacts'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    email = db.Column(db.String(200), nullable=False)
    phone = db.Column(db.String(20))
    subject = db.Column(db.String(200))
    message = db.Column(db.Text, nullable=False)
    
    # Status
    status = db.Column(db.String(50), default='new')  # new, in_progress, resolved
    
    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Contact {self.name}>'
