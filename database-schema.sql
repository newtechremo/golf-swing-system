-- Golf Swing System Database Schema
-- Based on REMO API responses and SPPB system structure

-- ==========================================
-- Centers Table (센터 정보)
-- ==========================================
CREATE TABLE centers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    address VARCHAR(500),
    contact VARCHAR(50),
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_code (code),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- Users Table (유저 정보 - HP 로그인 기반)
-- ==========================================
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    center_id INT NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    birth_date DATE,
    gender ENUM('M', 'F', 'Other'),
    height DECIMAL(5,2), -- cm
    weight DECIMAL(5,2), -- kg
    email VARCHAR(255),
    status ENUM('active', 'inactive', 'deleted') DEFAULT 'active',
    last_login_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (center_id) REFERENCES centers(id),
    INDEX idx_phone (phone_number),
    INDEX idx_center (center_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- Golf Swing Analyses Table (골프 스윙 분석)
-- ==========================================
CREATE TABLE golf_swing_analyses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    uuid VARCHAR(100) UNIQUE NOT NULL,

    -- 기본 정보
    analysis_date DATE NOT NULL,
    height VARCHAR(10), -- 분석 시 입력한 키
    video_url VARCHAR(500),
    video_s3_key VARCHAR(500),

    -- 분석 상태
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    wait_time INT, -- 초 단위
    credit_used INT,

    -- 메모
    memo TEXT,

    -- 시스템 정보
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_user_date (user_id, analysis_date),
    INDEX idx_uuid (uuid),
    INDEX idx_status (status),
    INDEX idx_analysis_date (analysis_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- Golf Swing Results Table (골프 스윙 분석 결과)
-- ==========================================
CREATE TABLE golf_swing_results (
    id INT PRIMARY KEY AUTO_INCREMENT,
    analysis_id INT NOT NULL UNIQUE,

    -- Address Phase (어드레스 자세)
    address_frame INT,
    address_stance DECIMAL(10,3), -- AnkleShoulderRatio
    address_upper_body_tilt DECIMAL(10,3), -- HipNeckRatio (degree)
    address_shoulder_tilt DECIMAL(10,3), -- UpperBody z-axis (degree)
    address_head_location DECIMAL(10,3),

    -- Takeback Phase (테이크백)
    takeback_frame INT,
    takeback_left_shoulder_rotation DECIMAL(10,3), -- degree
    takeback_right_hip_rotation DECIMAL(10,3), -- degree
    takeback_left_arm_flexion DECIMAL(10,3), -- LeftElbow x-axis (degree)
    takeback_right_arm_flexion DECIMAL(10,3), -- RightElbow x-axis (degree)

    -- Backswing Phase (백스윙)
    backswing_frame INT,
    backswing_head_location DECIMAL(10,3),
    backswing_left_shoulder_rotation DECIMAL(10,3), -- degree
    backswing_left_arm_flexion DECIMAL(10,3), -- degree

    -- Backswing Top (백스윙 탑)
    backswing_top_frame INT,
    backswing_top_reverse_spine DECIMAL(10,3), -- -Spine2 x-axis
    backswing_top_right_hip_rotation DECIMAL(10,3), -- degree
    backswing_top_right_leg_flexion DECIMAL(10,3), -- RightKnee x-axis (degree)
    backswing_top_center_of_gravity DECIMAL(10,3), -- AnkleHipRatio

    -- Downswing Phase (다운스윙)
    downswing_frame INT,
    downswing_left_shoulder_rotation DECIMAL(10,3),
    downswing_right_hip_rotation DECIMAL(10,3),
    downswing_left_arm_flexion DECIMAL(10,3),

    -- Impact (임팩트)
    impact_frame INT,
    impact_head_location DECIMAL(10,3),
    impact_left_arm_flexion DECIMAL(10,3),
    impact_hip_rotation DECIMAL(10,3),

    -- Follow-through (팔로우스루)
    followthrough_frame INT,
    followthrough_hip_rotation DECIMAL(10,3),
    followthrough_shoulder_rotation DECIMAL(10,3),

    -- Finish (피니시)
    finish_frame INT,
    finish_center_of_gravity DECIMAL(10,3),
    finish_upper_body_tilt DECIMAL(10,3),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (analysis_id) REFERENCES golf_swing_analyses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- Golf Swing Angles Table (골프 스윙 각도 데이터)
-- ==========================================
CREATE TABLE golf_swing_angles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    analysis_id INT NOT NULL UNIQUE,

    -- 각도 데이터는 JSON으로 저장 (프레임별 x, y, z 축 데이터)
    knee_line_data JSON, -- [[x, y, z], ...] 형태
    pelvis_data JSON, -- [[x, y, z], ...] 형태
    shoulder_line_data JSON, -- [[x, y, z], ...] 형태

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (analysis_id) REFERENCES golf_swing_analyses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- Body Posture Analyses Table (체형 분석)
-- ==========================================
CREATE TABLE body_posture_analyses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,

    -- 기본 정보
    analysis_date DATE NOT NULL,

    -- 이미지 정보
    front_image_url VARCHAR(500),
    front_image_s3_key VARCHAR(500),
    side_image_url VARCHAR(500),
    side_image_s3_key VARCHAR(500),
    back_image_url VARCHAR(500),
    back_image_s3_key VARCHAR(500),

    -- 분석 상태
    front_status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
    side_status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
    back_status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',

    -- REMO API UUIDs
    front_uuid VARCHAR(100),
    side_uuid VARCHAR(100),
    back_uuid VARCHAR(100),

    -- 메모
    memo TEXT,

    -- 시스템 정보
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_user_date (user_id, analysis_date),
    INDEX idx_analysis_date (analysis_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- Front Posture Results Table (정면 체형 분석 결과)
-- ==========================================
CREATE TABLE front_posture_results (
    id INT PRIMARY KEY AUTO_INCREMENT,
    posture_analysis_id INT NOT NULL,

    -- 측정 값 (degree)
    head_balance_value DECIMAL(10,3),
    head_balance_grade INT,

    pelvic_balance_value DECIMAL(10,3),
    pelvic_balance_grade INT,

    shoulder_balance_value DECIMAL(10,3),
    shoulder_balance_grade INT,

    knee_balance_value DECIMAL(10,3),
    knee_balance_grade INT,

    body_tilt_value DECIMAL(10,3),
    body_tilt_grade INT,

    left_leg_qangle_value DECIMAL(10,3), -- Q-angle (valgus)
    left_leg_qangle_grade INT,

    right_leg_qangle_value DECIMAL(10,3),
    right_leg_qangle_grade INT,

    -- 좌표 데이터 (JSON)
    skeleton_coords JSON,

    -- 결과 이미지
    result_image_url VARCHAR(500),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (posture_analysis_id) REFERENCES body_posture_analyses(id) ON DELETE CASCADE,
    INDEX idx_posture_analysis (posture_analysis_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- Side Posture Results Table (측면 체형 분석 결과)
-- ==========================================
CREATE TABLE side_posture_results (
    id INT PRIMARY KEY AUTO_INCREMENT,
    posture_analysis_id INT NOT NULL,

    -- 측정 값 (degree)
    round_shoulder_value DECIMAL(10,3),
    round_shoulder_grade INT, -- 0: normal, 1: caution, 2: risk

    turtle_neck_value DECIMAL(10,3),
    turtle_neck_grade INT,

    head_tilt_value DECIMAL(10,3),
    head_tilt_grade INT, -- -2 to 2

    body_tilt_value DECIMAL(10,3),
    body_tilt_grade INT,

    -- 좌표 데이터 (JSON)
    skeleton_coords JSON,

    -- 결과 이미지
    result_image_url VARCHAR(500),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (posture_analysis_id) REFERENCES body_posture_analyses(id) ON DELETE CASCADE,
    INDEX idx_posture_analysis (posture_analysis_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- Back Posture Results Table (후면 체형 분석 결과)
-- ==========================================
CREATE TABLE back_posture_results (
    id INT PRIMARY KEY AUTO_INCREMENT,
    posture_analysis_id INT NOT NULL,

    -- 측정 값 (degree)
    head_balance_value DECIMAL(10,3),
    head_balance_grade INT,

    pelvic_balance_value DECIMAL(10,3),
    pelvic_balance_grade INT,

    shoulder_balance_value DECIMAL(10,3),
    shoulder_balance_grade INT,

    knee_balance_value DECIMAL(10,3),
    knee_balance_grade INT,

    body_tilt_value DECIMAL(10,3),
    body_tilt_grade INT,

    left_leg_qangle_value DECIMAL(10,3),
    left_leg_qangle_grade INT,

    right_leg_qangle_value DECIMAL(10,3),
    right_leg_qangle_grade INT,

    -- 좌표 데이터 (JSON)
    skeleton_coords JSON,

    -- 결과 이미지
    result_image_url VARCHAR(500),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (posture_analysis_id) REFERENCES body_posture_analyses(id) ON DELETE CASCADE,
    INDEX idx_posture_analysis (posture_analysis_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- Admins Table (관리자)
-- ==========================================
CREATE TABLE admins (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    role ENUM('super_admin', 'center_admin') DEFAULT 'center_admin',
    center_id INT NULL, -- center_admin인 경우 특정 센터와 연결
    status ENUM('active', 'inactive') DEFAULT 'active',
    last_login_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (center_id) REFERENCES centers(id),
    INDEX idx_username (username),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- Notices Table (공지사항)
-- ==========================================
CREATE TABLE notices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    author_id INT NOT NULL,
    priority ENUM('low', 'normal', 'high') DEFAULT 'normal',
    status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
    published_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES admins(id),
    INDEX idx_status (status),
    INDEX idx_published_at (published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- Notice Reads Table (공지사항 읽음 표시)
-- ==========================================
CREATE TABLE notice_reads (
    id INT PRIMARY KEY AUTO_INCREMENT,
    notice_id INT NOT NULL,
    user_id INT NOT NULL,
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (notice_id) REFERENCES notices(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_notice_user (notice_id, user_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- Initial Data
-- ==========================================

-- 기본 센터 생성
INSERT INTO centers (name, code, address, contact, status) VALUES
('테스트 센터', 'TEST001', '서울시 강남구', '02-1234-5678', 'active');

-- 기본 관리자 생성 (비밀번호: admin123)
INSERT INTO admins (username, password_hash, name, email, role, status) VALUES
('admin', '$2b$10$YourHashedPasswordHere', '시스템 관리자', 'admin@example.com', 'super_admin', 'active');
