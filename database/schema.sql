
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
    qualification VARCHAR(255),
    experience INT COMMENT 'Years of experience',
    rating DECIMAL(2,1) DEFAULT 0.0,
    hospital_id INT,
    consultation_fee DECIMAL(10,2),
    available_slots JSON COMMENT 'Store available time slots',
    available_days JSON COMMENT 'Store available days (e.g., ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"])',
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
-- END OF SCHEMA
-- ============================================================================
