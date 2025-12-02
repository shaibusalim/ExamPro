-- Create ENUM types for status
DROP TYPE IF EXISTS user_role CASCADE;
CREATE TYPE user_role AS ENUM ('teacher', 'student', 'admin');
DROP TYPE IF EXISTS exam_status CASCADE;
CREATE TYPE exam_status AS ENUM ('draft', 'published', 'active', 'closed');
DROP TYPE IF EXISTS question_type CASCADE;
CREATE TYPE question_type AS ENUM ('mcq', 'true_false', 'fill_blank', 'essay');
DROP TYPE IF EXISTS class_level CASCADE;
CREATE TYPE class_level AS ENUM ('B7', 'B8');

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role user_role NOT NULL,
  class_level class_level,
  student_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- Classes table
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  level class_level NOT NULL,
  teacher_id UUID NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Student enrollment
CREATE TABLE IF NOT EXISTS class_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL,
  student_id UUID NOT NULL,
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(class_id, student_id),
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Topics (B7 & B8 Computing Curriculum)
CREATE TABLE IF NOT EXISTS topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  class_level class_level NOT NULL,
  learning_outcomes TEXT,
  week_number INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL,
  question_text TEXT NOT NULL,
  question_type question_type NOT NULL,
  difficulty_level INT DEFAULT 1,
  marks INT DEFAULT 1,
  correct_answer TEXT,
  explanation TEXT,
  is_published BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Question options (for MCQ and True/False)
CREATE TABLE IF NOT EXISTS question_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL,
  option_text TEXT NOT NULL,
  option_order INT,
  is_correct BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- Exams table
CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status exam_status DEFAULT 'draft',
  duration_minutes INT NOT NULL,
  total_marks INT DEFAULT 100,
  passing_marks INT DEFAULT 50,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  show_answers BOOLEAN DEFAULT FALSE,
  shuffle_questions BOOLEAN DEFAULT TRUE,
  shuffle_options BOOLEAN DEFAULT TRUE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Exam questions mapping
CREATE TABLE IF NOT EXISTS exam_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL,
  question_id UUID NOT NULL,
  order_number INT,
  marks INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- Student exam attempts
CREATE TABLE IF NOT EXISTS exam_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL,
  student_id UUID NOT NULL,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  submitted_at TIMESTAMP,
  score INT,
  total_marks INT,
  percentage DECIMAL(5,2),
  status VARCHAR(50) DEFAULT 'in_progress',
  is_flagged BOOLEAN DEFAULT FALSE,
  tab_switches INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(exam_id, student_id),
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Student responses to questions
CREATE TABLE IF NOT EXISTS student_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_attempt_id UUID NOT NULL,
  question_id UUID NOT NULL,
  selected_option_id UUID,
  text_response TEXT,
  is_answered BOOLEAN DEFAULT FALSE,
  is_correct BOOLEAN,
  marks_awarded INT,
  teacher_feedback TEXT,
  marked_at TIMESTAMP,
  marked_by UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (exam_attempt_id) REFERENCES exam_attempts(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
  FOREIGN KEY (selected_option_id) REFERENCES question_options(id) ON DELETE SET NULL,
  FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Activity logs for security/audit
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action VARCHAR(255) NOT NULL,
  description TEXT,
  exam_id UUID,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE SET NULL
);

-- Create indexes for performance
DROP INDEX IF EXISTS idx_users_email;
CREATE INDEX idx_users_email ON users(email);
DROP INDEX IF EXISTS idx_users_role;
CREATE INDEX idx_users_role ON users(role);
DROP INDEX IF EXISTS idx_classes_teacher;
CREATE INDEX idx_classes_teacher ON classes(teacher_id);
DROP INDEX IF EXISTS idx_class_enrollments_student;
CREATE INDEX idx_class_enrollments_student ON class_enrollments(student_id);
DROP INDEX IF EXISTS idx_questions_topic;
CREATE INDEX idx_questions_topic ON questions(topic_id);
DROP INDEX IF EXISTS idx_exam_questions_exam;
CREATE INDEX idx_exam_questions_exam ON exam_questions(exam_id);
DROP INDEX IF EXISTS idx_exam_attempts_student;
CREATE INDEX idx_exam_attempts_student ON exam_attempts(student_id);
DROP INDEX IF EXISTS idx_exam_attempts_exam;
CREATE INDEX idx_exam_attempts_exam ON exam_attempts(exam_id);
DROP INDEX IF EXISTS idx_student_responses_attempt;
CREATE INDEX idx_student_responses_attempt ON student_responses(exam_attempt_id);
DROP INDEX IF EXISTS idx_activity_logs_user;
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
DROP INDEX IF EXISTS idx_activity_logs_created;
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at);
