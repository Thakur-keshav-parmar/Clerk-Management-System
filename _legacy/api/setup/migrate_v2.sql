-- Migration v2: Add DOB + new roll number format (EYYMM-NNNN)
-- Run against coaching_db (live) and coaching_db_test (test)

-- Live DB
USE coaching_db;
ALTER TABLE students MODIFY COLUMN id VARCHAR(15);
ALTER TABLE students ADD COLUMN IF NOT EXISTS dob DATE DEFAULT NULL AFTER course;
SELECT 'coaching_db migration v2 done' AS result;

-- Test DB
USE coaching_db_test;
ALTER TABLE students MODIFY COLUMN id VARCHAR(15);
ALTER TABLE students ADD COLUMN IF NOT EXISTS dob DATE DEFAULT NULL AFTER course;
SELECT 'coaching_db_test migration v2 done' AS result;
