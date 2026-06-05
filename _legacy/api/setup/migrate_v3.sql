-- Migration v3: add left_date column to students
USE coaching_db;
ALTER TABLE students ADD COLUMN IF NOT EXISTS left_date DATE DEFAULT NULL;
