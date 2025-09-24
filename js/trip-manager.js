/**
 * 行程管理模块
 * 提供完整的行程CRUD操作和数据管理功能
 */

class TripManager {
    constructor() {
        // 数据状态
        this.trips = [];
        this.currentTrip = null;
        this.filters = {
            status: 'all',
            sort: 'start_date_desc',
            search: ''
        };
        this.pagination = {
            currentPage: 1,
            perPage: 12,
            totalItems: 0,
            totalPages: 0
        };

        // API 配置
        this.apiBase = 'https://api.travel-planner.com/v1';
        this.endpoints = {
            trips: '/trips',
            tripById: (id) => `/trips/${id}`,
            tripItems: (tripId) => `/trips/${tripId}/items`,
            tripItem: (tripId, itemId) => `/trips/${tripId}/items/${itemId}`,
            reorderItems: (tripId) => `/trips/${tripId}/items/reorder`
        };

        // 事件监听器
        this.eventListeners = new Map();

        // 行程状态映射
        this.statusMap = {
            planning: { text: '规划中', color: '#64748b', icon: 'planning' },
            confirmed: { text: '已确认', color: '#10b981', icon: 'confirmed' },
            ongoing: { text: '进行中', color: '#3b82f6', icon: 'ongoing' },
            completed: { text: '已完成', color: '#6b7280', icon: 'completed' },
            cancelled: { text: '已取消', color: '#ef4444', icon: 'cancelled' }
        };

        // 行程项目类型映射
        this.itemTypeMap = {
            transport: { text: '交通', icon: 'transport', color: '#3b82f6' },
            accommodation: { text: '住宿', icon: 'accommodation', color: '#10b981' },
            activity: { text: '活动', icon: 'activity', color: '#f59e0b' },
            meal: { text: '餐饮', icon: 'meal', color: '#ef4444' },
            attraction: { text: '景点', icon: 'attraction', color: '#8b5cf6' },
            other: { text: '其他', icon: 'other', color: '#64748b' }
        };

        // 初始化
        this.init();
    }

    /**
     * 初始化行程管理器
     */
    async init() {
        // 监听认证状态变化
        if (typeof auth !== 'undefined') {
            auth.on('authenticated', () => this.loadTrips());
            auth.on('logout', () => this.clearData());
        }

        // 如果已经认证，加载行程数据
        if (auth && auth.isAuthenticated) {
            await this.loadTrips();
        }
    }

    /**
     * 加载行程列表
     * @param {Object} options - 查询选项
     * @returns {Promise<Array>} 行程列表
     */
    async loadTrips(options = {}) {
        try {
            // 使用本地存储服务
            const trips = localStorageService.getTrips({
                status: options.status || this.filters.status,
                sort: options.sort || this.filters.sort,
                search: options.search || this.filters.search
            });

            this.trips = trips;

            // 更新过滤器状态
            if (options.status) this.filters.status = options.status;
            if (options.sort) this.filters.sort = options.sort;
            if (options.search !== undefined) this.filters.search = options.search;

            this.emit('tripsLoaded', this.trips);
            return this.trips;
        } catch (error) {
            console.error('加载行程列表失败:', error);
            this.emit('loadError', error);
            throw error;
        }
    }

    /**
     * 获取行程详情
     * @param {number} tripId - 行程ID
     * @returns {Promise<Object>} 行程详情
     */
    async getTripById(tripId) {
        try {
            const trip = localStorageService.getTrip(tripId);

            if (trip) {
                this.currentTrip = trip;
                this.emit('tripLoaded', this.currentTrip);
                return this.currentTrip;
            } else {
                throw new Error('行程不存在');
            }
        } catch (error) {
            console.error('获取行程详情失败:', error);
            this.emit('loadError', error);
            throw error;
        }
    }

    /**
     * 创建行程
     * @param {Object} tripData - 行程数据
     * @returns {Promise<Object>} 创建的行程
     */
    async createTrip(tripData) {
        try {
            // 数据验证
            this.validateTripData(tripData);

            const newTrip = localStorageService.createTrip(tripData);
            this.trips.unshift(newTrip);
            this.emit('tripCreated', newTrip);
            return newTrip;
        } catch (error) {
            console.error('创建行程失败:', error);
            this.emit('createError', error);
            throw error;
        }
    }

    /**
     * 更新行程
     * @param {number} tripId - 行程ID
     * @param {Object} tripData - 更新的行程数据
     * @returns {Promise<Object>} 更新后的行程
     */
    async updateTrip(tripId, tripData) {
        try {
            // 数据验证
            this.validateTripData(tripData, false);

            const updatedTrip = localStorageService.updateTrip(tripId, tripData);

            if (updatedTrip) {
                // 更新本地数据
                const index = this.trips.findIndex(trip => trip.id === tripId);
                if (index !== -1) {
                    this.trips[index] = updatedTrip;
                }

                if (this.currentTrip && this.currentTrip.id === tripId) {
                    this.currentTrip = updatedTrip;
                }

                this.emit('tripUpdated', updatedTrip);
                return updatedTrip;
            } else {
                throw new Error('行程不存在');
            }
        } catch (error) {
            console.error('更新行程失败:', error);
            this.emit('updateError', error);
            throw error;
        }
    }

    /**
     * 删除行程
     * @param {number} tripId - 行程ID
     * @returns {Promise<boolean>} 删除结果
     */
    async deleteTrip(tripId) {
        try {
            const success = localStorageService.deleteTrip(tripId);

            if (success) {
                // 从本地数据中移除
                this.trips = this.trips.filter(trip => trip.id !== tripId);

                if (this.currentTrip && this.currentTrip.id === tripId) {
                    this.currentTrip = null;
                }

                this.emit('tripDeleted', tripId);
                return true;
            } else {
                throw new Error('删除失败');
            }
        } catch (error) {
            console.error('删除行程失败:', error);
            this.emit('deleteError', error);
            throw error;
        }
    }

    /**
     * 创建行程项目
     * @param {number} tripId - 行程ID
     * @param {Object} itemData - 项目数据
     * @returns {Promise<Object>} 创建的项目
     */
    async createTripItem(tripId, itemData) {
        try {
            // 数据验证
            this.validateTripItemData(itemData);

            const response = await auth.authenticatedRequest(
                this.endpoints.tripItems(tripId),
                'POST',
                itemData
            );

            if (response.success) {
                const newItem = response.data.item;

                // 更新当前行程的项目列表
                if (this.currentTrip && this.currentTrip.id === tripId) {
                    if (!this.currentTrip.items) {
                        this.currentTrip.items = [];
                    }
                    this.currentTrip.items.push(newItem);
                    this.sortTripItems(this.currentTrip);
                }

                this.emit('tripItemCreated', { tripId, item: newItem });
                return newItem;
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error('创建行程项目失败:', error);
            this.emit('createItemError', error);
            throw error;
        }
    }

    /**
     * 更新行程项目
     * @param {number} tripId - 行程ID
     * @param {number} itemId - 项目ID
     * @param {Object} itemData - 更新的项目数据
     * @returns {Promise<Object>} 更新后的项目
     */
    async updateTripItem(tripId, itemId, itemData) {
        try {
            this.validateTripItemData(itemData, false);

            const response = await auth.authenticatedRequest(
                this.endpoints.tripItem(tripId, itemId),
                'PUT',
                itemData
            );

            if (response.success) {
                const updatedItem = response.data.item;

                // 更新本地数据
                if (this.currentTrip && this.currentTrip.id === tripId && this.currentTrip.items) {
                    const index = this.currentTrip.items.findIndex(item => item.id === itemId);
                    if (index !== -1) {
                        this.currentTrip.items[index] = updatedItem;
                        this.sortTripItems(this.currentTrip);
                    }
                }

                this.emit('tripItemUpdated', { tripId, item: updatedItem });
                return updatedItem;
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error('更新行程项目失败:', error);
            this.emit('updateItemError', error);
            throw error;
        }
    }

    /**
     * 删除行程项目
     * @param {number} tripId - 行程ID
     * @param {number} itemId - 项目ID
     * @returns {Promise<boolean>} 删除结果
     */
    async deleteTripItem(tripId, itemId) {
        try {
            const response = await auth.authenticatedRequest(
                this.endpoints.tripItem(tripId, itemId),
                'DELETE'
            );

            if (response.success) {
                // 从本地数据中移除
                if (this.currentTrip && this.currentTrip.id === tripId && this.currentTrip.items) {
                    this.currentTrip.items = this.currentTrip.items.filter(item => item.id !== itemId);
                }

                this.emit('tripItemDeleted', { tripId, itemId });
                return true;
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error('删除行程项目失败:', error);
            this.emit('deleteItemError', error);
            throw error;
        }
    }

    /**
     * 重排序行程项目
     * @param {number} tripId - 行程ID
     * @param {Array} itemOrders - 项目顺序数组
     * @returns {Promise<boolean>} 重排序结果
     */
    async reorderTripItems(tripId, itemOrders) {
        try {
            const response = await auth.authenticatedRequest(
                this.endpoints.reorderItems(tripId),
                'PATCH',
                { items: itemOrders }
            );

            if (response.success) {
                // 更新本地数据
                if (this.currentTrip && this.currentTrip.id === tripId && this.currentTrip.items) {
                    itemOrders.forEach(order => {
                        const item = this.currentTrip.items.find(item => item.id === order.id);
                        if (item) {
                            item.sort_order = order.sort_order;
                        }
                    });
                    this.sortTripItems(this.currentTrip);
                }

                this.emit('tripItemsReordered', { tripId, itemOrders });
                return true;
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error('重排序行程项目失败:', error);
            this.emit('reorderError', error);
            throw error;
        }
    }

    /**
     * 搜索行程
     * @param {string} query - 搜索关键词
     * @returns {Promise<Array>} 搜索结果
     */
    async searchTrips(query) {
        try {
            this.filters.search = query;
            return await this.loadTrips({ search: query, page: 1 });
        } catch (error) {
            console.error('搜索行程失败:', error);
            throw error;
        }
    }

    /**
     * 计算行程统计信息
     * @param {Object} trip - 行程对象
     * @returns {Object} 统计信息
     */
    calculateTripStats(trip) {
        if (!trip || !trip.items) {
            return {
                totalCost: 0,
                itemsCount: 0,
                duration: 0,
                transportCount: 0,
                accommodationCount: 0,
                activityCount: 0
            };
        }

        const stats = {
            totalCost: 0,
            itemsCount: trip.items.length,
            duration: 0,
            transportCount: 0,
            accommodationCount: 0,
            activityCount: 0
        };

        // 计算总费用和各类型项目数量
        trip.items.forEach(item => {
            if (item.cost) {
                stats.totalCost += parseFloat(item.cost);
            }

            switch (item.item_type) {
                case 'transport':
                    stats.transportCount++;
                    break;
                case 'accommodation':
                    stats.accommodationCount++;
                    break;
                case 'activity':
                    stats.activityCount++;
                    break;
            }
        });

        // 计算行程天数
        if (trip.start_date && trip.end_date) {
            const startDate = new Date(trip.start_date);
            const endDate = new Date(trip.end_date);
            stats.duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        }

        return stats;
    }

    /**
     * 获取行程状态信息
     * @param {string} status - 状态代码
     * @returns {Object} 状态信息
     */
    getStatusInfo(status) {
        return this.statusMap[status] || this.statusMap.planning;
    }

    /**
     * 获取项目类型信息
     * @param {string} type - 类型代码
     * @returns {Object} 类型信息
     */
    getItemTypeInfo(type) {
        return this.itemTypeMap[type] || this.itemTypeMap.other;
    }

    /**
     * 验证行程数据
     * @param {Object} tripData - 行程数据
     * @param {boolean} isCreate - 是否为创建操作
     */
    validateTripData(tripData, isCreate = true) {
        const errors = [];

        // 必填字段验证
        if (isCreate || tripData.hasOwnProperty('title')) {
            if (!tripData.title || tripData.title.trim().length === 0) {
                errors.push({ field: 'title', message: '行程标题不能为空' });
            } else if (tripData.title.length > 200) {
                errors.push({ field: 'title', message: '行程标题不能超过200个字符' });
            }
        }

        if (isCreate || tripData.hasOwnProperty('start_date')) {
            if (!tripData.start_date) {
                errors.push({ field: 'start_date', message: '开始日期不能为空' });
            } else if (!this.isValidDate(tripData.start_date)) {
                errors.push({ field: 'start_date', message: '开始日期格式不正确' });
            }
        }

        if (isCreate || tripData.hasOwnProperty('end_date')) {
            if (!tripData.end_date) {
                errors.push({ field: 'end_date', message: '结束日期不能为空' });
            } else if (!this.isValidDate(tripData.end_date)) {
                errors.push({ field: 'end_date', message: '结束日期格式不正确' });
            }
        }

        // 日期逻辑验证
        if (tripData.start_date && tripData.end_date) {
            const startDate = new Date(tripData.start_date);
            const endDate = new Date(tripData.end_date);

            if (startDate > endDate) {
                errors.push({ field: 'end_date', message: '结束日期不能早于开始日期' });
            }
        }

        // 状态验证
        if (tripData.hasOwnProperty('status')) {
            if (!this.statusMap.hasOwnProperty(tripData.status)) {
                errors.push({ field: 'status', message: '行程状态不正确' });
            }
        }

        if (errors.length > 0) {
            const error = new Error('数据验证失败');
            error.errors = errors;
            throw error;
        }
    }

    /**
     * 验证行程项目数据
     * @param {Object} itemData - 项目数据
     * @param {boolean} isCreate - 是否为创建操作
     */
    validateTripItemData(itemData, isCreate = true) {
        const errors = [];

        // 必填字段验证
        if (isCreate || itemData.hasOwnProperty('title')) {
            if (!itemData.title || itemData.title.trim().length === 0) {
                errors.push({ field: 'title', message: '项目标题不能为空' });
            }
        }

        if (isCreate || itemData.hasOwnProperty('item_type')) {
            if (!itemData.item_type || !this.itemTypeMap.hasOwnProperty(itemData.item_type)) {
                errors.push({ field: 'item_type', message: '项目类型不正确' });
            }
        }

        if (isCreate || itemData.hasOwnProperty('start_datetime')) {
            if (!itemData.start_datetime) {
                errors.push({ field: 'start_datetime', message: '开始时间不能为空' });
            } else if (!this.isValidDateTime(itemData.start_datetime)) {
                errors.push({ field: 'start_datetime', message: '开始时间格式不正确' });
            }
        }

        // 时间逻辑验证
        if (itemData.start_datetime && itemData.end_datetime) {
            const startTime = new Date(itemData.start_datetime);
            const endTime = new Date(itemData.end_datetime);

            if (startTime >= endTime) {
                errors.push({ field: 'end_datetime', message: '结束时间必须晚于开始时间' });
            }
        }

        if (errors.length > 0) {
            const error = new Error('数据验证失败');
            error.errors = errors;
            throw error;
        }
    }

    /**
     * 验证日期格式
     * @param {string} dateStr - 日期字符串
     * @returns {boolean} 是否有效
     */
    isValidDate(dateStr) {
        const date = new Date(dateStr);
        return date instanceof Date && !isNaN(date);
    }

    /**
     * 验证日期时间格式
     * @param {string} dateTimeStr - 日期时间字符串
     * @returns {boolean} 是否有效
     */
    isValidDateTime(dateTimeStr) {
        const dateTime = new Date(dateTimeStr);
        return dateTime instanceof Date && !isNaN(dateTime);
    }

    /**
     * 排序行程项目
     * @param {Object} trip - 行程对象
     */
    sortTripItems(trip) {
        if (trip && trip.items) {
            trip.items.sort((a, b) => {
                // 首先按照 sort_order 排序
                if (a.sort_order !== undefined && b.sort_order !== undefined) {
                    return a.sort_order - b.sort_order;
                }

                // 然后按照开始时间排序
                const aTime = new Date(a.start_datetime);
                const bTime = new Date(b.start_datetime);
                return aTime - bTime;
            });
        }
    }

    /**
     * 清除数据
     */
    clearData() {
        this.trips = [];
        this.currentTrip = null;
        this.filters = {
            status: 'all',
            sort: 'start_date_desc',
            search: ''
        };
        this.pagination = {
            currentPage: 1,
            perPage: 12,
            totalItems: 0,
            totalPages: 0
        };
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
                    console.error(`事件回调执行失败 (${event}):`, error);
                }
            });
        }
    }
}

// 创建全局行程管理器实例
const tripManager = new TripManager();

// 导出行程管理器
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TripManager;
}