#!/usr/bin/env python
import sys
sys.path.insert(0, 'backend')

from utils.database import get_db_connection

def fix_database():
    """Fix/upgrade DB schema for PocketCare.

    Safe to run multiple times.
    - Ensures core lookup tables exist (specialties)
    - Ensures doctors table has all columns used by the API
    - Ensures appointments table has all columns used by the API
    - Ensures admins table exists for admin login
    - Ensures consultation chat tables exist (consultation_threads, consultation_messages)
    - Ensures weight management tables exist (weight_entries, weight_goals)
    - Ensures messages/chat tables exist (messages, chat_messages)
    - Ensures hospitals supports login + geo location (hospitals.password_hash, hospitals.latitude/longitude)
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        def _table_exists(table_name: str) -> bool:
            cursor.execute(
                """
                SELECT 1
                FROM INFORMATION_SCHEMA.TABLES
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s
                LIMIT 1
                """,
                (table_name,),
            )
            return bool(cursor.fetchone())

        def _column_exists(table_name: str, column_name: str) -> bool:
            cursor.execute(
                """
                SELECT 1
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = %s
                  AND COLUMN_NAME = %s
                LIMIT 1
                """,
                (table_name, column_name),
            )
            return bool(cursor.fetchone())

        def _ensure_table(table_name: str, create_sql: str):
            if _table_exists(table_name):
                return
            print(f"Creating {table_name} table...")
            cursor.execute(create_sql)
            conn.commit()
            print(f"✓ {table_name} table created")

        def _ensure_column(table_name: str, column_name: str, add_column_sql: str):
            """add_column_sql should be a full ALTER TABLE ... ADD COLUMN ... statement."""
            if _column_exists(table_name, column_name):
                return
            print(f"Adding {table_name}.{column_name} column...")
            cursor.execute(add_column_sql)
            conn.commit()
            print(f"✓ {table_name}.{column_name} column added")

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
        if _column_exists('doctors', 'specialty_id'):
            print("✓ specialty_id column already exists in doctors table")
        else:
            print("Adding specialty_id column to doctors table...")
            cursor.execute("ALTER TABLE doctors ADD COLUMN specialty_id INT NULL")
            conn.commit()
            print("✓ specialty_id column added successfully")

        # Ensure doctors table has newer profile columns used by API.
        # Note: JSON columns require MySQL 5.7+/MariaDB equivalent.
        _ensure_column('doctors', 'specialties', "ALTER TABLE doctors ADD COLUMN specialties JSON NULL")
        _ensure_column('doctors', 'qualification', "ALTER TABLE doctors ADD COLUMN qualification VARCHAR(255) NULL")
        _ensure_column('doctors', 'experience', "ALTER TABLE doctors ADD COLUMN experience INT NULL")
        _ensure_column('doctors', 'rating', "ALTER TABLE doctors ADD COLUMN rating DECIMAL(2,1) DEFAULT 0.0")
        _ensure_column('doctors', 'hospital_id', "ALTER TABLE doctors ADD COLUMN hospital_id INT NULL")
        _ensure_column('doctors', 'consultation_fee', "ALTER TABLE doctors ADD COLUMN consultation_fee DECIMAL(10,2) NULL")
        _ensure_column('doctors', 'available_slots', "ALTER TABLE doctors ADD COLUMN available_slots JSON NULL")
        _ensure_column('doctors', 'available_days', "ALTER TABLE doctors ADD COLUMN available_days JSON NULL")
        _ensure_column('doctors', 'day_specific_availability', "ALTER TABLE doctors ADD COLUMN day_specific_availability JSON NULL")
        _ensure_column('doctors', 'is_available', "ALTER TABLE doctors ADD COLUMN is_available BOOLEAN DEFAULT TRUE")
        _ensure_column('doctors', 'bio', "ALTER TABLE doctors ADD COLUMN bio TEXT NULL")
        _ensure_column('doctors', 'created_at', "ALTER TABLE doctors ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")

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
        if _column_exists('doctors', 'password_hash'):
            print("✓ password_hash column already exists in doctors table")
        else:
            print("Adding password_hash column to doctors table...")
            cursor.execute("ALTER TABLE doctors ADD COLUMN password_hash VARCHAR(255) NOT NULL DEFAULT ''")
            conn.commit()
            print("✓ password_hash column added successfully")

        # Ensure users table has newer profile columns (used in profile + appointments joins).
        _ensure_column('users', 'phone', "ALTER TABLE users ADD COLUMN phone VARCHAR(20) NULL")
        _ensure_column('users', 'date_of_birth', "ALTER TABLE users ADD COLUMN date_of_birth DATE NULL")
        _ensure_column('users', 'gender', "ALTER TABLE users ADD COLUMN gender ENUM('male','female','other') NULL")
        _ensure_column('users', 'blood_group', "ALTER TABLE users ADD COLUMN blood_group VARCHAR(5) NULL")
        _ensure_column('users', 'address', "ALTER TABLE users ADD COLUMN address TEXT NULL")
        _ensure_column('users', 'created_at', "ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
        _ensure_column('users', 'updated_at', "ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")

        # Ensure appointments table has fields used by doctor/user dashboards.
        _ensure_column('appointments', 'symptoms', "ALTER TABLE appointments ADD COLUMN symptoms TEXT NULL")
        _ensure_column(
            'appointments',
            'status',
            "ALTER TABLE appointments ADD COLUMN status ENUM('pending','confirmed','completed','cancelled') DEFAULT 'pending'",
        )
        _ensure_column('appointments', 'notes', "ALTER TABLE appointments ADD COLUMN notes TEXT NULL")
        _ensure_column('appointments', 'created_at', "ALTER TABLE appointments ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
        _ensure_column(
            'appointments',
            'updated_at',
            "ALTER TABLE appointments ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
        )

        # Ensure admins table exists (for admin login/dashboard).
        _ensure_table(
            'admins',
            """
            CREATE TABLE IF NOT EXISTS admins (
                id INT PRIMARY KEY AUTO_INCREMENT,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                name VARCHAR(100) NOT NULL,
                role VARCHAR(50) DEFAULT 'admin',
                is_active BOOLEAN DEFAULT TRUE,
                last_login TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_email (email)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
        )

        # Ensure chat and messaging tables exist.
        _ensure_table(
            'chat_messages',
            """
            CREATE TABLE IF NOT EXISTS chat_messages (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                sender ENUM('user', 'ai') NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_user (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
        )

        _ensure_table(
            'messages',
            """
            CREATE TABLE IF NOT EXISTS messages (
                id INT PRIMARY KEY AUTO_INCREMENT,
                sender_id INT NOT NULL,
                receiver_id INT NOT NULL,
                appointment_id INT,
                message TEXT NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
                INDEX idx_sender (sender_id),
                INDEX idx_receiver (receiver_id),
                INDEX idx_appointment (appointment_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
        )

        # Ensure weight management tables exist.
        _ensure_table(
            'weight_entries',
            """
            CREATE TABLE IF NOT EXISTS weight_entries (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                entry_date DATE NOT NULL,
                weight_kg DECIMAL(6,2) NOT NULL,
                height_cm DECIMAL(6,2) NOT NULL,
                age_years INT NULL,
                bmi DECIMAL(6,2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_weight_entries_user_date (user_id, entry_date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
        )

        _ensure_table(
            'weight_goals',
            """
            CREATE TABLE IF NOT EXISTS weight_goals (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                start_weight_kg DECIMAL(6,2) NULL,
                target_weight_kg DECIMAL(6,2) NOT NULL,
                start_date DATE NULL,
                target_date DATE NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_weight_goals_user_active (user_id, is_active)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
        )

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

        # --- Hospitals: login + geo fields ---
        cursor.execute(
            """
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='hospitals'
            """
        )
        hospital_cols = {r['COLUMN_NAME'] if isinstance(r, dict) else r[0] for r in (cursor.fetchall() or [])}

        if not hospital_cols:
            print("! hospitals table not found; skipping hospital upgrades")
        else:
            if 'latitude' not in hospital_cols:
                print("Adding latitude column to hospitals table...")
                cursor.execute("ALTER TABLE hospitals ADD COLUMN latitude DECIMAL(10,8) NULL")
                conn.commit()
                print("✓ latitude column added")

            if 'longitude' not in hospital_cols:
                print("Adding longitude column to hospitals table...")
                cursor.execute("ALTER TABLE hospitals ADD COLUMN longitude DECIMAL(11,8) NULL")
                conn.commit()
                print("✓ longitude column added")

            if 'password_hash' not in hospital_cols:
                print("Adding password_hash column to hospitals table...")
                cursor.execute("ALTER TABLE hospitals ADD COLUMN password_hash VARCHAR(255) NOT NULL DEFAULT ''")
                conn.commit()
                print("✓ password_hash column added")

            # Helpful index for geo queries (best-effort)
            try:
                cursor.execute("CREATE INDEX idx_location ON hospitals(latitude, longitude)")
                conn.commit()
            except Exception:
                pass
        
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
