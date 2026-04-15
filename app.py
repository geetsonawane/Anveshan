from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import os
import sys
import json
import numpy as np
import cv2
from datetime import datetime, date, time, timedelta
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
from pathlib import Path

# Add project root to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models import db, MissingPerson, FoundPerson, Alert, Admin, Contact

# Face matching will be handled by utils/face_matching.py module
# which has its own MTCNN import
FACE_DETECTION_AVAILABLE = True  # Assume available, will fail gracefully if not

# Pre-load DeepFace model to avoid auto-reload issues
print("🔄 Initializing DeepFace...")
DEEPFACE_AVAILABLE = False
try:
    from deepface import DeepFace
    DEEPFACE_AVAILABLE = True
    print("✓ DeepFace loaded successfully")
    print("  Note: FaceNet512 model will download on first use (~90MB)")
except ImportError as e:
    print("⚠️  DeepFace not available - Face recognition disabled")
    print(f"   Error: {e}")
    print("   Run: pip install deepface tensorflow")
except Exception as e:
    print(f"⚠️  DeepFace initialization warning: {e}")
    print("   Face recognition may still work on first use")

app = Flask(__name__)
app.secret_key = 'anveshan_secret_key_2023'  

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///anveshan.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# File upload configuration
UPLOAD_FOLDER = 'static/uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Email Configuration (Gmail example - update with your credentials)
EMAIL_CONFIG = {
    'SMTP_SERVER': 'smtp.gmail.com',
    'SMTP_PORT': 587,
    'EMAIL_ADDRESS': 'sonawanegeetkumar@gmail.com',  # Change this to your Gmail address
    'EMAIL_PASSWORD': 'vwus cgfd vhcq vnnj',     # Change this (use Gmail App Password, not your regular password)
    'FROM_NAME': 'Anveshan - Missing Person System'
}

# Check email configuration at startup
if EMAIL_CONFIG['EMAIL_ADDRESS'].startswith('your_') or EMAIL_CONFIG['EMAIL_PASSWORD'].startswith('your_'):
    print("\n⚠️  EMAIL CONFIGURATION REQUIRED")
    print("=" * 60)
    print("Email notifications are DISABLED because credentials are not set.")
    print("\nTo enable email alerts when face matches are found:")
    print("1. Open app.py (line 50-55)")
    print("2. Replace EMAIL_ADDRESS with your Gmail address")
    print("3. Replace EMAIL_PASSWORD with your Gmail App Password")
    print("   (Generate at: https://myaccount.google.com/apppasswords)")
    print("4. Restart the application")
    print("=" * 60 + "\n")

# Initialize database
db.init_app(app)

# Create upload folder if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(os.path.join(UPLOAD_FOLDER, 'missing'), exist_ok=True)
os.makedirs(os.path.join(UPLOAD_FOLDER, 'found'), exist_ok=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


# ============================================================================
# EMAIL NOTIFICATION FUNCTIONS
# ============================================================================

def check_email_already_sent(person_id, hours_threshold=1):
    """
    Check if an alert email was already sent for this missing person recently.
    Uses database to track sent emails with proper timestamp checking.
    
    Args:
        person_id: ID of the missing person
        hours_threshold: Hours within which to consider as duplicate (default 1 hour)
        
    Returns:
        tuple: (bool: True if recent email found, str: reason/message for logging)
    """
    try:
        current_time = datetime.utcnow()
        cutoff_time = current_time - timedelta(hours=hours_threshold)
        
        recent_alert = Alert.query.filter(
            Alert.missing_person_id == person_id,
            Alert.alert_type == 'match',
            Alert.created_at >= cutoff_time
        ).first()
        
        if recent_alert:
            time_since_email = current_time - recent_alert.created_at
            logger.info(
                f"⚠️ Duplicate email prevention: Email already sent {time_since_email.total_seconds():.0f}s ago "
                f"(within {hours_threshold}h cooldown) for person_id={person_id}"
            )
            return True, f"Duplicate prevention: Alert already sent {int(time_since_email.total_seconds())}s ago"
        else:
            logger.info(f"✅ No recent email found for person_id={person_id} - OK to send email")
            return False, "No recent email found"
            
    except Exception as e:
        logger.error(f"Error checking duplicate email: {e}")
        return False, f"Error checking duplicates: {str(e)}"


# ============================================================================
# END EMAIL FUNCTIONS
# ============================================================================


def validate_human_face(image_path):
    """
    Validate if the uploaded image contains a human face using multi-layer AI detection.
    
    Layer 1: DeepFace AI (Most Accurate)
    Layer 2: OpenCV with multiple attempts
    Layer 3: Face quality verification
    
    Args:
        image_path: Path to the uploaded image file
        
    Returns:
        tuple: (is_valid: bool, message: str)
    """
    try:
        print(f"\n{'='*60}")
        print(f"🔍 AI FACE VALIDATION - MULTI-LAYER CHECK")
        print(f"Image: {os.path.basename(image_path)}")
        print(f"{'='*60}")
        
        # Read image first
        img = cv2.imread(image_path)
        if img is None:
            print("❌ Unable to read image file")
            return False, "Unable to read image file. Please upload a valid image (JPG, PNG)."
        
        height, width = img.shape[:2]
        print(f"📐 Image dimensions: {width}x{height}")
        
        # Check if image is too small
        if width < 50 or height < 50:
            print("❌ Image too small")
            return False, "Image is too small. Please upload a larger, clearer image."
        
        # LAYER 1: DeepFace AI Detection (Most Accurate)
        if DEEPFACE_AVAILABLE:
            print("\n🤖 LAYER 1: DeepFace AI Detection")
            try:
                from deepface import DeepFace
                # Try multiple backends for maximum accuracy
                backends = ['opencv', 'ssd', 'mtcnn']
                
                for backend in backends:
                    try:
                        print(f"   Trying {backend} backend...")
                        faces = DeepFace.extract_faces(
                            img_path=image_path, 
                            detector_backend=backend,
                            enforce_detection=True,
                            align=True
                        )
                        
                        if faces and len(faces) > 0:
                            # Verify face quality
                            face_data = faces[0]
                            confidence = face_data.get('confidence', 0)
                            print(f"   ✓ Face detected using {backend}")
                            print(f"   ✓ Confidence: {confidence:.2%}")
                            print(f"   ✓ Total faces found: {len(faces)}")
                            
                            # Accept if confidence is reasonable
                            if confidence > 0.5 or backend == 'mtcnn':
                                print(f"\n✅ VALIDATION PASSED - Human face confirmed by AI")
                                return True, "Valid human face detected by AI"
                    except ValueError:
                        continue
                    except Exception as e:
                        print(f"   ⚠ {backend} failed: {str(e)[:50]}")
                        continue
                
                print("   ✗ No faces detected by DeepFace")
                        
            except Exception as e:
                print(f"   ⚠ DeepFace error: {str(e)[:100]}")
        
        # LAYER 2: OpenCV Haar Cascade (Multiple Attempts)
        print("\n🔍 LAYER 2: OpenCV Cascade Detection")
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Load Haar Cascade
        face_cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        face_cascade = cv2.CascadeClassifier(face_cascade_path)
        
        if face_cascade.empty():
            print("   ❌ Could not load face cascade classifier")
            return False, "Face detection system error. Please contact administrator."
        
        # Try detection with multiple parameter sets
        detection_configs = [
            {'scaleFactor': 1.1, 'minNeighbors': 5, 'minSize': (30, 30), 'name': 'standard'},
            {'scaleFactor': 1.05, 'minNeighbors': 4, 'minSize': (25, 25), 'name': 'moderate'},
            {'scaleFactor': 1.05, 'minNeighbors': 3, 'minSize': (20, 20), 'name': 'lenient'},
        ]
        
        for config in detection_configs:
            name = config.pop('name')
            print(f"   Trying {name} parameters...")
            faces = face_cascade.detectMultiScale(gray, **config)
            
            if len(faces) > 0:
                # Verify detected region is reasonable
                for (x, y, w, h) in faces:
                    # Check if face is at least 5% of image
                    face_area = w * h
                    image_area = width * height
                    face_percentage = (face_area / image_area) * 100
                    
                    print(f"   ✓ Face detected: {w}x{h} pixels")
                    print(f"   ✓ Face area: {face_percentage:.1f}% of image")
                    
                    if face_percentage >= 1:  # Face should be at least 1% of image
                        print(f"\n✅ VALIDATION PASSED - Face detected by OpenCV")
                        return True, "Valid human face detected"
        
        print("   ✗ No faces detected by OpenCV")
        
        # LAYER 3: Final Check - Eye Detection (for profile faces)
        print("\n👁️ LAYER 3: Eye Detection (Profile Check)")
        eye_cascade_path = cv2.data.haarcascades + 'haarcascade_eye.xml'
        eye_cascade = cv2.CascadeClassifier(eye_cascade_path)
        
        if not eye_cascade.empty():
            eyes = eye_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(15, 15))
            if len(eyes) >= 1:  # At least one eye visible
                print(f"   ✓ {len(eyes)} eye(s) detected - likely a human face")
                print(f"\n✅ VALIDATION PASSED - Human features detected")
                return True, "Valid human face detected"
            print("   ✗ No eyes detected")
        
        # All validation layers failed
        print(f"\n{'='*60}")
        print("❌ VALIDATION FAILED - No human face detected")
        print("   This appears to be a non-human image")
        print("   (nature, object, vehicle, etc.)")
        print(f"{'='*60}\n")
        
        return False, "❌ No human face detected. Please upload a clear photo of a person's face (not nature, objects, or vehicles)."
            
    except Exception as e:
        print(f"❌ Critical error in face validation: {str(e)}")
        import traceback
        traceback.print_exc()
        # Strict mode: reject upload on error
        return False, f"Face validation error. Please try a different image or contact support."


def send_email_notification(to_email, subject, body):
    """
    Send email notification via Gmail SMTP
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        body: Email body (HTML supported)
        
    Returns:
        tuple: (success: bool, message: str)
    """
    try:
        if not to_email or '@' not in to_email:
            return False, f"Invalid email: {to_email}"
        
        msg = MIMEMultipart('alternative')
        msg['From'] = f"{EMAIL_CONFIG['FROM_NAME']} <{EMAIL_CONFIG['EMAIL_ADDRESS']}>"
        msg['To'] = to_email
        msg['Subject'] = subject
        
        msg.attach(MIMEText(body, 'html'))
        
        with smtplib.SMTP(EMAIL_CONFIG['SMTP_SERVER'], EMAIL_CONFIG['SMTP_PORT'], timeout=10) as server:
            server.starttls()
            server.login(EMAIL_CONFIG['EMAIL_ADDRESS'], EMAIL_CONFIG['EMAIL_PASSWORD'])
            server.send_message(msg)
        
        logger.info(f"✓ Email sent to {to_email}")
        return True, "Email sent successfully"
        
    except smtplib.SMTPAuthenticationError:
        msg = "Error: Gmail credentials invalid. Check EMAIL_ADDRESS and EMAIL_PASSWORD in app.py line 50-55"
        logger.error(f"❌ {msg}")
        return False, msg
    except smtplib.SMTPException as e:
        logger.error(f"❌ SMTP error: {str(e)}")
        return False, f"SMTP error: {str(e)}"
    except Exception as e:
        logger.error(f"❌ Email error: {str(e)}")
        return False, f"Error: {str(e)}"


def extract_photo_location(filepath):
    """
    Extract GPS location from photo EXIF data
    
    Args:
        filepath: Path to the image file
        
    Returns:
        str: Location string (latitude, longitude) or None
    """
    try:
        from PIL import Image
        from PIL.ExifTags import TAGS, GPSTAGS
        
        image = Image.open(filepath)
        exif_data = image._getexif()
        
        if not exif_data:
            return None
        
        gps_info = {}
        for tag, value in exif_data.items():
            tag_name = TAGS.get(tag, tag)
            if tag_name == 'GPSInfo':
                for gps_tag in value:
                    sub_tag_name = GPSTAGS.get(gps_tag, gps_tag)
                    gps_info[sub_tag_name] = value[gps_tag]
        
        if not gps_info:
            return None
        
        # Convert GPS coordinates to decimal degrees
        def convert_to_degrees(value):
            d, m, s = value
            return d + (m / 60.0) + (s / 3600.0)
        
        if 'GPSLatitude' in gps_info and 'GPSLongitude' in gps_info:
            lat = convert_to_degrees(gps_info['GPSLatitude'])
            lon = convert_to_degrees(gps_info['GPSLongitude'])
            
            if gps_info.get('GPSLatitudeRef') == 'S':
                lat = -lat
            if gps_info.get('GPSLongitudeRef') == 'W':
                lon = -lon
            
            return f"{lat:.6f}, {lon:.6f}"
        
        return None
        
    except Exception as e:
        print(f"Error extracting GPS data: {e}")
        return None


def send_match_alert_email(person, confidence, found_location=None, search_photo_path=None):
    """
    Send email alert to relatives when a match is found via face search
    Includes duplicate prevention to avoid sending multiple alerts within 1 hour
    
    Args:
        person: MissingPerson object
        confidence: Match confidence percentage
        found_location: GPS coordinates dict {'latitude': float, 'longitude': float} or text location
        search_photo_path: Path to the search photo (optional)
        
    Returns:
        tuple: (success: bool, message: str)
    """
    try:
        # Check if email is properly configured
        if (EMAIL_CONFIG['EMAIL_ADDRESS'].startswith('your_') or 
            EMAIL_CONFIG['EMAIL_PASSWORD'].startswith('your_')):
            logger.warning(f"Email configuration not set - skipping notification")
            return False, "Email configuration not set up"
        
        reporter_email = person.reporter_email
        reporter_name = person.reporter_name
        person_name = person.full_name
        person_id = person.id
        
        # Check if alert email was already sent in last 1 hour to prevent duplicates
        is_duplicate, duplicate_reason = check_email_already_sent(person_id=person_id, hours_threshold=1)
        if is_duplicate:
            logger.info(f"🔴 Skipping email for {person_name}: {duplicate_reason}")
            return False, duplicate_reason
        
        # Build location HTML with Google Maps link if GPS available
        location_html = ""
        if found_location:
            if isinstance(found_location, dict):
                # GPS coordinates from browser geolocation
                latitude = found_location.get('latitude')
                longitude = found_location.get('longitude')
                if latitude and longitude:
                    maps_url = f"https://www.google.com/maps/search/?api=1&query={latitude},{longitude}"
                    location_html = f'''<tr>
                                <td class="label"> Found Location:</td>
                                <td>
                                    <p style="margin: 0 0 8px 0;">📍 <strong>Latitude:</strong> {latitude:.6f}</p>
                                    <p style="margin: 0 0 8px 0;">📍 <strong>Longitude:</strong> {longitude:.6f}</p>
                                    <p style="margin: 0;"><a href="{maps_url}" style="color: #2563eb; text-decoration: none; font-weight: bold;">🗺️ View Location on Google Maps</a></p>
                                </td>
                            </tr>'''
            else:
                # Text location from EXIF or other source
                location_html = f'<tr><td class="label"> Found Location:</td><td>{found_location}</td></tr>'
        
        subject = f" URGENT: Possible Match Found for {person_name} - AI Face Recognition Alert"
        
        # Build professional HTML email template
        email_body = f"""
        <html>
        <head>
            <style>
                body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 650px; margin: 0 auto; padding: 0; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }}
                .header h1 {{ color: white; margin: 0; font-size: 24px; }}
                .content {{ background-color: #f9fafb; padding: 30px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; }}
                .match-info {{ background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 4px; }}
                .confidence {{ font-size: 32px; color: #059669; font-weight: bold; }}
                .action-items {{ background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 4px; }}
                .action-items ol {{ margin: 10px 0; padding-left: 20px; }}
                .action-items li {{ margin-bottom: 10px; color: #78350f; }}
                .footer {{ background-color: #f3f4f6; padding: 20px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }}
                .button {{ display: inline-block; background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 10px 0; }}
                table {{ width: 100%; border-collapse: collapse; margin: 10px 0; }}
                td {{ padding: 10px; border-bottom: 1px solid #f0f0f0; }}
                .label {{ font-weight: bold; color: #374151; width: 150px; }}
                .alert-badge {{ display: inline-block; background-color: #dc2626; color: white; padding: 4px 12px; border-radius: 4px; font-weight: bold; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎯 AI Face Match Alert</h1>
                </div>
                
                <div class="content">
                    <p>Dear <strong>{reporter_name}</strong>,</p>
                    
                    <p style="font-size: 16px; color: #059669; margin-bottom: 20px;">
                        <span class="alert-badge">URGENT</span>
                        <strong>Possible match found!</strong> Our AI facial recognition system has identified a potential match for <strong>{person_name}</strong>.
                    </p>
                    
                    <div class="match-info">
                        <h3 style="margin-top: 0; color: #059669; text-align: center;">Match Details</h3>
                        <table>
                            <tr>
                                <td class="label"> Missing Person:</td>
                                <td><strong>{person_name}</strong></td>
                            </tr>
                            <tr>
                                <td class="label"> Age:</td>
                                <td>{person.age} years old</td>
                            </tr>
                            <tr>
                                <td class="label"> Gender:</td>
                                <td>{person.gender.capitalize()}</td>
                            </tr>
                            <tr>
                                <td class="label"> Last Seen:</td>
                                <td>{person.last_seen_location}</td>
                            </tr>
                            <tr>
                                <td class="label"> Last Seen Date:</td>
                                <td>{person.last_seen_date.strftime('%B %d, %Y') if person.last_seen_date else 'Unknown'}</td>
                            </tr>
                            <tr style="background-color: #dcfce7;">
                                <td class="label"> AI Confidence:</td>
                                <td><span class="confidence">{confidence:.1f}%</span></td>
                            </tr>
                            <tr>
                                <td class="label"> Match Time:</td>
                                <td>{datetime.now().strftime('%B %d, %Y at %I:%M %p')}</td>
                            </tr>
                            {location_html}
                        </table>
                    </div>
                    
                    <div class="action-items">
                        <h3 style="margin-top: 0; color: #d97706;">⚠️ Important Next Steps:</h3>
                        <ol>
                            <li><strong>Contact authorities immediately:</strong> Inform local police and rescue teams about this potential match</li>
                            <li><strong>Verify the identity:</strong> Look at the match details and photo carefully to confirm it could be your loved one</li>
                            <li><strong>Visit the location:</strong> If GPS location is available, visit to verify in person (with authorities if necessary)</li>
                            <li><strong>Bring identification:</strong> Carry documents for verification when visiting the location</li>
                            <li><strong>Check dashboard:</strong> Log into Anveshan dashboard to view more details and confirmation status</li>
                        </ol>
                    </div>
                    
                    <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
                        <p style="margin: 0; font-size: 14px;">
                            <strong>ℹ️ About This Alert:</strong><br>
                            This match was generated using advanced AI deep learning facial recognition (DeepFace FaceNet512). 
                            While our system is highly accurate, please verify the identity in person before taking action.
                        </p>
                    </div>
                    
                    <p style="color: #6b7280; font-size: 13px; margin-top: 20px;">
                        <strong>⚠️ Important Disclaimer:</strong> This is an automated AI-generated match. Facial recognition systems, 
                        while highly accurate (~99%), can occasionally produce false positives. Always confirm the identity through 
                        in-person verification and with local authorities before making any decisions.
                    </p>
                </div>
                
                <div class="footer">
                    <p style="margin: 0; font-weight: bold;">Anveshan - AI-Powered Missing Person Recovery System</p>
                    <p style="margin: 5px 0;">Your trusted partner in finding missing loved ones</p>
                    <p style="margin: 5px 0;">Emergency: Contact local authorities immediately | Website: www.anveshan.org</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Send the email
        success, message = send_email_notification(reporter_email, subject, email_body)
        
        if success:
            # Create alert record in database for duplicate prevention
            try:
                current_timestamp = datetime.utcnow()
                alert = Alert(
                    alert_type='match',
                    title=f"Face Match Found for {person_name}",
                    message=f"AI face match alert sent (Confidence: {confidence:.1f}%)",
                    missing_person_id=person_id,
                    is_active=True,
                    created_at=current_timestamp  # Explicitly set timestamp for clarity
                )
                db.session.add(alert)
                db.session.commit()
                logger.info(f"✅ Alert record created - ID: {alert.id}, Timestamp: {current_timestamp.isoformat()}")
            except Exception as e:
                logger.error(f"Error creating alert record: {e}")
            
            logger.info(f"✅✉️ Match alert EMAIL SENT to {reporter_email} for {person_name} (Confidence: {confidence:.1f}%)")
            return True, f"Match alert email sent successfully to {reporter_email}"
        else:
            logger.error(f"❌ Failed to send match alert: {message}")
            return False, f"Failed to send email: {message}"
            
    except Exception as e:
        error_msg = f"Unexpected error in send_match_alert_email: {str(e)}"
        logger.error(f"❌ {error_msg}")
        return False, error_msg


def notify_match_found(missing_person, found_person, confidence):
    """
    Send email and SMS notifications when a match is found
    
    Args:
        missing_person: MissingPerson object
        found_person: FoundPerson object
        confidence: Match confidence percentage
    """
    # Prepare notification content
    reporter_name = missing_person.reporter_name
    reporter_email = missing_person.reporter_email
    reporter_phone = missing_person.reporter_phone
    person_name = missing_person.full_name
    
    # Email subject
    subject = f"URGENT: Possible Match Found for {person_name}"
    
    # Email body (HTML)
    email_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #4CAF50; border-radius: 10px;">
            <h2 style="color: #4CAF50; text-align: center;">🎉 Match Found!</h2>
            
            <p>Dear {reporter_name},</p>
            
            <p><strong>Great news!</strong> We have found a possible match for your missing person report.</p>
            
            <div style="background-color: #f0f8ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Match Details:</h3>
                <ul style="list-style: none; padding: 0;">
                    <li><strong>Missing Person:</strong> {person_name}</li>
                    <li><strong>Age:</strong> {missing_person.age} years</li>
                    <li><strong>Last Seen:</strong> {missing_person.last_seen_location}</li>
                    <li><strong>Match Confidence:</strong> <span style="color: #4CAF50; font-weight: bold;">{confidence:.1f}%</span></li>
                </ul>
            </div>
            
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Found Person Details:</h3>
                <ul style="list-style: none; padding: 0;">
                    <li><strong>Found Location:</strong> {found_person.found_location}</li>
                    <li><strong>Found Date:</strong> {found_person.found_date.strftime('%B %d, %Y')}</li>
                    <li><strong>Current Status:</strong> {found_person.found_condition or 'Safe'}</li>
                    <li><strong>Finder Contact:</strong> {found_person.finder_phone}</li>
                </ul>
            </div>
            
            <div style="background-color: #ffebee; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #d32f2f;">⚠️ Important Next Steps:</h3>
                <ol>
                    <li>Please verify the match as soon as possible</li>
                    <li>Contact the finder at: <strong>{found_person.finder_phone}</strong></li>
                    <li>Visit the location: <strong>{found_person.current_location or found_person.found_location}</strong></li>
                    <li>Inform local authorities for safe reunion</li>
                </ol>
            </div>
            
            <p style="margin-top: 30px;">
                <strong>This is an automated AI-based match.</strong> Please verify the identity in person before taking any action.
            </p>
            
            <p>For any questions or assistance, please contact us immediately.</p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            
            <p style="text-align: center; color: #666; font-size: 12px;">
                Anveshan - Missing Person Tracking System<br>
                Powered by AI Face Recognition Technology
            </p>
        </div>
    </body>
    </html>
    """
    
    # Send email notification
    if reporter_email:
        send_email_notification(reporter_email, subject, email_body)
        print(f"📧 Email notification sent to {reporter_email}")
    else:
        print(f"⚠️ No email address for reporter: {reporter_name}")


def run_face_matching(image_path, embeddings_file='embeddings_deepface.json', threshold=0.60):
    """
    Match a found person's photo with missing persons database using DeepFace FaceNet512
    
    Args:
        image_path: Path to the found person's image
        embeddings_file: Path to embeddings database JSON file (DeepFace)
        threshold: Minimum similarity score (0.60 = 60% match)
    
    Returns:
        Dictionary with match results or None if no match
    """
    try:
        # Check if DeepFace is available
        if not DEEPFACE_AVAILABLE:
            print("❌ DeepFace not available - face matching disabled")
            return None
        
        # Use DeepFace matching (fixes overfitting issue)
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'utils'))
        from deepface_matching import match_face_deepface as match_face
        
        print(f"Running face matching on: {image_path}")
        result = match_face(image_path, embeddings_file, threshold=threshold)
        
        if result is None:
            print("Face matching returned None")
            return None
        
        if not result['match_found']:
            print(f"No match found. Best: {result.get('best_name', 'N/A')} ({result.get('best_similarity', 0):.3f})")
            return {
                'match_found': False,
                'best_similarity': result.get('best_similarity', 0),
                'best_name': result.get('best_name', '')
            }
        
        # Match found! Now find the person in database
        best_name = result['person_name'].strip()  # Strip whitespace
        best_score = result['similarity']
        
        print(f"Match found: {best_name} with confidence {result['confidence']:.1f}%")
        
        # Find missing person by name (try exact match first)
        missing_person = MissingPerson.query.filter_by(full_name=best_name, status='active').first()
        if not missing_person:
            # Try with stripped database names
            all_active = MissingPerson.query.filter_by(status='active').all()
            for person in all_active:
                if person.full_name.strip() == best_name:
                    missing_person = person
                    break
        if not missing_person:
            # Try partial match
            missing_person = MissingPerson.query.filter(
                MissingPerson.full_name.ilike(f'%{best_name}%'),
                MissingPerson.status == 'active'
            ).first()
        
        if missing_person:
            return {
                'match_found': True,
                'matched_person_id': missing_person.id,
                'person_name': missing_person.full_name,
                'confidence': result['confidence'],
                'similarity': best_score
            }
        else:
            print(f"Person {best_name} not found in active missing persons database")
            return {
                'match_found': False,
                'best_similarity': best_score,
                'best_name': best_name,
                'reason': 'Person not in active missing persons database'
            }
    
    except Exception as e:
        print(f"Error in face matching: {str(e)}")
        import traceback
        traceback.print_exc()
        return None


# Routes

# Initialize database with default admin user
def init_db():
    with app.app_context():
        db.create_all()
        
        # Create default admin user if not exists
        admin = Admin.query.filter_by(username='admin').first()
        if not admin:
            admin = Admin(
                username='admin',
                password_hash=generate_password_hash('admin123'),
                email='admin@anveshan.org',
                full_name='System Administrator',
                role='super_admin'
            )
            db.session.add(admin)
            print("✓ Default admin user created: admin/admin123")
        
        # Create geet admin user if not exists
        geet = Admin.query.filter_by(username='geet').first()
        if not geet:
            geet = Admin(
                username='geet',
                password_hash=generate_password_hash('geet1234'),
                email='geet@anveshan.org',
                full_name='Geet Admin',
                role='admin'
            )
            db.session.add(geet)
            print("✓ Admin user 'geet' created: geet/geet1234")
        
        db.session.commit()

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/report-missing')
def report_missing():
    return render_template('report_missing.html')

@app.route('/found-person')
def found_person():
    return render_template('found_person.html')

@app.route('/search-results')
def search_results():
    # Get all active missing persons from database
    missing_persons = MissingPerson.query.filter_by(status='active').all()
    missing_persons_list = [person.to_dict() for person in missing_persons]
    return render_template('search_results.html', missing_persons=missing_persons_list)

@app.route('/alerts')
def alerts():
    # Get all active alerts from database
    alerts_list = Alert.query.filter_by(is_active=True).order_by(Alert.created_at.desc()).all()
    alerts_data = [alert.to_dict() for alert in alerts_list]
    return render_template('alerts.html', alerts=alerts_data)

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/contact')
def contact():
    return render_template('contact.html')

# Admin authentication routes
@app.route('/admin-login', methods=['GET', 'POST'])
def admin_login():
    if session.get('admin'):
        return redirect(url_for('admin_dashboard'))
    
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        # Verify against database
        admin = Admin.query.filter_by(username=username, is_active=True).first()
        
        if admin and check_password_hash(admin.password_hash, password):
            session['admin'] = True
            session['admin_user'] = username
            session['admin_id'] = admin.id
            
            # Update last login
            admin.last_login = datetime.now()
            db.session.commit()
            
            flash('Login successful! Welcome to Admin Dashboard.', 'success')
            return redirect(url_for('admin_dashboard'))
        else:
            flash('Invalid username or password', 'error')
    
    return render_template('admin_login.html')

@app.route('/admin-dashboard')
def admin_dashboard():
    if not session.get('admin'):
        flash('Please login to access admin dashboard', 'error')
        return redirect(url_for('admin_login'))
    
    # Get dashboard statistics
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    
    stats = {
        'active_cases': MissingPerson.query.filter_by(status='active').count(),
        'resolved_today': MissingPerson.query.filter(
            MissingPerson.status == 'resolved',
            MissingPerson.resolved_at >= today_start
        ).count(),
        'total_reports': FoundPerson.query.count(),
        'pending_matches': FoundPerson.query.filter_by(match_status='pending').count()
    }
    
    # Get recent cases
    recent_cases = MissingPerson.query.order_by(MissingPerson.created_at.desc()).limit(10).all()
    
    # Get pending verifications
    pending_verifications = FoundPerson.query.filter_by(match_status='pending').order_by(
        FoundPerson.match_confidence.desc()
    ).limit(5).all()
    
    return render_template('admin_dashboard.html', 
                         stats=stats, 
                         recent_cases=recent_cases,
                         pending_verifications=pending_verifications)


# ============================================================================
# ANALYTICS API ROUTES
# ============================================================================

def get_date_range(period):
    """Get date range based on period parameter"""
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    if period == '7d':
        start_date = today - timedelta(days=7)
    elif period == '30d':
        start_date = today - timedelta(days=30)
    elif period == '90d':
        start_date = today - timedelta(days=90)
    elif period == '1y':
        start_date = today - timedelta(days=365)
    else:
        start_date = today - timedelta(days=7)  # Default to 7 days
    
    return start_date, today


@app.route('/api/admin/analytics/cases-by-category')
def analytics_cases_by_category():
    """Get case distribution by category"""
    if not session.get('admin'):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    try:
        period = request.args.get('period', '30d')
        start_date, end_date = get_date_range(period)
        
        # Get all categories
        categories = ['child', 'elderly', 'woman', 'man', 'alzheimer', 'other']
        data = []
        labels = []
        colors = ['#4361ee', '#00f2fe', '#38ef7d', '#f72585', '#fca311', '#e63946']
        
        for category in categories:
            count = MissingPerson.query.filter(
                MissingPerson.category == category,
                MissingPerson.created_at >= start_date,
                MissingPerson.created_at <= end_date
            ).count()
            if count > 0:
                labels.append(category.title())
                data.append(count)
        
        # Add color for each label
        chart_colors = colors[:len(labels)]
        
        return jsonify({
            'success': True,
            'labels': labels,
            'data': data,
            'colors': chart_colors
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/admin/analytics/cases-by-gender')
def analytics_cases_by_gender():
    """Get case distribution by gender"""
    if not session.get('admin'):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    try:
        period = request.args.get('period', '30d')
        start_date, end_date = get_date_range(period)
        
        # Get gender distribution
        male_count = MissingPerson.query.filter(
            MissingPerson.gender == 'Male',
            MissingPerson.created_at >= start_date,
            MissingPerson.created_at <= end_date
        ).count()
        
        female_count = MissingPerson.query.filter(
            MissingPerson.gender == 'Female',
            MissingPerson.created_at >= start_date,
            MissingPerson.created_at <= end_date
        ).count()
        
        other_count = MissingPerson.query.filter(
            MissingPerson.gender != 'Male',
            MissingPerson.gender != 'Female',
            MissingPerson.created_at >= start_date,
            MissingPerson.created_at <= end_date
        ).count()
        
        return jsonify({
            'success': True,
            'labels': ['Male', 'Female', 'Other'],
            'data': [male_count, female_count, other_count],
            'colors': ['#4361ee', '#f72585', '#fca311']
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/admin/analytics/missing-vs-found')
def analytics_missing_vs_found():
    """Get missing vs found person reports"""
    if not session.get('admin'):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    try:
        period = request.args.get('period', '30d')
        start_date, end_date = get_date_range(period)
        
        missing_count = MissingPerson.query.filter(
            MissingPerson.created_at >= start_date,
            MissingPerson.created_at <= end_date
        ).count()
        
        found_count = FoundPerson.query.filter(
            FoundPerson.created_at >= start_date,
            FoundPerson.created_at <= end_date
        ).count()
        
        return jsonify({
            'success': True,
            'labels': ['Missing Person Reports', 'Found Person Reports'],
            'data': [missing_count, found_count],
            'colors': ['#e63946', '#38ef7d']
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/admin/analytics/monthly-trend')
def analytics_monthly_trend():
    """Get monthly report trend"""
    if not session.get('admin'):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    try:
        period = request.args.get('period', '12m')
        
        if period == '3m':
            months_back = 3
        elif period == '6m':
            months_back = 6
        elif period == '12m':
            months_back = 12
        else:
            months_back = 12
        
        # Get monthly data
        labels = []
        missing_data = []
        found_data = []
        
        for i in range(months_back, 0, -1):
            # Calculate date range for this month
            current_month = datetime.utcnow().replace(day=1)
            month_start = current_month - timedelta(days=current_month.day - 1 + (months_back - i) * 30)
            month_start = month_start.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            month_end = month_start + timedelta(days=32)
            month_end = month_end.replace(day=1) - timedelta(seconds=1)
            
            # Get counts
            missing = MissingPerson.query.filter(
                MissingPerson.created_at >= month_start,
                MissingPerson.created_at <= month_end
            ).count()
            
            found = FoundPerson.query.filter(
                FoundPerson.created_at >= month_start,
                FoundPerson.created_at <= month_end
            ).count()
            
            labels.append(month_start.strftime('%b %Y'))
            missing_data.append(missing)
            found_data.append(found)
        
        return jsonify({
            'success': True,
            'labels': labels,
            'missing_data': missing_data,
            'found_data': found_data
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/admin/analytics/resolution-rate')
def analytics_resolution_rate():
    """Get case resolution rate over time"""
    if not session.get('admin'):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    try:
        period = request.args.get('period', '30d')
        start_date, end_date = get_date_range(period)
        
        # Get daily resolution data
        labels = []
        active_data = []
        resolved_data = []
        
        current_date = start_date
        while current_date <= end_date:
            date_str = current_date.strftime('%b %d')
            
            # Count cases up to this date
            total_active = MissingPerson.query.filter(
                MissingPerson.created_at <= current_date,
                MissingPerson.status == 'active'
            ).count()
            
            total_resolved = MissingPerson.query.filter(
                MissingPerson.created_at <= current_date,
                MissingPerson.status == 'resolved'
            ).count()
            
            labels.append(date_str)
            active_data.append(total_active)
            resolved_data.append(total_resolved)
            
            current_date += timedelta(days=1)
        
        return jsonify({
            'success': True,
            'labels': labels,
            'active_data': active_data,
            'resolved_data': resolved_data
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/admin/analytics/match-success')
def analytics_match_success():
    """Get match success rate"""
    if not session.get('admin'):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    try:
        period = request.args.get('period', '30d')
        start_date, end_date = get_date_range(period)
        
        # Get match data
        total_found = FoundPerson.query.filter(
            FoundPerson.created_at >= start_date,
            FoundPerson.created_at <= end_date
        ).count()
        
        confirmed_matches = FoundPerson.query.filter(
            FoundPerson.match_status == 'confirmed',
            FoundPerson.created_at >= start_date,
            FoundPerson.created_at <= end_date
        ).count()
        
        pending_matches = FoundPerson.query.filter(
            FoundPerson.match_status == 'pending',
            FoundPerson.created_at >= start_date,
            FoundPerson.created_at <= end_date
        ).count()
        
        rejected_matches = FoundPerson.query.filter(
            FoundPerson.match_status == 'rejected',
            FoundPerson.created_at >= start_date,
            FoundPerson.created_at <= end_date
        ).count()
        
        success_rate = (confirmed_matches / total_found * 100) if total_found > 0 else 0
        
        return jsonify({
            'success': True,
            'total_found': total_found,
            'confirmed_matches': confirmed_matches,
            'pending_matches': pending_matches,
            'rejected_matches': rejected_matches,
            'success_rate': round(success_rate, 1),
            'labels': ['Confirmed', 'Pending', 'Rejected'],
            'data': [confirmed_matches, pending_matches, rejected_matches],
            'colors': ['#38ef7d', '#fca311', '#e63946']
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/admin-contacts')
def admin_contacts():
    if not session.get('admin'):
        flash('Please login to access admin dashboard', 'error')
        return redirect(url_for('admin_login'))
    
    # Get filter parameters
    status_filter = request.args.get('status', 'all')
    subject_filter = request.args.get('subject', 'all')
    search_query = request.args.get('search', '')
    
    # Build query
    query = Contact.query
    
    if status_filter != 'all':
        query = query.filter_by(status=status_filter)
    
    if subject_filter != 'all':
        query = query.filter_by(subject=subject_filter)
    
    if search_query:
        query = query.filter(
            db.or_(
                Contact.name.ilike(f'%{search_query}%'),
                Contact.email.ilike(f'%{search_query}%'),
                Contact.message.ilike(f'%{search_query}%')
            )
        )
    
    # Order by most recent first
    contacts = query.order_by(Contact.created_at.desc()).all()
    
    # Get counts for filters
    counts = {
        'all': Contact.query.count(),
        'new': Contact.query.filter_by(status='new').count(),
        'in_progress': Contact.query.filter_by(status='in_progress').count(),
        'resolved': Contact.query.filter_by(status='resolved').count(),
    }
    
    return render_template('admin_contacts.html',
                         contacts=contacts,
                         counts=counts,
                         status_filter=status_filter,
                         subject_filter=subject_filter,
                         search_query=search_query)

@app.route('/admin-logout')
def admin_logout():
    session.pop('admin', None)
    session.pop('admin_user', None)
    session.pop('admin_id', None)
    flash('You have been logged out successfully', 'success')
    return redirect(url_for('index'))

@app.route('/admin/all-cases')
def admin_all_cases():
    if not session.get('admin'):
        flash('Please login to access admin dashboard', 'error')
        return redirect(url_for('admin_login'))
    
    # Get filter parameters
    status_filter = request.args.get('status', 'all')
    category_filter = request.args.get('category', 'all')
    search_query = request.args.get('search', '')
    
    # Build query
    query = MissingPerson.query
    
    if status_filter != 'all':
        query = query.filter_by(status=status_filter)
    
    if category_filter != 'all':
        query = query.filter_by(category=category_filter)
    
    if search_query:
        query = query.filter(MissingPerson.full_name.ilike(f'%{search_query}%'))
    
    # Order by most recent first
    all_cases = query.order_by(MissingPerson.created_at.desc()).all()
    
    # Get counts for filters
    counts = {
        'all': MissingPerson.query.count(),
        'active': MissingPerson.query.filter_by(status='active').count(),
        'resolved': MissingPerson.query.filter_by(status='resolved').count(),
        'child': MissingPerson.query.filter_by(category='child').count(),
        'alzheimer': MissingPerson.query.filter_by(category='alzheimer').count(),
    }
    
    return render_template('admin_all_cases.html', 
                         cases=all_cases,
                         counts=counts,
                         status_filter=status_filter,
                         category_filter=category_filter,
                         search_query=search_query)


# ============================================================================
# FOUND PERSON ADMIN ROUTES
# ============================================================================

@app.route('/admin-all-found')
def admin_all_found():
    """Display all found person reports in admin dashboard"""
    if not session.get('admin'):
        flash('Please login to access admin dashboard', 'error')
        return redirect(url_for('admin_login'))
    
    # Get filter parameters
    status_filter = request.args.get('status', 'all')
    search_query = request.args.get('search', '')
    
    # Build query
    query = FoundPerson.query
    
    if status_filter != 'all':
        query = query.filter_by(match_status=status_filter)
    
    if search_query:
        query = query.filter(
            (FoundPerson.finder_name.ilike(f'%{search_query}%')) |
            (FoundPerson.finder_email.ilike(f'%{search_query}%'))
        )
    
    # Order by most recent first
    found_persons = query.order_by(FoundPerson.created_at.desc()).all()
    
    # Get counts for filters
    counts = {
        'all': FoundPerson.query.count(),
        'pending': FoundPerson.query.filter_by(match_status='pending').count(),
        'confirmed': FoundPerson.query.filter_by(match_status='confirmed').count(),
        'rejected': FoundPerson.query.filter_by(match_status='rejected').count(),
    }
    
    return render_template('admin_all_found.html',
                         found_persons=found_persons,
                         counts=counts,
                         status_filter=status_filter,
                         search_query=search_query)


@app.route('/api/admin/found/<int:found_id>/confirm-match', methods=['POST'])
def confirm_found_match(found_id):
    """Confirm a match for a found person"""
    if not session.get('admin'):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    try:
        found = FoundPerson.query.get(found_id)
        if not found:
            return jsonify({'success': False, 'message': 'Found person not found'}), 404
        
        # Update match status
        found.match_status = 'confirmed'
        db.session.commit()
        
        logger.info(f"✅ Match confirmed for found person {found.finder_name} (ID: {found_id})")
        
        return jsonify({
            'success': True,
            'message': f'Match confirmed for {found.finder_name}'
        })
        
    except Exception as e:
        logger.error(f"Error confirming match: {e}")
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500


@app.route('/api/admin/found/<int:found_id>/reject-match', methods=['POST'])
def reject_found_match(found_id):
    """Reject a match for a found person"""
    if not session.get('admin'):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    try:
        found = FoundPerson.query.get(found_id)
        if not found:
            return jsonify({'success': False, 'message': 'Found person not found'}), 404
        
        # Update match status
        found.match_status = 'rejected'
        db.session.commit()
        
        logger.info(f"❌ Match rejected for found person {found.finder_name} (ID: {found_id})")
        
        return jsonify({
            'success': True,
            'message': f'Match rejected for {found.finder_name}'
        })
        
    except Exception as e:
        logger.error(f"Error rejecting match: {e}")
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500


@app.route('/api/admin/delete-found/<int:found_id>', methods=['DELETE'])
def delete_found_person(found_id):
    """Delete a found person report and associated photos"""
    if not session.get('admin'):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    try:
        found = FoundPerson.query.get(found_id)
        if not found:
            return jsonify({'success': False, 'message': 'Found person not found'}), 404
        
        # Delete associated photos from disk
        if found.photo_paths:
            photos = found.photo_paths.split(',')
            for photo_path in photos:
                photo_path = photo_path.strip()
                full_path = os.path.join('static', photo_path.lstrip('/'))
                if os.path.exists(full_path):
                    try:
                        os.remove(full_path)
                        logger.info(f"📸 Deleted photo: {full_path}")
                    except Exception as e:
                        logger.error(f"Error deleting photo {full_path}: {e}")
        
        # Delete associated alerts if any
        Alert.query.filter_by(found_person_id=found_id).delete()
        
        # Delete the found person record
        finder_name = found.finder_name
        db.session.delete(found)
        db.session.commit()
        
        logger.info(f"✓ Deleted found person report from {finder_name} (ID: {found_id})")
        
        return jsonify({
            'success': True,
            'message': f'Report from {finder_name} deleted successfully'
        })
        
    except Exception as e:
        logger.error(f"Error deleting found person: {e}")
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500

# API endpoints
@app.route('/api/report-missing', methods=['POST'])
def api_report_missing():
    try:
        print("=" * 50)
        print("Received POST request to /api/report-missing")
        print("Form data:", dict(request.form))
        print("Files:", list(request.files.keys()))
        print("=" * 50)
        
        # Handle file uploads with face validation
        photo_paths = []
        if 'photos[]' in request.files:
            photos = request.files.getlist('photos[]')
            for photo in photos:
                if photo and allowed_file(photo.filename):
                    filename = secure_filename(photo.filename)
                    # Add timestamp to filename to make it unique
                    filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{filename}"
                    filepath = os.path.join(app.config['UPLOAD_FOLDER'], 'missing', filename)
                    photo.save(filepath)
                    
                    # Validate that image contains a human face
                    is_valid, validation_message = validate_human_face(filepath)
                    if not is_valid:
                        # Delete the invalid image
                        os.remove(filepath)
                        return jsonify({
                            'success': False, 
                            'message': f'Invalid image: {validation_message}. Please upload a clear photo of the person\'s face.'
                        }), 400
                    
                    photo_paths.append(f"uploads/missing/{filename}")
        
        # Parse date and time
        last_seen_date = datetime.strptime(request.form.get('last-seen-date'), '%Y-%m-%d').date()
        last_seen_time_str = request.form.get('last-seen-time')
        last_seen_time = datetime.strptime(last_seen_time_str, '%H:%M').time() if last_seen_time_str else None
        
        # Create new missing person record
        missing_person = MissingPerson(
            full_name=request.form.get('full-name'),
            age=int(request.form.get('age')),
            gender=request.form.get('gender'),
            category=request.form.get('category'),
            height=int(request.form.get('height')) if request.form.get('height') else None,
            weight=int(request.form.get('weight')) if request.form.get('weight') else None,
            eye_color=request.form.get('eye-color'),
            hair_color=request.form.get('hair-color'),
            distinguishing_features=request.form.get('distinguishing-features'),
            last_seen_location=request.form.get('last-seen-location'),
            last_seen_date=last_seen_date,
            last_seen_time=last_seen_time,
            last_seen_wearing=request.form.get('last-seen-wearing'),
            reporter_name=request.form.get('reporter-name'),
            reporter_relationship=request.form.get('reporter-relationship'),
            reporter_phone=request.form.get('reporter-phone'),
            reporter_email=request.form.get('reporter-email'),
            photo_paths=','.join(photo_paths) if photo_paths else None,
            status='active'
        )
        
        db.session.add(missing_person)
        db.session.commit()
        
        # Create an alert for this missing person
        alert = Alert(
            alert_type='emergency',
            title=f'Missing {missing_person.category.title()}: {missing_person.full_name}',
            message=f'{missing_person.age}-year-old {missing_person.gender} missing from {missing_person.last_seen_location}',
            location=missing_person.last_seen_location,
            missing_person_id=missing_person.id
        )
        db.session.add(alert)
        db.session.commit()
        
        flash('Missing person report submitted successfully! Our team will contact you soon.', 'success')
        return jsonify({'success': True, 'message': 'Report submitted successfully', 'id': missing_person.id})
    
    except Exception as e:
        db.session.rollback()
        print(f"Error: {str(e)}")
        flash('Error submitting report. Please try again.', 'error')
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/report-found', methods=['POST'])
def api_report_found():
    try:
        # Handle file uploads with face validation
        photo_paths = []
        if 'photos[]' in request.files:
            photos = request.files.getlist('photos[]')
            for photo in photos:
                if photo and allowed_file(photo.filename):
                    filename = secure_filename(photo.filename)
                    filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{filename}"
                    filepath = os.path.join(app.config['UPLOAD_FOLDER'], 'found', filename)
                    photo.save(filepath)
                    
                    # Validate that image contains a human face
                    is_valid, validation_message = validate_human_face(filepath)
                    if not is_valid:
                        # Delete the invalid image
                        os.remove(filepath)
                        return jsonify({
                            'success': False, 
                            'message': f'Invalid image: {validation_message}. Please upload a clear photo of the person\'s face.'
                        }), 400
                    
                    photo_paths.append(f"uploads/found/{filename}")
        
        # Parse date and time
        found_date = datetime.strptime(request.form.get('found-date'), '%Y-%m-%d').date()
        found_time_str = request.form.get('found-time')
        found_time = datetime.strptime(found_time_str, '%H:%M').time() if found_time_str else None
        
        # Create new found person record
        found_person = FoundPerson(
            found_location=request.form.get('found-location'),
            found_date=found_date,
            found_time=found_time,
            found_condition=request.form.get('found-condition'),
            approx_age=int(request.form.get('approx-age')) if request.form.get('approx-age') else None,
            approx_gender=request.form.get('approx-gender'),
            physical_description=request.form.get('physical-description'),
            clothing_description=request.form.get('clothing-description'),
            current_location=request.form.get('current-location'),
            location_details=request.form.get('location-details'),
            finder_name=request.form.get('finder-name'),
            finder_phone=request.form.get('finder-phone'),
            finder_email=request.form.get('finder-email'),
            photo_paths=','.join(photo_paths) if photo_paths else None,
            match_status='pending'
        )
        
        db.session.add(found_person)
        db.session.commit()
        
        # Run AI face matching if photos were uploaded
        match_result = None
        if photo_paths:
            try:
                # Use the first photo for matching
                first_photo_path = os.path.join('static', photo_paths[0])
                match_result = run_face_matching(first_photo_path)
                
                if match_result and match_result['match_found']:
                    # Update found person with match information
                    found_person.matched_missing_person_id = match_result['matched_person_id']
                    found_person.match_confidence = match_result['confidence']
                    found_person.match_status = 'matched'
                    
                    # Get the matched missing person
                    missing_person = MissingPerson.query.get(match_result['matched_person_id'])
                    
                    # Create high priority alert for match
                    alert = Alert(
                        alert_type='match',
                        title=f'MATCH FOUND: {missing_person.full_name}',
                        message=f'Found person matches missing person: {missing_person.full_name} (Confidence: {match_result["confidence"]:.1f}%). Location: {found_person.found_location}',
                        location=found_person.found_location,
                        missing_person_id=missing_person.id,
                        found_person_id=found_person.id
                    )
                    db.session.add(alert)
                    db.session.commit()
                    
                    # Send email and SMS notifications to the reporter/family
                    print(f"\n{'='*60}")
                    print(f"🎉 MATCH FOUND! Sending notifications...")
                    print(f"Missing Person: {missing_person.full_name}")
                    print(f"Reporter: {missing_person.reporter_name}")
                    print(f"Confidence: {match_result['confidence']:.1f}%")
                    print(f"{'='*60}\n")
                    
                    notify_match_found(missing_person, found_person, match_result['confidence'])
                    
                    flash(f'Match found! This person may be {missing_person.full_name} (Confidence: {match_result["confidence"]:.1f}%). Family has been notified via email.', 'success')
                    return jsonify({
                        'success': True, 
                        'message': 'Match found! Family has been notified via email.', 
                        'id': found_person.id,
                        'match': {
                            'person_name': missing_person.full_name,
                            'confidence': match_result['confidence']
                        }
                    })
                else:
                    # No match found, create regular alert
                    alert = Alert(
                        alert_type='sighting',
                        title='New Found Person Report',
                        message=f'Found person reported in {found_person.found_location}. No immediate match found. Approx age: {found_person.approx_age or "Unknown"}',
                        location=found_person.found_location,
                        found_person_id=found_person.id
                    )
                    db.session.add(alert)
                    db.session.commit()
                    
            except Exception as e:
                print(f"Face matching error: {str(e)}")
                # Continue even if matching fails
                alert = Alert(
                    alert_type='sighting',
                    title='New Found Person Report',
                    message=f'Found person reported in {found_person.found_location}. Approx age: {found_person.approx_age or "Unknown"}',
                    location=found_person.found_location,
                    found_person_id=found_person.id
                )
                db.session.add(alert)
                db.session.commit()
        else:
            # No photos uploaded, create regular alert
            alert = Alert(
                alert_type='sighting',
                title='New Found Person Report',
                message=f'Found person reported in {found_person.found_location}. No photo provided. Approx age: {found_person.approx_age or "Unknown"}',
                location=found_person.found_location,
                found_person_id=found_person.id
            )
            db.session.add(alert)
            db.session.commit()
        
        flash('Found person report submitted successfully! We will process this information.', 'success')
        return jsonify({'success': True, 'message': 'Report submitted successfully', 'id': found_person.id})
    
    except Exception as e:
        db.session.rollback()
        print(f"Error: {str(e)}")
        flash('Error submitting report. Please try again.', 'error')
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/contact', methods=['POST'])
def api_contact():
    try:
        print("=" * 50)
        print("📧 Contact Form Submission Received")
        print("Form data:", dict(request.form))
        print("=" * 50)
        
        # Get form data
        name = request.form.get('contact-name')
        email = request.form.get('contact-email')
        phone = request.form.get('contact-phone')
        subject = request.form.get('contact-subject')
        message = request.form.get('contact-message')
        
        # Validate required fields
        if not name or not email or not message:
            return jsonify({
                'success': False, 
                'message': 'Please fill in all required fields (Name, Email, Message)'
            }), 400
        
        # Create new contact record
        contact = Contact(
            name=name,
            email=email,
            phone=phone,
            subject=subject,
            message=message,
            status='new'
        )
        
        db.session.add(contact)
        db.session.commit()
        
        print(f"✅ Contact message saved successfully! ID: {contact.id}")
        print(f"   From: {name} ({email})")
        print(f"   Subject: {subject or 'No subject'}")
        print("=" * 50)
        
        # TODO: Send email to support team
        # TODO: Send auto-reply to user
        
        return jsonify({
            'success': True, 
            'message': 'Thank you for contacting us! We will get back to you soon.',
            'contact_id': contact.id
        })
    
    except Exception as e:
        print(f"❌ Error saving contact: {str(e)}")
        db.session.rollback()
        return jsonify({
            'success': False, 
            'message': 'An error occurred while sending your message. Please try again.'
        }), 500

@app.route('/api/face-search', methods=['POST'])
def api_face_search():
    """
    AI Face Search - Upload photo and find matches using Custom CNN model
    """
    try:
        if 'photo' not in request.files:
            return jsonify({'success': False, 'message': 'No photo uploaded'}), 400
        
        photo = request.files['photo']
        if photo.filename == '':
            return jsonify({'success': False, 'message': 'No photo selected'}), 400
        
        # Save uploaded photo temporarily
        temp_folder = os.path.join(app.config['UPLOAD_FOLDER'], 'temp')
        os.makedirs(temp_folder, exist_ok=True)
        
        filename = secure_filename(f"search_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{photo.filename}")
        filepath = os.path.join(temp_folder, filename)
        photo.save(filepath)
        
        # Validate that image contains a human face
        is_valid, validation_message = validate_human_face(filepath)
        if not is_valid:
            # Delete the invalid image
            os.remove(filepath)
            return jsonify({
                'success': False, 
                'message': f'Invalid image: {validation_message}. Please upload a clear photo of a person\'s face.'
            }), 400
        
        print(f"\n{'='*60}")
        print(f"🔍 AI FACE SEARCH INITIATED")
        print(f"Photo: {filename}")
        print(f"{'='*60}\n")
        
        # Get location from photo EXIF if available, or from GPS form data
        photo_location = extract_photo_location(filepath)
        
        # Check for GPS coordinates from form (captured by browser geolocation)
        gps_latitude = request.form.get('latitude')
        gps_longitude = request.form.get('longitude')
        
        if gps_latitude and gps_longitude:
            try:
                photo_location = {
                    'latitude': float(gps_latitude),
                    'longitude': float(gps_longitude),
                    'source': 'browser_geolocation'
                }
                print(f"📍 Using GPS location from browser: {photo_location}")
            except ValueError:
                print(f"⚠️ Invalid GPS coordinates received: {gps_latitude}, {gps_longitude}")
        
        print(f"\n🔍 Searching against database missing persons...")
        
        # Run face matching with DeepFace FaceNet512 (fixes overfitting)
        # Using 0.60 threshold for exact match, 0.40 for similar matches
        match_result = run_face_matching(filepath, embeddings_file='embeddings_deepface.json', threshold=0.60)
        
        results = []
        matched_person = None
        
        if match_result and match_result.get('match_found'):
            # Found a match - get person from database
            person_id = match_result['matched_person_id']
            person = MissingPerson.query.get(person_id)
            matched_person = person
            
            if person:
                # Fix photo paths to include /static/ prefix
                photo_paths = []
                if person.photo_paths:
                    photo_paths = [f"/static/{path.strip()}" if not path.strip().startswith('/static') else path.strip() 
                                  for path in person.photo_paths.split(',')]
                
                results.append({
                    'id': person.id,
                    'name': person.full_name,
                    'age': person.age,
                    'gender': person.gender,
                    'last_seen_location': person.last_seen_location,
                    'last_seen_date': person.last_seen_date.strftime('%Y-%m-%d') if person.last_seen_date else None,
                    'photo_paths': photo_paths,
                    'confidence': match_result['confidence'],
                    'similarity': match_result['similarity'],
                    'match_type': 'exact',
                    'found_location': photo_location
                })
                
                print(f"✓ MATCH FOUND: {person.full_name}")
                print(f"  Confidence: {match_result['confidence']:.1f}%")
                print(f"  Similarity: {match_result['similarity']:.4f}")
                if photo_location:
                    print(f"  Found Location: {photo_location}")
                print()
        
        # Also get top similar matches from embeddings
        try:
            sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'utils'))
            from deepface_matching import match_face_deepface as match_face
            
            # Use 0.40 threshold for similar matches
            full_result = match_face(filepath, embeddings_file='embeddings_deepface.json', threshold=0.40)
            
            print(f"\n📊 Showing all matches above 40% similarity\n")
            
            if full_result and 'all_matches' in full_result:
                # Get top 10 matches (more results for search)
                for name, similarity in full_result['all_matches'][:10]:
                    # Strip whitespace from embedding name
                    name_stripped = name.strip()
                    
                    # Check if this person exists in database (try exact match first)
                    person = MissingPerson.query.filter_by(full_name=name_stripped, status='active').first()
                    
                    if not person:
                        # Try with stripped database names
                        all_active = MissingPerson.query.filter_by(status='active').all()
                        for p in all_active:
                            if p.full_name.strip() == name_stripped:
                                person = p
                                break
                    
                    if person and not any(r['id'] == person.id for r in results):
                        # Fix photo paths to include /static/ prefix
                        photo_paths = []
                        if person.photo_paths:
                            photo_paths = [f"/static/{path.strip()}" if not path.strip().startswith('/static') else path.strip() 
                                          for path in person.photo_paths.split(',')]
                        
                        results.append({
                            'id': person.id,
                            'name': person.full_name,
                            'age': person.age,
                            'gender': person.gender,
                            'last_seen_location': person.last_seen_location,
                            'last_seen_date': person.last_seen_date.strftime('%Y-%m-%d') if person.last_seen_date else None,
                            'photo_paths': photo_paths,
                            'confidence': similarity * 100,
                            'similarity': similarity,
                            'match_type': 'similar'
                        })
        except Exception as e:
            logger.error(f"Error getting similar matches: {e}")
        
        # ========================================================================
        # SEND EMAIL ALERT TO RELATIVES IF EXACT MATCH FOUND WITH HIGH CONFIDENCE
        # ========================================================================
        email_sent = False
        email_status_message = ""
        
        if matched_person and match_result.get('confidence', 0) >= 70:
            try:
                email_success, email_message = send_match_alert_email(
                    person=matched_person,
                    confidence=match_result['confidence'],
                    found_location=photo_location,
                    search_photo_path=filepath
                )
                
                email_sent = email_success
                email_status_message = email_message
                
                if email_success:
                    logger.info(f"✅ Email notification sent for match: {matched_person.full_name}")
                else:
                    logger.warning(f"⚠️ Email notification skipped: {email_message}")
                    
            except Exception as e:
                logger.error(f"❌ Exception in email sending: {str(e)}")
                email_sent = False
                email_status_message = f"Email service error: {str(e)}"
        
        # Clean up temp file
        try:
            os.remove(filepath)
        except:
            pass
        
        logger.info(f"Search complete: {len(results)} results found")
        
        return jsonify({
            'success': True,
            'results': results,
            'total': len(results),
            'email_notification': {
                'sent': email_sent,
                'message': email_status_message,
                'recipient': matched_person.reporter_email if matched_person and email_sent else None
            },
            'alert_sent': matched_person is not None and match_result.get('confidence', 0) >= 70,
            'message': f'Found {len(results)} potential match(es)' if results else 'No matches found'
        })
        
    except Exception as e:
        print(f"❌ Error in face search: {str(e)}")
        import traceback
        traceback.print_exc()
        
        # Clean up temp file even on error
        try:
            if 'filepath' in locals() and os.path.exists(filepath):
                os.remove(filepath)
        except:
            pass
        
        error_message = str(e)
        # Provide helpful message if it's a common issue
        if 'TensorFlow' in error_message or 'DeepFace' in error_message:
            error_message = 'AI model is loading. Please wait 10 seconds and try again.'
        
        return jsonify({
            'success': False, 
            'message': f'Face search error: {error_message}',
            'hint': 'If this is your first search, the AI model is loading. Please try again in 10 seconds.'
        }), 500

@app.route('/api/location-search', methods=['POST'])
def api_location_search():
    """
    Location-based search - Find missing persons near a location
    """
    try:
        data = request.get_json()
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        radius_km = data.get('radius', 10)
        
        if not latitude or not longitude:
            return jsonify({'success': False, 'message': 'Location coordinates required'}), 400
        
        # Get all active missing persons
        # In a real app, you'd use geospatial queries
        # For now, we'll return all and filter client-side or add location matching later
        persons = MissingPerson.query.filter_by(status='active').all()
        
        results = []
        for person in persons:
            results.append({
                'id': person.id,
                'name': person.full_name,
                'age': person.age,
                'gender': person.gender,
                'last_seen_location': person.last_seen_location,
                'last_seen_date': person.last_seen_date.strftime('%Y-%m-%d') if person.last_seen_date else None,
                'photo_paths': person.photo_paths.split(',') if person.photo_paths else [],
                'distance': 0  # Calculate actual distance in production
            })
        
        return jsonify({
            'success': True,
            'results': results,
            'total': len(results),
            'search_location': {'lat': latitude, 'lng': longitude},
            'radius_km': radius_km
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/search', methods=['GET'])
def api_search():
    try:
        query = request.args.get('q', '')
        category = request.args.get('category', 'all')
        location = request.args.get('location', 'all')
        time_filter = request.args.get('time', 'all')
        min_age = request.args.get('min_age', type=int)
        max_age = request.args.get('max_age', type=int)
        gender = request.args.get('gender', 'all')
        
        # Query database
        query_obj = MissingPerson.query.filter_by(status='active')
        
        # Apply filters
        if query:
            query_obj = query_obj.filter(
                db.or_(
                    MissingPerson.full_name.ilike(f'%{query}%'),
                    MissingPerson.last_seen_location.ilike(f'%{query}%'),
                    MissingPerson.distinguishing_features.ilike(f'%{query}%')
                )
            )
        
        if category != 'all':
            query_obj = query_obj.filter_by(category=category)
        
        if gender != 'all':
            query_obj = query_obj.filter_by(gender=gender)
        
        if min_age:
            query_obj = query_obj.filter(MissingPerson.age >= min_age)
        
        if max_age:
            query_obj = query_obj.filter(MissingPerson.age <= max_age)
        
        if time_filter != 'all':
            now = datetime.now()
            if time_filter == '24h':
                cutoff = now - timedelta(days=1)
            elif time_filter == 'week':
                cutoff = now - timedelta(weeks=1)
            elif time_filter == 'month':
                cutoff = now - timedelta(days=30)
            else:
                cutoff = None
            
            if cutoff:
                query_obj = query_obj.filter(MissingPerson.created_at >= cutoff)
        
        # Execute query
        results = query_obj.order_by(MissingPerson.created_at.desc()).all()
        results_list = [person.to_dict() for person in results]
        
        return jsonify({
            'success': True,
            'results': results_list,
            'count': len(results_list)
        })
    
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return render_template('404.html') if os.path.exists('templates/404.html') else ('Page not found', 404)

@app.errorhandler(500)
def internal_error(error):
    return render_template('500.html') if os.path.exists('templates/500.html') else ('Internal server error', 500)

# Admin API endpoints
@app.route('/api/admin/contact/<int:contact_id>/status', methods=['POST'])
def update_contact_status(contact_id):
    if not session.get('admin'):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    try:
        contact = Contact.query.get_or_404(contact_id)
        new_status = request.json.get('status')
        
        if new_status not in ['new', 'in_progress', 'resolved']:
            return jsonify({'success': False, 'message': 'Invalid status'}), 400
        
        contact.status = new_status
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Contact status updated to {new_status}',
            'status': new_status
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/admin/contact/<int:contact_id>', methods=['DELETE'])
def delete_contact(contact_id):
    if not session.get('admin'):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    try:
        contact = Contact.query.get_or_404(contact_id)
        db.session.delete(contact)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Contact message deleted successfully'
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/admin/delete-case/<int:case_id>', methods=['DELETE'])
def delete_case(case_id):
    """Delete a missing person case"""
    if not session.get('admin'):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    try:
        case = MissingPerson.query.get(case_id)
        if not case:
            return jsonify({'success': False, 'message': 'Case not found'}), 404
        
        # Delete associated photos from disk
        if case.photo_paths:
            photos = case.photo_paths.split(',')
            for photo_path in photos:
                photo_path = photo_path.strip()
                full_path = os.path.join('static', photo_path.lstrip('/'))
                if os.path.exists(full_path):
                    try:
                        os.remove(full_path)
                        print(f"Deleted photo: {full_path}")
                    except Exception as e:
                        print(f"Error deleting photo {full_path}: {e}")
        
        # Delete associated found person reports
        FoundPerson.query.filter_by(matched_missing_person_id=case_id).delete()
        
        # Delete associated alerts
        Alert.query.filter_by(missing_person_id=case_id).delete()
        
        # Delete the case
        case_name = case.full_name
        db.session.delete(case)
        db.session.commit()
        
        print(f"✓ Deleted case: {case_name} (ID: {case_id})")
        
        return jsonify({
            'success': True,
            'message': f'Case "{case_name}" deleted successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting case: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/admin/resolve-case/<int:case_id>', methods=['POST'])
def resolve_case_api(case_id):
    """Mark a case as resolved"""
    if not session.get('admin'):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    try:
        case = MissingPerson.query.get(case_id)
        if not case:
            return jsonify({'success': False, 'message': 'Case not found'}), 404
        
        case.status = 'resolved'
        case.resolved_at = datetime.utcnow()
        case.updated_at = datetime.now()
        db.session.commit()
        
        print(f"✓ Marked case as resolved: {case.full_name} (ID: {case_id})")
        
        return jsonify({
            'success': True,
            'message': f'Case "{case.full_name}" marked as resolved'
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"Error resolving case: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

if __name__ == '__main__':
    # Initialize database
    init_db()
    print("✓ Database initialized")
    print("✓ Server starting...")
    print("✓ Admin credentials: admin / admin123")
    print("\n💡 TIP: Face search may take 10-20 seconds on first use (loading AI model)")
    print("         Subsequent searches will be faster!\n")
    # Use threaded=True to handle concurrent requests better
    # use_reloader=True allows auto-reload but may restart during first TensorFlow load
    app.run(debug=True, host='0.0.0.0', port=5000, threaded=True, use_reloader=True)
