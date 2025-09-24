/**
 * 用户认证管理模块
 * 提供完整的用户认证、会话管理功能
 */

class AuthManager {
    constructor() {
        // 认证状态
        this.isAuthenticated = false;
        this.currentUser = null;
        this.tokens = {
            access_token: null,
            refresh_token: null,
            expires_at: null
        };

        // API 配置
        this.apiBase = 'https://api.travel-planner.com/v1';
        this.endpoints = {
            login: '/auth/login',
            register: '/auth/register',
            refresh: '/auth/refresh',
            logout: '/auth/logout',
            profile: '/auth/me',
            updateProfile: '/auth/profile',
            forgotPassword: '/auth/forgot-password',
            resetPassword: '/auth/reset-password'
        };

        // 存储键
        this.storageKeys = {
            accessToken: 'travel_planner_access_token',
            refreshToken: 'travel_planner_refresh_token',
            user: 'travel_planner_user',
            expiresAt: 'travel_planner_expires_at'
        };

        // 事件监听器
        this.eventListeners = new Map();

        // 初始化认证状态
        this.initAuthState();
        this.setupTokenRefresh();
    }

    /**
     * 初始化认证状态
     */
    initAuthState() {
        try {
            // 从本地存储恢复认证状态
            const accessToken = localStorage.getItem(this.storageKeys.accessToken);
            const refreshToken = localStorage.getItem(this.storageKeys.refreshToken);
            const expiresAt = localStorage.getItem(this.storageKeys.expiresAt);
            const userStr = localStorage.getItem(this.storageKeys.user);

            if (accessToken && userStr) {
                this.tokens = {
                    access_token: accessToken,
                    refresh_token: refreshToken,
                    expires_at: expiresAt ? parseInt(expiresAt) : Date.now() + (24 * 60 * 60 * 1000)
                };
                this.currentUser = JSON.parse(userStr);

                // 检查token是否过期 (本地模式下不检查过期)
                this.isAuthenticated = true;
                this.emit('authenticated', this.currentUser);
            }
        } catch (error) {
            console.error('初始化认证状态失败:', error);
            this.clearAuthState();
        }
    }

    /**
     * 设置token自动刷新
     */
    setupTokenRefresh() {
        // 每5分钟检查一次token状态
        this.refreshTimer = setInterval(() => {
            if (this.isAuthenticated && this.tokens.access_token) {
                // 如果token在30分钟内过期，则刷新
                const thirtyMinutes = 30 * 60 * 1000;
                if (Date.now() + thirtyMinutes > this.tokens.expires_at) {
                    this.refreshToken();
                }
            }
        }, 5 * 60 * 1000);
    }

    /**
     * 用户登录
     * @param {string} email - 邮箱
     * @param {string} password - 密码
     * @param {boolean} rememberMe - 记住我
     * @returns {Promise<Object>} 登录结果
     */
    async login(email, password, rememberMe = false) {
        try {
            // 模拟登录验证
            if (!email || !password) {
                throw new Error('邮箱和密码不能为空');
            }

            // 简单的演示用户验证（实际应用中应该调用后端API）
            if (password.length < 6) {
                throw new Error('密码至少需要6个字符');
            }

            // 模拟用户数据
            const mockUser = {
                id: generateId(),
                email: email,
                name: email.split('@')[0],
                avatar: '/assets/default-avatar.png',
                created_at: new Date().toISOString()
            };

            // 模拟token
            const mockTokens = {
                access_token: generateId(),
                refresh_token: generateId(),
                expires_in: 24 * 60 * 60 // 24小时
            };

            await this.handleAuthSuccess({
                user: mockUser,
                tokens: mockTokens
            });

            this.emit('login', this.currentUser);
            return { success: true, user: this.currentUser };

        } catch (error) {
            console.error('登录失败:', error);
            this.emit('loginError', error);
            throw error;
        }
    }

    /**
     * 用户注册
     * @param {Object} userData - 用户数据
     * @returns {Promise<Object>} 注册结果
     */
    async register(userData) {
        try {
            // 验证注册数据
            if (!userData.email || !userData.password) {
                throw new Error('邮箱和密码不能为空');
            }

            if (!userData.username) {
                throw new Error('用户名不能为空');
            }

            if (userData.password.length < 6) {
                throw new Error('密码至少需要6个字符');
            }

            // 模拟用户数据
            const mockUser = {
                id: generateId(),
                email: userData.email,
                name: userData.username,
                avatar: '/assets/default-avatar.png',
                created_at: new Date().toISOString()
            };

            // 模拟token
            const mockTokens = {
                access_token: generateId(),
                refresh_token: generateId(),
                expires_in: 24 * 60 * 60 // 24小时
            };

            await this.handleAuthSuccess({
                user: mockUser,
                tokens: mockTokens
            });

            this.emit('register', this.currentUser);
            return { success: true, user: this.currentUser };

        } catch (error) {
            console.error('注册失败:', error);
            this.emit('registerError', error);
            throw error;
        }
    }

    /**
     * 用户登出
     */
    async logout() {
        try {
            if (this.tokens.access_token) {
                await this.apiRequest(this.endpoints.logout, 'POST', {}, {
                    'Authorization': `Bearer ${this.tokens.access_token}`
                });
            }
        } catch (error) {
            console.warn('登出API调用失败:', error);
        } finally {
            this.clearAuthState();
            this.emit('logout');
        }
    }

    /**
     * 刷新访问令牌
     */
    async refreshToken() {
        if (!this.tokens.refresh_token) {
            this.clearAuthState();
            return;
        }

        try {
            const response = await this.apiRequest(this.endpoints.refresh, 'POST', {}, {
                'Authorization': `Bearer ${this.tokens.refresh_token}`
            });

            if (response.success) {
                this.tokens = {
                    access_token: response.data.tokens.access_token,
                    refresh_token: response.data.tokens.refresh_token || this.tokens.refresh_token,
                    expires_at: Date.now() + (response.data.tokens.expires_in * 1000)
                };

                this.saveAuthState();
                this.emit('tokenRefreshed');
            } else {
                this.clearAuthState();
                this.emit('tokenExpired');
            }
        } catch (error) {
            console.error('刷新token失败:', error);
            this.clearAuthState();
            this.emit('tokenExpired');
        }
    }

    /**
     * 获取当前用户信息
     */
    async getCurrentUser() {
        if (!this.isAuthenticated) {
            return null;
        }

        try {
            const response = await this.authenticatedRequest(this.endpoints.profile, 'GET');
            if (response.success) {
                this.currentUser = response.data.user;
                this.saveAuthState();
                return this.currentUser;
            }
        } catch (error) {
            console.error('获取用户信息失败:', error);
        }

        return this.currentUser;
    }

    /**
     * 更新用户资料
     * @param {Object} userData - 更新的用户数据
     */
    async updateProfile(userData) {
        if (!this.isAuthenticated) {
            throw new Error('用户未登录');
        }

        try {
            const response = await this.authenticatedRequest(this.endpoints.updateProfile, 'PUT', userData);
            if (response.success) {
                this.currentUser = { ...this.currentUser, ...response.data.user };
                this.saveAuthState();
                this.emit('profileUpdated', this.currentUser);
                return this.currentUser;
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error('更新用户资料失败:', error);
            throw error;
        }
    }

    /**
     * 忘记密码
     * @param {string} email - 邮箱
     */
    async forgotPassword(email) {
        try {
            const response = await this.apiRequest(this.endpoints.forgotPassword, 'POST', { email });
            return response;
        } catch (error) {
            console.error('发送重置密码邮件失败:', error);
            throw error;
        }
    }

    /**
     * 重置密码
     * @param {string} token - 重置令牌
     * @param {string} password - 新密码
     */
    async resetPassword(token, password) {
        try {
            const response = await this.apiRequest(this.endpoints.resetPassword, 'POST', {
                token,
                password
            });
            return response;
        } catch (error) {
            console.error('重置密码失败:', error);
            throw error;
        }
    }

    /**
     * 验证密码强度
     * @param {string} password - 密码
     * @returns {Object} 强度信息
     */
    validatePassword(password) {
        const result = {
            score: 0,
            feedback: [],
            isValid: false
        };

        if (!password) {
            result.feedback.push('请输入密码');
            return result;
        }

        // 长度检查
        if (password.length < 8) {
            result.feedback.push('密码至少需要8个字符');
        } else {
            result.score += 1;
        }

        // 复杂性检查
        const patterns = [
            { regex: /[a-z]/, message: '需要包含小写字母' },
            { regex: /[A-Z]/, message: '需要包含大写字母' },
            { regex: /\d/, message: '需要包含数字' },
            { regex: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, message: '需要包含特殊字符' }
        ];

        patterns.forEach(pattern => {
            if (pattern.regex.test(password)) {
                result.score += 1;
            } else {
                result.feedback.push(pattern.message);
            }
        });

        // 常见密码检查
        const commonPasswords = ['123456', 'password', '123456789', '12345678'];
        if (commonPasswords.includes(password.toLowerCase())) {
            result.feedback.push('密码过于简单，请选择更复杂的密码');
            result.score = Math.max(0, result.score - 2);
        }

        result.isValid = result.score >= 3 && password.length >= 8;
        return result;
    }

    /**
     * 处理认证成功
     * @param {Object} data - 认证数据
     */
    async handleAuthSuccess(data) {
        this.currentUser = data.user;
        this.tokens = {
            access_token: data.tokens.access_token,
            refresh_token: data.tokens.refresh_token,
            expires_at: Date.now() + (data.tokens.expires_in * 1000)
        };
        this.isAuthenticated = true;

        this.saveAuthState();
        this.emit('authenticated', this.currentUser);
    }

    /**
     * 保存认证状态到本地存储
     */
    saveAuthState() {
        try {
            if (this.tokens.access_token) {
                localStorage.setItem(this.storageKeys.accessToken, this.tokens.access_token);
                localStorage.setItem(this.storageKeys.refreshToken, this.tokens.refresh_token);
                localStorage.setItem(this.storageKeys.expiresAt, this.tokens.expires_at.toString());
            }
            if (this.currentUser) {
                localStorage.setItem(this.storageKeys.user, JSON.stringify(this.currentUser));
            }
        } catch (error) {
            console.error('保存认证状态失败:', error);
        }
    }

    /**
     * 清除认证状态
     */
    clearAuthState() {
        this.isAuthenticated = false;
        this.currentUser = null;
        this.tokens = {
            access_token: null,
            refresh_token: null,
            expires_at: null
        };

        // 清除本地存储
        Object.values(this.storageKeys).forEach(key => {
            localStorage.removeItem(key);
        });

        // 清除定时器
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    /**
     * 发送认证请求
     * @param {string} endpoint - API端点
     * @param {string} method - HTTP方法
     * @param {Object} data - 请求数据
     * @param {Object} headers - 请求头
     * @returns {Promise<Object>} 响应数据
     */
    async authenticatedRequest(endpoint, method = 'GET', data = null, headers = {}) {
        if (!this.isAuthenticated || !this.tokens.access_token) {
            throw new Error('用户未认证');
        }

        return this.apiRequest(endpoint, method, data, {
            'Authorization': `Bearer ${this.tokens.access_token}`,
            ...headers
        });
    }

    /**
     * 发送API请求
     * @param {string} endpoint - API端点
     * @param {string} method - HTTP方法
     * @param {Object} data - 请求数据
     * @param {Object} headers - 请求头
     * @returns {Promise<Object>} 响应数据
     */
    async apiRequest(endpoint, method = 'GET', data = null, headers = {}) {
        const url = `${this.apiBase}${endpoint}`;
        const config = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
            config.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, config);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || `HTTP ${response.status}`);
            }

            return result;
        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('网络连接失败，请检查网络设置');
            }
            throw error;
        }
    }

    /**
     * 获取设备信息
     * @returns {Object} 设备信息
     */
    getDeviceInfo() {
        return {
            device_type: 'web',
            device_name: navigator.userAgent.includes('Mobile') ? 'Mobile Browser' : 'Desktop Browser',
            os: navigator.platform,
            browser: this.getBrowserInfo(),
            screen_resolution: `${screen.width}x${screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
    }

    /**
     * 获取浏览器信息
     * @returns {string} 浏览器信息
     */
    getBrowserInfo() {
        const userAgent = navigator.userAgent;
        if (userAgent.includes('Chrome')) return 'Chrome';
        if (userAgent.includes('Firefox')) return 'Firefox';
        if (userAgent.includes('Safari')) return 'Safari';
        if (userAgent.includes('Edge')) return 'Edge';
        return 'Unknown';
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

    /**
     * 销毁认证管理器
     */
    destroy() {
        this.clearAuthState();
        this.eventListeners.clear();

        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
    }
}

// 创建全局认证管理器实例
const auth = new AuthManager();

// 导出认证管理器
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}