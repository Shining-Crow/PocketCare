#!/usr/bin/env python
import sys
sys.path.insert(0, 'backend')

from utils.database import get_db_connection

def fix_database():
    """Add password_hash column to doctors table if it doesn't exist"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if password_hash column exists
        cursor.execute("""
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME='doctors' AND COLUMN_NAME='password_hash'
        """)
        
        if cursor.fetchone():
            print("✓ password_hash column already exists in doctors table")
        else:
            print("Adding password_hash column to doctors table...")
            cursor.execute("""
                ALTER TABLE doctors ADD COLUMN password_hash VARCHAR(255) NOT NULL DEFAULT ''
            """)
            conn.commit()
            print("✓ password_hash column added successfully")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"✗ Error: {str(e)}")
        return False

if __name__ == '__main__':
    if fix_database():
        print("\nDatabase fixed! You can now test the login.")
        sys.exit(0)
    else:
        print("\nFailed to fix database.")
        sys.exit(1)
