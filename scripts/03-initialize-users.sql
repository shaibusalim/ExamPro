-- Insert sample teacher account
INSERT INTO users (email, password_hash, full_name, role, created_at) 
VALUES ('teacher@example.com', '$2b$10$sample.hash.here', 'Mr. Kwame Mensah', 'teacher', CURRENT_TIMESTAMP)
ON CONFLICT (email) DO NOTHING;

-- Insert sample B7 student accounts
INSERT INTO users (email, password_hash, full_name, role, class_level, student_id, created_at) 
VALUES 
  ('student1@example.com', '$2b$10$sample.hash.here', 'Ama Osei', 'student', 'B7', 'B7001', CURRENT_TIMESTAMP),
  ('student2@example.com', '$2b$10$sample.hash.here', 'Kofi Asante', 'student', 'B7', 'B7002', CURRENT_TIMESTAMP)
ON CONFLICT (email) DO NOTHING;

-- Insert sample B8 student accounts
INSERT INTO users (email, password_hash, full_name, role, class_level, student_id, created_at) 
VALUES 
  ('student3@example.com', '$2b$10$sample.hash.here', 'Abena Boateng', 'student', 'B8', 'B8001', CURRENT_TIMESTAMP),
  ('student4@example.com', '$2b$10$sample.hash.here', 'Yaw Mensah', 'student', 'B8', 'B8002', CURRENT_TIMESTAMP)
ON CONFLICT (email) DO NOTHING;
