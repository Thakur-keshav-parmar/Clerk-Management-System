-- Migration: Simplify student form + switch to monthly/yearly fees
USE coaching_db;

-- 1. Courses: add monthly_fee, yearly_fee; remove semesters
ALTER TABLE courses
  ADD COLUMN monthly_fee INT NOT NULL DEFAULT 0,
  ADD COLUMN yearly_fee  INT NOT NULL DEFAULT 0;

ALTER TABLE courses DROP COLUMN semesters;

-- 2. Drop semester-based fee and subjects tables
DROP TABLE IF EXISTS course_fees;
DROP TABLE IF EXISTS course_subjects;

-- 3. Students: add simplified columns
ALTER TABLE students
  ADD COLUMN contact       VARCHAR(15) NOT NULL DEFAULT '',
  ADD COLUMN address       TEXT        NOT NULL DEFAULT '',
  ADD COLUMN fee_type      VARCHAR(10) NOT NULL DEFAULT 'monthly',
  ADD COLUMN waiver_amount INT         NOT NULL DEFAULT 0,
  ADD COLUMN admission_date DATE       NOT NULL DEFAULT '2026-01-01';

-- 4. Students: drop removed columns
ALTER TABLE students
  DROP COLUMN IF EXISTS semester,
  DROP COLUMN IF EXISTS batch,
  DROP COLUMN IF EXISTS mother_name,
  DROP COLUMN IF EXISTS dob,
  DROP COLUMN IF EXISTS gender,
  DROP COLUMN IF EXISTS blood_group,
  DROP COLUMN IF EXISTS marital_status,
  DROP COLUMN IF EXISTS category,
  DROP COLUMN IF EXISTS sub_category,
  DROP COLUMN IF EXISTS caste,
  DROP COLUMN IF EXISTS seat_category,
  DROP COLUMN IF EXISTS postmatric,
  DROP COLUMN IF EXISTS tuition_waiver,
  DROP COLUMN IF EXISTS annual_income,
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS house_no,
  DROP COLUMN IF EXISTS street,
  DROP COLUMN IF EXISTS area,
  DROP COLUMN IF EXISTS city,
  DROP COLUMN IF EXISTS pin,
  DROP COLUMN IF EXISTS district,
  DROP COLUMN IF EXISTS state,
  DROP COLUMN IF EXISTS country,
  DROP COLUMN IF EXISTS c_house_no,
  DROP COLUMN IF EXISTS c_street,
  DROP COLUMN IF EXISTS c_area,
  DROP COLUMN IF EXISTS c_city,
  DROP COLUMN IF EXISTS c_pin,
  DROP COLUMN IF EXISTS c_district,
  DROP COLUMN IF EXISTS c_state,
  DROP COLUMN IF EXISTS c_country,
  DROP COLUMN IF EXISTS signature,
  DROP COLUMN IF EXISTS academics;

-- 5. Payments: drop semester column
ALTER TABLE payments DROP COLUMN IF EXISTS semester;

SELECT 'Migration complete!' AS result;
