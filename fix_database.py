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
    - Ensures Emergency SOS tables/columns exist (emergency_requests, emergency_types)
    - Ensures Bed Management tables exist (bed_wards, private_rooms, bed_allocation_logs, user_bed_bookings)
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

        # --- Emergency SOS: tables + columns used by routes/emergency_sos.py ---
        _ensure_table(
            'emergency_types',
            """
            CREATE TABLE IF NOT EXISTS emergency_types (
                code VARCHAR(50) PRIMARY KEY,
                label VARCHAR(100) NOT NULL,
                description VARCHAR(255) NULL,
                sort_order INT NOT NULL DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uq_emergency_types_label (label),
                INDEX idx_emergency_types_active (is_active, sort_order)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
        )

        _ensure_table(
            'emergency_requests',
            """
            CREATE TABLE IF NOT EXISTS emergency_requests (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                latitude DECIMAL(10,8),
                longitude DECIMAL(11,8),
                emergency_type VARCHAR(50) NULL,
                note TEXT NULL,
                status ENUM('pending', 'acknowledged', 'resolved') DEFAULT 'pending',
                hospital_id INT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                acknowledged_at TIMESTAMP NULL,
                resolved_at TIMESTAMP NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE SET NULL,
                INDEX idx_user (user_id),
                INDEX idx_status (status),
                INDEX idx_hospital (hospital_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
        )

        _ensure_column(
            'emergency_requests',
            'emergency_type',
            "ALTER TABLE emergency_requests ADD COLUMN emergency_type VARCHAR(50) NULL",
        )
        _ensure_column(
            'emergency_requests',
            'note',
            "ALTER TABLE emergency_requests ADD COLUMN note TEXT NULL",
        )
        _ensure_column(
            'emergency_requests',
            'acknowledged_at',
            "ALTER TABLE emergency_requests ADD COLUMN acknowledged_at TIMESTAMP NULL",
        )
        _ensure_column(
            'emergency_requests',
            'resolved_at',
            "ALTER TABLE emergency_requests ADD COLUMN resolved_at TIMESTAMP NULL",
        )

        # Helpful indexes (best-effort)
        try:
            cursor.execute("CREATE INDEX idx_hospital ON emergency_requests(hospital_id)")
            conn.commit()
        except Exception:
            pass
        try:
            cursor.execute("CREATE INDEX idx_created_at ON emergency_requests(created_at)")
            conn.commit()
        except Exception:
            pass
        try:
            cursor.execute("CREATE INDEX idx_emergency_type ON emergency_requests(emergency_type)")
            conn.commit()
        except Exception:
            pass

        # Seed default emergency types (idempotent)
        try:
            cursor.execute(
                """
                INSERT INTO emergency_types (code, label, description, sort_order, is_active) VALUES
                ('general', 'General', 'General emergency (fallback/default)', 0, TRUE),
                ('chest-pain', 'Chest Pain', 'Chest pain / possible cardiac emergency', 10, TRUE),
                ('breathing', 'Breathing Issue', 'Breathing difficulty / respiratory distress', 20, TRUE),
                ('bleeding', 'Heavy Bleeding', 'Severe bleeding / hemorrhage risk', 30, TRUE),
                ('unconscious', 'Unconscious', 'Loss of consciousness / fainting', 40, TRUE),
                ('seizure', 'Seizure', 'Active seizure or post-seizure emergency', 50, TRUE),
                ('other', 'Other Medical', 'Other urgent medical emergency', 60, TRUE)
                ON DUPLICATE KEY UPDATE
                  label = VALUES(label),
                  description = VALUES(description),
                  sort_order = VALUES(sort_order),
                  is_active = VALUES(is_active)
                """
            )
            conn.commit()
        except Exception:
            # Non-fatal; schema fix is more important than seed.
            pass

        # --- Bed Management + User Bed Bookings (align with database/schema.sql) ---
        # Note: These tables reference hospitals/users, which are expected to already exist.
        _ensure_table(
            'bed_wards',
            """
            CREATE TABLE IF NOT EXISTS bed_wards (
                id INT PRIMARY KEY AUTO_INCREMENT,
                hospital_id INT NOT NULL,
                ward_type ENUM('general', 'maternity', 'pediatrics', 'icu', 'emergency', 'private_room') NOT NULL,
                ac_type ENUM('ac', 'non_ac', 'not_applicable') DEFAULT 'not_applicable',
                room_config VARCHAR(50) NULL,
                total_beds INT NOT NULL DEFAULT 0,
                available_beds INT NOT NULL DEFAULT 0,
                reserved_beds INT NOT NULL DEFAULT 0,
                occupied_beds INT NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE,
                INDEX idx_hospital_ward (hospital_id, ward_type),
                INDEX idx_ward_type (ward_type),
                UNIQUE KEY uq_hospital_ward_ac (hospital_id, ward_type, ac_type, room_config)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
        )

        _ensure_table(
            'private_rooms',
            """
            CREATE TABLE IF NOT EXISTS private_rooms (
                id INT PRIMARY KEY AUTO_INCREMENT,
                hospital_id INT NOT NULL,
                room_number VARCHAR(50) NOT NULL,
                bed_count ENUM('1', '2') NOT NULL DEFAULT '1',
                has_attached_bathroom BOOLEAN DEFAULT FALSE,
                ac_type ENUM('ac', 'non_ac') NOT NULL DEFAULT 'non_ac',
                status ENUM('available', 'occupied', 'reserved', 'maintenance') DEFAULT 'available',
                daily_rate DECIMAL(10,2) DEFAULT 0.00,
                patient_name VARCHAR(100) NULL,
                patient_contact VARCHAR(20) NULL,
                admission_date DATE NULL,
                expected_discharge_date DATE NULL,
                notes TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE,
                INDEX idx_hospital_room (hospital_id, room_number),
                INDEX idx_room_status (status),
                UNIQUE KEY uq_hospital_room_number (hospital_id, room_number)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
        )

        _ensure_table(
            'bed_allocation_logs',
            """
            CREATE TABLE IF NOT EXISTS bed_allocation_logs (
                id INT PRIMARY KEY AUTO_INCREMENT,
                hospital_id INT NOT NULL,
                ward_id INT NULL,
                room_id INT NULL,
                allocation_type ENUM('ward', 'private_room') NOT NULL,
                action ENUM('allocated', 'released', 'reserved', 'cancelled') NOT NULL,
                patient_name VARCHAR(100) NULL,
                patient_contact VARCHAR(20) NULL,
                allocated_by VARCHAR(100) NULL,
                notes TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE,
                FOREIGN KEY (ward_id) REFERENCES bed_wards(id) ON DELETE SET NULL,
                FOREIGN KEY (room_id) REFERENCES private_rooms(id) ON DELETE SET NULL,
                INDEX idx_hospital_logs (hospital_id, created_at),
                INDEX idx_allocation_type (allocation_type)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
        )

        _ensure_table(
            'user_bed_bookings',
            """
            CREATE TABLE IF NOT EXISTS user_bed_bookings (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                hospital_id INT NOT NULL,
                ward_type ENUM('general', 'maternity', 'pediatrics', 'icu', 'emergency', 'private_room') NOT NULL,
                ac_type ENUM('ac', 'non_ac', 'not_applicable') DEFAULT 'not_applicable',
                room_config VARCHAR(50) NULL,
                patient_name VARCHAR(100) NOT NULL,
                patient_age INT NULL,
                patient_gender ENUM('male', 'female', 'other') NULL,
                patient_phone VARCHAR(20) NOT NULL,
                patient_email VARCHAR(255) NULL,
                emergency_contact VARCHAR(20) NULL,
                preferred_date DATE NOT NULL,
                expected_discharge_date DATE NULL,
                admission_reason TEXT NULL,
                doctor_name VARCHAR(100) NULL,
                special_requirements TEXT NULL,
                status ENUM('pending', 'confirmed', 'rejected', 'cancelled', 'completed') DEFAULT 'pending',
                notes TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE,
                INDEX idx_user_bookings (user_id),
                INDEX idx_hospital_bookings (hospital_id),
                INDEX idx_booking_status (status),
                INDEX idx_ward_type (ward_type),
                INDEX idx_preferred_date (preferred_date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
        )

        # Migration support: older deployments may have admission_date/medical_condition instead
        if _table_exists('user_bed_bookings'):
            # admission_date -> preferred_date
            if _column_exists('user_bed_bookings', 'admission_date') and not _column_exists('user_bed_bookings', 'preferred_date'):
                print("Migrating user_bed_bookings.admission_date -> preferred_date...")
                try:
                    cursor.execute(
                        """
                        ALTER TABLE user_bed_bookings
                        CHANGE COLUMN admission_date preferred_date DATE NOT NULL
                        """
                    )
                    conn.commit()
                    print("✓ user_bed_bookings.preferred_date migrated")
                except Exception as e:
                    print(f"! Could not migrate admission_date: {e}")

            # medical_condition -> admission_reason
            if _column_exists('user_bed_bookings', 'medical_condition') and not _column_exists('user_bed_bookings', 'admission_reason'):
                print("Migrating user_bed_bookings.medical_condition -> admission_reason...")
                try:
                    cursor.execute(
                        """
                        ALTER TABLE user_bed_bookings
                        CHANGE COLUMN medical_condition admission_reason TEXT NULL
                        """
                    )
                    conn.commit()
                    print("✓ user_bed_bookings.admission_reason migrated")
                except Exception as e:
                    print(f"! Could not migrate medical_condition: {e}")

            # Ensure newer columns exist (safe ADDs)
            _ensure_column('user_bed_bookings', 'patient_email', "ALTER TABLE user_bed_bookings ADD COLUMN patient_email VARCHAR(255) NULL")
            _ensure_column('user_bed_bookings', 'expected_discharge_date', "ALTER TABLE user_bed_bookings ADD COLUMN expected_discharge_date DATE NULL")
            _ensure_column('user_bed_bookings', 'doctor_name', "ALTER TABLE user_bed_bookings ADD COLUMN doctor_name VARCHAR(100) NULL")
            _ensure_column('user_bed_bookings', 'special_requirements', "ALTER TABLE user_bed_bookings ADD COLUMN special_requirements TEXT NULL")
            _ensure_column('user_bed_bookings', 'notes', "ALTER TABLE user_bed_bookings ADD COLUMN notes TEXT NULL")

            # Preferred date index (best-effort)
            try:
                cursor.execute("CREATE INDEX idx_preferred_date ON user_bed_bookings(preferred_date)")
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
