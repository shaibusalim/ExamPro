-- Seed B7 & B8 Computing Topics with GES Curriculum alignment
INSERT INTO topics (title, description, class_level, learning_outcomes, week_number) VALUES
-- B7 Topics
('Introduction to Computers', 'Understanding computer basics, hardware and software', 'B7', 'Define computer and identify its components; Distinguish between hardware and software', 1),
('Computer Hardware', 'Study of computer components and peripherals', 'B7', 'Identify and describe computer hardware components', 2),
('Operating Systems', 'Introduction to operating systems and their functions', 'B7', 'Explain functions of operating systems; Use basic OS features', 3),
('File Management', 'Managing files and folders in an operating system', 'B7', 'Create, copy, move, and delete files; Organize folders', 4),
('Introduction to the Internet', 'Basics of internet connectivity and web browsers', 'B7', 'Explain internet concepts; Use web browsers effectively', 5),
('Email and Communication', 'Electronic mail and online communication tools', 'B7', 'Send and receive emails; Use online communication platforms', 6),
('Word Processing Basics', 'Introduction to word processing software', 'B7', 'Create, format, and save documents', 7),
('Presentation Software', 'Creating presentations and slideshows', 'B7', 'Design and deliver effective presentations', 8),

-- B8 Topics
('Advanced Computer Systems', 'Deep dive into computer architecture and networks', 'B8', 'Analyze computer system components; Understand network architecture', 1),
('Data Types and Variables', 'Programming fundamentals: data types and variables', 'B8', 'Declare and use variables; Understand data types', 2),
('Control Structures', 'Conditional statements and loops in programming', 'B8', 'Use if-else statements; Implement loops', 3),
('Functions and Procedures', 'Creating reusable code blocks', 'B8', 'Define and call functions; Pass parameters', 4),
('Introduction to Databases', 'Database concepts and basic SQL queries', 'B8', 'Understand databases; Write basic SQL', 5),
('Web Development Basics', 'HTML, CSS basics for web development', 'B8', 'Create simple web pages; Style with CSS', 6),
('Graphics and Multimedia', 'Working with images, audio, and video', 'B8', 'Manipulate multimedia files; Understand compression', 7),
('Cybersecurity Basics', 'Internet safety and security concepts', 'B8', 'Understand threats; Practice safe computing', 8);

-- Fixed ambiguous column reference by explicitly qualifying table names in JOINs
-- Insert sample questions for B7 Topic 1
INSERT INTO questions (topic_id, question_text, question_type, difficulty_level, marks, correct_answer, created_by) 
SELECT t.id, 'What is a computer?', 'mcq', 1, 1, 'An electronic device that processes data', u.id 
FROM topics t, users u WHERE t.title = 'Introduction to Computers' AND u.role = 'teacher' LIMIT 1;

-- Using table alias to qualify question_id
INSERT INTO question_options (question_id, option_text, option_order, is_correct) 
SELECT q.id, 'An electronic device that processes data', 1, TRUE 
FROM questions q WHERE q.question_text = 'What is a computer?' LIMIT 1;

INSERT INTO question_options (question_id, option_text, option_order, is_correct) 
SELECT q.id, 'A device used only for gaming', 2, FALSE 
FROM questions q WHERE q.question_text = 'What is a computer?' LIMIT 1;

INSERT INTO question_options (question_id, option_text, option_order, is_correct) 
SELECT q.id, 'A printer used in offices', 3, FALSE 
FROM questions q WHERE q.question_text = 'What is a computer?' LIMIT 1;

INSERT INTO question_options (question_id, option_text, option_order, is_correct) 
SELECT q.id, 'A telephone device', 4, FALSE 
FROM questions q WHERE q.question_text = 'What is a computer?' LIMIT 1;
