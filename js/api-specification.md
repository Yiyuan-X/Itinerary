# 智能行程规划系统 API 接口设计规范

## 概述

本文档定义了智能行程规划系统的所有API接口规范，采用RESTful架构风格，支持JSON格式的数据交换。

### 基础信息

- **基础URL**: `https://api.travel-planner.com/v1`
- **认证方式**: JWT Bearer Token
- **数据格式**: JSON
- **字符编码**: UTF-8
- **请求方法**: GET, POST, PUT, DELETE, PATCH

### 通用响应格式

```json
{
  "success": true,
  "data": {},
  "message": "操作成功",
  "timestamp": "2024-03-15T10:30:00Z",
  "errors": null
}
```

### 错误响应格式

```json
{
  "success": false,
  "data": null,
  "message": "错误描述",
  "timestamp": "2024-03-15T10:30:00Z",
  "errors": [
    {
      "field": "email",
      "code": "INVALID_FORMAT",
      "message": "邮箱格式不正确"
    }
  ]
}
```

### HTTP状态码

- `200 OK`: 请求成功
- `201 Created`: 创建成功
- `204 No Content`: 删除成功
- `400 Bad Request`: 请求参数错误
- `401 Unauthorized`: 未认证
- `403 Forbidden`: 无权限
- `404 Not Found`: 资源不存在
- `409 Conflict`: 资源冲突
- `422 Unprocessable Entity`: 验证失败
- `500 Internal Server Error`: 服务器错误

## 1. 用户认证模块

### 1.1 用户注册

```
POST /auth/register
Content-Type: application/json
```

**请求参数:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePassword123",
  "full_name": "John Doe",
  "phone": "+8613800138000",
  "timezone": "Asia/Shanghai",
  "language": "zh-CN"
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "johndoe",
      "email": "john@example.com",
      "full_name": "John Doe",
      "avatar_url": null,
      "timezone": "Asia/Shanghai",
      "language": "zh-CN",
      "status": "active",
      "created_at": "2024-03-15T10:30:00Z"
    },
    "tokens": {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expires_in": 3600,
      "token_type": "Bearer"
    }
  },
  "message": "注册成功"
}
```

### 1.2 用户登录

```
POST /auth/login
Content-Type: application/json
```

**请求参数:**
```json
{
  "email": "john@example.com",
  "password": "SecurePassword123",
  "remember_me": true,
  "device_info": {
    "device_type": "web",
    "device_name": "Chrome Browser",
    "os": "macOS"
  }
}
```

### 1.3 刷新Token

```
POST /auth/refresh
Authorization: Bearer {refresh_token}
```

### 1.4 退出登录

```
POST /auth/logout
Authorization: Bearer {access_token}
```

### 1.5 获取用户信息

```
GET /auth/me
Authorization: Bearer {access_token}
```

### 1.6 更新用户资料

```
PUT /auth/profile
Authorization: Bearer {access_token}
Content-Type: application/json
```

**请求参数:**
```json
{
  "full_name": "John Smith",
  "phone": "+8613900139000",
  "timezone": "Asia/Shanghai",
  "language": "en-US",
  "preferences": {
    "currency": "CNY",
    "distance_unit": "km",
    "temperature_unit": "celsius",
    "notifications": {
      "email": true,
      "push": true,
      "sms": false
    }
  }
}
```

## 2. 行程管理模块

### 2.1 获取行程列表

```
GET /trips?status=all&sort=start_date_desc&page=1&per_page=10
Authorization: Bearer {access_token}
```

**查询参数:**
- `status`: 行程状态 (all, planning, confirmed, ongoing, completed, cancelled)
- `sort`: 排序方式 (start_date_desc, start_date_asc, created_desc, updated_desc)
- `page`: 页码 (默认: 1)
- `per_page`: 每页数量 (默认: 10, 最大: 50)
- `search`: 搜索关键词
- `start_date`: 开始日期过滤 (YYYY-MM-DD)
- `end_date`: 结束日期过滤 (YYYY-MM-DD)

**响应:**
```json
{
  "success": true,
  "data": {
    "trips": [
      {
        "id": 1,
        "title": "日本东京之旅",
        "description": "春季赏樱之旅",
        "start_date": "2024-04-01",
        "end_date": "2024-04-07",
        "status": "confirmed",
        "total_cost": 8800.00,
        "currency": "CNY",
        "cover_image_url": "https://...",
        "is_public": false,
        "items_count": 12,
        "created_at": "2024-03-15T10:30:00Z",
        "updated_at": "2024-03-16T15:20:00Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 3,
      "per_page": 10,
      "total_items": 25,
      "has_next_page": true,
      "has_prev_page": false
    }
  }
}
```

### 2.2 创建行程

```
POST /trips
Authorization: Bearer {access_token}
Content-Type: application/json
```

**请求参数:**
```json
{
  "title": "日本东京之旅",
  "description": "春季赏樱之旅",
  "start_date": "2024-04-01",
  "end_date": "2024-04-07",
  "status": "planning",
  "cover_image_url": "https://...",
  "is_public": false,
  "metadata": {
    "destination": "Tokyo, Japan",
    "travelers_count": 2,
    "trip_type": "leisure"
  }
}
```

### 2.3 获取行程详情

```
GET /trips/{trip_id}
Authorization: Bearer {access_token}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "trip": {
      "id": 1,
      "title": "日本东京之旅",
      "description": "春季赏樱之旅",
      "start_date": "2024-04-01",
      "end_date": "2024-04-07",
      "status": "confirmed",
      "total_cost": 8800.00,
      "currency": "CNY",
      "cover_image_url": "https://...",
      "is_public": false,
      "metadata": {},
      "items": [
        {
          "id": 1,
          "title": "北京-东京 航班",
          "item_type": "transport",
          "start_datetime": "2024-04-01T08:00:00+08:00",
          "end_datetime": "2024-04-01T12:30:00+09:00",
          "location_name": "成田国际机场",
          "cost": 3200.00,
          "booking_status": "confirmed",
          "transportation": {
            "transport_type": "flight",
            "carrier_name": "中国国际航空",
            "flight_number": "CA925",
            "departure_airport_code": "PEK",
            "arrival_airport_code": "NRT"
          }
        }
      ],
      "created_at": "2024-03-15T10:30:00Z",
      "updated_at": "2024-03-16T15:20:00Z"
    }
  }
}
```

### 2.4 更新行程

```
PUT /trips/{trip_id}
Authorization: Bearer {access_token}
```

### 2.5 删除行程

```
DELETE /trips/{trip_id}
Authorization: Bearer {access_token}
```

## 3. 行程项目管理

### 3.1 创建行程项目

```
POST /trips/{trip_id}/items
Authorization: Bearer {access_token}
Content-Type: application/json
```

**请求参数:**
```json
{
  "title": "北京-东京 航班",
  "description": "CA925航班",
  "item_type": "transport",
  "start_datetime": "2024-04-01T08:00:00+08:00",
  "end_datetime": "2024-04-01T12:30:00+09:00",
  "location_name": "成田国际机场",
  "location_address": "日本千叶县成田市",
  "location_coordinates": {
    "latitude": 35.7647,
    "longitude": 140.3864
  },
  "cost": 3200.00,
  "currency": "CNY",
  "booking_reference": "ABC123",
  "notes": "需要提前3小时到达机场",
  "transportation": {
    "transport_type": "flight",
    "carrier_name": "中国国际航空",
    "flight_number": "CA925",
    "departure_airport_code": "PEK",
    "arrival_airport_code": "NRT",
    "departure_terminal": "T3",
    "arrival_terminal": "T1",
    "seat_number": "12A",
    "class_type": "Economy"
  }
}
```

### 3.2 更新行程项目

```
PUT /trips/{trip_id}/items/{item_id}
Authorization: Bearer {access_token}
```

### 3.3 删除行程项目

```
DELETE /trips/{trip_id}/items/{item_id}
Authorization: Bearer {access_token}
```

### 3.4 批量重排序行程项目

```
PATCH /trips/{trip_id}/items/reorder
Authorization: Bearer {access_token}
Content-Type: application/json
```

**请求参数:**
```json
{
  "items": [
    {"id": 1, "sort_order": 0},
    {"id": 3, "sort_order": 1},
    {"id": 2, "sort_order": 2}
  ]
}
```

## 4. 地图服务模块

### 4.1 地理编码

```
GET /map/geocode?address=北京市朝阳区&city=北京
Authorization: Bearer {access_token}
```

### 4.2 逆地理编码

```
GET /map/regeocode?lat=39.9042&lng=116.4074
Authorization: Bearer {access_token}
```

### 4.3 路径规划

```
POST /map/directions
Authorization: Bearer {access_token}
Content-Type: application/json
```

**请求参数:**
```json
{
  "origin": {
    "latitude": 39.9042,
    "longitude": 116.4074,
    "name": "北京"
  },
  "destination": {
    "latitude": 35.6762,
    "longitude": 139.6503,
    "name": "东京"
  },
  "waypoints": [
    {
      "latitude": 35.1796,
      "longitude": 129.0756,
      "name": "釜山"
    }
  ],
  "travel_mode": "driving",
  "alternatives": true
}
```

### 4.4 周边搜索

```
GET /map/places/nearby?lat=35.6762&lng=139.6503&radius=1000&keyword=餐厅&category=食品&limit=20
Authorization: Bearer {access_token}
```

## 5. 天气服务模块

### 5.1 获取当前天气

```
GET /weather/current?location=东京&date=2024-04-01
Authorization: Bearer {access_token}
```

### 5.2 获取天气预报

```
GET /weather/forecast?location=东京&days=7
Authorization: Bearer {access_token}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "location": {
      "city": "东京",
      "country": "日本",
      "coordinates": {
        "latitude": 35.6762,
        "longitude": 139.6503
      }
    },
    "current": {
      "temperature": 18,
      "feels_like": 20,
      "humidity": 65,
      "weather": "晴天",
      "weather_code": "sunny",
      "wind_speed": 5,
      "wind_direction": "东南",
      "visibility": 10,
      "uv_index": 3,
      "updated_at": "2024-04-01T10:00:00+09:00"
    },
    "forecast": [
      {
        "date": "2024-04-01",
        "temperature_max": 22,
        "temperature_min": 15,
        "weather": "多云",
        "weather_code": "cloudy",
        "precipitation_probability": 20,
        "precipitation_amount": 0
      }
    ]
  }
}
```

## 6. 票务导入模块

### 6.1 解析票务信息

```
POST /import/parse
Authorization: Bearer {access_token}
Content-Type: application/json
```

**请求参数 (文本解析):**
```json
{
  "type": "text",
  "content": "CA925 北京-东京 2024-04-01 08:00"
}
```

**请求参数 (图片解析):**
```json
{
  "type": "image",
  "image_url": "https://...",
  "image_base64": "data:image/jpeg;base64,/9j/4AAQ..."
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "import_id": "imp_123456",
    "parsed_items": [
      {
        "type": "flight",
        "title": "北京-东京航班",
        "flight_number": "CA925",
        "carrier": "中国国际航空",
        "departure": {
          "airport_code": "PEK",
          "airport_name": "北京首都国际机场",
          "datetime": "2024-04-01T08:00:00+08:00",
          "terminal": "T3"
        },
        "arrival": {
          "airport_code": "NRT",
          "airport_name": "成田国际机场",
          "datetime": "2024-04-01T12:30:00+09:00",
          "terminal": "T1"
        },
        "passenger": {
          "name": "张三",
          "seat": "12A",
          "class": "Economy"
        },
        "booking_reference": "ABC123",
        "confidence": 0.95
      }
    ],
    "status": "success"
  }
}
```

### 6.2 确认导入

```
POST /import/{import_id}/confirm
Authorization: Bearer {access_token}
Content-Type: application/json
```

**请求参数:**
```json
{
  "trip_id": 1,
  "create_new_trip": false,
  "new_trip": {
    "title": "日本之旅",
    "description": "春季旅行"
  },
  "items": [
    {
      "import_item_id": 0,
      "confirmed": true,
      "modifications": {
        "title": "修改后的标题"
      }
    }
  ]
}
```

## 7. 提醒管理模块

### 7.1 获取提醒列表

```
GET /reminders?status=pending&type=departure&page=1&per_page=20
Authorization: Bearer {access_token}
```

### 7.2 创建提醒

```
POST /reminders
Authorization: Bearer {access_token}
Content-Type: application/json
```

**请求参数:**
```json
{
  "trip_id": 1,
  "trip_item_id": 1,
  "title": "航班起飞提醒",
  "message": "您的CA925航班将在2小时后起飞，请提前到达机场",
  "reminder_type": "departure",
  "reminder_datetime": "2024-04-01T06:00:00+08:00",
  "advance_minutes": 120,
  "notification_methods": ["email", "push"]
}
```

### 7.3 更新提醒状态

```
PATCH /reminders/{reminder_id}/status
Authorization: Bearer {access_token}
Content-Type: application/json
```

**请求参数:**
```json
{
  "status": "cancelled"
}
```

## 8. 收藏管理模块

### 8.1 获取收藏地点

```
GET /favorites/locations?type=all&page=1&per_page=20
Authorization: Bearer {access_token}
```

### 8.2 添加收藏地点

```
POST /favorites/locations
Authorization: Bearer {access_token}
Content-Type: application/json
```

**请求参数:**
```json
{
  "name": "东京塔",
  "address": "日本东京都港区芝公园4丁目2-8",
  "coordinates": {
    "latitude": 35.6586,
    "longitude": 139.7454
  },
  "location_type": "attraction",
  "notes": "东京的标志性建筑"
}
```

## 9. 系统管理模块

### 9.1 获取系统配置

```
GET /system/config
Authorization: Bearer {access_token}
```

### 9.2 健康检查

```
GET /system/health
```

**响应:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "timestamp": "2024-03-15T10:30:00Z",
    "services": {
      "database": "healthy",
      "redis": "healthy",
      "amap_api": "healthy",
      "weather_api": "healthy"
    },
    "uptime": 86400
  }
}
```

## 10. WebHook接口

### 10.1 支付回调

```
POST /webhooks/payment
Content-Type: application/json
X-Signature: sha256=...
```

### 10.2 第三方服务回调

```
POST /webhooks/external/{service}
Content-Type: application/json
X-Signature: sha256=...
```

## 认证和授权

### JWT Token格式

```json
{
  "header": {
    "typ": "JWT",
    "alg": "HS256"
  },
  "payload": {
    "sub": "1",
    "iat": 1615804800,
    "exp": 1615808400,
    "iss": "travel-planner-api",
    "user": {
      "id": 1,
      "email": "john@example.com",
      "roles": ["user"]
    }
  }
}
```

### API权限级别

- **公开接口**: 无需认证
- **用户接口**: 需要有效的访问令牌
- **管理接口**: 需要管理员权限
- **系统接口**: 需要系统级别权限

## 限流和缓存

### API限流策略

- **用户级限制**: 1000请求/小时
- **IP级限制**: 100请求/分钟
- **端点级限制**: 特定接口单独限制

### 缓存策略

- **地理编码**: 24小时缓存
- **天气数据**: 1小时缓存
- **静态配置**: 6小时缓存
- **用户数据**: 不缓存

## 版本控制

API采用URL版本控制，当前版本为v1。向后不兼容的更改将发布新版本。

## 开发环境

### 测试服务器

- **基础URL**: `https://api-dev.travel-planner.com/v1`
- **文档**: `https://api-dev.travel-planner.com/docs`
- **测试密钥**: 开发环境专用密钥

### 生产环境

- **基础URL**: `https://api.travel-planner.com/v1`
- **文档**: `https://api.travel-planner.com/docs`
- **SSL/TLS**: 强制HTTPS