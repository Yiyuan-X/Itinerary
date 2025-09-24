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
            console.log('开始初始化应用程序...');

            // 显示加载指示器
            Loading.show();

            // 缓存DOM元素
            this.cacheElements();

            // 绑定事件监听器
            this.bindEvents();

            // 检查高德地图API是否加载
            if (typeof AMap !== 'undefined') {
                try {
                    // 初始化地图服务管理器
                    if (typeof AmapManager !== 'undefined') {
                        this.amap = new AmapManager();
                        console.log('地图服务初始化成功');
                    }
                } catch (mapError) {
                    console.warn('地图初始化失败:', mapError);
                }
            } else {
                console.warn('高德地图API未加载，跳过地图初始化');
            }

            // 检查认证状态
            if (typeof auth !== 'undefined' && auth.isAuthenticated) {
                // 加载用户数据
                await this.loadUserData();
            } else {
                // 显示欢迎页面
                this.showWelcomePage();
            }

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
            // 主要容器
            app: DOM.query('#app'),
            welcomeSection: DOM.query('#welcomeSection'),
            tripsSection: DOM.query('#tripsSection'),
            mapSection: DOM.query('#mapSection'),
            importSection: DOM.query('#importSection'),

            // 导航元素
            guestNav: DOM.query('#guestNav'),
            userNav: DOM.query('#userNav'),
            homeBtn: DOM.query('#homeBtn'),
            tripsBtn: DOM.query('#tripsBtn'),
            mapBtn: DOM.query('#mapBtn'),
            importBtn: DOM.query('#importBtn'),

            // 按钮
            loginBtn: DOM.query('#loginBtn'),
            registerBtn: DOM.query('#registerBtn'),
            logoutBtn: DOM.query('#logoutBtn'),
            startPlanningBtn: DOM.query('#startPlanningBtn'),
            addTripBtn: DOM.query('#addTripBtn'),

            // 表单相关
            authModal: DOM.query('#authModal'),
            loginForm: DOM.query('#loginForm'),
            registerForm: DOM.query('#registerForm'),
            authSwitchBtn: DOM.query('#authSwitchBtn'),
            closeAuthModal: DOM.query('#closeAuthModal'),

            // 行程相关
            tripModal: DOM.query('#tripModal'),
            tripForm: DOM.query('#tripForm'),
            closeTripModal: DOM.query('#closeTripModal'),
            tripsGrid: DOM.query('#tripsGrid'),
            emptyTripsState: DOM.query('#emptyTripsState'),

            // 地图相关
            mainMap: DOM.query('#mainMap')
        };

        // 记录找到和未找到的元素
        const foundElements = [];
        const missingElements = [];

        Object.entries(this.elements).forEach(([key, element]) => {
            if (element) {
                foundElements.push(key);
            } else {
                missingElements.push(key);
            }
        });

        console.log('找到的DOM元素:', foundElements);
        if (missingElements.length > 0) {
            console.warn('未找到的DOM元素:', missingElements);
        }
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 导航事件
        DOM.on(this.elements.loginBtn, 'click', () => this.showAuthModal('login'));
        DOM.on(this.elements.registerBtn, 'click', () => this.showAuthModal('register'));
        DOM.on(this.elements.logoutBtn, 'click', () => this.logout());
        DOM.on(this.elements.startPlanningBtn, 'click', () => this.showAuthModal('register'));

        // 导航菜单事件
        DOM.on(this.elements.homeBtn, 'click', () => this.showSection('welcome'));
        DOM.on(this.elements.tripsBtn, 'click', () => this.showSection('trips'));
        DOM.on(this.elements.mapBtn, 'click', () => this.showSection('map'));
        DOM.on(this.elements.importBtn, 'click', () => this.showSection('import'));

        // 模态框事件
        DOM.on(this.elements.closeAuthModal, 'click', () => this.hideAuthModal());
        DOM.on(this.elements.authSwitchBtn, 'click', () => this.switchAuthMode());

        // 行程管理事件
        DOM.on(this.elements.addTripBtn, 'click', () => this.showTripModal());
        DOM.on(this.elements.closeTripModal, 'click', () => this.hideTripModal());

        // 表单提交事件
        DOM.on(this.elements.loginForm, 'submit', (e) => this.handleLogin(e));
        DOM.on(this.elements.registerForm, 'submit', (e) => this.handleRegister(e));
        DOM.on(this.elements.tripForm, 'submit', (e) => this.handleTripSubmit(e));

        // 认证事件监听
        if (typeof auth !== 'undefined') {
            auth.on('authenticated', (user) => this.onUserAuthenticated(user));
            auth.on('logout', () => this.onUserLogout());
        }

        console.log('事件监听器绑定完成');
    }

    /**
     * 显示欢迎页面
     */
    showWelcomePage() {
        this.hideAllSections();
        DOM.show(this.elements.welcomeSection);
        DOM.hide(this.elements.userNav);
        DOM.show(this.elements.guestNav);
    }

    /**
     * 显示指定页面
     */
    showSection(sectionName) {
        this.hideAllSections();

        // 更新导航状态
        this.updateNavigation(sectionName);

        switch (sectionName) {
            case 'welcome':
                DOM.show(this.elements.welcomeSection);
                break;
            case 'trips':
                DOM.show(this.elements.tripsSection);
                this.loadTrips();
                break;
            case 'map':
                DOM.show(this.elements.mapSection);
                this.initializeMap();
                break;
            case 'import':
                DOM.show(this.elements.importSection);
                break;
        }
    }

    /**
     * 隐藏所有页面
     */
    hideAllSections() {
        DOM.hide(this.elements.welcomeSection);
        DOM.hide(this.elements.tripsSection);
        DOM.hide(this.elements.mapSection);
        DOM.hide(this.elements.importSection);
    }

    /**
     * 更新导航状态
     */
    updateNavigation(activeSection) {
        const navItems = DOM.queryAll('.nav-item');
        navItems.forEach(item => DOM.removeClass(item, 'active'));

        const activeNavItem = DOM.query(`#${activeSection}Btn`);
        if (activeNavItem) {
            DOM.addClass(activeNavItem, 'active');
        }
    }

    /**
     * 显示认证模态框
     */
    showAuthModal(mode = 'login') {
        if (!this.elements.authModal) return;

        Modal.show('authModal');

        if (mode === 'login') {
            DOM.show(this.elements.loginForm);
            DOM.hide(this.elements.registerForm);
            DOM.setContent(DOM.query('#authModalTitle'), '登录');
            DOM.setContent(DOM.query('#authSwitchText'), '还没有账号？');
            DOM.setContent(this.elements.authSwitchBtn, '立即注册');
        } else {
            DOM.hide(this.elements.loginForm);
            DOM.show(this.elements.registerForm);
            DOM.setContent(DOM.query('#authModalTitle'), '注册');
            DOM.setContent(DOM.query('#authSwitchText'), '已有账号？');
            DOM.setContent(this.elements.authSwitchBtn, '立即登录');
        }
    }

    /**
     * 隐藏认证模态框
     */
    hideAuthModal() {
        Modal.hide('authModal');
    }

    /**
     * 切换认证模式
     */
    switchAuthMode() {
        const isLoginVisible = !DOM.query('#loginForm').classList.contains('hidden');
        this.showAuthModal(isLoginVisible ? 'register' : 'login');
    }

    /**
     * 处理登录
     */
    async handleLogin(event) {
        event.preventDefault();

        try {
            const formData = new FormData(event.target);
            const email = formData.get('email');
            const password = formData.get('password');
            const rememberMe = formData.get('rememberMe') === 'on';

            if (typeof auth !== 'undefined') {
                await auth.login(email, password, rememberMe);
                this.hideAuthModal();
                Toast.success('登录成功！');
            } else {
                // 模拟登录成功
                console.log('模拟登录:', { email, password, rememberMe });
                this.onUserAuthenticated({ email, name: '测试用户' });
                this.hideAuthModal();
                Toast.success('登录成功！');
            }
        } catch (error) {
            console.error('登录失败:', error);
            Toast.error('登录失败，请检查用户名和密码');
        }
    }

    /**
     * 处理注册
     */
    async handleRegister(event) {
        event.preventDefault();

        try {
            const formData = new FormData(event.target);
            const userData = {
                username: formData.get('username'),
                email: formData.get('email'),
                password: formData.get('password')
            };

            if (typeof auth !== 'undefined') {
                await auth.register(userData);
                this.hideAuthModal();
                Toast.success('注册成功！');
            } else {
                // 模拟注册成功
                console.log('模拟注册:', userData);
                this.onUserAuthenticated({ email: userData.email, name: userData.username });
                this.hideAuthModal();
                Toast.success('注册成功！');
            }
        } catch (error) {
            console.error('注册失败:', error);
            Toast.error('注册失败，请稍后重试');
        }
    }

    /**
     * 用户认证成功处理
     */
    onUserAuthenticated(user) {
        console.log('用户已认证:', user);

        // 切换导航显示
        DOM.hide(this.elements.guestNav);
        DOM.show(this.elements.userNav);

        // 显示行程页面
        this.showSection('trips');

        // 加载用户数据
        this.loadUserData();
    }

    /**
     * 用户登出处理
     */
    onUserLogout() {
        console.log('用户已登出');

        // 切换导航显示
        DOM.show(this.elements.guestNav);
        DOM.hide(this.elements.userNav);

        // 显示欢迎页面
        this.showWelcomePage();

        Toast.success('已退出登录');
    }

    /**
     * 登出
     */
    async logout() {
        try {
            if (typeof auth !== 'undefined') {
                await auth.logout();
            } else {
                // 模拟登出
                this.onUserLogout();
            }
        } catch (error) {
            console.error('登出失败:', error);
            Toast.error('登出失败');
        }
    }

    /**
     * 加载用户数据
     */
    async loadUserData() {
        try {
            // 加载行程数据
            if (typeof tripManager !== 'undefined') {
                await tripManager.loadTrips();
            }

            console.log('用户数据加载完成');
        } catch (error) {
            console.error('加载用户数据失败:', error);
        }
    }

    /**
     * 加载行程列表
     */
    async loadTrips() {
        try {
            if (typeof tripManager !== 'undefined') {
                const trips = await tripManager.loadTrips();
                this.renderTrips(trips);
            } else {
                // 显示模拟数据
                this.renderTrips([]);
            }
        } catch (error) {
            console.error('加载行程失败:', error);
            Toast.error('加载行程失败');
        }
    }

    /**
     * 渲染行程列表
     */
    renderTrips(trips) {
        if (!this.elements.tripsGrid) return;

        if (trips.length === 0) {
            DOM.show(this.elements.emptyTripsState);
            DOM.hide(this.elements.tripsGrid);
        } else {
            DOM.hide(this.elements.emptyTripsState);
            DOM.show(this.elements.tripsGrid);

            const tripCards = trips.map(trip => this.createTripCard(trip)).join('');
            DOM.setContent(this.elements.tripsGrid, tripCards);
        }
    }

    /**
     * 创建行程卡片
     */
    createTripCard(trip) {
        return `
            <div class="trip-card" data-trip-id="${trip.id}">
                <div class="trip-header">
                    <h3 class="trip-title">${trip.title}</h3>
                    <span class="trip-status ${trip.status}">${trip.status}</span>
                </div>
                <div class="trip-dates">
                    ${formatDate(trip.start_date)} - ${formatDate(trip.end_date)}
                </div>
                <div class="trip-description">${trip.description || ''}</div>
                <div class="trip-actions">
                    <button class="btn btn-outline" onclick="app.editTrip(${trip.id})">编辑</button>
                    <button class="btn btn-primary" onclick="app.viewTrip(${trip.id})">查看</button>
                </div>
            </div>
        `;
    }

    /**
     * 显示行程模态框
     */
    showTripModal(trip = null) {
        if (!this.elements.tripModal) return;

        Modal.show('tripModal');

        if (trip) {
            this.editingTripId = trip.id;
            DOM.setContent(DOM.query('#tripModalTitle'), '编辑行程');
            // 填充表单数据
            this.fillTripForm(trip);
        } else {
            this.editingTripId = null;
            DOM.setContent(DOM.query('#tripModalTitle'), '新建行程');
            // 清空表单
            this.clearTripForm();
        }
    }

    /**
     * 隐藏行程模态框
     */
    hideTripModal() {
        Modal.hide('tripModal');
    }

    /**
     * 处理行程表单提交
     */
    async handleTripSubmit(event) {
        event.preventDefault();

        try {
            const formData = new FormData(event.target);
            const tripData = {
                title: formData.get('title'),
                description: formData.get('description'),
                start_date: formData.get('start_date'),
                end_date: formData.get('end_date'),
                status: formData.get('status') || 'planning'
            };

            if (typeof tripManager !== 'undefined') {
                if (this.editingTripId) {
                    await tripManager.updateTrip(this.editingTripId, tripData);
                    Toast.success('行程更新成功！');
                } else {
                    await tripManager.createTrip(tripData);
                    Toast.success('行程创建成功！');
                }
            } else {
                console.log('模拟行程操作:', tripData);
                Toast.success(this.editingTripId ? '行程更新成功！' : '行程创建成功！');
            }

            this.hideTripModal();
            this.loadTrips();
        } catch (error) {
            console.error('行程操作失败:', error);
            Toast.error('操作失败，请稍后重试');
        }
    }

    /**
     * 填充行程表单
     */
    fillTripForm(trip) {
        if (!this.elements.tripForm) return;

        const form = this.elements.tripForm;
        const titleInput = DOM.query('#tripTitle', form);
        const descInput = DOM.query('#tripDescription', form);
        const startDateInput = DOM.query('#tripStartDate', form);
        const endDateInput = DOM.query('#tripEndDate', form);

        if (titleInput) titleInput.value = trip.title || '';
        if (descInput) descInput.value = trip.description || '';
        if (startDateInput) startDateInput.value = trip.start_date || '';
        if (endDateInput) endDateInput.value = trip.end_date || '';
    }

    /**
     * 清空行程表单
     */
    clearTripForm() {
        if (!this.elements.tripForm) return;
        this.elements.tripForm.reset();
    }

    /**
     * 初始化地图
     */
    async initializeMap() {
        try {
            if (!this.elements.mainMap) {
                console.warn('地图容器不存在');
                return;
            }

            if (this.amap && !this.amap.isInitialized) {
                await this.amap.initMap('mainMap');
                console.log('地图初始化成功');
            }
        } catch (error) {
            console.error('地图初始化失败:', error);
            Toast.error('地图加载失败');
        }
    }

    /**
     * 编辑行程
     */
    editTrip(tripId) {
        console.log('编辑行程:', tripId);
        // TODO: 实现编辑逻辑
    }

    /**
     * 查看行程
     */
    viewTrip(tripId) {
        console.log('查看行程:', tripId);
        // TODO: 实现查看逻辑
    }
}

// 创建全局应用实例
let app = null;

// 导出应用类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TravelPlannerApp;
}