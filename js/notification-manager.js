/**
 * 通知提醒管理模块
 * 提供智能提醒、推送通知等功能
 */

class NotificationManager {
    constructor() {
        // API 配置
        this.apiBase = 'https://api.travel-planner.com/v1';
        this.endpoints = {
            reminders: '/reminders',
            reminderById: (id) => `/reminders/${id}`,
            updateStatus: (id) => `/reminders/${id}/status`,
            batch: '/reminders/batch',
            settings: '/reminders/settings'
        };

        // 本地状态
        this.reminders = [];
        this.settings = {
            enabled: true,
            methods: {
                browser: true,
                email: true,
                push: true
            },
            defaultAdvanceTime: {
                departure: 120,    // 出发前2小时
                check_in: 240,     // 入住前4小时
                activity: 60,      // 活动前1小时
                custom: 30         // 自定义提醒前30分钟
            }
        };

        // 提醒类型配置
        this.reminderTypes = {
            departure: {
                title: '出发提醒',
                icon: '🚗',
                color: '#3b82f6',
                defaultMessage: '您的{transport}即将出发，请提前到达{location}',
                templates: {
                    flight: '您的{flight_number}航班将在{time}起飞，请提前3小时到达{airport}',
                    train: '您的{train_number}次列车将在{time}出发，请提前1小时到达{station}',
                    general: '您的{title}将在{time}开始，请提前准备'
                }
            },
            check_in: {
                title: '入住提醒',
                icon: '🏨',
                color: '#10b981',
                defaultMessage: '您在{hotel}的入住时间为{time}，请准备好相关证件',
                templates: {
                    hotel: '您在{hotel_name}的入住时间为{time}，房间号：{room_number}',
                    general: '您的住宿入住时间为{time}，请准备好相关证件'
                }
            },
            activity: {
                title: '活动提醒',
                icon: '🎯',
                color: '#f59e0b',
                defaultMessage: '您的活动"{title}"将在{time}开始',
                templates: {
                    tour: '您的旅行团"{title}"将在{time}开始，集合地点：{location}',
                    attraction: '您预约的"{title}"参观时间为{time}，请提前到达',
                    general: '您的活动"{title}"将在{time}开始'
                }
            },
            weather_alert: {
                title: '天气提醒',
                icon: '🌦️',
                color: '#ef4444',
                defaultMessage: '{location}明日天气{weather}，请做好相应准备',
                templates: {
                    rain: '{location}明日有雨，降水概率{probability}%，请携带雨具',
                    cold: '{location}明日气温{temperature}℃，请注意保暖',
                    hot: '{location}明日气温{temperature}℃，请注意防暑',
                    general: '{location}明日天气{weather}，请做好相应准备'
                }
            },
            document_expiry: {
                title: '证件提醒',
                icon: '📄',
                color: '#8b5cf6',
                defaultMessage: '您的{document}将在{days}天后过期，请及时办理',
                templates: {
                    passport: '您的护照将在{days}天后过期，请及时续签',
                    visa: '您的{country}签证将在{days}天后过期',
                    general: '您的{document}将在{days}天后过期，请及时处理'
                }
            },
            custom: {
                title: '自定义提醒',
                icon: '⏰',
                color: '#64748b',
                defaultMessage: '{message}',
                templates: {
                    general: '{message}'
                }
            }
        };

        // 浏览器通知权限状态
        this.notificationPermission = 'default';

        // 定时器
        this.checkInterval = null;
        this.retryTimeouts = new Map();

        // 事件监听器
        this.eventListeners = new Map();

        // 初始化
        this.init();
    }

    /**
     * 初始化通知管理器
     */
    async init() {
        // 检查浏览器通知权限
        await this.checkNotificationPermission();

        // 监听认证状态变化
        if (typeof auth !== 'undefined') {
            auth.on('authenticated', () => {
                this.loadReminders();
                this.loadSettings();
                this.startChecking();
            });

            auth.on('logout', () => {
                this.stopChecking();
                this.clearReminders();
            });
        }

        // 监听页面可见性变化
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && auth && auth.isAuthenticated) {
                this.loadReminders();
            }
        });

        console.log('通知管理器初始化完成');
    }

    /**
     * 检查浏览器通知权限
     */
    async checkNotificationPermission() {
        if (!('Notification' in window)) {
            console.warn('浏览器不支持通知功能');
            return;
        }

        this.notificationPermission = Notification.permission;

        if (this.notificationPermission === 'default') {
            try {
                this.notificationPermission = await Notification.requestPermission();
            } catch (error) {
                console.warn('请求通知权限失败:', error);
            }
        }

        console.log('通知权限状态:', this.notificationPermission);
    }

    /**
     * 创建提醒
     * @param {Object} reminderData - 提醒数据
     * @returns {Promise<Object>} 创建的提醒
     */
    async createReminder(reminderData) {
        try {
            // 数据验证
            this.validateReminderData(reminderData);

            // 处理提醒时间
            if (reminderData.advance_minutes) {
                const targetTime = new Date(reminderData.target_datetime);
                const reminderTime = new Date(targetTime.getTime() - (reminderData.advance_minutes * 60 * 1000));
                reminderData.reminder_datetime = reminderTime.toISOString();
            }

            // 生成提醒消息
            if (!reminderData.message) {
                reminderData.message = this.generateReminderMessage(reminderData);
            }

            const response = await auth.authenticatedRequest(
                this.endpoints.reminders,
                'POST',
                reminderData
            );

            if (response.success) {
                const newReminder = response.data.reminder;
                this.reminders.push(newReminder);
                this.sortReminders();

                this.emit('reminderCreated', newReminder);
                return newReminder;
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error('创建提醒失败:', error);
            this.emit('createError', error);
            throw error;
        }
    }

    /**
     * 更新提醒
     * @param {number} reminderId - 提醒ID
     * @param {Object} updateData - 更新数据
     * @returns {Promise<Object>} 更新后的提醒
     */
    async updateReminder(reminderId, updateData) {
        try {
            const response = await auth.authenticatedRequest(
                this.endpoints.reminderById(reminderId),
                'PUT',
                updateData
            );

            if (response.success) {
                const updatedReminder = response.data.reminder;

                // 更新本地数据
                const index = this.reminders.findIndex(r => r.id === reminderId);
                if (index !== -1) {
                    this.reminders[index] = updatedReminder;
                    this.sortReminders();
                }

                this.emit('reminderUpdated', updatedReminder);
                return updatedReminder;
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error('更新提醒失败:', error);
            this.emit('updateError', error);
            throw error;
        }
    }

    /**
     * 删除提醒
     * @param {number} reminderId - 提醒ID
     * @returns {Promise<boolean>} 删除结果
     */
    async deleteReminder(reminderId) {
        try {
            const response = await auth.authenticatedRequest(
                this.endpoints.reminderById(reminderId),
                'DELETE'
            );

            if (response.success) {
                // 从本地数据中移除
                this.reminders = this.reminders.filter(r => r.id !== reminderId);

                // 清除重试定时器
                if (this.retryTimeouts.has(reminderId)) {
                    clearTimeout(this.retryTimeouts.get(reminderId));
                    this.retryTimeouts.delete(reminderId);
                }

                this.emit('reminderDeleted', reminderId);
                return true;
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error('删除提醒失败:', error);
            this.emit('deleteError', error);
            throw error;
        }
    }

    /**
     * 加载提醒列表
     * @param {Object} options - 查询选项
     * @returns {Promise<Array>} 提醒列表
     */
    async loadReminders(options = {}) {
        try {
            const params = new URLSearchParams({
                status: options.status || 'pending',
                limit: options.limit || '50',
                ...options
            });

            const response = await auth.authenticatedRequest(
                `${this.endpoints.reminders}?${params.toString()}`,
                'GET'
            );

            if (response.success) {
                this.reminders = response.data.reminders || [];
                this.sortReminders();

                this.emit('remindersLoaded', this.reminders);
                return this.reminders;
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error('加载提醒失败:', error);
            this.emit('loadError', error);
            throw error;
        }
    }

    /**
     * 为行程项目创建自动提醒
     * @param {Object} tripItem - 行程项目
     * @returns {Promise<Array>} 创建的提醒列表
     */
    async createAutoReminders(tripItem) {
        try {
            const reminders = [];

            // 根据项目类型创建相应提醒
            switch (tripItem.item_type) {
                case 'transport':
                    // 交通提醒
                    const departureReminder = {
                        trip_id: tripItem.trip_id,
                        trip_item_id: tripItem.id,
                        reminder_type: 'departure',
                        target_datetime: tripItem.start_datetime,
                        advance_minutes: this.getDefaultAdvanceTime(tripItem),
                        title: `${tripItem.title} 出发提醒`,
                        notification_methods: ['browser', 'push']
                    };
                    reminders.push(await this.createReminder(departureReminder));
                    break;

                case 'accommodation':
                    // 入住提醒
                    const checkInReminder = {
                        trip_id: tripItem.trip_id,
                        trip_item_id: tripItem.id,
                        reminder_type: 'check_in',
                        target_datetime: tripItem.start_datetime,
                        advance_minutes: this.settings.defaultAdvanceTime.check_in,
                        title: `${tripItem.title} 入住提醒`,
                        notification_methods: ['browser', 'push']
                    };
                    reminders.push(await this.createReminder(checkInReminder));
                    break;

                case 'activity':
                case 'attraction':
                    // 活动提醒
                    const activityReminder = {
                        trip_id: tripItem.trip_id,
                        trip_item_id: tripItem.id,
                        reminder_type: 'activity',
                        target_datetime: tripItem.start_datetime,
                        advance_minutes: this.settings.defaultAdvanceTime.activity,
                        title: `${tripItem.title} 活动提醒`,
                        notification_methods: ['browser', 'push']
                    };
                    reminders.push(await this.createReminder(activityReminder));
                    break;
            }

            this.emit('autoRemindersCreated', { tripItem, reminders });
            return reminders;
        } catch (error) {
            console.error('创建自动提醒失败:', error);
            this.emit('autoRemindersError', error);
            throw error;
        }
    }

    /**
     * 创建天气提醒
     * @param {Object} weatherData - 天气数据
     * @param {Object} location - 位置信息
     * @returns {Promise<Object>} 天气提醒
     */
    async createWeatherReminder(weatherData, location) {
        try {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(8, 0, 0, 0); // 明天早上8点提醒

            let messageType = 'general';
            let templateData = {
                location: location.name || '目的地',
                weather: weatherData.weather
            };

            // 根据天气情况选择消息类型
            if (weatherData.weather_code.includes('rain')) {
                messageType = 'rain';
                templateData.probability = weatherData.precipitation_probability || 0;
            } else if (weatherData.temperature < 5) {
                messageType = 'cold';
                templateData.temperature = weatherData.temperature;
            } else if (weatherData.temperature > 30) {
                messageType = 'hot';
                templateData.temperature = weatherData.temperature;
            }

            const reminderData = {
                reminder_type: 'weather_alert',
                target_datetime: tomorrow.toISOString(),
                advance_minutes: 0,
                title: '天气提醒',
                message: this.generateMessageFromTemplate('weather_alert', messageType, templateData),
                notification_methods: ['browser', 'push'],
                metadata: {
                    weather_data: weatherData,
                    location: location
                }
            };

            return await this.createReminder(reminderData);
        } catch (error) {
            console.error('创建天气提醒失败:', error);
            throw error;
        }
    }

    /**
     * 开始定时检查提醒
     */
    startChecking() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }

        // 每分钟检查一次
        this.checkInterval = setInterval(() => {
            this.checkPendingReminders();
        }, 60 * 1000);

        // 立即执行一次检查
        this.checkPendingReminders();
        console.log('提醒检查已启动');
    }

    /**
     * 停止定时检查
     */
    stopChecking() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }

        // 清除所有重试定时器
        for (const timeout of this.retryTimeouts.values()) {
            clearTimeout(timeout);
        }
        this.retryTimeouts.clear();

        console.log('提醒检查已停止');
    }

    /**
     * 检查待执行的提醒
     */
    async checkPendingReminders() {
        try {
            const now = new Date();
            const pendingReminders = this.reminders.filter(reminder =>
                reminder.status === 'pending' &&
                new Date(reminder.reminder_datetime) <= now
            );

            if (pendingReminders.length > 0) {
                console.log(`检查到 ${pendingReminders.length} 个待执行的提醒`);

                for (const reminder of pendingReminders) {
                    await this.executeReminder(reminder);
                }
            }
        } catch (error) {
            console.error('检查提醒失败:', error);
        }
    }

    /**
     * 执行提醒
     * @param {Object} reminder - 提醒对象
     */
    async executeReminder(reminder) {
        try {
            console.log('执行提醒:', reminder.title);

            const methods = reminder.notification_methods || ['browser'];

            // 执行各种通知方式
            const results = await Promise.allSettled([
                methods.includes('browser') ? this.sendBrowserNotification(reminder) : Promise.resolve(),
                methods.includes('push') ? this.sendPushNotification(reminder) : Promise.resolve(),
                methods.includes('email') ? this.sendEmailNotification(reminder) : Promise.resolve()
            ]);

            // 检查是否有成功的通知
            const hasSuccess = results.some(result => result.status === 'fulfilled');

            if (hasSuccess) {
                // 标记为已发送
                await this.updateReminderStatus(reminder.id, 'sent');
                this.emit('reminderSent', reminder);
            } else {
                // 重试逻辑
                await this.retryReminder(reminder);
            }
        } catch (error) {
            console.error('执行提醒失败:', error);
            await this.retryReminder(reminder);
        }
    }

    /**
     * 发送浏览器通知
     * @param {Object} reminder - 提醒对象
     * @returns {Promise<void>}
     */
    async sendBrowserNotification(reminder) {
        if (!this.settings.methods.browser || this.notificationPermission !== 'granted') {
            throw new Error('浏览器通知未启用或无权限');
        }

        const typeConfig = this.reminderTypes[reminder.reminder_type] || this.reminderTypes.custom;

        const notification = new Notification(reminder.title, {
            body: reminder.message,
            icon: '/assets/icons/notification-icon.png',
            badge: '/assets/icons/badge-icon.png',
            tag: `reminder_${reminder.id}`,
            timestamp: Date.now(),
            requireInteraction: true,
            actions: [
                {
                    action: 'view',
                    title: '查看详情',
                    icon: '/assets/icons/view-icon.png'
                },
                {
                    action: 'dismiss',
                    title: '知道了',
                    icon: '/assets/icons/dismiss-icon.png'
                }
            ]
        });

        notification.onclick = () => {
            window.focus();
            this.emit('notificationClicked', reminder);
            notification.close();
        };

        notification.onclose = () => {
            console.log('通知已关闭:', reminder.id);
        };

        notification.onerror = (error) => {
            console.error('通知发送失败:', error);
            throw error;
        };

        return new Promise((resolve) => {
            setTimeout(() => {
                notification.close();
                resolve();
            }, 10000); // 10秒后自动关闭
        });
    }

    /**
     * 发送推送通知
     * @param {Object} reminder - 提醒对象
     * @returns {Promise<void>}
     */
    async sendPushNotification(reminder) {
        if (!this.settings.methods.push) {
            throw new Error('推送通知未启用');
        }

        // 这里可以集成第三方推送服务
        console.log('发送推送通知:', reminder);
        return Promise.resolve();
    }

    /**
     * 发送邮件通知
     * @param {Object} reminder - 提醒对象
     * @returns {Promise<void>}
     */
    async sendEmailNotification(reminder) {
        if (!this.settings.methods.email) {
            throw new Error('邮件通知未启用');
        }

        try {
            const response = await auth.authenticatedRequest(
                '/notifications/email',
                'POST',
                {
                    reminder_id: reminder.id,
                    subject: reminder.title,
                    message: reminder.message
                }
            );

            if (!response.success) {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error('发送邮件通知失败:', error);
            throw error;
        }
    }

    /**
     * 重试提醒
     * @param {Object} reminder - 提醒对象
     */
    async retryReminder(reminder) {
        const maxRetries = reminder.max_retries || 3;
        const currentRetries = reminder.retry_count || 0;

        if (currentRetries < maxRetries) {
            // 更新重试次数
            await this.updateReminderStatus(reminder.id, 'pending', {
                retry_count: currentRetries + 1
            });

            // 计算重试延迟（指数退避）
            const retryDelay = Math.min(300000, Math.pow(2, currentRetries) * 60000); // 最大5分钟

            console.log(`提醒 ${reminder.id} 将在 ${retryDelay / 1000} 秒后重试`);

            const retryTimeout = setTimeout(async () => {
                this.retryTimeouts.delete(reminder.id);
                await this.executeReminder({
                    ...reminder,
                    retry_count: currentRetries + 1
                });
            }, retryDelay);

            this.retryTimeouts.set(reminder.id, retryTimeout);
        } else {
            // 超过最大重试次数，标记为失败
            await this.updateReminderStatus(reminder.id, 'failed');
            this.emit('reminderFailed', reminder);
        }
    }

    /**
     * 更新提醒状态
     * @param {number} reminderId - 提醒ID
     * @param {string} status - 状态
     * @param {Object} additionalData - 额外数据
     * @returns {Promise<void>}
     */
    async updateReminderStatus(reminderId, status, additionalData = {}) {
        try {
            const response = await auth.authenticatedRequest(
                this.endpoints.updateStatus(reminderId),
                'PATCH',
                {
                    status,
                    ...additionalData
                }
            );

            if (response.success) {
                // 更新本地数据
                const reminder = this.reminders.find(r => r.id === reminderId);
                if (reminder) {
                    reminder.status = status;
                    Object.assign(reminder, additionalData);
                }

                this.emit('statusUpdated', { reminderId, status, additionalData });
            }
        } catch (error) {
            console.error('更新提醒状态失败:', error);
            throw error;
        }
    }

    /**
     * 生成提醒消息
     * @param {Object} reminderData - 提醒数据
     * @returns {string} 提醒消息
     */
    generateReminderMessage(reminderData) {
        const typeConfig = this.reminderTypes[reminderData.reminder_type];
        if (!typeConfig) {
            return reminderData.title || '您有一个提醒';
        }

        // 从关联的行程项目或其他数据中提取模板变量
        const templateData = this.extractTemplateData(reminderData);

        // 选择合适的模板
        const template = this.selectMessageTemplate(reminderData, typeConfig);

        return this.replaceTemplateVariables(template, templateData);
    }

    /**
     * 生成模板消息
     * @param {string} type - 提醒类型
     * @param {string} templateType - 模板类型
     * @param {Object} data - 模板数据
     * @returns {string} 消息
     */
    generateMessageFromTemplate(type, templateType, data) {
        const typeConfig = this.reminderTypes[type];
        if (!typeConfig || !typeConfig.templates[templateType]) {
            return data.message || typeConfig?.defaultMessage || '提醒消息';
        }

        const template = typeConfig.templates[templateType];
        return this.replaceTemplateVariables(template, data);
    }

    /**
     * 替换模板变量
     * @param {string} template - 模板字符串
     * @param {Object} data - 数据对象
     * @returns {string} 替换后的字符串
     */
    replaceTemplateVariables(template, data) {
        return template.replace(/\{(\w+)\}/g, (match, key) => {
            return data[key] || match;
        });
    }

    /**
     * 提取模板数据
     * @param {Object} reminderData - 提醒数据
     * @returns {Object} 模板数据
     */
    extractTemplateData(reminderData) {
        const data = {
            title: reminderData.title,
            time: reminderData.target_datetime ? new Date(reminderData.target_datetime).toLocaleString('zh-CN') : '',
            ...reminderData.metadata
        };

        // 从关联的行程项目中提取数据
        if (reminderData.trip_item) {
            const item = reminderData.trip_item;
            data.location = item.location_name;

            if (item.transportation) {
                data.flight_number = item.transportation.flight_number;
                data.train_number = item.transportation.flight_number;
                data.airport = item.location_name;
                data.station = item.location_name;
            }

            if (item.accommodation) {
                data.hotel_name = item.accommodation.hotel_name;
                data.room_number = item.accommodation.room_number;
            }
        }

        return data;
    }

    /**
     * 选择消息模板
     * @param {Object} reminderData - 提醒数据
     * @param {Object} typeConfig - 类型配置
     * @returns {string} 模板字符串
     */
    selectMessageTemplate(reminderData, typeConfig) {
        // 根据关联数据选择合适的模板
        if (reminderData.trip_item) {
            const item = reminderData.trip_item;
            if (item.item_type === 'transport' && item.transportation?.flight_number) {
                return typeConfig.templates.flight || typeConfig.templates.general;
            }
            if (item.item_type === 'transport' && item.transportation?.train_number) {
                return typeConfig.templates.train || typeConfig.templates.general;
            }
            if (item.item_type === 'accommodation') {
                return typeConfig.templates.hotel || typeConfig.templates.general;
            }
            if (item.item_type === 'activity') {
                return typeConfig.templates.tour || typeConfig.templates.general;
            }
        }

        return typeConfig.templates.general || typeConfig.defaultMessage;
    }

    /**
     * 获取默认提前时间
     * @param {Object} tripItem - 行程项目
     * @returns {number} 提前时间（分钟）
     */
    getDefaultAdvanceTime(tripItem) {
        if (tripItem.transportation) {
            if (tripItem.transportation.transport_type === 'flight') {
                return 180; // 航班提前3小时
            }
            if (tripItem.transportation.transport_type === 'train') {
                return 60;  // 火车提前1小时
            }
        }
        return this.settings.defaultAdvanceTime.departure;
    }

    /**
     * 验证提醒数据
     * @param {Object} reminderData - 提醒数据
     */
    validateReminderData(reminderData) {
        const errors = [];

        if (!reminderData.reminder_type) {
            errors.push('缺少提醒类型');
        }

        if (!reminderData.title) {
            errors.push('缺少提醒标题');
        }

        if (!reminderData.reminder_datetime && !reminderData.target_datetime) {
            errors.push('缺少提醒时间');
        }

        if (reminderData.target_datetime && new Date(reminderData.target_datetime) <= new Date()) {
            errors.push('目标时间不能是过去时间');
        }

        if (errors.length > 0) {
            const error = new Error('提醒数据验证失败');
            error.errors = errors;
            throw error;
        }
    }

    /**
     * 排序提醒列表
     */
    sortReminders() {
        this.reminders.sort((a, b) => {
            // 按提醒时间排序
            return new Date(a.reminder_datetime) - new Date(b.reminder_datetime);
        });
    }

    /**
     * 清除提醒数据
     */
    clearReminders() {
        this.reminders = [];
        this.stopChecking();
    }

    /**
     * 加载设置
     */
    async loadSettings() {
        try {
            const response = await auth.authenticatedRequest(
                this.endpoints.settings,
                'GET'
            );

            if (response.success && response.data.settings) {
                this.settings = { ...this.settings, ...response.data.settings };
                this.emit('settingsLoaded', this.settings);
            }
        } catch (error) {
            console.warn('加载通知设置失败:', error);
        }
    }

    /**
     * 更新设置
     * @param {Object} newSettings - 新设置
     * @returns {Promise<Object>} 更新后的设置
     */
    async updateSettings(newSettings) {
        try {
            const response = await auth.authenticatedRequest(
                this.endpoints.settings,
                'PUT',
                newSettings
            );

            if (response.success) {
                this.settings = { ...this.settings, ...response.data.settings };
                this.emit('settingsUpdated', this.settings);
                return this.settings;
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error('更新设置失败:', error);
            throw error;
        }
    }

    /**
     * 事件监听
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        this.eventListeners.get(event).add(callback);
    }

    /**
     * 移除事件监听
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     */
    off(event, callback) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).delete(callback);
        }
    }

    /**
     * 触发事件
     * @param {string} event - 事件名称
     * @param {*} data - 事件数据
     */
    emit(event, data = null) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`通知事件回调执行失败 (${event}):`, error);
                }
            });
        }
    }

    /**
     * 销毁通知管理器
     */
    destroy() {
        this.stopChecking();
        this.clearReminders();
        this.eventListeners.clear();
    }
}

// 创建全局通知管理器实例
const notificationManager = new NotificationManager();

// 导出通知管理器
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationManager;
}