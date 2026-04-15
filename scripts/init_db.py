"""
Database initialization script
Run this script to create all database tables and add sample data
"""

from app import app, db
from models import MissingPerson, FoundPerson, Alert, Admin, Contact
from werkzeug.security import generate_password_hash
from datetime import datetime, date, time, timedelta
import json

def init_database():
    """Initialize the database with tables and sample data"""
    
    with app.app_context():
        # Drop all existing tables (use with caution in production!)
        print("Dropping existing tables...")
        db.drop_all()
        
        # Create all tables
        print("Creating database tables...")
        db.create_all()
        
        # Add sample admin user
        print("Creating admin user...")
        admin = Admin(
            username='admin',
            password_hash=generate_password_hash('admin123'),
            email='admin@anveshan.org',
            full_name='System Administrator',
            role='super_admin'
        )
        db.session.add(admin)
        
        # Add sample missing persons
        print("Adding sample missing persons...")
        missing_persons = [
            MissingPerson(
                full_name='Emma Johnson',
                age=8,
                gender='Female',
                category='child',
                height=120,
                weight=25,
                eye_color='Blue',
                hair_color='Blonde',
                distinguishing_features='Small birthmark on left cheek',
                last_seen_location='Central Park, Downtown',
                last_seen_date=date.today() - timedelta(days=2),
                last_seen_time=time(14, 30),
                last_seen_wearing='Blue dress with white shoes',
                reporter_name='Sarah Johnson',
                reporter_relationship='Mother',
                reporter_phone='+1234567890',
                reporter_email='sarah.johnson@email.com',
                photo_paths=json.dumps(['missing-person.jpg']),
                status='active',
                match_score=92
            ),
            MissingPerson(
                full_name='Robert Williams',
                age=72,
                gender='Male',
                category='alzheimer',
                height=175,
                weight=70,
                eye_color='Brown',
                hair_color='Gray',
                distinguishing_features='Wears glasses, has a small scar on forehead',
                last_seen_location='Oak Street, Residential Area',
                last_seen_date=date.today() - timedelta(days=1),
                last_seen_time=time(10, 15),
                last_seen_wearing='Blue jacket and gray pants',
                reporter_name='Mary Williams',
                reporter_relationship='Daughter',
                reporter_phone='+1234567891',
                reporter_email='mary.williams@email.com',
                photo_paths=json.dumps(['found-person.jpg']),
                status='active',
                match_score=78
            ),
            MissingPerson(
                full_name='Sophia Martinez',
                age=9,
                gender='Female',
                category='child',
                height=130,
                weight=30,
                eye_color='Brown',
                hair_color='Black',
                distinguishing_features='Dimples when smiling',
                last_seen_location='Community Park',
                last_seen_date=date.today(),
                last_seen_time=time(15, 0),
                last_seen_wearing='Pink t-shirt and jeans',
                reporter_name='Carlos Martinez',
                reporter_relationship='Father',
                reporter_phone='+1234567892',
                reporter_email='carlos.martinez@email.com',
                photo_paths=json.dumps(['missing-person.jpg']),
                status='active',
                match_score=65
            )
        ]
        
        for person in missing_persons:
            db.session.add(person)
        
        db.session.commit()
        
        # Add sample alerts
        print("Adding sample alerts...")
        alerts = [
            Alert(
                alert_type='emergency',
                title='Emergency Alert: Missing Child',
                message='8-year-old girl missing from Central Park area since 2:30 PM today. Last seen wearing blue dress.',
                location='Within 5 miles of you',
                missing_person_id=1,
                is_read=False
            ),
            Alert(
                alert_type='match',
                title='Potential Match Found',
                message='High probability match (92%) found for missing person Robert Williams. Please verify.',
                location='Match confidence: 92%',
                missing_person_id=2,
                is_read=False
            ),
            Alert(
                alert_type='sighting',
                title='Possible Sighting Reported',
                message='Community member reported possible sighting of Sophia Martinez near the shopping mall.',
                location='Shopping Mall Area',
                missing_person_id=3,
                is_read=True
            )
        ]
        
        for alert in alerts:
            db.session.add(alert)
        
        # Add sample found person
        print("Adding sample found persons...")
        found_person = FoundPerson(
            found_location='Shopping Mall, East Side',
            found_date=date.today(),
            found_time=time(11, 30),
            found_condition='Person appears disoriented but physically okay',
            approx_age=70,
            approx_gender='Male',
            physical_description='Elderly man with gray hair, wearing glasses',
            clothing_description='Blue jacket and gray pants',
            current_location='safe-place',
            location_details='City Police Station, Main Branch',
            finder_name='John Doe',
            finder_phone='+1234567893',
            finder_email='john.doe@email.com',
            matched_missing_person_id=2,
            match_confidence=78.5,
            match_status='pending'
        )
        db.session.add(found_person)
        
        # Commit all changes
        db.session.commit()
        
        print("\n" + "="*50)
        print("Database initialized successfully!")
        print("="*50)
        print(f"✓ Created {MissingPerson.query.count()} missing persons")
        print(f"✓ Created {Alert.query.count()} alerts")
        print(f"✓ Created {FoundPerson.query.count()} found persons")
        print(f"✓ Created {Admin.query.count()} admin users")
        print("\nAdmin credentials:")
        print("  Username: admin")
        print("  Password: admin123")
        print("="*50)


if __name__ == '__main__':
    init_database()
