-- 智能行程规划系统数据库设计
-- 支持用户管理、行程规划、票务导入、提醒推送等功能

-- 用户表
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(32) NOT NULL,
    full_name VARCHAR(100),
    phone VARCHAR(20),
    avatar_url VARCHAR(255),
    timezone VARCHAR(50) DEFAULT 'Asia/Shanghai',
    language VARCHAR(10) DEFAULT 'zh-CN',
    preferences JSON, -- 用户偏好设置
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP NULL,
    last_login_ip VARCHAR(45),

    INDEX idx_email (email),
    INDEX idx_username (username),
    INDEX idx_status (status)
);

-- 用户会话表
CREATE TABLE user_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE,
    device_info JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_session_token (session_token),
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at)
);

-- 行程表
CREATE TABLE trips (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status ENUM('planning', 'confirmed', 'ongoing', 'completed', 'cancelled') DEFAULT 'planning',
    total_cost DECIMAL(10,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'CNY',
    cover_image_url VARCHAR(255),
    is_public BOOLEAN DEFAULT FALSE,
    share_token VARCHAR(64),
    metadata JSON, -- 存储额外的行程元数据
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_start_date (start_date),
    INDEX idx_status (status),
    INDEX idx_share_token (share_token)
);

-- 行程项目表（每个行程的具体项目）
CREATE TABLE trip_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    trip_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    item_type ENUM('transport', 'accommodation', 'activity', 'meal', 'attraction', 'other') NOT NULL,
    start_datetime DATETIME NOT NULL,
    end_datetime DATETIME,
    location_name VARCHAR(200),
    location_address TEXT,
    location_coordinates POINT, -- 经纬度坐标
    cost DECIMAL(10,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'CNY',
    booking_reference VARCHAR(100),
    booking_status ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending',
    notes TEXT,
    attachments JSON, -- 存储相关文件URL等
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
    INDEX idx_trip_id (trip_id),
    INDEX idx_start_datetime (start_datetime),
    INDEX idx_item_type (item_type),
    INDEX idx_sort_order (sort_order),
    SPATIAL INDEX idx_location (location_coordinates)
);

-- 交通工具详细信息表
CREATE TABLE transportation_details (
    id INT PRIMARY KEY AUTO_INCREMENT,
    trip_item_id INT NOT NULL,
    transport_type ENUM('flight', 'train', 'bus', 'car', 'ship', 'subway', 'taxi', 'other') NOT NULL,
    carrier_name VARCHAR(100), -- 承运商（航空公司、铁路等）
    flight_number VARCHAR(20), -- 航班号/车次号
    departure_airport_code VARCHAR(10),
    arrival_airport_code VARCHAR(10),
    departure_terminal VARCHAR(10),
    arrival_terminal VARCHAR(10),
    departure_gate VARCHAR(10),
    arrival_gate VARCHAR(10),
    seat_number VARCHAR(20),
    class_type VARCHAR(20), -- 舱位等级
    check_in_url VARCHAR(255),
    booking_confirmation VARCHAR(100),

    FOREIGN KEY (trip_item_id) REFERENCES trip_items(id) ON DELETE CASCADE,
    INDEX idx_flight_number (flight_number),
    INDEX idx_transport_type (transport_type)
);

-- 住宿详细信息表
CREATE TABLE accommodation_details (
    id INT PRIMARY KEY AUTO_INCREMENT,
    trip_item_id INT NOT NULL,
    hotel_name VARCHAR(200) NOT NULL,
    room_type VARCHAR(100),
    room_number VARCHAR(20),
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    guest_count INT DEFAULT 1,
    special_requests TEXT,
    amenities JSON,
    contact_phone VARCHAR(20),
    contact_email VARCHAR(100),

    FOREIGN KEY (trip_item_id) REFERENCES trip_items(id) ON DELETE CASCADE
);

-- 提醒表
CREATE TABLE reminders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    trip_id INT,
    trip_item_id INT,
    title VARCHAR(200) NOT NULL,
    message TEXT,
    reminder_type ENUM('departure', 'check_in', 'custom', 'weather_alert', 'document_expiry') NOT NULL,
    reminder_datetime DATETIME NOT NULL,
    advance_minutes INT DEFAULT 60, -- 提前多少分钟提醒
    status ENUM('pending', 'sent', 'failed', 'cancelled') DEFAULT 'pending',
    notification_methods JSON, -- 通知方式：email, sms, push, in_app
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    sent_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
    FOREIGN KEY (trip_item_id) REFERENCES trip_items(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_reminder_datetime (reminder_datetime),
    INDEX idx_status (status),
    INDEX idx_reminder_type (reminder_type)
);

-- 票务导入记录表
CREATE TABLE ticket_imports (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    import_type ENUM('email', 'image', 'manual', 'api') NOT NULL,
    original_content TEXT, -- 原始导入内容
    parsed_data JSON, -- 解析后的结构化数据
    status ENUM('pending', 'success', 'failed', 'partial') DEFAULT 'pending',
    error_message TEXT,
    created_trip_ids JSON, -- 创建的行程ID列表
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_import_type (import_type),
    INDEX idx_status (status)
);

-- 天气缓存表
CREATE TABLE weather_cache (
    id INT PRIMARY KEY AUTO_INCREMENT,
    location_key VARCHAR(100) NOT NULL, -- 位置标识符
    date DATE NOT NULL,
    weather_data JSON NOT NULL,
    source VARCHAR(50) DEFAULT 'amap', -- 数据来源
    cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,

    UNIQUE KEY uk_location_date (location_key, date),
    INDEX idx_expires_at (expires_at)
);

-- 地点收藏表
CREATE TABLE favorite_locations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    name VARCHAR(200) NOT NULL,
    address TEXT,
    coordinates POINT,
    location_type ENUM('home', 'work', 'airport', 'hotel', 'attraction', 'restaurant', 'other') DEFAULT 'other',
    notes TEXT,
    visit_count INT DEFAULT 0,
    last_visited_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_location_type (location_type),
    SPATIAL INDEX idx_coordinates (coordinates)
);

-- 系统配置表
CREATE TABLE system_config (
    id INT PRIMARY KEY AUTO_INCREMENT,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSON,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 操作日志表
CREATE TABLE activity_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50),
    resource_id INT,
    details JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
);

-- 初始化系统配置
INSERT INTO system_config (config_key, config_value, description) VALUES
('amap_api_key', '"your_amap_api_key"', '高德地图API密钥'),
('weather_api_key', '"your_weather_api_key"', '天气API密钥'),
('email_smtp_config', '{"host": "smtp.example.com", "port": 587, "secure": false}', '邮件SMTP配置'),
('notification_settings', '{"email": true, "sms": false, "push": true}', '通知设置'),
('import_rules', '{"flight_patterns": [], "train_patterns": []}', '票务导入规则配置'),
('reminder_intervals', '{"departure": [1440, 120, 30], "check_in": [1440, 240]}', '提醒时间间隔配置（分钟）');