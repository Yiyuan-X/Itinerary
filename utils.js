/**
 * 通用工具函数模块
 * 遵循DRY原则，提供可复用的工具函数
 */

/**
 * 生成唯一ID
 * @returns {string} 唯一ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * 格式化日期
 * @param {Date|string} date - 日期对象或日期字符串
 * @param {string} format - 格式类型 'short' | 'long' | 'medium'
 * @returns {string} 格式化后的日期字符串
 */
function formatDate(date, format = 'medium') {
    const d = new Date(date);

    if (isNaN(d.getTime())) {
        return '无效日期';
    }

    const options = {
        short: { month: 'numeric', day: 'numeric' },
        medium: { year: 'numeric', month: 'numeric', day: 'numeric' },
        long: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }
    };

    return d.toLocaleDateString('zh-CN', options[format]);
}

/**
 * 计算两个日期之间的天数
 * @param {Date|string} startDate - 开始日期
 * @param {Date|string} endDate - 结束日期
 * @returns {number} 天数差
 */
function calculateDaysBetween(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const timeDiff = end.getTime() - start.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
}

/**
 * 防抖函数
 * @param {Function} func - 要执行的函数
 * @param {number} wait - 等待时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 节流函数
 * @param {Function} func - 要执行的函数
 * @param {number} limit - 限制时间（毫秒）
 * @returns {Function} 节流后的函数
 */
function throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * 验证表单字段
 * @param {object} formData - 表单数据
 * @param {object} rules - 验证规则
 * @returns {object} 验证结果 {isValid: boolean, errors: object}
 */
function validateForm(formData, rules) {
    const errors = {};
    let isValid = true;

    for (const [field, value] of Object.entries(formData)) {
        const fieldRules = rules[field];
        if (!fieldRules) continue;

        // 必填验证
        if (fieldRules.required && (!value || value.trim() === '')) {
            errors[field] = fieldRules.requiredMessage || `${field}是必填项`;
            isValid = false;
            continue;
        }

        // 最小长度验证
        if (fieldRules.minLength && value.length < fieldRules.minLength) {
            errors[field] = fieldRules.minLengthMessage || `${field}至少需要${fieldRules.minLength}个字符`;
            isValid = false;
        }

        // 日期验证
        if (fieldRules.isDate && value) {
            const date = new Date(value);
            if (isNaN(date.getTime())) {
                errors[field] = fieldRules.dateMessage || `${field}格式不正确`;
                isValid = false;
            }
        }

        // 自定义验证函数
        if (fieldRules.validator && typeof fieldRules.validator === 'function') {
            const customResult = fieldRules.validator(value);
            if (customResult !== true) {
                errors[field] = customResult;
                isValid = false;
            }
        }
    }

    return { isValid, errors };
}

/**
 * DOM操作工具
 */
const DOM = {
    /**
     * 查询单个元素
     * @param {string} selector - CSS选择器
     * @param {Element} context - 查询上下文，默认为document
     * @returns {Element|null} 元素
     */
    query(selector, context = document) {
        return context.querySelector(selector);
    },

    /**
     * 查询多个元素
     * @param {string} selector - CSS选择器
     * @param {Element} context - 查询上下文，默认为document
     * @returns {NodeList} 元素列表
     */
    queryAll(selector, context = document) {
        return context.querySelectorAll(selector);
    },

    /**
     * 添加CSS类
     * @param {Element} element - 目标元素
     * @param {string} className - CSS类名
     */
    addClass(element, className) {
        if (element) element.classList.add(className);
    },

    /**
     * 移除CSS类
     * @param {Element} element - 目标元素
     * @param {string} className - CSS类名
     */
    removeClass(element, className) {
        if (element) element.classList.remove(className);
    },

    /**
     * 切换CSS类
     * @param {Element} element - 目标元素
     * @param {string} className - CSS类名
     */
    toggleClass(element, className) {
        if (element) element.classList.toggle(className);
    },

    /**
     * 显示元素
     * @param {Element} element - 目标元素
     */
    show(element) {
        if (element) {
            this.removeClass(element, 'hidden');
            element.style.display = '';
        }
    },

    /**
     * 隐藏元素
     * @param {Element} element - 目标元素
     */
    hide(element) {
        if (element) {
            this.addClass(element, 'hidden');
        }
    },

    /**
     * 设置元素内容
     * @param {Element} element - 目标元素
     * @param {string} content - 内容
     */
    setContent(element, content) {
        if (element) element.innerHTML = content;
    },

    /**
     * 添加事件监听器
     * @param {Element} element - 目标元素
     * @param {string} event - 事件名称
     * @param {Function} handler - 事件处理函数
     */
    on(element, event, handler) {
        if (element) element.addEventListener(event, handler);
    },

    /**
     * 移除事件监听器
     * @param {Element} element - 目标元素
     * @param {string} event - 事件名称
     * @param {Function} handler - 事件处理函数
     */
    off(element, event, handler) {
        if (element) element.removeEventListener(event, handler);
    }
};

/**
 * Toast通知工具
 */
const Toast = {
    /**
     * 显示成功消息
     * @param {string} message - 消息内容
     * @param {number} duration - 显示时长（毫秒）
     */
    success(message, duration = 3000) {
        this.show(message, 'success', duration);
    },

    /**
     * 显示错误消息
     * @param {string} message - 消息内容
     * @param {number} duration - 显示时长（毫秒）
     */
    error(message, duration = 4000) {
        this.show(message, 'error', duration);
    },

    /**
     * 显示通知
     * @param {string} message - 消息内容
     * @param {string} type - 类型
     * @param {number} duration - 显示时长（毫秒）
     */
    show(message, type = 'success', duration = 3000) {
        const toast = DOM.query('#toast');
        const messageEl = DOM.query('.toast-message', toast);

        if (toast && messageEl) {
            DOM.setContent(messageEl, message);
            DOM.removeClass(toast, 'success');
            DOM.removeClass(toast, 'error');
            DOM.addClass(toast, type);
            DOM.show(toast);

            setTimeout(() => {
                DOM.hide(toast);
            }, duration);
        }
    }
};

/**
 * 加载指示器工具
 */
const Loading = {
    /**
     * 显示加载指示器
     */
    show() {
        const loading = DOM.query('#loading');
        DOM.show(loading);
    },

    /**
     * 隐藏加载指示器
     */
    hide() {
        const loading = DOM.query('#loading');
        DOM.hide(loading);
    }
};

/**
 * 模态框工具
 */
const Modal = {
    /**
     * 显示模态框
     * @param {string} modalId - 模态框ID
     */
    show(modalId) {
        console.log(`显示模态框: ${modalId}`);
        const modal = DOM.query(`#${modalId}`);
        if (modal) {
            // 移除hidden类，添加show类
            modal.classList.remove('hidden');
            modal.classList.add('show');
            modal.style.display = 'flex';

            // 阻止背景滚动
            document.body.style.overflow = 'hidden';

            console.log(`模态框 ${modalId} 显示成功`);
        } else {
            console.error(`找不到模态框元素: #${modalId}`);
        }
    },

    /**
     * 隐藏模态框
     * @param {string} modalId - 模态框ID
     */
    hide(modalId) {
        console.log(`隐藏模态框: ${modalId}`);
        const modal = DOM.query(`#${modalId}`);
        if (modal) {
            // 添加hidden类，移除show类
            modal.classList.add('hidden');
            modal.classList.remove('show');
            modal.style.display = 'none';

            // 恢复背景滚动
            document.body.style.overflow = '';

            console.log(`模态框 ${modalId} 隐藏成功`);
        } else {
            console.error(`找不到模态框元素: #${modalId}`);
        }
    },

    /**
     * 切换模态框显示状态
     * @param {string} modalId - 模态框ID
     */
    toggle(modalId) {
        const modal = DOM.query(`#${modalId}`);
        if (modal) {
            const isVisible = modal.classList.contains('show');
            if (isVisible) {
                this.hide(modalId);
            } else {
                this.show(modalId);
            }
        }
    }
};

/**
 * 获取旅行状态显示文本
 * @param {string} status - 状态值
 * @returns {string} 显示文本
 */
function getStatusText(status) {
    const statusMap = {
        planning: '计划中',
        completed: '已完成',
        cancelled: '已取消'
    };
    return statusMap[status] || status;
}

/**
 * 获取旅行状态图标
 * @param {string} status - 状态值
 * @returns {string} 图标
 */
function getStatusIcon(status) {
    const iconMap = {
        planning: '📅',
        completed: '✅',
        cancelled: '❌'
    };
    return iconMap[status] || '📅';
}