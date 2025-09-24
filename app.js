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

            // 隐藏全局加载器
            this.hideGlobalLoader();

            // 显示加载指示器
            Loading.show();

            // 等待DOM完全加载（额外保险）
            await this.waitForDOM();

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
            this.hideGlobalLoader();
            Loading.hide();
            Toast.error('应用初始化失败，请刷新页面重试');
        }
    }

    /**
     * 等待DOM完全加载
     */
    async waitForDOM() {
        return new Promise((resolve) => {
            if (document.readyState === 'complete') {
                resolve();
            } else {
                const checkDOM = () => {
                    if (document.readyState === 'complete') {
                        resolve();
                    } else {
                        setTimeout(checkDOM, 10);
                    }
                };
                checkDOM();
            }
        });
    }

    /**
     * 隐藏全局加载器
     */
    hideGlobalLoader() {
        const globalLoader = DOM.query('#globalLoader');
        if (globalLoader) {
            DOM.hide(globalLoader);
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
        console.log('开始绑定事件监听器...');

        // 安全的事件绑定函数
        const bindEvent = (element, elementName, event, handler) => {
            if (element) {
                element.addEventListener(event, handler);
                console.log(`✓ 成功绑定事件: ${elementName} -> ${event}`);
                return true;
            } else {
                console.warn(`✗ 无法绑定事件: ${elementName} (元素不存在)`);
                return false;
            }
        };

        // 导航事件
        bindEvent(this.elements.loginBtn, 'loginBtn', 'click', () => {
            console.log('登录按钮被点击');
            this.showAuthModal('login');
        });

        bindEvent(this.elements.registerBtn, 'registerBtn', 'click', () => {
            console.log('注册按钮被点击');
            this.showAuthModal('register');
        });

        bindEvent(this.elements.logoutBtn, 'logoutBtn', 'click', () => {
            console.log('登出按钮被点击');
            this.logout();
        });

        bindEvent(this.elements.startPlanningBtn, 'startPlanningBtn', 'click', () => {
            console.log('开始规划按钮被点击');
            this.showAuthModal('register');
        });

        // 导航菜单事件
        bindEvent(this.elements.homeBtn, 'homeBtn', 'click', () => this.showSection('welcome'));
        bindEvent(this.elements.tripsBtn, 'tripsBtn', 'click', () => this.showSection('trips'));
        bindEvent(this.elements.mapBtn, 'mapBtn', 'click', () => this.showSection('map'));
        bindEvent(this.elements.importBtn, 'importBtn', 'click', () => this.showSection('import'));

        // 模态框事件
        bindEvent(this.elements.closeAuthModal, 'closeAuthModal', 'click', () => this.hideAuthModal());
        bindEvent(this.elements.authSwitchBtn, 'authSwitchBtn', 'click', () => this.switchAuthMode());

        // 行程管理事件
        bindEvent(this.elements.addTripBtn, 'addTripBtn', 'click', () => this.showTripModal());
        bindEvent(this.elements.closeTripModal, 'closeTripModal', 'click', () => this.hideTripModal());

        // 表单提交事件
        bindEvent(this.elements.loginForm, 'loginForm', 'submit', (e) => this.handleLogin(e));
        bindEvent(this.elements.registerForm, 'registerForm', 'submit', (e) => this.handleRegister(e));
        bindEvent(this.elements.tripForm, 'tripForm', 'submit', (e) => this.handleTripSubmit(e));

        // 认证事件监听
        if (typeof auth !== 'undefined') {
            auth.on('authenticated', (user) => this.onUserAuthenticated(user));
            auth.on('logout', () => this.onUserLogout());
        }

        // 额外的直接事件绑定（备用方案）
        this.bindDirectEvents();

        console.log('事件监听器绑定完成');
    }

    /**
     * 直接绑定事件（备用方案）
     */
    bindDirectEvents() {
        // 直接通过ID查找并绑定事件
        const directBindings = [
            { id: 'loginBtn', handler: () => this.showAuthModal('login') },
            { id: 'registerBtn', handler: () => this.showAuthModal('register') },
            { id: 'startPlanningBtn', handler: () => this.showAuthModal('register') },
            { id: 'logoutBtn', handler: () => this.logout() },
            { id: 'addTripBtn', handler: () => this.showTripModal() }
        ];

        directBindings.forEach(({ id, handler }) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('click', handler);
                console.log(`✓ 直接绑定成功: ${id}`);
            } else {
                console.warn(`✗ 直接绑定失败: ${id} (元素不存在)`);
            }
        });

        // 为空状态按钮绑定事件
        const emptyStateBtn = document.querySelector('#emptyTripsState .btn');
        if (emptyStateBtn) {
            emptyStateBtn.addEventListener('click', () => this.showTripModal());
            console.log('✓ 空状态按钮绑定成功');
        }
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
        console.log(`显示认证模态框: ${mode}`);

        const authModal = this.elements.authModal || DOM.query('#authModal');
        if (!authModal) {
            console.error('找不到认证模态框元素 #authModal');
            // 创建简单的提示
            alert(`${mode === 'login' ? '登录' : '注册'}功能正在开发中...`);
            return;
        }

        // 使用多种方式尝试显示模态框
        try {
            // 方式1：使用Modal工具
            if (typeof Modal !== 'undefined') {
                Modal.show('authModal');
            } else {
                // 方式2：直接操作DOM
                authModal.style.display = 'flex';
                authModal.classList.add('show');
                authModal.classList.remove('hidden');
            }

            // 更新模态框内容
            const loginForm = this.elements.loginForm || DOM.query('#loginForm');
            const registerForm = this.elements.registerForm || DOM.query('#registerForm');
            const modalTitle = DOM.query('#authModalTitle');
            const switchText = DOM.query('#authSwitchText');
            const switchBtn = this.elements.authSwitchBtn || DOM.query('#authSwitchBtn');

            if (mode === 'login') {
                if (loginForm) loginForm.classList.remove('hidden');
                if (registerForm) registerForm.classList.add('hidden');
                if (modalTitle) modalTitle.textContent = '登录';
                if (switchText) switchText.textContent = '还没有账号？';
                if (switchBtn) switchBtn.textContent = '立即注册';
            } else {
                if (loginForm) loginForm.classList.add('hidden');
                if (registerForm) registerForm.classList.remove('hidden');
                if (modalTitle) modalTitle.textContent = '注册';
                if (switchText) switchText.textContent = '已有账号？';
                if (switchBtn) switchBtn.textContent = '立即登录';
            }

            console.log('认证模态框显示成功');
        } catch (error) {
            console.error('显示模态框失败:', error);
            // 备用方案：使用alert
            alert(`${mode === 'login' ? '登录' : '注册'}功能正在开发中...`);
        }
    }

    /**
     * 隐藏认证模态框
     */
    hideAuthModal() {
        console.log('隐藏认证模态框');

        const authModal = this.elements.authModal || DOM.query('#authModal');
        if (authModal) {
            // 使用多种方式尝试隐藏模态框
            if (typeof Modal !== 'undefined') {
                Modal.hide('authModal');
            } else {
                // 直接操作DOM
                authModal.style.display = 'none';
                authModal.classList.remove('show');
                authModal.classList.add('hidden');
            }
            console.log('认证模态框隐藏成功');
        }
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
        console.log('处理登录表单提交');

        try {
            const formData = new FormData(event.target);

            // 获取表单数据
            const loginData = {
                email: formData.get('email'),
                password: formData.get('password'),
                rememberMe: formData.get('rememberMe') === 'on'
            };

            console.log('登录数据:', { ...loginData, password: '***' }); // 隐藏密码

            // 基本验证
            if (!loginData.email || !loginData.password) {
                Toast.error('请填写邮箱和密码');
                return;
            }

            // 邮箱格式验证
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(loginData.email)) {
                Toast.error('请输入有效的邮箱地址');
                return;
            }

            console.log('表单验证通过，开始登录...');

            if (typeof auth !== 'undefined') {
                await auth.login(loginData.email, loginData.password, loginData.rememberMe);
                this.hideAuthModal();
                Toast.success('登录成功！');
            } else {
                // 模拟登录成功
                console.log('模拟登录成功');

                // 模拟延迟
                setTimeout(() => {
                    this.onUserAuthenticated({
                        email: loginData.email,
                        name: loginData.email.split('@')[0], // 使用邮箱前缀作为用户名
                        id: generateId ? generateId() : Date.now().toString()
                    });
                    this.hideAuthModal();
                    Toast.success('登录成功！欢迎回来！');
                }, 500);
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
        console.log('处理注册表单提交');

        try {
            const formData = new FormData(event.target);

            // 获取表单数据
            const userData = {
                username: formData.get('username'),
                email: formData.get('email'),
                password: formData.get('password'),
                confirmPassword: formData.get('confirmPassword'),
                agreeTerms: formData.get('agreeTerms') === 'on'
            };

            console.log('注册数据:', userData);

            // 基本验证
            if (!userData.username || !userData.email || !userData.password || !userData.confirmPassword) {
                Toast.error('请填写所有必填字段');
                return;
            }

            if (userData.password !== userData.confirmPassword) {
                Toast.error('两次输入的密码不一致');
                return;
            }

            if (userData.password.length < 6) {
                Toast.error('密码长度至少6位');
                return;
            }

            if (!userData.agreeTerms) {
                Toast.error('请同意用户协议和隐私政策');
                return;
            }

            // 邮箱格式验证
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(userData.email)) {
                Toast.error('请输入有效的邮箱地址');
                return;
            }

            console.log('表单验证通过，开始注册...');

            if (typeof auth !== 'undefined') {
                await auth.register(userData);
                this.hideAuthModal();
                Toast.success('注册成功！');
            } else {
                // 模拟注册成功
                console.log('模拟注册成功:', userData);

                // 模拟延迟
                setTimeout(() => {
                    this.onUserAuthenticated({
                        email: userData.email,
                        name: userData.username,
                        id: generateId ? generateId() : Date.now().toString()
                    });
                    this.hideAuthModal();
                    Toast.success('注册成功！欢迎使用智能行程规划器！');
                }, 500);
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
            console.log('开始加载行程列表...');

            if (typeof tripManager !== 'undefined') {
                const trips = await tripManager.loadTrips();
                this.renderTrips(trips);
                console.log('从tripManager加载了', trips.length, '个行程');
            } else {
                // 从本地存储加载行程数据
                try {
                    const trips = JSON.parse(localStorage.getItem('trips') || '[]');
                    this.renderTrips(trips);
                    console.log('从localStorage加载了', trips.length, '个行程:', trips);
                } catch (storageError) {
                    console.error('本地存储读取失败:', storageError);
                    this.renderTrips([]);
                    Toast.error('加载行程数据失败');
                }
            }
        } catch (error) {
            console.error('加载行程失败:', error);
            Toast.error('加载行程失败: ' + error.message);
        }
    }

    /**
     * 渲染行程列表
     */
    renderTrips(trips) {
        console.log('渲染行程列表, 行程数量:', trips.length);

        if (!this.elements.tripsGrid) {
            console.warn('找不到行程网格元素 #tripsGrid');
            return;
        }

        if (trips.length === 0) {
            console.log('没有行程数据，显示空状态');
            if (this.elements.emptyTripsState) {
                DOM.show(this.elements.emptyTripsState);
            }
            DOM.hide(this.elements.tripsGrid);
        } else {
            console.log('有行程数据，渲染行程卡片');
            if (this.elements.emptyTripsState) {
                DOM.hide(this.elements.emptyTripsState);
            }
            DOM.show(this.elements.tripsGrid);

            try {
                const tripCards = trips.map(trip => this.createTripCard(trip)).join('');
                DOM.setContent(this.elements.tripsGrid, tripCards);
                console.log('成功渲染了', trips.length, '个行程卡片');
            } catch (error) {
                console.error('渲染行程卡片失败:', error);
                Toast.error('渲染行程列表失败');
            }
        }
    }

    /**
     * 创建行程卡片
     */
    createTripCard(trip) {
        console.log('创建行程卡片:', trip);

        // 安全地获取日期字符串
        const startDate = trip.start_date || '';
        const endDate = trip.end_date || '';

        // 格式化日期显示
        let dateDisplay = '';
        try {
            if (startDate && endDate) {
                if (typeof formatDate === 'function') {
                    dateDisplay = `${formatDate(startDate)} - ${formatDate(endDate)}`;
                } else {
                    // 简单的日期格式化
                    dateDisplay = `${startDate} - ${endDate}`;
                }
            } else if (startDate) {
                dateDisplay = startDate;
            }
        } catch (error) {
            console.warn('日期格式化失败:', error);
            dateDisplay = `${startDate} - ${endDate}`;
        }

        // 状态显示文本
        const statusText = {
            'planning': '规划中',
            'confirmed': '已确认',
            'ongoing': '进行中',
            'completed': '已完成'
        }[trip.status] || trip.status || '规划中';

        return `
            <div class="trip-card" data-trip-id="${trip.id || ''}">
                <div class="trip-header">
                    <h3 class="trip-title">${trip.title || '未命名行程'}</h3>
                    <span class="trip-status ${trip.status || 'planning'}">${statusText}</span>
                </div>
                <div class="trip-dates">
                    ${dateDisplay}
                </div>
                <div class="trip-description">${trip.description || ''}</div>
                <div class="trip-actions">
                    <button class="btn btn-outline" onclick="app.editTrip('${trip.id}')">编辑</button>
                    <button class="btn btn-primary" onclick="app.viewTrip('${trip.id}')">查看</button>
                    <button class="btn btn-danger" onclick="app.deleteTrip('${trip.id}')">删除</button>
                </div>
            </div>
        `;
    }

    /**
     * 显示行程模态框
     */
    showTripModal(trip = null) {
        console.log('显示行程模态框', trip ? '(编辑模式)' : '(新建模式)');

        const tripModal = this.elements.tripModal || DOM.query('#tripModal');
        if (!tripModal) {
            console.error('找不到行程模态框元素 #tripModal');
            Toast.error('行程模态框不可用，请刷新页面后重试');
            return;
        }

        try {
            // 显示模态框
            if (typeof Modal !== 'undefined') {
                Modal.show('tripModal');
                console.log('使用Modal工具显示模态框');
            } else {
                // 直接操作DOM
                tripModal.style.display = 'flex';
                tripModal.classList.add('show');
                tripModal.classList.remove('hidden');
                console.log('直接操作DOM显示模态框');
            }

            // 更新模态框标题和内容
            const modalTitle = DOM.query('#tripModalTitle');
            if (trip) {
                this.editingTripId = trip.id;
                if (modalTitle) modalTitle.textContent = '编辑行程';
                this.fillTripForm(trip);
                console.log('填充编辑数据:', trip);
            } else {
                this.editingTripId = null;
                if (modalTitle) modalTitle.textContent = '新建行程';
                this.clearTripForm();
                console.log('清空表单，准备新建行程');
            }

            // 验证表单元素是否存在
            const tripForm = this.elements.tripForm || DOM.query('#tripForm');
            if (!tripForm) {
                console.error('找不到行程表单元素 #tripForm');
                Toast.error('行程表单不可用');
                return;
            }

            console.log('行程模态框显示成功');
            Toast.success(trip ? '行程编辑器已打开' : '新建行程窗口已打开');
        } catch (error) {
            console.error('显示行程模态框失败:', error);
            Toast.error('显示行程模态框失败，请刷新页面后重试');
        }
    }

    /**
     * 隐藏行程模态框
     */
    hideTripModal() {
        console.log('隐藏行程模态框');

        const tripModal = this.elements.tripModal || DOM.query('#tripModal');
        if (tripModal) {
            if (typeof Modal !== 'undefined') {
                Modal.hide('tripModal');
            } else {
                tripModal.style.display = 'none';
                tripModal.classList.remove('show');
                tripModal.classList.add('hidden');
            }
            console.log('行程模态框隐藏成功');
        }
    }

    /**
     * 处理行程表单提交
     */
    async handleTripSubmit(event) {
        event.preventDefault();
        console.log('处理行程表单提交');

        try {
            // 显示加载状态
            const submitBtn = event.target.querySelector('button[type="submit"]');
            const originalText = submitBtn ? submitBtn.textContent : '';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = '保存中...';
            }

            const formData = new FormData(event.target);

            // 获取表单数据
            const tripData = {
                title: formData.get('title'),
                description: formData.get('description'),
                start_date: formData.get('start_date'),
                end_date: formData.get('end_date'),
                status: formData.get('status') || 'planning'
            };

            console.log('行程数据:', tripData);

            // 检查FormData是否正确获取到值
            console.log('FormData调试信息:');
            for (const [key, value] of formData.entries()) {
                console.log(`  ${key}: ${value}`);
            }

            // 基本验证
            if (!tripData.title || !tripData.start_date || !tripData.end_date) {
                Toast.error('请填写行程标题、开始日期和结束日期');
                return;
            }

            // 检查字段长度
            if (tripData.title.trim().length === 0) {
                Toast.error('行程标题不能为空');
                return;
            }

            if (tripData.title.length > 100) {
                Toast.error('行程标题不能超过100个字符');
                return;
            }

            // 日期验证
            const startDate = new Date(tripData.start_date);
            const endDate = new Date(tripData.end_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                Toast.error('请输入有效的日期');
                return;
            }

            if (startDate > endDate) {
                Toast.error('开始日期不能晚于结束日期');
                return;
            }

            // 检查日期是否太久远
            if (startDate < new Date('1900-01-01') || endDate > new Date('2099-12-31')) {
                Toast.error('请输入合理的日期范围');
                return;
            }

            console.log('表单验证通过，开始保存行程...');

            if (typeof tripManager !== 'undefined') {
                if (this.editingTripId) {
                    await tripManager.updateTrip(this.editingTripId, tripData);
                    Toast.success('行程更新成功！');
                } else {
                    await tripManager.createTrip(tripData);
                    Toast.success('行程创建成功！');
                }

                // 关闭模态框
                this.hideTripModal();

                // 刷新行程列表（如果在行程页面）
                if (document.querySelector('#tripsSection:not(.hidden)')) {
                    this.loadTrips();
                }
            } else {
                // 模拟行程操作
                console.log('tripManager不存在，使用模拟操作:', tripData);

                // 生成行程ID
                const tripId = this.editingTripId || (typeof generateId === 'function' ? generateId() : Date.now().toString());

                // 创建完整的行程对象
                const fullTripData = {
                    ...tripData,
                    id: tripId,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                // 保存到本地存储（模拟）
                try {
                    const existingTrips = JSON.parse(localStorage.getItem('trips') || '[]');

                    if (this.editingTripId) {
                        // 更新现有行程
                        const index = existingTrips.findIndex(trip => trip.id === this.editingTripId);
                        if (index !== -1) {
                            existingTrips[index] = { ...existingTrips[index], ...tripData, updated_at: new Date().toISOString() };
                        }
                        console.log('更新行程到本地存储');
                    } else {
                        // 添加新行程
                        existingTrips.push(fullTripData);
                        console.log('添加新行程到本地存储');
                    }

                    localStorage.setItem('trips', JSON.stringify(existingTrips));

                    const operation = this.editingTripId ? '更新' : '创建';
                    console.log(`${operation}行程成功，ID: ${tripId}`);

                    // 显示成功消息
                    Toast.success(`行程${operation}成功！`);

                    // 关闭模态框
                    this.hideTripModal();

                    // 刷新行程列表（如果在行程页面）
                    if (document.querySelector('#tripsSection:not(.hidden)')) {
                        this.loadTrips();
                    }
                } catch (storageError) {
                    console.error('本地存储操作失败:', storageError);
                    Toast.error('保存失败，请检查浏览器存储权限');
                }
            }

        } catch (error) {
            console.error('行程操作失败:', error);
            Toast.error('操作失败：' + error.message);
        } finally {
            // 恢复按钮状态
            const submitBtn = event.target.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText || '保存行程';
            }
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

        try {
            // 从本地存储中查找行程
            const trips = JSON.parse(localStorage.getItem('trips') || '[]');
            const trip = trips.find(t => t.id === tripId);

            if (trip) {
                this.showTripModal(trip);
            } else {
                console.error('未找到指定行程ID:', tripId);
                Toast.error('未找到指定的行程');
            }
        } catch (error) {
            console.error('编辑行程失败:', error);
            Toast.error('编辑行程失败');
        }
    }

    /**
     * 查看行程
     */
    viewTrip(tripId) {
        console.log('查看行程:', tripId);
        // TODO: 实现查看逻辑
        Toast.info('查看行程功能正在开发中...');
    }

    /**
     * 删除行程
     */
    async deleteTrip(tripId) {
        console.log('删除行程:', tripId);

        try {
            // 确认删除
            if (!confirm('确定要删除这个行程吗？此操作不可恢复。')) {
                return;
            }

            if (typeof tripManager !== 'undefined') {
                await tripManager.deleteTrip(tripId);
            } else {
                // 从本地存储中删除
                const trips = JSON.parse(localStorage.getItem('trips') || '[]');
                const filteredTrips = trips.filter(t => t.id !== tripId);
                localStorage.setItem('trips', JSON.stringify(filteredTrips));
            }

            Toast.success('行程删除成功');

            // 刷新行程列表
            if (document.querySelector('#tripsSection:not(.hidden)')) {
                this.loadTrips();
            }
        } catch (error) {
            console.error('删除行程失败:', error);
            Toast.error('删除行程失败');
        }
    }
}

// 创建全局应用实例
let app = null;

// 导出应用类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TravelPlannerApp;
}