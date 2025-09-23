/**
 * 智能旅行规划器主应用程序
 * 整合所有功能模块，提供完整的旅行规划功能
 */

class TravelPlannerApp {
    constructor() {
        // 应用状态
        this.currentTrips = [];
        this.currentFilter = 'all';
        this.editingTripId = null;
        this.isLocationSuggestionsVisible = false;

        // DOM元素引用
        this.elements = {};

        // 初始化应用
        this.init();
    }

    /**
     * 初始化应用程序
     */
    async init() {
        try {
            // 显示加载指示器
            Loading.show();

            // 缓存DOM元素
            this.cacheElements();

            // 绑定事件监听器
            this.bindEvents();

            // 初始化地图
            await amap.initMap('map');

            // 加载旅行计划数据
            this.loadTrips();

            // 隐藏加载指示器
            Loading.hide();

            console.log('应用初始化完成');
            Toast.success('应用加载成功');

        } catch (error) {
            console.error('应用初始化失败:', error);
            Loading.hide();
            Toast.error('应用初始化失败，请刷新页面重试');
        }
    }

    /**
     * 缓存DOM元素引用
     */
    cacheElements() {
        this.elements = {
            // 按钮
            addTripBtn: DOM.query('#addTripBtn'),
            locateBtn: DOM.query('#locateBtn'),
            refreshMapBtn: DOM.query('#refreshMapBtn'),
            modalClose: DOM.query('#modalClose'),
            confirmModalClose: DOM.query('#confirmModalClose'),
            cancelBtn: DOM.query('#cancelBtn'),
            saveBtn: DOM.query('#saveBtn'),
            confirmCancelBtn: DOM.query('#confirmCancelBtn'),
            confirmDeleteBtn: DOM.query('#confirmDeleteBtn'),

            // 表单元素
            tripForm: DOM.query('#tripForm'),
            tripTitle: DOM.query('#tripTitle'),
            tripDestination: DOM.query('#tripDestination'),
            startDate: DOM.query('#startDate'),
            endDate: DOM.query('#endDate'),
            tripDescription: DOM.query('#tripDescription'),
            tripStatus: DOM.query('#tripStatus'),

            // 容器和列表
            tripsContainer: DOM.query('#tripsContainer'),
            emptyState: DOM.query('#emptyState'),
            locationSuggestions: DOM.query('#locationSuggestions'),
            statusFilter: DOM.query('#statusFilter'),

            // 模态框
            tripModal: DOM.query('#tripModal'),
            confirmModal: DOM.query('#confirmModal'),
            modalTitle: DOM.query('#modalTitle')
        };
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 添加旅行计划按钮
        DOM.on(this.elements.addTripBtn, 'click', () => this.showAddTripModal());

        // 定位按钮
        DOM.on(this.elements.locateBtn, 'click', () => this.getCurrentLocation());

        // 刷新地图按钮
        DOM.on(this.elements.refreshMapBtn, 'click', () => amap.refresh());

        // 模态框关闭按钮
        DOM.on(this.elements.modalClose, 'click', () => this.hideModal('tripModal'));
        DOM.on(this.elements.confirmModalClose, 'click', () => this.hideModal('confirmModal'));
        DOM.on(this.elements.cancelBtn, 'click', () => this.hideModal('tripModal'));
        DOM.on(this.elements.confirmCancelBtn, 'click', () => this.hideModal('confirmModal'));

        // 表单提交
        DOM.on(this.elements.tripForm, 'submit', (e) => this.handleFormSubmit(e));

        // 状态筛选
        DOM.on(this.elements.statusFilter, 'change', (e) => this.handleFilterChange(e));

        // 目的地输入建议
        DOM.on(this.elements.tripDestination, 'input',
            debounce((e) => this.handleDestinationInput(e), 300)
        );

        // 隐藏建议列表
        DOM.on(document, 'click', (e) => {
            if (!this.elements.tripDestination.contains(e.target) &&
                !this.elements.locationSuggestions.contains(e.target)) {
                this.hideSuggestions();
            }
        });

        // 模态框背景点击关闭
        DOM.on(this.elements.tripModal, 'click', (e) => {
            if (e.target === this.elements.tripModal) {
                this.hideModal('tripModal');
            }
        });

        DOM.on(this.elements.confirmModal, 'click', (e) => {
            if (e.target === this.elements.confirmModal) {
                this.hideModal('confirmModal');
            }
        });

        // 确认删除
        DOM.on(this.elements.confirmDeleteBtn, 'click', () => this.confirmDelete());

        // 键盘事件
        DOM.on(document, 'keydown', (e) => this.handleKeyboardEvents(e));
    }

    /**
     * 处理键盘事件
     * @param {KeyboardEvent} e - 键盘事件
     */
    handleKeyboardEvents(e) {
        // ESC键关闭模态框
        if (e.key === 'Escape') {
            if (this.elements.tripModal.classList.contains('show')) {
                this.hideModal('tripModal');
            } else if (this.elements.confirmModal.classList.contains('show')) {
                this.hideModal('confirmModal');
            }
        }
    }

    /**
     * 加载旅行计划数据
     */
    loadTrips() {
        try {
            this.currentTrips = storage.getAllTrips();
            this.renderTrips();
            amap.showTripsOnMap(this.currentTrips);
        } catch (error) {
            console.error('加载旅行计划失败:', error);
            Toast.error('加载旅行计划失败');
        }
    }

    /**
     * 渲染旅行计划列表
     */
    renderTrips() {
        const filteredTrips = this.getFilteredTrips();

        if (filteredTrips.length === 0) {
            this.showEmptyState();
        } else {
            this.hideEmptyState();
            this.renderTripCards(filteredTrips);
        }
    }

    /**
     * 获取筛选后的旅行计划
     * @returns {Array} 筛选后的旅行计划数组
     */
    getFilteredTrips() {
        return storage.getTripsByStatus(this.currentFilter);
    }

    /**
     * 渲染旅行计划卡片
     * @param {Array} trips - 旅行计划数组
     */
    renderTripCards(trips) {
        const container = this.elements.tripsContainer;

        // 清空容器
        DOM.setContent(container, '');

        // 生成卡片HTML
        trips.forEach(trip => {
            const cardElement = this.createTripCard(trip);
            container.appendChild(cardElement);
        });
    }

    /**
     * 创建旅行计划卡片元素
     * @param {object} trip - 旅行计划对象
     * @returns {HTMLElement} 卡片元素
     */
    createTripCard(trip) {
        const card = document.createElement('div');
        card.className = 'trip-card';
        card.dataset.tripId = trip.id;

        const days = calculateDaysBetween(trip.startDate, trip.endDate);
        const statusIcon = getStatusIcon(trip.status);
        const statusText = getStatusText(trip.status);

        card.innerHTML = `
            <div class="trip-card-header">
                <div>
                    <h3 class="trip-title">${this.escapeHtml(trip.title)}</h3>
                    <div class="trip-destination">
                        📍 ${this.escapeHtml(trip.destination)}
                    </div>
                </div>
                <div class="trip-actions">
                    <button class="action-btn edit-btn" title="编辑" data-action="edit" data-trip-id="${trip.id}">
                        ✏️
                    </button>
                    <button class="action-btn delete-btn" title="删除" data-action="delete" data-trip-id="${trip.id}">
                        🗑️
                    </button>
                </div>
            </div>

            <div class="trip-dates">
                📅 ${formatDate(trip.startDate)} - ${formatDate(trip.endDate)}
                ${days > 0 ? `(${days}天)` : ''}
            </div>

            ${trip.description ? `
                <div class="trip-description">
                    ${this.escapeHtml(trip.description)}
                </div>
            ` : ''}

            <div class="trip-status status-${trip.status}">
                ${statusIcon} ${statusText}
            </div>
        `;

        // 绑定卡片事件
        this.bindCardEvents(card, trip);

        return card;
    }

    /**
     * 绑定卡片事件
     * @param {HTMLElement} card - 卡片元素
     * @param {object} trip - 旅行计划对象
     */
    bindCardEvents(card, trip) {
        // 卡片点击事件 - 在地图上显示
        DOM.on(card, 'click', (e) => {
            if (!e.target.closest('.trip-actions')) {
                this.showTripOnMap(trip);
            }
        });

        // 编辑按钮
        const editBtn = card.querySelector('[data-action="edit"]');
        DOM.on(editBtn, 'click', (e) => {
            e.stopPropagation();
            this.showEditTripModal(trip);
        });

        // 删除按钮
        const deleteBtn = card.querySelector('[data-action="delete"]');
        DOM.on(deleteBtn, 'click', (e) => {
            e.stopPropagation();
            this.showDeleteConfirmModal(trip.id);
        });
    }

    /**
     * 在地图上显示旅行计划
     * @param {object} trip - 旅行计划对象
     */
    showTripOnMap(trip) {
        if (trip.coordinates) {
            amap.panTo(trip.coordinates.lng, trip.coordinates.lat);
            amap.showTripInfo(trip);
        } else {
            Toast.error('该旅行计划没有位置信息');
        }
    }

    /**
     * 显示空状态
     */
    showEmptyState() {
        DOM.show(this.elements.emptyState);
    }

    /**
     * 隐藏空状态
     */
    hideEmptyState() {
        DOM.hide(this.elements.emptyState);
    }

    /**
     * 显示添加旅行计划模态框
     */
    showAddTripModal() {
        this.editingTripId = null;
        DOM.setContent(this.elements.modalTitle, '添加旅行计划');
        this.resetForm();
        this.showModal('tripModal');
    }

    /**
     * 显示编辑旅行计划模态框
     * @param {object} trip - 旅行计划对象
     */
    showEditTripModal(trip) {
        this.editingTripId = trip.id;
        DOM.setContent(this.elements.modalTitle, '编辑旅行计划');
        this.fillForm(trip);
        this.showModal('tripModal');
    }

    /**
     * 显示删除确认模态框
     * @param {string} tripId - 旅行计划ID
     */
    showDeleteConfirmModal(tripId) {
        this.deletingTripId = tripId;
        this.showModal('confirmModal');
    }

    /**
     * 显示模态框
     * @param {string} modalId - 模态框ID
     */
    showModal(modalId) {
        Modal.show(modalId);
    }

    /**
     * 隐藏模态框
     * @param {string} modalId - 模态框ID
     */
    hideModal(modalId) {
        Modal.hide(modalId);
        if (modalId === 'tripModal') {
            this.hideSuggestions();
        }
    }

    /**
     * 重置表单
     */
    resetForm() {
        this.elements.tripForm.reset();

        // 设置默认日期为今天
        const today = new Date().toISOString().split('T')[0];
        this.elements.startDate.value = today;

        // 结束日期默认为明天
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        this.elements.endDate.value = tomorrow.toISOString().split('T')[0];
    }

    /**
     * 填充表单
     * @param {object} trip - 旅行计划对象
     */
    fillForm(trip) {
        this.elements.tripTitle.value = trip.title || '';
        this.elements.tripDestination.value = trip.destination || '';
        this.elements.startDate.value = trip.startDate || '';
        this.elements.endDate.value = trip.endDate || '';
        this.elements.tripDescription.value = trip.description || '';
        this.elements.tripStatus.value = trip.status || 'planning';
    }

    /**
     * 处理表单提交
     * @param {Event} e - 提交事件
     */
    async handleFormSubmit(e) {
        e.preventDefault();

        try {
            // 收集表单数据
            const formData = this.collectFormData();

            // 验证表单
            const validation = this.validateTripForm(formData);
            if (!validation.isValid) {
                this.showValidationErrors(validation.errors);
                return;
            }

            // 显示加载状态
            Loading.show();

            // 获取位置坐标
            const coordinates = await this.getLocationCoordinates(formData.destination);

            // 准备旅行数据
            const tripData = {
                ...formData,
                coordinates
            };

            // 保存或更新旅行计划
            let result;
            if (this.editingTripId) {
                result = storage.updateTrip(this.editingTripId, tripData);
                if (result) {
                    Toast.success('旅行计划更新成功');
                }
            } else {
                result = storage.addTrip(tripData);
                if (result) {
                    Toast.success('旅行计划添加成功');
                }
            }

            if (result) {
                // 关闭模态框
                this.hideModal('tripModal');

                // 重新加载数据
                this.loadTrips();
            }

        } catch (error) {
            console.error('保存旅行计划失败:', error);
            Toast.error('保存失败: ' + error.message);
        } finally {
            Loading.hide();
        }
    }

    /**
     * 收集表单数据
     * @returns {object} 表单数据对象
     */
    collectFormData() {
        return {
            title: this.elements.tripTitle.value.trim(),
            destination: this.elements.tripDestination.value.trim(),
            startDate: this.elements.startDate.value,
            endDate: this.elements.endDate.value,
            description: this.elements.tripDescription.value.trim(),
            status: this.elements.tripStatus.value
        };
    }

    /**
     * 验证旅行表单
     * @param {object} formData - 表单数据
     * @returns {object} 验证结果
     */
    validateTripForm(formData) {
        const rules = {
            title: {
                required: true,
                minLength: 2,
                requiredMessage: '请输入旅行标题',
                minLengthMessage: '标题至少需要2个字符'
            },
            destination: {
                required: true,
                minLength: 2,
                requiredMessage: '请输入目的地',
                minLengthMessage: '目的地至少需要2个字符'
            },
            startDate: {
                required: true,
                isDate: true,
                requiredMessage: '请选择开始日期'
            },
            endDate: {
                required: true,
                isDate: true,
                requiredMessage: '请选择结束日期',
                validator: (value) => {
                    if (value && formData.startDate && new Date(value) < new Date(formData.startDate)) {
                        return '结束日期不能早于开始日期';
                    }
                    return true;
                }
            }
        };

        return validateForm(formData, rules);
    }

    /**
     * 显示验证错误
     * @param {object} errors - 错误对象
     */
    showValidationErrors(errors) {
        const firstError = Object.values(errors)[0];
        Toast.error(firstError);

        // 聚焦到第一个有错误的字段
        const firstErrorField = Object.keys(errors)[0];
        const fieldElement = this.elements[firstErrorField];
        if (fieldElement) {
            fieldElement.focus();
        }
    }

    /**
     * 获取位置坐标
     * @param {string} destination - 目的地
     * @returns {Promise<object|null>} 坐标对象
     */
    async getLocationCoordinates(destination) {
        try {
            const location = await amap.geocodeAddress(destination);
            return {
                lng: location.lng,
                lat: location.lat
            };
        } catch (error) {
            console.warn('获取位置坐标失败:', error);
            return null;
        }
    }

    /**
     * 处理目的地输入
     * @param {Event} e - 输入事件
     */
    async handleDestinationInput(e) {
        const keyword = e.target.value.trim();

        if (keyword.length < 2) {
            this.hideSuggestions();
            return;
        }

        try {
            const suggestions = await amap.searchPlaceSuggestions(keyword);
            this.showSuggestions(suggestions);
        } catch (error) {
            console.error('搜索地点建议失败:', error);
            this.hideSuggestions();
        }
    }

    /**
     * 显示位置建议
     * @param {Array} suggestions - 建议列表
     */
    showSuggestions(suggestions) {
        const container = this.elements.locationSuggestions;

        if (suggestions.length === 0) {
            this.hideSuggestions();
            return;
        }

        // 生成建议项HTML
        const html = suggestions.map(item => `
            <div class="suggestion-item" data-lng="${item.location.lng}" data-lat="${item.location.lat}">
                <strong>${this.escapeHtml(item.name)}</strong>
                ${item.address ? `<br><small>${this.escapeHtml(item.address)}</small>` : ''}
            </div>
        `).join('');

        DOM.setContent(container, html);
        container.style.display = 'block';

        // 绑定点击事件
        container.querySelectorAll('.suggestion-item').forEach(item => {
            DOM.on(item, 'click', () => {
                const name = item.querySelector('strong').textContent;
                this.elements.tripDestination.value = name;
                this.hideSuggestions();
            });
        });

        this.isLocationSuggestionsVisible = true;
    }

    /**
     * 隐藏位置建议
     */
    hideSuggestions() {
        this.elements.locationSuggestions.style.display = 'none';
        this.isLocationSuggestionsVisible = false;
    }

    /**
     * 处理筛选变化
     * @param {Event} e - 变化事件
     */
    handleFilterChange(e) {
        this.currentFilter = e.target.value;
        this.renderTrips();

        // 更新地图显示
        const filteredTrips = this.getFilteredTrips();
        amap.showTripsOnMap(filteredTrips);
    }

    /**
     * 确认删除
     */
    confirmDelete() {
        if (this.deletingTripId) {
            const success = storage.deleteTrip(this.deletingTripId);
            if (success) {
                Toast.success('旅行计划删除成功');
                this.loadTrips();
                this.hideModal('confirmModal');
            }
            this.deletingTripId = null;
        }
    }

    /**
     * 获取当前位置
     */
    async getCurrentLocation() {
        try {
            Loading.show();
            await amap.getCurrentLocation();
            Toast.success('定位成功');
        } catch (error) {
            console.error('定位失败:', error);
            Toast.error('定位失败，请检查定位权限');
        } finally {
            Loading.hide();
        }
    }

    /**
     * HTML转义
     * @param {string} text - 文本
     * @returns {string} 转义后的文本
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.travelApp = new TravelPlannerApp();
});