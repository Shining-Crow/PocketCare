-- ============================================================================
-- POCKETCARE SEED DATA
-- Sample data for testing and development
-- ============================================================================

USE pocketcare_db;

-- Clear existing seed data (except hospitals - needed for foreign keys)
DELETE FROM hospital_appointments;
DELETE FROM bed_wards;
DELETE FROM hospital_doctors;
DELETE FROM doctors;

-- ============================================================================
-- SEED: specialties (idempotent)
-- ============================================================================
INSERT INTO specialties (name) VALUES
('General Practice'),
('Internal Medicine'),
('Pediatrics'),
('Gynecology'),
('Dermatology'),
('ENT'),
('Ophthalmology'),
('Dentistry'),
('Cardiology'),
('Neurology'),
('Psychiatry'),
('Pulmonology'),
('Gastroenterology'),
('Endocrinology'),
('Nephrology'),
('Urology'),
('Orthopedics'),
('Rheumatology'),
('Oncology'),
('Hematology'),
('Infectious Disease'),
('General Surgery'),
('Emergency Medicine'),
('Physiotherapy'),
('Nutrition'),
('Other')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- ============================================================================
-- SEED: emergency_types (idempotent)
-- Codes should match what the frontend sends as emergency_type
-- ============================================================================
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
is_active = VALUES(is_active);

-- Ensure password_hash column exists in doctors table (if it doesn't already)
SET @dbname = DATABASE();
SET @tablename = "doctors";
SET @columnname = "password_hash";
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE
    (COLUMN_NAME = @columnname) AND (TABLE_NAME = @tablename) AND (TABLE_SCHEMA = @dbname)) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD ", @columnname, " VARCHAR(255) NOT NULL DEFAULT '' AFTER email")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ============================================================================
-- SEED: hospitals
-- Password hashes are for password: hospital123
-- ============================================================================
INSERT INTO hospitals (id, name, address, city, state, latitude, longitude, phone, email, password_hash, emergency_contact, total_beds, available_beds, icu_beds, services, rating) VALUES
(1, 'City Hospital', '123 Main Street, Downtown', 'New York', 'NY', 40.7128, -74.0060, '+1-555-0101', 'info@cityhospital.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5xuLmK1wJL0hy', '+1-555-0199', 200, 45, 20, '[]', 4.8),
(2, 'Metro Clinic', '456 Park Avenue, Midtown', 'New York', 'NY', 40.7589, -73.9851, '+1-555-0201', 'contact@metroclinic.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5xuLmK1wJL0hy', '+1-555-0299', 100, 25, 10, '[]', 4.9),
(3, 'Children\'s Hospital', '789 Oak Road, North District', 'New York', 'NY', 40.8000, -73.9500, '+1-555-0301', 'info@childrenshospital.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5xuLmK1wJL0hy', '+1-555-0399', 150, 30, 15, '[]', 4.7),
(4, 'Medical Center', '321 West Boulevard', 'New York', 'NY', 40.7500, -74.0200, '+1-555-0401', 'contact@medicalcenter.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5xuLmK1wJL0hy', '+1-555-0499', 250, 60, 25, '[]', 4.8),
(5, 'Community Health Center', '654 East Street', 'New York', 'NY', 40.7200, -73.9800, '+1-555-0501', 'info@communityhc.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5xuLmK1wJL0hy', '+1-555-0599', 80, 20, 5, '[]', 4.5),
-- Bangladesh Hospitals (Dhaka and surrounding areas)
(6, 'Square Hospital', 'Plot No. 18/F, Bir Uttam Qazi Nuruzzaman Sarak, West Panthapath', 'Dhaka', 'Dhaka Division', 23.7515, 90.3816, '+880-2-8159457', 'info@squarehospital.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5xuLmK1wJL0hy', '+880-2-8159458', 400, 120, 50, '[]', 4.9),
(7, 'United Hospital', 'Plot 15, Road 71, Gulshan-2', 'Dhaka', 'Dhaka Division', 23.7925, 90.4148, '+880-2-8836000', 'info@uhlbd.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5xuLmK1wJL0hy', '+880-2-8836001', 450, 150, 60, '[]', 4.8),
(8, 'Apollo Hospitals Dhaka', 'Plot 81, Block E, Bashundhara R/A', 'Dhaka', 'Dhaka Division', 23.8195, 90.4325, '+880-2-8401661', 'info@apollodhaka.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5xuLmK1wJL0hy', '+880-2-8401662', 350, 100, 40, '[]', 4.7),
(9, 'Labaid Specialized Hospital', 'House 1, Road 4, Dhanmondi', 'Dhaka', 'Dhaka Division', 23.7465, 90.3755, '+880-2-9116551', 'info@labaidgroup.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5xuLmK1wJL0hy', '+880-2-9116552', 300, 80, 35, '[]', 4.6),
(10, 'Ibn Sina Hospital', 'House 48, Road 9/A, Dhanmondi', 'Dhaka', 'Dhaka Division', 23.7398, 90.3756, '+880-2-9126570', 'info@ibnsinatrust.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5xuLmK1wJL0hy', '+880-2-9126571', 250, 70, 25, '[]', 4.5),
(11, 'Evercare Hospital Dhaka', '19 Gulshan South Avenue, Gulshan-1', 'Dhaka', 'Dhaka Division', 23.7808, 90.4168, '+880-2-8431661', 'info@evercarebd.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5xuLmK1wJL0hy', '+880-2-8431662', 500, 180, 70, '[]', 4.8),
(12, 'Popular Medical College Hospital', 'House 16, Road 2, Dhanmondi', 'Dhaka', 'Dhaka Division', 23.7412, 90.3728, '+880-2-8610990', 'info@popularmedical.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5xuLmK1wJL0hy', '+880-2-8610991', 200, 60, 20, '[]', 4.4),
(13, 'BIRDEM General Hospital', '122 Kazi Nazrul Islam Avenue, Shahbag', 'Dhaka', 'Dhaka Division', 23.7389, 90.3958, '+880-2-8616641', 'info@birdem.org', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5xuLmK1wJL0hy', '+880-2-8616642', 600, 200, 80, '[]', 4.7),
(14, 'Chittagong Medical College Hospital', 'KB Fazlul Kader Road, Panchlaish', 'Chittagong', 'Chittagong Division', 22.3569, 91.8317, '+880-31-2850261', 'info@cmch.gov.bd', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5xuLmK1wJL0hy', '+880-31-2850262', 1000, 350, 100, '[]', 4.3),
(15, 'Rajshahi Medical College Hospital', 'Medical College Road, Rajshahi', 'Rajshahi', 'Rajshahi Division', 24.3636, 88.6241, '+880-721-772150', 'info@rmch.gov.bd', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5xuLmK1wJL0hy', '+880-721-772151', 800, 280, 60, '[]', 4.2),
(16, 'Sylhet MAG Osmani Medical College Hospital', 'Medical College Road, Sylhet', 'Sylhet', 'Sylhet Division', 24.9045, 91.8611, '+880-821-713667', 'info@somch.gov.bd', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5xuLmK1wJL0hy', '+880-821-713668', 700, 250, 50, '[]', 4.1),
(17, 'Khulna Medical College Hospital', 'Medical College Road, Khulna', 'Khulna', 'Khulna Division', 22.8456, 89.5403, '+880-41-720551', 'info@kmch.gov.bd', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5xuLmK1wJL0hy', '+880-41-720552', 650, 220, 45, '[]', 4.0),
(18, 'Gazipur Shaheed Tajuddin Ahmad Medical College Hospital', 'Gazipur Sadar, Gazipur', 'Gazipur', 'Dhaka Division', 23.9999, 90.4203, '+880-2-9298765', 'info@gstamch.gov.bd', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5xuLmK1wJL0hy', '+880-2-9298766', 400, 150, 30, '[]', 4.0),
(19, 'National Heart Foundation Hospital', 'Plot 7/2, Section 2, Mirpur', 'Dhaka', 'Dhaka Division', 23.7984, 90.3535, '+880-2-8053935', 'info@nhfbd.org', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5xuLmK1wJL0hy', '+880-2-8053936', 300, 90, 50, '[]', 4.9),
(20, 'Bangladesh Eye Hospital', 'House 78, Road 5, Dhanmondi', 'Dhaka', 'Dhaka Division', 23.7425, 90.3742, '+880-2-9671891', 'info@bdeye.org', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5xuLmK1wJL0hy', '+880-2-9671892', 150, 50, 10, '[]', 4.6)
ON DUPLICATE KEY UPDATE
name = VALUES(name),
address = VALUES(address),
city = VALUES(city),
state = VALUES(state),
password_hash = VALUES(password_hash),
services = VALUES(services);

-- ============================================================================
-- SEED: doctors
-- Password hashes are for password123 using bcrypt
-- ============================================================================
INSERT INTO doctors (name, email, password_hash, phone, specialty, qualification, experience, rating, hospital_id, consultation_fee, available_slots, available_days, day_specific_availability, bio) VALUES
('Dr. Sarah Johnson', 'sarah.johnson@cityhospital.com', '$2b$12$QIXxB6UNVj0C.EymGBFgk.JD1eT5mZXyv5Sd6.0J4v3dKJbEIwNP6', '+1-555-1001', 'Cardiology', 'MD, FACC', 15, 4.8, 1, 150.00, '["09:00-10:00", "10:00-11:00", "14:00-15:00", "15:00-16:00"]', '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]', '{"Monday": ["09:00-10:00", "10:00-11:00", "14:00-15:00", "15:00-16:00"], "Tuesday": ["09:00-10:00", "10:00-11:00", "14:00-15:00", "15:00-16:00"], "Wednesday": ["09:00-10:00", "10:00-11:00", "14:00-15:00", "15:00-16:00"], "Thursday": ["09:00-10:00", "10:00-11:00", "14:00-15:00", "15:00-16:00"], "Friday": ["09:00-10:00", "10:00-11:00", "14:00-15:00", "15:00-16:00"]}', 'Experienced cardiologist specializing in heart disease prevention and treatment.'),
('Dr. Michael Chen', 'michael.chen@metroclinic.com', '$2b$12$QIXxB6UNVj0C.EymGBFgk.JD1eT5mZXyv5Sd6.0J4v3dKJbEIwNP6', '+1-555-1002', 'Dermatology', 'MD, Board Certified', 10, 4.9, 2, 120.00, '["10:00-11:00", "11:00-12:00", "15:00-16:00", "16:00-17:00"]', '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]', '{"Monday": ["10:00-11:00", "11:00-12:00", "15:00-16:00", "16:00-17:00"], "Tuesday": ["10:00-11:00", "11:00-12:00", "15:00-16:00", "16:00-17:00"], "Wednesday": ["10:00-11:00", "11:00-12:00", "15:00-16:00", "16:00-17:00"], "Thursday": ["10:00-11:00", "11:00-12:00", "15:00-16:00", "16:00-17:00"], "Friday": ["10:00-11:00", "11:00-12:00", "15:00-16:00", "16:00-17:00"]}', 'Skin specialist with expertise in both medical and cosmetic dermatology.'),
('Dr. Emily Rodriguez', 'emily.rodriguez@childrenshospital.com', '$2b$12$QIXxB6UNVj0C.EymGBFgk.JD1eT5mZXyv5Sd6.0J4v3dKJbEIwNP6', '+1-555-1003', 'Pediatrics', 'MD, FAAP', 12, 4.7, 3, 100.00, '["09:00-10:00", "10:00-11:00", "13:00-14:00", "14:00-15:00"]', '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]', '{"Monday": ["09:00-10:00", "10:00-11:00", "13:00-14:00", "14:00-15:00"], "Tuesday": ["09:00-10:00", "10:00-11:00", "13:00-14:00", "14:00-15:00"], "Wednesday": ["09:00-10:00", "10:00-11:00", "13:00-14:00", "14:00-15:00"], "Thursday": ["09:00-10:00", "10:00-11:00", "13:00-14:00", "14:00-15:00"], "Friday": ["09:00-10:00", "10:00-11:00", "13:00-14:00", "14:00-15:00"], "Saturday": ["09:00-10:00", "10:00-11:00"]}', 'Compassionate pediatrician dedicated to child health and development.'),
('Dr. James Williams', 'james.williams@communityhc.com', '$2b$12$QIXxB6UNVj0C.EymGBFgk.JD1eT5mZXyv5Sd6.0J4v3dKJbEIwNP6', '+1-555-1004', 'General Practice', 'MD, Family Medicine', 8, 4.5, 5, 80.00, '["09:00-10:00", "11:00-12:00", "14:00-15:00", "16:00-17:00"]', '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]', '{"Monday": ["09:00-10:00", "11:00-12:00", "14:00-15:00", "16:00-17:00"], "Tuesday": ["09:00-10:00", "11:00-12:00", "14:00-15:00", "16:00-17:00"], "Wednesday": ["09:00-10:00", "11:00-12:00", "14:00-15:00", "16:00-17:00"], "Thursday": ["09:00-10:00", "11:00-12:00", "14:00-15:00", "16:00-17:00"], "Friday": ["09:00-10:00", "11:00-12:00", "14:00-15:00", "16:00-17:00"], "Saturday": ["09:00-10:00", "11:00-12:00"]}', 'General practitioner providing comprehensive primary care services.'),
('Dr. Priya Patel', 'priya.patel@medicalcenter.com', '$2b$12$QIXxB6UNVj0C.EymGBFgk.JD1eT5mZXyv5Sd6.0J4v3dKJbEIwNP6', '+1-555-1005', 'Neurology', 'MD, PhD, Neuroscience', 18, 4.8, 4, 180.00, '["10:00-11:00", "11:00-12:00", "15:00-16:00"]', '["Monday", "Wednesday", "Friday"]', '{"Monday": ["10:00-11:00", "11:00-12:00", "15:00-16:00"], "Wednesday": ["10:00-11:00", "11:00-12:00", "15:00-16:00"], "Friday": ["10:00-11:00", "11:00-12:00", "15:00-16:00"]}', 'Neurologist specializing in brain and nervous system disorders.'),
('Dr. Robert Brown', 'robert.brown@cityhospital.com', '$2b$12$QIXxB6UNVj0C.EymGBFgk.JD1eT5mZXyv5Sd6.0J4v3dKJbEIwNP6', '+1-555-1006', 'Orthopedics', 'MD, Orthopedic Surgery', 14, 4.6, 1, 160.00, '["09:00-10:00", "10:00-11:00", "14:00-15:00"]', '["Monday", "Tuesday", "Thursday", "Friday"]', '{"Monday": ["09:00-10:00", "10:00-11:00", "14:00-15:00"], "Tuesday": ["09:00-10:00", "10:00-11:00", "14:00-15:00"], "Thursday": ["09:00-10:00", "10:00-11:00", "14:00-15:00"], "Friday": ["09:00-10:00", "10:00-11:00", "14:00-15:00"]}', 'Orthopedic surgeon expert in joint replacement and sports injuries.'),
('Dr. Lisa Anderson', 'lisa.anderson@metroclinic.com', '$2b$12$QIXxB6UNVj0C.EymGBFgk.JD1eT5mZXyv5Sd6.0J4v3dKJbEIwNP6', '+1-555-1007', 'Ophthalmology', 'MD, Eye Surgery', 11, 4.7, 2, 130.00, '["10:00-11:00", "13:00-14:00", "15:00-16:00"]', '["Tuesday", "Wednesday", "Thursday", "Friday"]', '{"Tuesday": ["10:00-11:00", "13:00-14:00", "15:00-16:00"], "Wednesday": ["10:00-11:00", "13:00-14:00", "15:00-16:00"], "Thursday": ["10:00-11:00", "13:00-14:00", "15:00-16:00"], "Friday": ["10:00-11:00", "13:00-14:00", "15:00-16:00"]}', 'Eye care specialist offering comprehensive vision services.'),
('Dr. David Martinez', 'david.martinez@medicalcenter.com', '$2b$12$QIXxB6UNVj0C.EymGBFgk.JD1eT5mZXyv5Sd6.0J4v3dKJbEIwNP6', '+1-555-1008', 'Oncology', 'MD, Medical Oncology', 16, 4.9, 4, 200.00, '["09:00-10:00", "14:00-15:00", "15:00-16:00"]', '["Monday", "Tuesday", "Wednesday", "Thursday"]', '{"Monday": ["09:00-10:00", "14:00-15:00", "15:00-16:00"], "Tuesday": ["09:00-10:00", "14:00-15:00", "15:00-16:00"], "Wednesday": ["09:00-10:00", "14:00-15:00", "15:00-16:00"], "Thursday": ["09:00-10:00", "14:00-15:00", "15:00-16:00"]}', 'Cancer specialist focused on personalized treatment plans.'),
('Dr. Jennifer Lee', 'jennifer.lee@childrenshospital.com', '$2b$12$QIXxB6UNVj0C.EymGBFgk.JD1eT5mZXyv5Sd6.0J4v3dKJbEIwNP6', '+1-555-1009', 'Neonatology', 'MD, FAAP', 13, 4.8, 3, 150.00, '["09:00-10:00", "10:00-11:00"]', '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]', '{"Monday": ["09:00-10:00", "10:00-11:00"], "Tuesday": ["09:00-10:00", "10:00-11:00"], "Wednesday": ["09:00-10:00", "10:00-11:00"], "Thursday": ["09:00-10:00", "10:00-11:00"], "Friday": ["09:00-10:00", "10:00-11:00"]}', 'Neonatal care expert dedicated to newborn health.'),
('Dr. Thomas White', 'thomas.white@communityhc.com', '$2b$12$QIXxB6UNVj0C.EymGBFgk.JD1eT5mZXyv5Sd6.0J4v3dKJbEIwNP6', '+1-555-1010', 'Dentistry', 'DDS', 9, 4.6, 5, 90.00, '["10:00-11:00", "13:00-14:00", "15:00-16:00"]', '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]', '{"Monday": ["10:00-11:00", "13:00-14:00", "15:00-16:00"], "Tuesday": ["10:00-11:00", "13:00-14:00", "15:00-16:00"], "Wednesday": ["10:00-11:00", "13:00-14:00", "15:00-16:00"], "Thursday": ["10:00-11:00", "13:00-14:00", "15:00-16:00"], "Friday": ["10:00-11:00", "13:00-14:00", "15:00-16:00"], "Saturday": ["10:00-11:00", "13:00-14:00"]}', 'General dentist providing preventive and restorative dental care.');

-- ============================================================================
-- SEED: admins
-- ============================================================================
-- NOTE: Password hashes are bcrypt hashes for admin password: admin123
INSERT INTO admins (email, password_hash, name, role, is_active) VALUES
('admin@pocketcare.com', '$2b$12$4jHUCWRU1CGkWN1Yholv/ufx1setSeZJv.HcRfXYhY1P.0BoZhvcm', 'Admin User', 'admin', TRUE)
ON DUPLICATE KEY UPDATE
password_hash = VALUES(password_hash),
name = VALUES(name),
role = VALUES(role),
is_active = VALUES(is_active);

-- ============================================================================
-- SEED: hospital_doctors
-- Hospital-specific doctors managed through Hospital Doctors Management
-- ============================================================================
INSERT INTO hospital_doctors (id, hospital_id, name, email, phone, specialty, qualification, experience, rating, consultation_fee, is_available, bio) VALUES
-- City Hospital (hospital_id = 1)
(1, 1, 'Dr. Sarah Wilson', 'sarah.w@cityhospital.com', '+880 1234567890', 'Cardiology', 'MBBS, MD Cardiology', 12, 4.8, 500.00, TRUE, 'Experienced cardiologist specializing in preventive cardiology and heart disease management.'),
(2, 1, 'Dr. Michael Brown', 'michael.b@cityhospital.com', '+880 1234567891', 'Neurology', 'MBBS, DM Neurology', 15, 4.7, 600.00, TRUE, 'Neurologist with expertise in stroke management and neurodegenerative diseases.'),
(3, 1, 'Dr. Emily Davis', 'emily.d@cityhospital.com', '+880 1234567892', 'Pediatrics', 'MBBS, DCH', 8, 4.9, 400.00, TRUE, 'Pediatrician dedicated to comprehensive child healthcare and development.'),
(4, 1, 'Dr. James Miller', 'james.m@cityhospital.com', '+880 1234567893', 'Orthopedics', 'MBBS, MS Orthopedics', 10, 4.6, 550.00, TRUE, 'Orthopedic surgeon specializing in joint replacement and sports injuries.'),
(5, 1, 'Dr. Lisa Chen', 'lisa.c@cityhospital.com', '+880 1234567894', 'Oncology', 'MBBS, DM Oncology', 14, 4.8, 700.00, TRUE, 'Medical oncologist focused on personalized cancer treatment and care.'),
(6, 1, 'Dr. Robert Kim', 'robert.k@cityhospital.com', '+880 1234567895', 'Emergency Medicine', 'MBBS, DEM', 9, 4.5, 450.00, TRUE, 'Emergency physician with extensive trauma and critical care experience.'),

-- Metro Clinic (hospital_id = 2)
(7, 2, 'Dr. Amanda Taylor', 'amanda.t@metroclinic.com', '+880 2234567890', 'Dermatology', 'MBBS, MD Dermatology', 11, 4.7, 400.00, TRUE, 'Dermatologist specializing in medical and cosmetic dermatology.'),
(8, 2, 'Dr. Daniel Lee', 'daniel.l@metroclinic.com', '+880 2234567891', 'ENT', 'MBBS, MS ENT', 13, 4.6, 450.00, TRUE, 'ENT surgeon with expertise in sinus and throat disorders.'),
(9, 2, 'Dr. Rachel Green', 'rachel.g@metroclinic.com', '+880 2234567892', 'Ophthalmology', 'MBBS, DO', 9, 4.8, 500.00, TRUE, 'Eye specialist offering comprehensive vision care and surgery.'),

-- Children\'s Hospital (hospital_id = 3)
(10, 3, 'Dr. Sofia Martinez', 'sofia.m@childrenshospital.com', '+880 3234567890', 'Pediatrics', 'MBBS, MD Pediatrics', 16, 4.9, 450.00, TRUE, 'Senior pediatrician with special interest in child development and infectious diseases.'),
(11, 3, 'Dr. Benjamin Clark', 'benjamin.c@childrenshospital.com', '+880 3234567891', 'Pediatric Surgery', 'MBBS, MCh Pediatric Surgery', 12, 4.7, 650.00, TRUE, 'Pediatric surgeon specializing in minimally invasive procedures.'),
(12, 3, 'Dr. Olivia White', 'olivia.w@childrenshospital.com', '+880 3234567892', 'Neonatology', 'MBBS, DM Neonatology', 10, 4.8, 600.00, TRUE, 'Neonatologist dedicated to newborn critical care.'),

-- Medical Center (hospital_id = 4)
(13, 4, 'Dr. Andrew Harris', 'andrew.h@medicalcenter.com', '+880 4234567890', 'Neurology', 'MBBS, DM Neurology, PhD', 18, 4.9, 750.00, TRUE, 'Neurologist and researcher specializing in brain disorders and epilepsy.'),
(14, 4, 'Dr. Victoria Adams', 'victoria.a@medicalcenter.com', '+880 4234567891', 'Oncology', 'MBBS, MD Oncology', 15, 4.8, 700.00, TRUE, 'Oncologist with expertise in chemotherapy and immunotherapy.'),
(15, 4, 'Dr. Christopher Moore', 'chris.m@medicalcenter.com', '+880 4234567892', 'Cardiology', 'MBBS, DM Cardiology', 14, 4.7, 650.00, TRUE, 'Interventional cardiologist specializing in angioplasty and stenting.'),

-- Community Health Center (hospital_id = 5)
(16, 5, 'Dr. Jessica Thompson', 'jessica.t@communityhc.com', '+880 5234567890', 'General Medicine', 'MBBS, MD', 10, 4.6, 300.00, TRUE, 'General physician providing comprehensive primary healthcare.'),
(17, 5, 'Dr. William Jackson', 'william.j@communityhc.com', '+880 5234567891', 'General Surgery', 'MBBS, MS General Surgery', 12, 4.5, 500.00, TRUE, 'General surgeon with expertise in laparoscopic procedures.'),
(18, 5, 'Dr. Michelle Robinson', 'michelle.r@communityhc.com', '+880 5234567892', 'Gynecology', 'MBBS, DGO', 11, 4.7, 450.00, TRUE, 'Gynecologist specializing in women\'s reproductive health.')
ON DUPLICATE KEY UPDATE
name = VALUES(name),
email = VALUES(email),
phone = VALUES(phone);

-- ============================================================================
-- SEED: hospital_appointments
-- Sample appointments for hospitals
-- ============================================================================
INSERT INTO hospital_appointments (hospital_id, hospital_doctor_id, patient_name, patient_phone, patient_email, appointment_date, appointment_time, department, appointment_type, priority, status, symptoms, notes) VALUES
-- City Hospital appointments
(1, 1, 'John Smith', '+880 1711111111', 'john.smith@email.com', '2026-01-22', '09:00:00', 'Cardiology', 'Consultation', 'normal', 'confirmed', 'Chest pain and shortness of breath', 'First visit'),
(1, 1, 'Maria Garcia', '+880 1722222222', 'maria.garcia@email.com', '2026-01-22', '10:00:00', 'Cardiology', 'Follow-up', 'normal', 'confirmed', 'Follow-up for hypertension', 'Regular checkup'),
(1, 2, 'Robert Wilson', '+880 1733333333', 'robert.wilson@email.com', '2026-01-22', '14:00:00', 'Neurology', 'Consultation', 'high', 'pending', 'Severe headaches and dizziness', 'Urgent case'),
(1, 3, 'Sarah Johnson', '+880 1744444444', 'sarah.j@email.com', '2026-01-23', '09:00:00', 'Pediatrics', 'Check-up', 'normal', 'confirmed', 'Annual health checkup for 5-year-old', 'Vaccination due'),
(1, 4, 'David Brown', '+880 1755555555', 'david.brown@email.com', '2026-01-23', '10:00:00', 'Orthopedics', 'Consultation', 'high', 'confirmed', 'Knee pain after sports injury', 'X-ray required'),
(1, 5, 'Lisa Anderson', '+880 1766666666', 'lisa.a@email.com', '2026-01-24', '09:00:00', 'Oncology', 'Follow-up', 'urgent', 'confirmed', 'Post-chemotherapy checkup', 'Treatment ongoing'),
(1, 6, 'Michael Lee', '+880 1777777777', 'michael.lee@email.com', '2026-01-21', '15:00:00', 'Emergency Medicine', 'Emergency', 'urgent', 'completed', 'Accident victim - minor injuries', 'Discharged'),

-- Metro Clinic appointments
(2, 7, 'Emma Davis', '+880 1788888888', 'emma.d@email.com', '2026-01-22', '10:00:00', 'Dermatology', 'Consultation', 'normal', 'confirmed', 'Skin rash and itching', 'Allergy suspected'),
(2, 8, 'James Wilson', '+880 1799999999', 'james.w@email.com', '2026-01-22', '11:00:00', 'ENT', 'Follow-up', 'normal', 'confirmed', 'Follow-up for sinus infection', 'Medication review'),
(2, 9, 'Sophia Martinez', '+880 1800000000', 'sophia.m@email.com', '2026-01-23', '14:00:00', 'Ophthalmology', 'Check-up', 'normal', 'pending', 'Vision problems, need glasses', 'Eye test required'),

-- Children\'s Hospital appointments
(3, 10, 'Oliver Taylor', '+880 1811111111', 'parent.taylor@email.com', '2026-01-22', '09:00:00', 'Pediatrics', 'Consultation', 'high', 'confirmed', 'High fever for 3 days', 'Child patient - 7 years old'),
(3, 11, 'Isabella Clark', '+880 1822222222', 'parent.clark@email.com', '2026-01-23', '10:00:00', 'Pediatric Surgery', 'Follow-up', 'normal', 'confirmed', 'Post-surgery checkup', 'Appendectomy recovery'),
(3, 12, 'Baby Jackson', '+880 1833333333', 'parent.jackson@email.com', '2026-01-24', '09:00:00', 'Neonatology', 'Check-up', 'high', 'pending', 'Newborn health assessment', '2 weeks old'),

-- Medical Center appointments
(4, 13, 'William Harris', '+880 1844444444', 'william.h@email.com', '2026-01-22', '10:00:00', 'Neurology', 'Consultation', 'urgent', 'confirmed', 'Seizure episodes', 'MRI scheduled'),
(4, 14, 'Patricia Adams', '+880 1855555555', 'patricia.a@email.com', '2026-01-22', '14:00:00', 'Oncology', 'Follow-up', 'high', 'confirmed', 'Cancer treatment progress review', 'Lab results pending'),
(4, 15, 'Richard Moore', '+880 1866666666', 'richard.m@email.com', '2026-01-23', '09:00:00', 'Cardiology', 'Consultation', 'urgent', 'pending', 'Irregular heartbeat', 'ECG required'),

-- Community Health Center appointments
(5, 16, 'Jennifer Thompson', '+880 1877777777', 'jennifer.t@email.com', '2026-01-22', '09:00:00', 'General Medicine', 'Check-up', 'normal', 'confirmed', 'Routine health checkup', 'Annual physical'),
(5, 17, 'Charles Jackson', '+880 1888888888', 'charles.j@email.com', '2026-01-22', '14:00:00', 'General Surgery', 'Consultation', 'normal', 'pending', 'Hernia evaluation', 'Surgical consultation'),
(5, 18, 'Barbara Robinson', '+880 1899999999', 'barbara.r@email.com', '2026-01-23', '10:00:00', 'Gynecology', 'Follow-up', 'normal', 'confirmed', 'Prenatal checkup', '20 weeks pregnant'),

-- Some cancelled appointments
(1, 1, 'Peter Wilson', '+880 1901111111', 'peter.w@email.com', '2026-01-21', '11:00:00', 'Cardiology', 'Consultation', 'normal', 'cancelled', 'Patient cancelled', 'Rescheduled'),
(2, 7, 'Nancy Brown', '+880 1912222222', 'nancy.b@email.com', '2026-01-21', '15:00:00', 'Dermatology', 'Consultation', 'low', 'cancelled', 'Doctor unavailable', 'Will reschedule');

-- ============================================================================
-- Note: User accounts should be created through the registration API
-- The seed data above is for doctors, hospitals, and admins only
-- Bed ward data should be managed through the Hospital Bed Management UI
-- Admin email: admin@pocketcare.com
-- Admin password: admin123
-- ============================================================================
