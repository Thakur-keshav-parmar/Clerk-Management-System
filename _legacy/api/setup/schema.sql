-- IT Coaching Institute — MySQL Schema (fresh install)
-- Run once: mysql -u root -p < setup/schema.sql

CREATE DATABASE IF NOT EXISTS coaching_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE coaching_db;

-- Users
CREATE TABLE IF NOT EXISTS users (
    username      VARCHAR(50) PRIMARY KEY,
    password_hash CHAR(64)    NOT NULL,
    name          VARCHAR(100) NOT NULL,
    role          ENUM('admin','teacher') NOT NULL DEFAULT 'teacher'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Courses
CREATE TABLE IF NOT EXISTS courses (
    code        VARCHAR(20)  PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    duration    INT          NOT NULL DEFAULT 1,
    monthly_fee INT          NOT NULL DEFAULT 0,
    yearly_fee  INT          NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Students
CREATE TABLE IF NOT EXISTS students (
    id             VARCHAR(15)  PRIMARY KEY,
    name           VARCHAR(100) NOT NULL,
    course         VARCHAR(20)  NOT NULL,
    dob            DATE         DEFAULT NULL,
    contact        VARCHAR(15)  DEFAULT '',
    address        TEXT         DEFAULT '',
    father_name    VARCHAR(100) DEFAULT '',
    father_mobile  VARCHAR(15)  DEFAULT '',
    aadhaar        VARCHAR(20)  DEFAULT '',
    photo          LONGTEXT     DEFAULT NULL,
    fee_type       VARCHAR(10)  NOT NULL DEFAULT 'monthly',
    waiver_amount  INT          NOT NULL DEFAULT 0,
    total_fees     INT          NOT NULL DEFAULT 0,
    paid           INT          NOT NULL DEFAULT 0,
    due            INT          NOT NULL DEFAULT 0,
    fee_confirmed  TINYINT(1)   NOT NULL DEFAULT 1,
    installments   JSON,
    admission_date DATE         NOT NULL,
    status         VARCHAR(10)  NOT NULL DEFAULT 'active',
    created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_course (course)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Payments
CREATE TABLE IF NOT EXISTS payments (
    txn_id       VARCHAR(20)  PRIMARY KEY,
    student_id   VARCHAR(15)  DEFAULT NULL,
    student_name VARCHAR(100) NOT NULL,
    course       VARCHAR(20)  NOT NULL,
    amount       INT          NOT NULL,
    method       VARCHAR(20)  DEFAULT 'Cash',
    date         DATE         NOT NULL,
    display_time VARCHAR(20)  NOT NULL,
    time_iso     VARCHAR(35)  NOT NULL,
    status       VARCHAR(20)  DEFAULT 'Paid',
    INDEX idx_student (student_id),
    INDEX idx_date    (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
