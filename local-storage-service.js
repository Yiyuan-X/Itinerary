/**
 * 本地存储管理模块
 * 模拟后端API功能，使用localStorage进行数据持久化
 */

class LocalStorageService {
    constructor() {
        this.storageKeys = {
            trips: 'travel_planner_trips',
            tripItems: 'travel_planner_trip_items',
            reminders: 'travel_planner_reminders',
            importHistory: 'travel_planner_import_history',
            settings: 'travel_planner_settings'
        };

        // 初始化默认数据
        this.initDefaultData();
    }

    /**
     * 初始化默认数据
     */
    initDefaultData() {
        // 如果没有数据，创建默认的空数据结构
        if (!this.getFromStorage(this.storageKeys.trips)) {
            this.setInStorage(this.storageKeys.trips, []);
        }
        if (!this.getFromStorage(this.storageKeys.tripItems)) {
            this.setInStorage(this.storageKeys.tripItems, []);
        }
        if (!this.getFromStorage(this.storageKeys.reminders)) {
            this.setInStorage(this.storageKeys.reminders, []);
        }
        if (!this.getFromStorage(this.storageKeys.importHistory)) {
            this.setInStorage(this.storageKeys.importHistory, []);
        }
        if (!this.getFromStorage(this.storageKeys.settings)) {
            this.setInStorage(this.storageKeys.settings, {
                notifications: {
                    enabled: true,
                    methods: {
                        browser: true,
                        email: false,
                        push: false
                    }
                }
            });
        }
    }

    /**
     * 从localStorage获取数据
     * @param {string} key - 存储键
     * @returns {*} 数据
     */
    getFromStorage(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('读取本地存储失败:', error);
            return null;
        }
    }

    /**
     * 存储数据到localStorage
     * @param {string} key - 存储键
     * @param {*} data - 数据
     */
    setInStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('写入本地存储失败:', error);
            return false;
        }
    }

    // ====== 行程管理 API ======

    /**
     * 获取行程列表
     * @param {Object} filters - 过滤条件
     * @returns {Array} 行程列表
     */
    getTrips(filters = {}) {
        let trips = this.getFromStorage(this.storageKeys.trips) || [];

        // 应用过滤器
        if (filters.status && filters.status !== 'all') {
            trips = trips.filter(trip => trip.status === filters.status);
        }

        // 排序
        if (filters.sort) {
            switch (filters.sort) {
                case 'start_date_desc':
                    trips.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
                    break;
                case 'start_date_asc':
                    trips.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
                    break;
                case 'created_desc':
                    trips.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                    break;
                case 'updated_desc':
                    trips.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
                    break;
            }
        }

        // 搜索
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            trips = trips.filter(trip =>
                trip.title.toLowerCase().includes(searchTerm) ||
                (trip.description && trip.description.toLowerCase().includes(searchTerm))
            );
        }

        return trips;
    }

    /**
     * 获取单个行程
     * @param {string} id - 行程ID
     * @returns {Object|null} 行程数据
     */
    getTrip(id) {
        const trips = this.getFromStorage(this.storageKeys.trips) || [];
        const trip = trips.find(t => t.id === id);

        if (trip) {
            // 获取关联的行程项目
            const tripItems = this.getTripItems(id);
            trip.items = tripItems;
        }

        return trip;
    }

    /**
     * 创建行程
     * @param {Object} tripData - 行程数据
     * @returns {Object} 创建的行程
     */
    createTrip(tripData) {
        const trips = this.getFromStorage(this.storageKeys.trips) || [];

        const newTrip = {
            id: generateId(),
            ...tripData,
            items: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        trips.push(newTrip);
        this.setInStorage(this.storageKeys.trips, trips);

        return newTrip;
    }

    /**
     * 更新行程
     * @param {string} id - 行程ID
     * @param {Object} updateData - 更新数据
     * @returns {Object|null} 更新后的行程
     */
    updateTrip(id, updateData) {
        const trips = this.getFromStorage(this.storageKeys.trips) || [];
        const index = trips.findIndex(t => t.id === id);

        if (index !== -1) {
            trips[index] = {
                ...trips[index],
                ...updateData,
                updated_at: new Date().toISOString()
            };

            this.setInStorage(this.storageKeys.trips, trips);
            return trips[index];
        }

        return null;
    }

    /**
     * 删除行程
     * @param {string} id - 行程ID
     * @returns {boolean} 删除结果
     */
    deleteTrip(id) {
        const trips = this.getFromStorage(this.storageKeys.trips) || [];
        const filteredTrips = trips.filter(t => t.id !== id);

        if (filteredTrips.length !== trips.length) {
            this.setInStorage(this.storageKeys.trips, filteredTrips);

            // 同时删除相关的行程项目
            const tripItems = this.getFromStorage(this.storageKeys.tripItems) || [];
            const filteredItems = tripItems.filter(item => item.trip_id !== id);
            this.setInStorage(this.storageKeys.tripItems, filteredItems);

            return true;
        }

        return false;
    }

    // ====== 行程项目管理 API ======

    /**
     * 获取行程项目列表
     * @param {string} tripId - 行程ID
     * @returns {Array} 行程项目列表
     */
    getTripItems(tripId) {
        const tripItems = this.getFromStorage(this.storageKeys.tripItems) || [];
        return tripItems
            .filter(item => item.trip_id === tripId)
            .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
    }

    /**
     * 创建行程项目
     * @param {Object} itemData - 项目数据
     * @returns {Object} 创建的项目
     */
    createTripItem(itemData) {
        const tripItems = this.getFromStorage(this.storageKeys.tripItems) || [];

        const newItem = {
            id: generateId(),
            ...itemData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        tripItems.push(newItem);
        this.setInStorage(this.storageKeys.tripItems, tripItems);

        // 更新关联行程的更新时间
        this.updateTrip(itemData.trip_id, {});

        return newItem;
    }

    /**
     * 更新行程项目
     * @param {string} id - 项目ID
     * @param {Object} updateData - 更新数据
     * @returns {Object|null} 更新后的项目
     */
    updateTripItem(id, updateData) {
        const tripItems = this.getFromStorage(this.storageKeys.tripItems) || [];
        const index = tripItems.findIndex(item => item.id === id);

        if (index !== -1) {
            tripItems[index] = {
                ...tripItems[index],
                ...updateData,
                updated_at: new Date().toISOString()
            };

            this.setInStorage(this.storageKeys.tripItems, tripItems);

            // 更新关联行程的更新时间
            this.updateTrip(tripItems[index].trip_id, {});

            return tripItems[index];
        }

        return null;
    }

    /**
     * 删除行程项目
     * @param {string} id - 项目ID
     * @returns {boolean} 删除结果
     */
    deleteTripItem(id) {
        const tripItems = this.getFromStorage(this.storageKeys.tripItems) || [];
        const item = tripItems.find(item => item.id === id);

        if (item) {
            const filteredItems = tripItems.filter(item => item.id !== id);
            this.setInStorage(this.storageKeys.tripItems, filteredItems);

            // 更新关联行程的更新时间
            this.updateTrip(item.trip_id, {});

            return true;
        }

        return false;
    }

    // ====== 提醒管理 API ======

    /**
     * 获取提醒列表
     * @param {Object} filters - 过滤条件
     * @returns {Array} 提醒列表
     */
    getReminders(filters = {}) {
        let reminders = this.getFromStorage(this.storageKeys.reminders) || [];

        if (filters.status && filters.status !== 'all') {
            reminders = reminders.filter(reminder => reminder.status === filters.status);
        }

        return reminders.sort((a, b) =>
            new Date(a.reminder_datetime) - new Date(b.reminder_datetime)
        );
    }

    /**
     * 创建提醒
     * @param {Object} reminderData - 提醒数据
     * @returns {Object} 创建的提醒
     */
    createReminder(reminderData) {
        const reminders = this.getFromStorage(this.storageKeys.reminders) || [];

        const newReminder = {
            id: generateId(),
            ...reminderData,
            status: 'pending',
            retry_count: 0,
            created_at: new Date().toISOString()
        };

        reminders.push(newReminder);
        this.setInStorage(this.storageKeys.reminders, reminders);

        return newReminder;
    }

    /**
     * 更新提醒状态
     * @param {string} id - 提醒ID
     * @param {string} status - 新状态
     * @param {Object} additionalData - 额外数据
     * @returns {Object|null} 更新后的提醒
     */
    updateReminderStatus(id, status, additionalData = {}) {
        const reminders = this.getFromStorage(this.storageKeys.reminders) || [];
        const index = reminders.findIndex(r => r.id === id);

        if (index !== -1) {
            reminders[index] = {
                ...reminders[index],
                status,
                ...additionalData,
                updated_at: new Date().toISOString()
            };

            this.setInStorage(this.storageKeys.reminders, reminders);
            return reminders[index];
        }

        return null;
    }

    // ====== 导入历史 API ======

    /**
     * 获取导入历史
     * @returns {Array} 导入历史列表
     */
    getImportHistory() {
        return this.getFromStorage(this.storageKeys.importHistory) || [];
    }

    /**
     * 添加导入历史记录
     * @param {Object} importData - 导入数据
     * @returns {Object} 导入记录
     */
    addImportHistory(importData) {
        const history = this.getFromStorage(this.storageKeys.importHistory) || [];

        const newRecord = {
            id: generateId(),
            ...importData,
            created_at: new Date().toISOString()
        };

        history.push(newRecord);

        // 只保留最新的50条记录
        if (history.length > 50) {
            history.splice(0, history.length - 50);
        }

        this.setInStorage(this.storageKeys.importHistory, history);
        return newRecord;
    }

    // ====== 设置管理 API ======

    /**
     * 获取用户设置
     * @returns {Object} 设置数据
     */
    getSettings() {
        return this.getFromStorage(this.storageKeys.settings) || {};
    }

    /**
     * 更新用户设置
     * @param {Object} settings - 设置数据
     * @returns {Object} 更新后的设置
     */
    updateSettings(settings) {
        const currentSettings = this.getSettings();
        const newSettings = { ...currentSettings, ...settings };
        this.setInStorage(this.storageKeys.settings, newSettings);
        return newSettings;
    }

    /**
     * 清除所有数据
     */
    clearAllData() {
        Object.values(this.storageKeys).forEach(key => {
            localStorage.removeItem(key);
        });
        this.initDefaultData();
    }

    /**
     * 导出所有数据
     * @returns {Object} 导出的数据
     */
    exportData() {
        const data = {};
        Object.entries(this.storageKeys).forEach(([name, key]) => {
            data[name] = this.getFromStorage(key);
        });
        return data;
    }

    /**
     * 导入数据
     * @param {Object} data - 要导入的数据
     */
    importData(data) {
        Object.entries(data).forEach(([name, value]) => {
            const key = this.storageKeys[name];
            if (key && value) {
                this.setInStorage(key, value);
            }
        });
    }
}

// 创建全局本地存储服务实例
const localStorageService = new LocalStorageService();

// 导出本地存储服务
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LocalStorageService;
}