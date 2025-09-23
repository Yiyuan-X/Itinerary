# 智能旅行规划器 🗺️✈️

一个现代化的Web旅行规划应用，帮助您轻松规划和管理旅行计划。

## ✨ 主要功能

- 🎯 **旅行计划管理** - 添加、编辑、删除旅行计划
- 🗺️ **地图集成** - 基于高德地图的位置显示和搜索
- 📱 **响应式设计** - 完美适配桌面端、平板端、手机端
- 💾 **本地存储** - 数据持久化保存，无需注册账户
- 🎨 **现代化界面** - 精美的UI设计和流畅的交互体验
- 🔍 **智能搜索** - 位置搜索和自动建议功能
- 📊 **状态管理** - 支持计划中、已完成、已取消状态

## 🚀 快速开始

### 本地运行

1. 克隆项目
```bash
git clone https://github.com/Yiyuan-X/Itinerary.git
cd Itinerary
```

2. 启动本地服务器
```bash
# 使用Python
python3 -m http.server 8080

# 或使用Node.js
npx serve .
```

3. 在浏览器中访问
- 主应用：http://localhost:8080
- 测试页面：http://localhost:8080/test.html

## 📁 项目结构

```
├── index.html          # 主应用页面
├── styles.css          # 样式文件
├── test.html           # 测试页面
├── CLAUDE.md          # 开发规范文档
└── js/
    ├── app.js          # 主应用逻辑
    ├── utils.js        # 工具函数库
    ├── storage.js      # 本地存储管理
    └── amap-api.js     # 高德地图API封装
```

## 🛠️ 技术栈

- **前端框架**: 原生JavaScript ES6+
- **样式**: CSS3 (Grid + Flexbox + CSS变量)
- **地图服务**: 高德地图API v2.0
- **数据存储**: LocalStorage
- **设计理念**: 响应式设计、组件化开发

## 📋 功能特性

### 旅行计划管理
- ✅ 创建新的旅行计划
- ✅ 编辑现有计划信息
- ✅ 删除不需要的计划
- ✅ 状态标记（计划中/已完成/已取消）
- ✅ 按状态筛选显示

### 地图功能
- ✅ 地图显示和交互
- ✅ 位置搜索和建议
- ✅ 地图标记和信息展示
- ✅ 当前位置定位

### 用户体验
- ✅ 响应式设计
- ✅ 现代化UI界面
- ✅ 流畅的动画效果
- ✅ 友好的错误提示
- ✅ 无障碍设计支持

## 🎨 设计原则

本项目严格遵循以下开发原则：

- **DRY原则** - 避免重复代码，提高代码复用性
- **模块化设计** - 功能模块独立，便于维护和扩展
- **响应式优先** - 移动端优先的设计理念
- **用户体验** - 注重交互细节和用户感受

## 🔧 开发指南

### 代码规范

请查看 `CLAUDE.md` 文件了解详细的开发规范和指导原则。

### 本地开发

1. 修改代码后，在浏览器中刷新页面查看效果
2. 使用浏览器开发者工具调试
3. 测试不同屏幕尺寸的响应式效果

### 测试

访问 `test.html` 页面进行功能测试：
- 响应式设计测试
- 地图API连接测试
- 本地存储功能测试
- CSS特性支持检测

## 🌟 截图展示

### 桌面端界面
![桌面端界面](docs/desktop.png)

### 移动端界面
![移动端界面](docs/mobile.png)

### 地图功能
![地图功能](docs/map.png)

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

1. Fork 本仓库
2. 创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 👨‍💻 作者

**Yiyuan-X**

- GitHub: [@Yiyuan-X](https://github.com/Yiyuan-X)
- Email: yiyuan1359@gmail.com

## 🙏 致谢

- 感谢高德地图提供的优秀地图服务
- 感谢所有开源项目的贡献者

---

如果这个项目对您有帮助，请给个⭐️支持一下！