# 智能行程规划系统部署指南

## 项目概述

智能行程规划系统是一个完整的Web应用，提供用户认证、行程管理、地图集成、天气服务、票务导入和智能提醒等功能。

### 技术栈

**前端:**
- HTML5, CSS3, JavaScript (ES6+)
- 高德地图 API
- 响应式设计

**后端:**
- Node.js/Python/Java（根据需求选择）
- MySQL 数据库
- RESTful API
- JWT 认证

**第三方服务:**
- 高德地图 API（地图服务）
- 天气 API（天气数据）
- 邮件服务（通知推送）

## 环境要求

### 系统要求
- Node.js 16+ 或 Python 3.8+ 或 Java 11+
- MySQL 8.0+
- Redis 6.0+（可选，用于缓存）
- Nginx（生产环境推荐）

### API 密钥
在开始部署前，需要申请以下 API 密钥：

1. **高德地图 API 密钥**
   - 访问：https://console.amap.com/
   - 注册账号并创建应用
   - 获取 Web 服务 API Key

2. **天气 API 密钥**（可选，系统支持多种天气API）
   - 和风天气：https://dev.qweather.com/
   - OpenWeatherMap：https://openweathermap.org/api

## 部署步骤

### 1. 克隆项目

```bash
git clone <repository-url>
cd intelligent-travel-planner
```

### 2. 数据库设置

创建 MySQL 数据库并执行初始化脚本：

```bash
# 登录 MySQL
mysql -u root -p

# 创建数据库
CREATE DATABASE travel_planner CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 使用数据库
USE travel_planner;

# 导入数据库结构
source database-schema.sql;
```

### 3. 环境配置

创建环境配置文件：

```bash
# 复制环境配置模板
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=travel_planner
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# Redis 配置（可选）
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# API 密钥配置
AMAP_API_KEY=your_amap_api_key
WEATHER_API_KEY=your_weather_api_key

# 邮件配置
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_email_password

# JWT 配置
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# 应用配置
APP_ENV=production
APP_PORT=3000
APP_URL=https://your-domain.com
```

### 4. 前端文件配置

更新前端配置文件中的 API 密钥：

**更新 `index.html`:**
```html
<!-- 更新高德地图API密钥 -->
<script src="https://webapi.amap.com/maps?v=2.0&key=YOUR_AMAP_API_KEY"></script>
```

**创建 `js/config.js`:**
```javascript
const CONFIG = {
    API_BASE_URL: 'https://your-domain.com/api/v1',
    AMAP_API_KEY: 'your_amap_api_key',
    APP_VERSION: '1.0.0',
    DEBUG: false
};
```

### 5. 安装依赖（根据后端技术栈选择）

**Node.js 后端:**
```bash
npm install
# 或
yarn install
```

**Python 后端:**
```bash
pip install -r requirements.txt
```

**Java 后端:**
```bash
mvn install
```

### 6. 启动应用

**开发环境:**
```bash
# Node.js
npm run dev

# Python
python app.py

# Java
mvn spring-boot:run
```

**生产环境:**
```bash
# Node.js
npm run build
npm start

# Python
gunicorn --bind 0.0.0.0:3000 app:app

# Java
java -jar target/travel-planner-1.0.0.jar
```

### 7. Nginx 配置（生产环境）

创建 Nginx 配置文件 `/etc/nginx/sites-available/travel-planner`:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL 证书配置
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # 静态文件服务
    location / {
        root /path/to/your/frontend;
        try_files $uri $uri/ /index.html;

        # 设置缓存头
        location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API 代理
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket 支持（如果需要实时通知）
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/travel-planner /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 8. SSL 证书配置

**使用 Let's Encrypt:**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### 9. 进程管理（生产环境）

**使用 PM2（Node.js）:**
```bash
npm install -g pm2

# 创建 ecosystem.config.js
module.exports = {
  apps: [{
    name: 'travel-planner',
    script: './server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};

# 启动应用
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

**使用 Systemd（通用）:**
```bash
# 创建服务文件
sudo nano /etc/systemd/system/travel-planner.service

[Unit]
Description=Travel Planner Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/your/app
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target

# 启用并启动服务
sudo systemctl enable travel-planner
sudo systemctl start travel-planner
sudo systemctl status travel-planner
```

## 功能验证

### 1. 用户认证测试
- 访问 `/register` 测试用户注册
- 访问 `/login` 测试用户登录
- 验证 JWT Token 生成和验证

### 2. 地图功能测试
- 验证地图加载
- 测试地理编码和逆地理编码
- 测试路线规划功能

### 3. 天气服务测试
- 测试当前天气获取
- 测试天气预报功能
- 验证天气缓存机制

### 4. 票务导入测试
- 测试文本解析功能
- 测试图片识别（如果启用）
- 验证解析结果准确性

### 5. 提醒功能测试
- 创建测试提醒
- 验证浏览器通知权限
- 测试提醒执行逻辑

## 监控和维护

### 1. 日志配置

**应用日志:**
```bash
# 创建日志目录
sudo mkdir -p /var/log/travel-planner
sudo chown www-data:www-data /var/log/travel-planner
```

**Nginx 日志:**
```nginx
# 在 Nginx 配置中添加
access_log /var/log/nginx/travel-planner.access.log;
error_log /var/log/nginx/travel-planner.error.log;
```

### 2. 性能监控

**系统资源监控:**
```bash
# 安装监控工具
sudo apt install htop iotop nethogs

# 使用 PM2 监控（Node.js）
pm2 monit
```

**数据库监控:**
```sql
-- 查看数据库连接
SHOW PROCESSLIST;

-- 查看表大小
SELECT
    table_schema AS 'Database',
    table_name AS 'Table',
    round(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)'
FROM information_schema.tables
WHERE table_schema = 'travel_planner'
ORDER BY (data_length + index_length) DESC;
```

### 3. 备份策略

**数据库备份:**
```bash
#!/bin/bash
# 创建备份脚本 backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/travel-planner"
DB_NAME="travel_planner"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 数据库备份
mysqldump -u $DB_USER -p$DB_PASSWORD $DB_NAME > $BACKUP_DIR/db_backup_$DATE.sql

# 压缩备份文件
gzip $BACKUP_DIR/db_backup_$DATE.sql

# 删除7天前的备份
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: db_backup_$DATE.sql.gz"
```

**自动备份:**
```bash
# 添加到 crontab
crontab -e

# 每天凌晨2点执行备份
0 2 * * * /path/to/backup.sh
```

## 故障排除

### 常见问题

1. **地图无法加载**
   - 检查高德地图 API 密钥是否正确
   - 验证域名是否已添加到 API 白名单
   - 检查网络连接和防火墙设置

2. **数据库连接失败**
   - 验证数据库配置信息
   - 检查数据库服务状态
   - 确认用户权限设置

3. **API 请求失败**
   - 检查后端服务状态
   - 验证 API 路由配置
   - 查看错误日志

4. **通知功能异常**
   - 检查浏览器通知权限
   - 验证邮件服务配置
   - 查看后台任务执行状态

### 性能优化

1. **数据库优化**
   ```sql
   -- 添加索引
   CREATE INDEX idx_trips_user_start_date ON trips(user_id, start_date);
   CREATE INDEX idx_reminders_user_datetime ON reminders(user_id, reminder_datetime);
   ```

2. **缓存优化**
   - 启用 Redis 缓存
   - 配置 CDN 加速静态资源
   - 使用浏览器缓存

3. **代码优化**
   - 压缩 CSS 和 JavaScript 文件
   - 优化图片资源
   - 使用懒加载技术

## 安全考虑

### 1. 数据安全
- 使用强密码和定期更换
- 启用数据库连接加密
- 实施数据备份和恢复策略

### 2. API 安全
- 使用 JWT Token 认证
- 实施 API 限流机制
- 验证所有输入数据

### 3. 服务器安全
- 定期更新系统补丁
- 配置防火墙规则
- 使用 HTTPS 加密传输

## 扩展功能

### 1. 多语言支持
- 实现 i18n 国际化
- 支持多种地区设置

### 2. 移动端适配
- 开发 PWA 应用
- 优化移动端体验

### 3. 社交功能
- 支持行程分享
- 添加评论和评分

### 4. 高级分析
- 用户行为分析
- 行程数据洞察

---

如有任何部署问题，请参考项目文档或联系技术支持。