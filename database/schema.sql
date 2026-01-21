
-- ============================================================================
-- POCKETCARE DATABASE SCHEMA
-- ============================================================================

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS pocketcare_db;
USE pocketcare_db;

-- ============================================================================
-- TABLE: users
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    date_of_birth DATE,
    gender ENUM('male', 'female', 'other'),
    blood_group VARCHAR(5),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4; 

-- ============================================================================
-- TABLE: specialties
-- ============================================================================
CREATE TABLE IF NOT EXISTS specialties (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_specialties_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- TABLE: doctors
-- ============================================================================
CREATE TABLE IF NOT EXISTS doctors (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    specialty VARCHAR(100) NOT NULL,
    specialty_id INT NULL,
    specialties JSON NULL COMMENT 'Store multiple selected specialties as an array of strings',
    qualification VARCHAR(255),
    experience INT COMMENT 'Years of experience',
    rating DECIMAL(2,1) DEFAULT 0.0,
    hospital_id INT,
    consultation_fee DECIMAL(10,2),
    available_slots JSON COMMENT 'Store available time slots',
    available_days JSON COMMENT 'Store available days (e.g., ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"])',
    day_specific_availability JSON COMMENT 'Store day-specific time slots (e.g., {"Monday": ["09:00-10:00", "10:00-11:00"], "Tuesday": [...]})',
    is_available BOOLEAN DEFAULT TRUE COMMENT 'Doctor availability toggle - TRUE for available, FALSE for unavailable',
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_specialty (specialty),
    INDEX idx_specialty_id (specialty_id),
    INDEX idx_hospital (hospital_id),
    CONSTRAINT fk_doctors_specialty_id FOREIGN KEY (specialty_id) REFERENCES specialties(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- TABLE: hospitals
-- ============================================================================
CREATE TABLE IF NOT EXISTS hospitals (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100),
    state VARCHAR(100),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    phone VARCHAR(20),
    email VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    emergency_contact VARCHAR(20),
    total_beds INT,
    available_beds INT,
    icu_beds INT,
    services JSON COMMENT 'List of services offered',
    rating DECIMAL(2,1) DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_location (latitude, longitude),
    INDEX idx_city (city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- TABLE: hospital_doctors
-- Separate table for managing doctors within a specific hospital
-- ============================================================================
CREATE TABLE IF NOT EXISTS hospital_doctors (
    id INT PRIMARY KEY AUTO_INCREMENT,
    hospital_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    specialty VARCHAR(100) NOT NULL,
    qualification VARCHAR(255),
    experience INT COMMENT 'Years of experience',
    rating DECIMAL(2,1) DEFAULT 0.0,
    consultation_fee DECIMAL(10,2),
    is_available BOOLEAN DEFAULT TRUE,
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_hospital_id (hospital_id),
    INDEX idx_specialty (specialty),
    UNIQUE KEY unique_hospital_email (hospital_id, email),
    CONSTRAINT fk_hospital_doctors_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- TABLE: appointments
-- ============================================================================
CREATE TABLE IF NOT EXISTS appointments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    doctor_id INT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    symptoms TEXT,
    status ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_doctor (doctor_id),
    INDEX idx_date (appointment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- TABLE: hospital_appointments
-- Separate table for managing appointments within hospitals
-- ============================================================================
CREATE TABLE IF NOT EXISTS hospital_appointments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    hospital_id INT NOT NULL,
    hospital_doctor_id INT NULL COMMENT 'References hospital_doctors table',
    patient_name VARCHAR(100) NOT NULL,
    patient_phone VARCHAR(20),
    patient_email VARCHAR(255),
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    department VARCHAR(100) NOT NULL,
    appointment_type VARCHAR(50) DEFAULT 'Consultation' COMMENT 'e.g., Consultation, Follow-up, Emergency, Check-up',
    priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
    status ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
    symptoms TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE,
    FOREIGN KEY (hospital_doctor_id) REFERENCES hospital_doctors(id) ON DELETE SET NULL,
    INDEX idx_hospital (hospital_id),
    INDEX idx_hospital_doctor (hospital_doctor_id),
    INDEX idx_date (appointment_date),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- TABLE: symptom_logs
-- ============================================================================
CREATE TABLE IF NOT EXISTS symptom_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    symptoms TEXT NOT NULL,
    ai_analysis TEXT COMMENT 'Gemini API response',
    recommended_specialty VARCHAR(100),
    urgency_level ENUM('low', 'medium', 'high'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- TABLE: medical_reports
-- ============================================================================
CREATE TABLE IF NOT EXISTS medical_reports (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    file_path VARCHAR(500),
    file_name VARCHAR(255),
    ocr_text TEXT COMMENT 'Extracted text from OCR',
    ai_interpretation TEXT COMMENT 'Gemini explanation',
    report_type VARCHAR(100) COMMENT 'e.g., blood test, x-ray',
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- TABLE: emergency_requests
-- ============================================================================
CREATE TABLE IF NOT EXISTS emergency_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    status ENUM('pending', 'acknowledged', 'resolved') DEFAULT 'pending',
    hospital_id INT COMMENT 'Hospital that responded',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- TABLE: messages
-- ============================================================================
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

-- ============================================================================
-- TABLE: chat_messages
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    sender ENUM('user', 'ai') NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================================
-- TABLE: weight_entries (weight/BMI history per user)
-- =========================================================================
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

-- =========================================================================
-- TABLE: weight_goals (one active goal per user, enforced in code)
-- =========================================================================
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

-- =========================================================================
-- TABLE: consultation_threads (doctor-user chats, per appointment)
-- =========================================================================
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

-- =========================================================================
-- TABLE: consultation_messages
-- =========================================================================
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

-- ============================================================================
-- TABLE: admins
-- ============================================================================
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

-- ============================================================================
-- TABLE: bed_wards
-- ============================================================================
CREATE TABLE IF NOT EXISTS bed_wards (
    id INT PRIMARY KEY AUTO_INCREMENT,
    hospital_id INT NOT NULL,
    ward_type ENUM('general', 'maternity', 'pediatrics', 'icu', 'emergency', 'private_room') NOT NULL,
    ac_type ENUM('ac', 'non_ac', 'not_applicable') DEFAULT 'not_applicable',
    room_config VARCHAR(50) NULL COMMENT 'For private rooms: 1_bed_no_bath, 1_bed_with_bath, 2_bed_with_bath (2 beds always have attached bathroom)',
    total_beds INT NOT NULL DEFAULT 0,
    available_beds INT NOT NULL DEFAULT 0,
    reserved_beds INT NOT NULL DEFAULT 0,
    occupied_beds INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE,
    INDEX idx_hospital_ward (hospital_id, ward_type),
    INDEX idx_ward_type (ward_type),
    UNIQUE KEY uq_hospital_ward_ac (hospital_id, ward_type, ac_type, room_config),
    CONSTRAINT chk_bed_counts CHECK (
        total_beds >= 0 AND
        available_beds >= 0 AND
        reserved_beds >= 0 AND
        occupied_beds >= 0 AND
        (available_beds + reserved_beds + occupied_beds) <= total_beds
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- TABLE: private_rooms
-- ============================================================================
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

-- ============================================================================
-- TABLE: bed_allocation_logs
-- ============================================================================
CREATE TABLE IF NOT EXISTS bed_allocation_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    hospital_id INT NOT NULL,
    ward_id INT NULL,
    room_id INT NULL,
    allocation_type ENUM('ward', 'private_room') NOT NULL,
    action ENUM('allocated', 'released', 'reserved', 'cancelled') NOT NULL,
    patient_name VARCHAR(100) NULL,
    patient_contact VARCHAR(20) NULL,
    allocated_by VARCHAR(100) NULL COMMENT 'Staff member who made the allocation',
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE,
    FOREIGN KEY (ward_id) REFERENCES bed_wards(id) ON DELETE SET NULL,
    FOREIGN KEY (room_id) REFERENCES private_rooms(id) ON DELETE SET NULL,
    INDEX idx_hospital_logs (hospital_id, created_at),
    INDEX idx_allocation_type (allocation_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
