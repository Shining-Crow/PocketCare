#!/usr/bin/env python
import sys
sys.path.insert(0, 'backend')

from utils.database import get_db_connection

def fix_database():
    """Fix/upgrade DB schema for PocketCare.

    Safe to run multiple times.
    - Ensures doctors.password_hash exists
    - Ensures consultation chat tables exist (consultation_threads, consultation_messages)
    - Ensures specialties table exists and doctors.specialty_id exists
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # --- Specialties lookup table (and doctors.specialty_id) ---
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS specialties (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uq_specialties_name (name)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """
        )
        conn.commit()

        # Ensure "Other" exists for custom specialties
        cursor.execute("INSERT INTO specialties (name) VALUES (%s) ON DUPLICATE KEY UPDATE name=VALUES(name)", ("Other",))
        conn.commit()

        # Ensure doctors.specialty_id exists
        cursor.execute(
            """
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='doctors' AND COLUMN_NAME='specialty_id'
            """
        )
        if cursor.fetchone():
            print("✓ specialty_id column already exists in doctors table")
        else:
            print("Adding specialty_id column to doctors table...")
            cursor.execute("ALTER TABLE doctors ADD COLUMN specialty_id INT NULL")
            conn.commit()
            print("✓ specialty_id column added successfully")

        # Backfill doctors.specialty_id from doctors.specialty (best effort)
        try:
            cursor.execute(
                """
                UPDATE doctors d
                JOIN specialties s ON LOWER(TRIM(d.specialty)) = LOWER(TRIM(s.name))
                SET d.specialty_id = s.id
                WHERE d.specialty_id IS NULL AND d.specialty IS NOT NULL AND d.specialty <> ''
                """
            )
            conn.commit()
        except Exception:
            # Non-fatal; continue.
            pass

        # Ensure index exists (ignore failures)
        try:
            cursor.execute("CREATE INDEX idx_specialty_id ON doctors(specialty_id)")
            conn.commit()
        except Exception:
            pass

        # Ensure FK exists (ignore failures if existing data prevents constraint)
        try:
            cursor.execute(
                """
                SELECT CONSTRAINT_NAME
                FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'doctors'
                  AND CONSTRAINT_TYPE = 'FOREIGN KEY'
                  AND CONSTRAINT_NAME = 'fk_doctors_specialty_id'
                """
            )
            if cursor.fetchone():
                print("✓ fk_doctors_specialty_id already exists")
            else:
                cursor.execute(
                    """
                    ALTER TABLE doctors
                    ADD CONSTRAINT fk_doctors_specialty_id
                    FOREIGN KEY (specialty_id) REFERENCES specialties(id)
                    ON DELETE SET NULL
                    """
                )
                conn.commit()
                print("✓ fk_doctors_specialty_id added")
        except Exception:
            # Constraint is a nice-to-have; app can still function without it.
            pass
        
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

        # --- Consultation chat tables ---
        cursor.execute(
            """
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME IN ('consultation_threads', 'consultation_messages')
            """
        )
        existing = {row['TABLE_NAME'] if isinstance(row, dict) else row[0] for row in cursor.fetchall()}

        if 'consultation_threads' in existing:
            print("✓ consultation_threads table already exists")
        else:
            print("Creating consultation_threads table...")
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS consultation_threads (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    appointment_id INT NOT NULL,
                    user_id INT NOT NULL,
                    doctor_id INT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY uq_consultation_threads_appointment (appointment_id),
                    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
                    INDEX idx_consultation_threads_user (user_id),
                    INDEX idx_consultation_threads_doctor (doctor_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                """
            )
            conn.commit()
            print("✓ consultation_threads table created")

        if 'consultation_messages' in existing:
            print("✓ consultation_messages table already exists")
        else:
            print("Creating consultation_messages table...")
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS consultation_messages (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    thread_id INT NOT NULL,
                    sender_role ENUM('user', 'doctor') NOT NULL,
                    sender_id INT NOT NULL,
                    message TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (thread_id) REFERENCES consultation_threads(id) ON DELETE CASCADE,
                    INDEX idx_consultation_messages_thread (thread_id),
                    INDEX idx_consultation_messages_created (created_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                """
            )
            conn.commit()
            print("✓ consultation_messages table created")
        
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
