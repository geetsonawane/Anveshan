"""
Alternative app runner that disables auto-reload to prevent TensorFlow issues
Use this if face search keeps timing out due to server restarts
"""

import os
import sys

# Clean environment variables that might interfere
if 'WERKZEUG_RUN_MAIN' in os.environ:
    del os.environ['WERKZEUG_RUN_MAIN']
if 'WERKZEUG_SERVER_FD' in os.environ:
    del os.environ['WERKZEUG_SERVER_FD']

# Import and run app
from app import app, init_db

if __name__ == '__main__':
    print("\n" + "="*70)
    print("ANVESHAN - MISSING PERSON FINDER (STABLE MODE)")
    print("="*70)
    print("\n✓ Starting server WITHOUT auto-reload")
    print("✓ This prevents issues with TensorFlow/DeepFace loading")
    print("✓ You'll need to manually restart if you edit code\n")
    
    # Initialize database
    init_db()
    print("✓ Database initialized")
    print("✓ Admin credentials: admin / admin123")
    print("\n💡 FIRST FACE SEARCH: May take 15-30 seconds (loading AI model)")
    print("   Subsequent searches: 2-5 seconds\n")
    print("Server running at: http://127.0.0.1:5000")
    print("Press CTRL+C to stop\n")
    print("="*70 + "\n")
    
    # Run without auto-reload (use_reloader=False)
    app.run(
        debug=False,  # Disable debug mode
        host='0.0.0.0',
        port=5000,
        threaded=True,
        use_reloader=False  # Prevent auto-reload
    )
