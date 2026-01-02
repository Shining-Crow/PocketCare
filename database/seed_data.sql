-- ============================================================================
-- POCKETCARE SEED DATA
-- Sample data for testing and development
-- ============================================================================

USE pocketcare_db;

-- ============================================================================
-- SEED: hospitals
-- ============================================================================
INSERT INTO hospitals (name, address, city, state, latitude, longitude, phone, email, emergency_contact, total_beds, available_beds, icu_beds, services, rating) VALUES
('City Hospital', '123 Main Street, Downtown', 'New York', 'NY', 40.7128, -74.0060, '+1-555-0101', 'info@cityhospital.com', '+1-555-0199', 200, 45, 20, '["Cardiology", "Orthopedics", "Emergency", "Surgery"]', 4.8),
('Metro Clinic', '456 Park Avenue, Midtown', 'New York', 'NY', 40.7589, -73.9851, '+1-555-0201', 'contact@metroclinic.com', '+1-555-0299', 100, 25, 10, '["Dermatology", "ENT", "Ophthalmology", "General Medicine"]', 4.9),
('Children\'s Hospital', '789 Oak Road, North District', 'New York', 'NY', 40.8000, -73.9500, '+1-555-0301', 'info@childrenshospital.com', '+1-555-0399', 150, 30, 15, '["Pediatrics", "Neonatology", "Child Surgery"]', 4.7),
('Medical Center', '321 West Boulevard', 'New York', 'NY', 40.7500, -74.0200, '+1-555-0401', 'contact@medicalcenter.com', '+1-555-0499', 250, 60, 25, '["Neurology", "Oncology", "Surgery", "ICU"]', 4.8),
('Community Health Center', '654 East Street', 'New York', 'NY', 40.7200, -73.9800, '+1-555-0501', 'info@communityhc.com', '+1-555-0599', 80, 20, 5, '["General Medicine", "Dental", "Physiotherapy"]', 4.5);

-- ============================================================================
-- SEED: doctors
-- ============================================================================
INSERT INTO doctors (name, email, phone, specialty, qualification, experience, rating, hospital_id, consultation_fee, available_slots, bio) VALUES
('Dr. Sarah Johnson', 'sarah.johnson@cityhospital.com', '+1-555-1001', 'Cardiology', 'MD, FACC', 15, 4.8, 1, 150.00, '["09:00-10:00", "10:00-11:00", "14:00-15:00", "15:00-16:00"]', 'Experienced cardiologist specializing in heart disease prevention and treatment.'),
('Dr. Michael Chen', 'michael.chen@metroclinic.com', '+1-555-1002', 'Dermatology', 'MD, Board Certified', 10, 4.9, 2, 120.00, '["10:00-11:00", "11:00-12:00", "15:00-16:00", "16:00-17:00"]', 'Skin specialist with expertise in both medical and cosmetic dermatology.'),
('Dr. Emily Rodriguez', 'emily.rodriguez@childrenshospital.com', '+1-555-1003', 'Pediatrics', 'MD, FAAP', 12, 4.7, 3, 100.00, '["09:00-10:00", "10:00-11:00", "13:00-14:00", "14:00-15:00"]', 'Compassionate pediatrician dedicated to child health and development.'),
('Dr. James Williams', 'james.williams@communityhc.com', '+1-555-1004', 'General Practice', 'MD, Family Medicine', 8, 4.5, 5, 80.00, '["09:00-10:00", "11:00-12:00", "14:00-15:00", "16:00-17:00"]', 'General practitioner providing comprehensive primary care services.'),
('Dr. Priya Patel', 'priya.patel@medicalcenter.com', '+1-555-1005', 'Neurology', 'MD, PhD, Neuroscience', 18, 4.8, 4, 180.00, '["10:00-11:00", "11:00-12:00", "15:00-16:00"]', 'Neurologist specializing in brain and nervous system disorders.'),
('Dr. Robert Brown', 'robert.brown@cityhospital.com', '+1-555-1006', 'Orthopedics', 'MD, Orthopedic Surgery', 14, 4.6, 1, 160.00, '["09:00-10:00", "10:00-11:00", "14:00-15:00"]', 'Orthopedic surgeon expert in joint replacement and sports injuries.'),
('Dr. Lisa Anderson', 'lisa.anderson@metroclinic.com', '+1-555-1007', 'Ophthalmology', 'MD, Eye Surgery', 11, 4.7, 2, 130.00, '["10:00-11:00", "13:00-14:00", "15:00-16:00"]', 'Eye care specialist offering comprehensive vision services.'),
('Dr. David Martinez', 'david.martinez@medicalcenter.com', '+1-555-1008', 'Oncology', 'MD, Medical Oncology', 16, 4.9, 4, 200.00, '["09:00-10:00", "14:00-15:00", "15:00-16:00"]', 'Cancer specialist focused on personalized treatment plans.'),
('Dr. Jennifer Lee', 'jennifer.lee@childrenshospital.com', '+1-555-1009', 'Neonatology', 'MD, FAAP', 13, 4.8, 3, 150.00, '["09:00-10:00", "10:00-11:00"]', 'Neonatal care expert dedicated to newborn health.'),
('Dr. Thomas White', 'thomas.white@communityhc.com', '+1-555-1010', 'Dentistry', 'DDS', 9, 4.6, 5, 90.00, '["10:00-11:00", "13:00-14:00", "15:00-16:00"]', 'General dentist providing preventive and restorative dental care.');

-- ============================================================================
-- SEED: admins
-- ============================================================================
-- NOTE: Password hashes are bcrypt hashes for admin password: admin123
INSERT INTO admins (email, password_hash, name, role, is_active) VALUES
('admin@pocketcare.com', '$2b$12$4jHUCWRU1CGkWN1Yholv/ufx1setSeZJv.HcRfXYhY1P.0BoZhvcm', 'Admin User', 'admin', TRUE);

-- ============================================================================
-- Note: User accounts should be created through the registration API
-- The seed data above is for doctors, hospitals, and admins only
-- Admin email: admin@pocketcare.com
-- Admin password: admin123
