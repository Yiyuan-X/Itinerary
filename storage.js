/**
 * 本地存储管理模块
 * 提供旅行计划数据的本地存储功能
 */

class StorageManager {
    constructor() {
        this.STORAGE_KEY = 'travel_planner_trips';
        this.VERSION_KEY = 'travel_planner_version';
        this.CURRENT_VERSION = '1.0.0';

        // 初始化存储
        this.initStorage();
    }

    /**
     * 初始化存储
     */
    initStorage() {
        try {
            // 检查版本兼容性
            const currentVersion = localStorage.getItem(this.VERSION_KEY);
            if (!currentVersion || currentVersion !== this.CURRENT_VERSION) {
                this.migrateData(currentVersion);
                localStorage.setItem(this.VERSION_KEY, this.CURRENT_VERSION);
            }

            // 确保存储结构存在
            if (!this.getAllTrips()) {
                this.saveTrips([]);
            }
        } catch (error) {
            console.error('初始化存储失败:', error);
            Toast.error('存储初始化失败，请刷新页面重试');
        }
    }

    /**
     * 数据迁移（版本兼容性处理）
     * @param {string} oldVersion - 旧版本号
     */
    migrateData(oldVersion) {
        try {
            if (!oldVersion) {
                // 全新安装，无需迁移
                return;
            }

            // 这里可以添加版本迁移逻辑
            console.log(`数据迁移: ${oldVersion} -> ${this.CURRENT_VERSION}`);

            // 示例：如果是从旧版本迁移，可以在这里处理数据格式变更
            const existingData = this.getAllTrips();
            if (existingData && Array.isArray(existingData)) {
                // 确保每个旅行计划都有必要的字段
                const migratedData = existingData.map(trip => ({
                    id: trip.id || generateId(),
                    title: trip.title || '未命名旅行',
                    destination: trip.destination || '',
                    startDate: trip.startDate || '',
                    endDate: trip.endDate || '',
                    status: trip.status || 'planning',
                    description: trip.description || '',
                    coordinates: trip.coordinates || null,
                    createdAt: trip.createdAt || new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }));
                this.saveTrips(migratedData);
            }
        } catch (error) {
            console.error('数据迁移失败:', error);
        }
    }

    /**
     * 获取所有旅行计划
     * @returns {Array} 旅行计划数组
     */
    getAllTrips() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('获取旅行计划失败:', error);
            Toast.error('读取数据失败');
            return [];
        }
    }

    /**
     * 保存所有旅行计划
     * @param {Array} trips - 旅行计划数组
     * @returns {boolean} 是否保存成功
     */
    saveTrips(trips) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trips));
            return true;
        } catch (error) {
            console.error('保存旅行计划失败:', error);

            // 检查是否是存储空间不足
            if (error.name === 'QuotaExceededError') {
                Toast.error('存储空间不足，请清理浏览器数据后重试');
            } else {
                Toast.error('保存数据失败');
            }
            return false;
        }
    }

    /**
     * 根据ID获取旅行计划
     * @param {string} id - 旅行计划ID
     * @returns {object|null} 旅行计划对象
     */
    getTripById(id) {
        const trips = this.getAllTrips();
        return trips.find(trip => trip.id === id) || null;
    }

    /**
     * 添加新的旅行计划
     * @param {object} tripData - 旅行计划数据
     * @returns {object|null} 添加的旅行计划对象
     */
    addTrip(tripData) {
        try {
            const trips = this.getAllTrips();
            const newTrip = {
                id: generateId(),
                title: tripData.title || '',
                destination: tripData.destination || '',
                startDate: tripData.startDate || '',
                endDate: tripData.endDate || '',
                status: tripData.status || 'planning',
                description: tripData.description || '',
                coordinates: tripData.coordinates || null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            trips.push(newTrip);

            if (this.saveTrips(trips)) {
                return newTrip;
            }
            return null;
        } catch (error) {
            console.error('添加旅行计划失败:', error);
            Toast.error('添加旅行计划失败');
            return null;
        }
    }

    /**
     * 更新旅行计划
     * @param {string} id - 旅行计划ID
     * @param {object} updateData - 更新数据
     * @returns {object|null} 更新后的旅行计划对象
     */
    updateTrip(id, updateData) {
        try {
            const trips = this.getAllTrips();
            const index = trips.findIndex(trip => trip.id === id);

            if (index === -1) {
                Toast.error('旅行计划不存在');
                return null;
            }

            const updatedTrip = {
                ...trips[index],
                ...updateData,
                id, // 确保ID不被覆盖
                updatedAt: new Date().toISOString()
            };

            trips[index] = updatedTrip;

            if (this.saveTrips(trips)) {
                return updatedTrip;
            }
            return null;
        } catch (error) {
            console.error('更新旅行计划失败:', error);
            Toast.error('更新旅行计划失败');
            return null;
        }
    }

    /**
     * 删除旅行计划
     * @param {string} id - 旅行计划ID
     * @returns {boolean} 是否删除成功
     */
    deleteTrip(id) {
        try {
            const trips = this.getAllTrips();
            const filteredTrips = trips.filter(trip => trip.id !== id);

            if (filteredTrips.length === trips.length) {
                Toast.error('旅行计划不存在');
                return false;
            }

            return this.saveTrips(filteredTrips);
        } catch (error) {
            console.error('删除旅行计划失败:', error);
            Toast.error('删除旅行计划失败');
            return false;
        }
    }

    /**
     * 根据状态筛选旅行计划
     * @param {string} status - 状态筛选条件
     * @returns {Array} 筛选后的旅行计划数组
     */
    getTripsByStatus(status) {
        const trips = this.getAllTrips();
        if (status === 'all') {
            return trips;
        }
        return trips.filter(trip => trip.status === status);
    }

    /**
     * 搜索旅行计划
     * @param {string} keyword - 搜索关键词
     * @returns {Array} 搜索结果数组
     */
    searchTrips(keyword) {
        const trips = this.getAllTrips();
        if (!keyword || keyword.trim() === '') {
            return trips;
        }

        const searchTerm = keyword.toLowerCase().trim();
        return trips.filter(trip =>
            trip.title.toLowerCase().includes(searchTerm) ||
            trip.destination.toLowerCase().includes(searchTerm) ||
            trip.description.toLowerCase().includes(searchTerm)
        );
    }

    /**
     * 获取统计信息
     * @returns {object} 统计信息对象
     */
    getStatistics() {
        const trips = this.getAllTrips();
        const stats = {
            total: trips.length,
            planning: 0,
            completed: 0,
            cancelled: 0
        };

        trips.forEach(trip => {
            if (stats.hasOwnProperty(trip.status)) {
                stats[trip.status]++;
            }
        });

        return stats;
    }

    /**
     * 导出数据
     * @returns {string} JSON格式的数据字符串
     */
    exportData() {
        try {
            const data = {
                version: this.CURRENT_VERSION,
                exportDate: new Date().toISOString(),
                trips: this.getAllTrips()
            };
            return JSON.stringify(data, null, 2);
        } catch (error) {
            console.error('导出数据失败:', error);
            Toast.error('导出数据失败');
            return null;
        }
    }

    /**
     * 导入数据
     * @param {string} jsonData - JSON格式的数据字符串
     * @returns {boolean} 是否导入成功
     */
    importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);

            // 验证数据格式
            if (!data.trips || !Array.isArray(data.trips)) {
                Toast.error('数据格式不正确');
                return false;
            }

            // 备份现有数据
            const currentTrips = this.getAllTrips();
            const backupKey = `${this.STORAGE_KEY}_backup_${Date.now()}`;
            localStorage.setItem(backupKey, JSON.stringify(currentTrips));

            // 导入新数据
            const importedTrips = data.trips.map(trip => ({
                ...trip,
                id: trip.id || generateId(),
                updatedAt: new Date().toISOString()
            }));

            if (this.saveTrips(importedTrips)) {
                Toast.success('数据导入成功');
                return true;
            }
            return false;
        } catch (error) {
            console.error('导入数据失败:', error);
            Toast.error('导入数据失败，请检查文件格式');
            return false;
        }
    }

    /**
     * 清空所有数据
     * @returns {boolean} 是否清空成功
     */
    clearAllData() {
        try {
            // 创建备份
            const currentTrips = this.getAllTrips();
            const backupKey = `${this.STORAGE_KEY}_backup_${Date.now()}`;
            localStorage.setItem(backupKey, JSON.stringify(currentTrips));

            // 清空数据
            return this.saveTrips([]);
        } catch (error) {
            console.error('清空数据失败:', error);
            Toast.error('清空数据失败');
            return false;
        }
    }

    /**
     * 获取存储使用情况
     * @returns {object} 存储使用情况对象
     */
    getStorageUsage() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            const dataSize = data ? new Blob([data]).size : 0;
            const maxSize = 5 * 1024 * 1024; // 假设最大5MB

            return {
                used: dataSize,
                max: maxSize,
                percentage: Math.round((dataSize / maxSize) * 100),
                available: maxSize - dataSize
            };
        } catch (error) {
            console.error('获取存储使用情况失败:', error);
            return {
                used: 0,
                max: 0,
                percentage: 0,
                available: 0
            };
        }
    }
}

// 创建存储管理器实例
const storage = new StorageManager();