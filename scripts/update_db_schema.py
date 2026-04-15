"""
Update database schema to add found_person_id to alerts table
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app import app, db
from models import Alert
import sqlite3

def update_schema():
    """Add missing columns to database"""
    
    db_path = os.path.join(os.path.dirname(__file__), '..', 'instance', 'anveshan.db')
    
    print(f"Updating database: {db_path}")
    
    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check if found_person_id column exists
    cursor.execute("PRAGMA table_info(alerts)")
    columns = [col[1] for col in cursor.fetchall()]
    
    if 'found_person_id' not in columns:
        print("Adding found_person_id column to alerts table...")
        try:
            cursor.execute("ALTER TABLE alerts ADD COLUMN found_person_id INTEGER REFERENCES found_persons(id)")
            conn.commit()
            print("✓ Column added successfully")
        except Exception as e:
            print(f"Error adding column: {e}")
    else:
        print("✓ found_person_id column already exists")
    
    conn.close()
    print("\nDatabase schema update complete!")

if __name__ == '__main__':
    update_schema()
