-- Golf Swing System - Database Reset Script
-- TypeORM synchronize will recreate tables based on Entity definitions
-- Run this script to clean existing tables and prepare for fresh start

-- ==========================================
-- Step 1: Drop all existing tables
-- ==========================================

SET FOREIGN_KEY_CHECKS = 0;

-- Drop tables in correct order (dependencies first)
DROP TABLE IF EXISTS notice_reads;
DROP TABLE IF EXISTS notices;
DROP TABLE IF EXISTS back_posture_results;
DROP TABLE IF EXISTS side_posture_results;
DROP TABLE IF EXISTS front_posture_results;
DROP TABLE IF EXISTS body_posture_analyses;
DROP TABLE IF EXISTS golf_swing_angles;
DROP TABLE IF EXISTS golf_swing_results;
DROP TABLE IF EXISTS golf_swing_analyses;
DROP TABLE IF EXISTS swing_types;
DROP TABLE IF EXISTS subjects;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS admins;
DROP TABLE IF EXISTS centers;

SET FOREIGN_KEY_CHECKS = 1;

-- ==========================================
-- Step 2: TypeORM will create tables on app start
-- Just need to add initial data after app starts
-- ==========================================

SELECT 'All tables dropped. Start backend to create new tables via TypeORM synchronize.' AS message;
