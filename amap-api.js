/**
 * 高德地图API封装模块
 * 提供地图相关功能的统一接口
 */

class AmapManager {
    constructor() {
        this.map = null;
        this.markers = [];
        this.polylines = [];
        this.infoWindows = [];
        this.autoCompleteService = null;
        this.placeSearchService = null;
        this.geocoder = null;
        this.geolocation = null;
        this.drivingService = null;
        this.walkingService = null;
        this.transitService = null;
        this.isInitialized = false;

        // 地图配置
        this.mapConfig = {
            center: [116.397428, 39.90923], // 北京天安门
            zoom: 10,
            viewMode: '3D',
            mapStyle: 'amap://styles/normal',
            resizeEnable: true,
            rotateEnable: true,
            pitchEnable: true,
            zoomEnable: true,
            dragEnable: true
        };

        // 标记样式配置
        this.markerStyles = {
            transport: {
                icon: '//a.amap.com/jsapi_demos/static/demo-center/icons/poi-marker-red.png',
                size: [25, 34]
            },
            accommodation: {
                icon: '//a.amap.com/jsapi_demos/static/demo-center/icons/poi-marker-blue.png',
                size: [25, 34]
            },
            activity: {
                icon: '//a.amap.com/jsapi_demos/static/demo-center/icons/poi-marker-green.png',
                size: [25, 34]
            },
            attraction: {
                icon: '//a.amap.com/jsapi_demos/static/demo-center/icons/poi-marker-yellow.png',
                size: [25, 34]
            },
            default: {
                icon: '//a.amap.com/jsapi_demos/static/demo-center/icons/poi-marker-default.png',
                size: [25, 34]
            }
        };

        // 路线样式配置
        this.routeStyles = {
            driving: {
                strokeColor: '#3b82f6',
                strokeWeight: 6,
                strokeOpacity: 0.8
            },
            walking: {
                strokeColor: '#10b981',
                strokeWeight: 4,
                strokeOpacity: 0.8,
                strokeStyle: 'dashed'
            },
            transit: {
                strokeColor: '#f59e0b',
                strokeWeight: 5,
                strokeOpacity: 0.8
            }
        };

        // 事件监听器
        this.eventListeners = new Map();
    }

    /**
     * 初始化地图
     * @param {string} containerId - 地图容器ID
     * @returns {Promise<boolean>} 初始化是否成功
     */
    async initMap(containerId = 'map') {
        try {
            if (!window.AMap) {
                throw new Error('高德地图API未加载');
            }

            // 创建地图实例
            this.map = new AMap.Map(containerId, this.mapConfig);

            // 添加地图控件
            this.addMapControls();

            // 初始化服务
            await this.initServices();

            // 尝试定位到用户当前位置
            await this.getCurrentLocation();

            this.isInitialized = true;
            console.log('地图初始化成功');
            return true;

        } catch (error) {
            console.error('地图初始化失败:', error);
            Toast.error('地图初始化失败，请检查网络连接');
            return false;
        }
    }

    /**
     * 添加地图控件
     */
    addMapControls() {
        // 缩放控件
        const zoom = new AMap.Scale({
            position: 'LB'
        });
        this.map.addControl(zoom);

        // 工具条
        const toolBar = new AMap.ToolBar({
            position: 'RT'
        });
        this.map.addControl(toolBar);

        // 鹰眼控件
        const overView = new AMap.HawkEye({
            isOpen: false,
            visible: false
        });
        this.map.addControl(overView);
    }

    /**
     * 初始化服务
     */
    async initServices() {
        return new Promise((resolve, reject) => {
            AMap.plugin([
                'AMap.AutoComplete',
                'AMap.PlaceSearch',
                'AMap.Geocoder',
                'AMap.Geolocation',
                'AMap.Driving',
                'AMap.Walking',
                'AMap.Transfer',
                'AMap.Weather'
            ], () => {
                try {
                    // 初始化自动完成服务
                    this.autoCompleteService = new AMap.AutoComplete({
                        city: '全国',
                        citylimit: false
                    });

                    // 初始化地点搜索服务
                    this.placeSearchService = new AMap.PlaceSearch({
                        city: '全国',
                        citylimit: false,
                        pageSize: 20
                    });

                    // 初始化地理编码服务
                    this.geocoder = new AMap.Geocoder({
                        city: '全国',
                        radius: 1000
                    });

                    // 初始化定位服务
                    this.geolocation = new AMap.Geolocation({
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 0,
                        convert: true,
                        showButton: true,
                        buttonPosition: 'LB',
                        showMarker: true,
                        showCircle: true
                    });

                    // 初始化路线规划服务
                    this.drivingService = new AMap.Driving({
                        policy: AMap.DrivingPolicy.LEAST_TIME,
                        ferry: 1,
                        map: this.map
                    });

                    this.walkingService = new AMap.Walking({
                        map: this.map
                    });

                    this.transitService = new AMap.Transfer({
                        city: '北京',
                        policy: AMap.TransferPolicy.LEAST_TIME,
                        map: this.map
                    });

                    console.log('地图服务初始化完成');
                    resolve();
                } catch (error) {
                    console.error('地图服务初始化失败:', error);
                    reject(error);
                }
            });
        });
    }

    /**
     * 地理编码 - 将地址转换为经纬度
     * @param {string} address - 地址
     * @param {string} city - 城市（可选）
     * @returns {Promise<Object>} 编码结果
     */
    async geocode(address, city = null) {
        return new Promise((resolve, reject) => {
            if (!this.geocoder) {
                reject(new Error('地理编码服务未初始化'));
                return;
            }

            const options = { address };
            if (city) {
                options.city = city;
            }

            this.geocoder.getLocation(options, (status, result) => {
                if (status === 'complete' && result.geocodes.length > 0) {
                    const location = result.geocodes[0];
                    resolve({
                        location: location.location,
                        formattedAddress: location.formattedAddress,
                        addressComponents: location.addressComponent,
                        level: location.level
                    });
                } else {
                    reject(new Error('地理编码失败'));
                }
            });
        });
    }

    /**
     * 逆地理编码 - 将经纬度转换为地址
     * @param {Array|AMap.LngLat} location - 经纬度
     * @returns {Promise<Object>} 解码结果
     */
    async regeocode(location) {
        return new Promise((resolve, reject) => {
            if (!this.geocoder) {
                reject(new Error('地理编码服务未初始化'));
                return;
            }

            this.geocoder.getAddress(location, (status, result) => {
                if (status === 'complete' && result.regeocode) {
                    const regeocode = result.regeocode;
                    resolve({
                        formattedAddress: regeocode.formattedAddress,
                        addressComponents: regeocode.addressComponent,
                        crosses: regeocode.crosses,
                        pois: regeocode.pois
                    });
                } else {
                    reject(new Error('逆地理编码失败'));
                }
            });
        });
    }

    /**
     * 搜索地点
     * @param {string} keyword - 搜索关键词
     * @param {string} city - 搜索城市（可选）
     * @param {Object} options - 搜索选项
     * @returns {Promise<Array>} 搜索结果
     */
    async searchPlaces(keyword, city = null, options = {}) {
        return new Promise((resolve, reject) => {
            if (!this.placeSearchService) {
                reject(new Error('地点搜索服务未初始化'));
                return;
            }

            // 设置搜索城市
            if (city) {
                this.placeSearchService.setCity(city);
            }

            this.placeSearchService.search(keyword, (status, result) => {
                if (status === 'complete' && result.poiList) {
                    const places = result.poiList.pois.map(poi => ({
                        id: poi.id,
                        name: poi.name,
                        address: poi.address,
                        location: poi.location,
                        distance: poi.distance,
                        tel: poi.tel,
                        type: poi.type,
                        website: poi.website,
                        photos: poi.photos
                    }));
                    resolve(places);
                } else {
                    reject(new Error('搜索地点失败'));
                }
            });
        });
    }

    /**
     * 周边搜索
     * @param {Array|AMap.LngLat} center - 中心点
     * @param {string} keyword - 搜索关键词
     * @param {number} radius - 搜索半径（米）
     * @returns {Promise<Array>} 搜索结果
     */
    async searchNearby(center, keyword, radius = 1000) {
        return new Promise((resolve, reject) => {
            if (!this.placeSearchService) {
                reject(new Error('地点搜索服务未初始化'));
                return;
            }

            this.placeSearchService.searchNearBy(keyword, center, radius, (status, result) => {
                if (status === 'complete' && result.poiList) {
                    const places = result.poiList.pois.map(poi => ({
                        id: poi.id,
                        name: poi.name,
                        address: poi.address,
                        location: poi.location,
                        distance: poi.distance,
                        tel: poi.tel,
                        type: poi.type
                    }));
                    resolve(places);
                } else {
                    reject(new Error('周边搜索失败'));
                }
            });
        });
    }

    /**
     * 驾车路线规划
     * @param {Array|AMap.LngLat} start - 起点
     * @param {Array|AMap.LngLat} end - 终点
     * @param {Array} waypoints - 途经点（可选）
     * @param {Object} options - 路线选项
     * @returns {Promise<Object>} 路线结果
     */
    async planDrivingRoute(start, end, waypoints = [], options = {}) {
        return new Promise((resolve, reject) => {
            if (!this.drivingService) {
                reject(new Error('驾车路线服务未初始化'));
                return;
            }

            // 设置路线策略
            if (options.policy) {
                this.drivingService.setPolicy(options.policy);
            }

            this.drivingService.search(start, end, {
                waypoints: waypoints
            }, (status, result) => {
                if (status === 'complete') {
                    const route = result.routes[0];
                    resolve({
                        distance: route.distance,
                        time: route.time,
                        tolls: route.tolls,
                        tollDistance: route.tollDistance,
                        paths: route.steps.map(step => ({
                            instruction: step.instruction,
                            distance: step.distance,
                            time: step.time,
                            path: step.path
                        }))
                    });
                } else {
                    reject(new Error('驾车路线规划失败'));
                }
            });
        });
    }

    /**
     * 步行路线规划
     * @param {Array|AMap.LngLat} start - 起点
     * @param {Array|AMap.LngLat} end - 终点
     * @returns {Promise<Object>} 路线结果
     */
    async planWalkingRoute(start, end) {
        return new Promise((resolve, reject) => {
            if (!this.walkingService) {
                reject(new Error('步行路线服务未初始化'));
                return;
            }

            this.walkingService.search(start, end, (status, result) => {
                if (status === 'complete') {
                    const route = result.routes[0];
                    resolve({
                        distance: route.distance,
                        time: route.time,
                        paths: route.steps.map(step => ({
                            instruction: step.instruction,
                            distance: step.distance,
                            time: step.time,
                            path: step.path
                        }))
                    });
                } else {
                    reject(new Error('步行路线规划失败'));
                }
            });
        });
    }

    /**
     * 公交路线规划
     * @param {Array|AMap.LngLat} start - 起点
     * @param {Array|AMap.LngLat} end - 终点
     * @param {string} city - 城市
     * @param {Object} options - 路线选项
     * @returns {Promise<Object>} 路线结果
     */
    async planTransitRoute(start, end, city, options = {}) {
        return new Promise((resolve, reject) => {
            if (!this.transitService) {
                reject(new Error('公交路线服务未初始化'));
                return;
            }

            // 设置城市
            this.transitService.setCity(city);

            // 设置路线策略
            if (options.policy) {
                this.transitService.setPolicy(options.policy);
            }

            this.transitService.search(start, end, (status, result) => {
                if (status === 'complete' && result.plans.length > 0) {
                    const plans = result.plans.map(plan => ({
                        distance: plan.distance,
                        time: plan.time,
                        cost: plan.cost,
                        segments: plan.segments.map(segment => ({
                            transit_mode: segment.transit_mode,
                            distance: segment.distance,
                            time: segment.time,
                            instruction: segment.instruction
                        }))
                    }));
                    resolve({ plans });
                } else {
                    reject(new Error('公交路线规划失败'));
                }
            });
        });
    }

    /**
     * 添加标记
     * @param {Array|AMap.LngLat} position - 位置
     * @param {Object} options - 标记选项
     * @returns {AMap.Marker} 标记对象
     */
    addMarker(position, options = {}) {
        const markerOptions = {
            position: position,
            title: options.title || '',
            content: options.content,
            ...options
        };

        // 设置标记样式
        if (options.type && this.markerStyles[options.type]) {
            const style = this.markerStyles[options.type];
            markerOptions.icon = style.icon;
            markerOptions.size = style.size;
        }

        const marker = new AMap.Marker(markerOptions);
        marker.setMap(this.map);

        // 添加点击事件
        if (options.onClick) {
            marker.on('click', options.onClick);
        }

        // 添加信息窗口
        if (options.infoWindow) {
            const infoWindow = new AMap.InfoWindow({
                content: options.infoWindow.content,
                offset: new AMap.Pixel(0, -30)
            });

            marker.on('click', () => {
                infoWindow.open(this.map, marker.getPosition());
            });

            this.infoWindows.push(infoWindow);
        }

        this.markers.push(marker);
        return marker;
    }

    /**
     * 批量添加标记
     * @param {Array} markersData - 标记数据数组
     * @returns {Array} 标记对象数组
     */
    addMarkers(markersData) {
        return markersData.map(markerData =>
            this.addMarker(markerData.position, markerData.options)
        );
    }

    /**
     * 清除所有标记
     */
    clearMarkers() {
        this.markers.forEach(marker => {
            marker.setMap(null);
        });
        this.markers = [];
    }

    /**
     * 清除所有信息窗口
     */
    clearInfoWindows() {
        this.infoWindows.forEach(infoWindow => {
            infoWindow.close();
        });
        this.infoWindows = [];
    }

    /**
     * 添加路线
     * @param {Array} path - 路径点数组
     * @param {Object} options - 路线选项
     * @returns {AMap.Polyline} 路线对象
     */
    addPolyline(path, options = {}) {
        const polylineOptions = {
            path: path,
            strokeColor: options.strokeColor || '#3b82f6',
            strokeWeight: options.strokeWeight || 6,
            strokeOpacity: options.strokeOpacity || 0.8,
            strokeStyle: options.strokeStyle || 'solid',
            ...options
        };

        const polyline = new AMap.Polyline(polylineOptions);
        polyline.setMap(this.map);
        this.polylines.push(polyline);

        return polyline;
    }

    /**
     * 清除所有路线
     */
    clearPolylines() {
        this.polylines.forEach(polyline => {
            polyline.setMap(null);
        });
        this.polylines = [];
    }

    /**
     * 显示行程路线
     * @param {Object} trip - 行程对象
     */
    async displayTripRoute(trip) {
        try {
            this.clearMarkers();
            this.clearPolylines();
            this.clearInfoWindows();

            if (!trip || !trip.items || trip.items.length === 0) {
                return;
            }

            // 添加行程项目标记
            const bounds = new AMap.Bounds();
            trip.items.forEach((item, index) => {
                if (item.location_coordinates) {
                    const position = [
                        item.location_coordinates.longitude,
                        item.location_coordinates.latitude
                    ];

                    // 添加标记
                    this.addMarker(position, {
                        type: item.item_type,
                        title: item.title,
                        infoWindow: {
                            content: this.createInfoWindowContent(item)
                        }
                    });

                    bounds.extend(position);
                }
            });

            // 调整地图视野
            if (bounds.northeast && bounds.southwest) {
                this.map.setBounds(bounds);
            }

            // 连接路线
            await this.connectTripItems(trip.items);

        } catch (error) {
            console.error('显示行程路线失败:', error);
            throw error;
        }
    }

    /**
     * 连接行程项目路线
     * @param {Array} items - 行程项目数组
     */
    async connectTripItems(items) {
        const transportItems = items
            .filter(item => item.location_coordinates)
            .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));

        for (let i = 0; i < transportItems.length - 1; i++) {
            const start = [
                transportItems[i].location_coordinates.longitude,
                transportItems[i].location_coordinates.latitude
            ];
            const end = [
                transportItems[i + 1].location_coordinates.longitude,
                transportItems[i + 1].location_coordinates.latitude
            ];

            try {
                // 根据项目类型选择路线规划方式
                const routeType = this.determineRouteType(transportItems[i], transportItems[i + 1]);
                let routeResult;

                switch (routeType) {
                    case 'driving':
                        routeResult = await this.planDrivingRoute(start, end);
                        break;
                    case 'walking':
                        routeResult = await this.planWalkingRoute(start, end);
                        break;
                    default:
                        // 直线连接
                        this.addPolyline([start, end], this.routeStyles.driving);
                        continue;
                }

                // 绘制路线
                if (routeResult && routeResult.paths) {
                    routeResult.paths.forEach(pathData => {
                        if (pathData.path) {
                            this.addPolyline(pathData.path, this.routeStyles[routeType]);
                        }
                    });
                }

            } catch (error) {
                console.warn('路线规划失败，使用直线连接:', error);
                this.addPolyline([start, end], {
                    ...this.routeStyles.driving,
                    strokeStyle: 'dashed'
                });
            }
        }
    }

    /**
     * 确定路线类型
     * @param {Object} startItem - 起始项目
     * @param {Object} endItem - 结束项目
     * @returns {string} 路线类型
     */
    determineRouteType(startItem, endItem) {
        // 简单的路线类型判断逻辑
        const distance = AMap.GeometryUtil.distance(
            [startItem.location_coordinates.longitude, startItem.location_coordinates.latitude],
            [endItem.location_coordinates.longitude, endItem.location_coordinates.latitude]
        );

        if (distance < 1000) {
            return 'walking';
        } else {
            return 'driving';
        }
    }

    /**
     * 创建信息窗口内容
     * @param {Object} item - 行程项目
     * @returns {string} HTML内容
     */
    createInfoWindowContent(item) {
        const startTime = new Date(item.start_datetime).toLocaleString('zh-CN');
        const endTime = item.end_datetime ? new Date(item.end_datetime).toLocaleString('zh-CN') : '';

        return `
            <div class="info-window">
                <h4>${item.title}</h4>
                <p><strong>类型:</strong> ${this.getItemTypeText(item.item_type)}</p>
                <p><strong>开始时间:</strong> ${startTime}</p>
                ${endTime ? `<p><strong>结束时间:</strong> ${endTime}</p>` : ''}
                ${item.location_name ? `<p><strong>地点:</strong> ${item.location_name}</p>` : ''}
                ${item.cost ? `<p><strong>费用:</strong> ¥${item.cost}</p>` : ''}
                ${item.notes ? `<p><strong>备注:</strong> ${item.notes}</p>` : ''}
            </div>
        `;
    }

    /**
     * 获取项目类型文本
     * @param {string} type - 项目类型
     * @returns {string} 类型文本
     */
    getItemTypeText(type) {
        const typeMap = {
            transport: '交通',
            accommodation: '住宿',
            activity: '活动',
            meal: '餐饮',
            attraction: '景点',
            other: '其他'
        };
        return typeMap[type] || '未知';
    }
                    });

                    // 初始化地理编码服务
                    this.geocoder = new AMap.Geocoder({
                        city: '全国'
                    });

                    // 初始化定位服务
                    this.geolocation = new AMap.Geolocation({
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 0,
                        convert: true,
                        showButton: false,
                        buttonPosition: 'LB',
                        showMarker: true,
                        showCircle: true,
                        panToLocation: true,
                        zoomToAccuracy: true
                    });

                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    /**
     * 获取当前位置
     * @returns {Promise<object>} 位置信息
     */
    getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!this.geolocation) {
                reject(new Error('定位服务未初始化'));
                return;
            }

            this.geolocation.getCurrentPosition((status, result) => {
                if (status === 'complete') {
                    const position = {
                        lng: result.position.lng,
                        lat: result.position.lat,
                        address: result.formattedAddress || '位置信息获取中...'
                    };

                    // 更新地图中心点
                    this.map.setCenter([position.lng, position.lat]);
                    this.map.setZoom(15);

                    console.log('定位成功:', position);
                    resolve(position);
                } else {
                    console.warn('定位失败:', result);
                    resolve(null); // 不要reject，允许继续使用默认位置
                }
            });
        });
    }

    /**
     * 搜索地点建议
     * @param {string} keyword - 搜索关键词
     * @returns {Promise<Array>} 建议列表
     */
    searchPlaceSuggestions(keyword) {
        return new Promise((resolve, reject) => {
            if (!this.autoCompleteService || !keyword.trim()) {
                resolve([]);
                return;
            }

            this.autoCompleteService.search(keyword, (status, result) => {
                if (status === 'complete' && result.tips) {
                    const suggestions = result.tips
                        .filter(tip => tip.location) // 只返回有坐标的结果
                        .map(tip => ({
                            id: tip.id,
                            name: tip.name,
                            district: tip.district,
                            address: tip.address || tip.district,
                            location: {
                                lng: tip.location.lng,
                                lat: tip.location.lat
                            }
                        }))
                        .slice(0, 8); // 限制返回8个结果

                    resolve(suggestions);
                } else {
                    console.warn('搜索建议失败:', result);
                    resolve([]);
                }
            });
        });
    }

    /**
     * 地理编码 - 根据地址获取坐标
     * @param {string} address - 地址
     * @returns {Promise<object>} 坐标信息
     */
    geocodeAddress(address) {
        return new Promise((resolve, reject) => {
            if (!this.geocoder || !address.trim()) {
                reject(new Error('地理编码服务未初始化或地址为空'));
                return;
            }

            this.geocoder.getLocation(address, (status, result) => {
                if (status === 'complete' && result.geocodes && result.geocodes.length > 0) {
                    const geocode = result.geocodes[0];
                    const location = {
                        lng: geocode.location.lng,
                        lat: geocode.location.lat,
                        address: geocode.formattedAddress,
                        level: geocode.level
                    };
                    resolve(location);
                } else {
                    reject(new Error('地址解析失败'));
                }
            });
        });
    }

    /**
     * 逆地理编码 - 根据坐标获取地址
     * @param {number} lng - 经度
     * @param {number} lat - 纬度
     * @returns {Promise<string>} 地址信息
     */
    reverseGeocode(lng, lat) {
        return new Promise((resolve, reject) => {
            if (!this.geocoder) {
                reject(new Error('地理编码服务未初始化'));
                return;
            }

            const lnglat = new AMap.LngLat(lng, lat);
            this.geocoder.getAddress(lnglat, (status, result) => {
                if (status === 'complete' && result.regeocode) {
                    resolve(result.regeocode.formattedAddress);
                } else {
                    reject(new Error('坐标解析失败'));
                }
            });
        });
    }

    /**
     * 添加地图标记
     * @param {object} trip - 旅行计划对象
     * @returns {object} 标记对象
     */
    addTripMarker(trip) {
        if (!this.map || !trip.coordinates) {
            return null;
        }

        try {
            const marker = new AMap.Marker({
                position: [trip.coordinates.lng, trip.coordinates.lat],
                title: trip.title,
                content: this.createMarkerContent(trip),
                offset: new AMap.Pixel(-15, -30)
            });

            // 添加点击事件
            marker.on('click', () => {
                this.showTripInfo(trip);
            });

            // 添加到地图
            this.map.add(marker);

            // 存储标记引用
            this.markers.push({
                id: trip.id,
                marker: marker,
                trip: trip
            });

            return marker;
        } catch (error) {
            console.error('添加标记失败:', error);
            return null;
        }
    }

    /**
     * 创建标记内容
     * @param {object} trip - 旅行计划对象
     * @returns {string} HTML内容
     */
    createMarkerContent(trip) {
        const statusIcon = getStatusIcon(trip.status);
        const statusColor = {
            planning: '#3b82f6',
            completed: '#10b981',
            cancelled: '#ef4444'
        }[trip.status] || '#3b82f6';

        return `
            <div class="custom-marker" style="
                background: ${statusColor};
                color: white;
                padding: 8px 12px;
                border-radius: 20px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                font-size: 12px;
                font-weight: 500;
                white-space: nowrap;
                position: relative;
                max-width: 150px;
                text-align: center;
            ">
                <div style="display: flex; align-items: center; gap: 4px;">
                    <span>${statusIcon}</span>
                    <span>${trip.title}</span>
                </div>
                <div style="
                    position: absolute;
                    bottom: -6px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 0;
                    height: 0;
                    border-left: 6px solid transparent;
                    border-right: 6px solid transparent;
                    border-top: 6px solid ${statusColor};
                "></div>
            </div>
        `;
    }

    /**
     * 显示旅行信息窗口
     * @param {object} trip - 旅行计划对象
     */
    showTripInfo(trip) {
        const days = calculateDaysBetween(trip.startDate, trip.endDate);
        const infoWindow = new AMap.InfoWindow({
            content: `
                <div style="padding: 16px; min-width: 200px;">
                    <h3 style="margin: 0 0 8px 0; color: #1f2937; font-size: 16px;">${trip.title}</h3>
                    <p style="margin: 4px 0; color: #6b7280; font-size: 14px;">
                        <strong>目的地:</strong> ${trip.destination}
                    </p>
                    <p style="margin: 4px 0; color: #6b7280; font-size: 14px;">
                        <strong>日期:</strong> ${formatDate(trip.startDate)} - ${formatDate(trip.endDate)}
                        ${days > 0 ? `(${days}天)` : ''}
                    </p>
                    <p style="margin: 4px 0; color: #6b7280; font-size: 14px;">
                        <strong>状态:</strong>
                        <span style="color: ${this.getStatusColor(trip.status)};">
                            ${getStatusIcon(trip.status)} ${getStatusText(trip.status)}
                        </span>
                    </p>
                    ${trip.description ? `
                        <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 13px;">
                            ${trip.description}
                        </p>
                    ` : ''}
                </div>
            `,
            position: [trip.coordinates.lng, trip.coordinates.lat],
            offset: new AMap.Pixel(0, -30)
        });

        infoWindow.open(this.map);
    }

    /**
     * 获取状态颜色
     * @param {string} status - 状态
     * @returns {string} 颜色值
     */
    getStatusColor(status) {
        const colors = {
            planning: '#3b82f6',
            completed: '#10b981',
            cancelled: '#ef4444'
        };
        return colors[status] || '#6b7280';
    }

    /**
     * 移除指定旅行的标记
     * @param {string} tripId - 旅行计划ID
     */
    removeTripMarker(tripId) {
        const markerIndex = this.markers.findIndex(item => item.id === tripId);
        if (markerIndex !== -1) {
            const markerItem = this.markers[markerIndex];
            this.map.remove(markerItem.marker);
            this.markers.splice(markerIndex, 1);
        }
    }

    /**
     * 更新标记
     * @param {object} trip - 更新后的旅行计划对象
     */
    updateTripMarker(trip) {
        // 先移除旧标记
        this.removeTripMarker(trip.id);
        // 添加新标记
        if (trip.coordinates) {
            this.addTripMarker(trip);
        }
    }

    /**
     * 清除所有标记
     */
    clearAllMarkers() {
        this.markers.forEach(item => {
            this.map.remove(item.marker);
        });
        this.markers = [];
    }

    /**
     * 显示所有旅行标记
     * @param {Array} trips - 旅行计划数组
     */
    showTripsOnMap(trips) {
        // 先清除现有标记
        this.clearAllMarkers();

        // 添加新标记
        const validTrips = trips.filter(trip => trip.coordinates);
        validTrips.forEach(trip => {
            this.addTripMarker(trip);
        });

        // 如果有标记，调整地图视野以包含所有标记
        if (validTrips.length > 0) {
            this.fitMapToMarkers(validTrips);
        }
    }

    /**
     * 调整地图视野以包含所有标记
     * @param {Array} trips - 有坐标的旅行计划数组
     */
    fitMapToMarkers(trips) {
        if (trips.length === 0) return;

        if (trips.length === 1) {
            // 只有一个标记时，移动到该位置
            const trip = trips[0];
            this.map.setCenter([trip.coordinates.lng, trip.coordinates.lat]);
            this.map.setZoom(15);
        } else {
            // 多个标记时，调整视野包含所有标记
            const bounds = new AMap.Bounds();
            trips.forEach(trip => {
                bounds.extend([trip.coordinates.lng, trip.coordinates.lat]);
            });
            this.map.setBounds(bounds, false, [20, 20, 20, 20]);
        }
    }

    /**
     * 移动到指定位置
     * @param {number} lng - 经度
     * @param {number} lat - 纬度
     * @param {number} zoom - 缩放级别
     */
    panTo(lng, lat, zoom = 15) {
        if (this.map) {
            this.map.setCenter([lng, lat]);
            this.map.setZoom(zoom);
        }
    }

    /**
     * 刷新地图
     */
    refresh() {
        if (this.map) {
            this.map.getSize();
            setTimeout(() => {
                this.map.getSize();
            }, 200);
        }
    }

    /**
     * 销毁地图
     */
    destroy() {
        if (this.map) {
            this.clearAllMarkers();
            this.map.destroy();
            this.map = null;
        }
        this.isInitialized = false;
    }
}

// 创建地图管理器实例
const amap = new AmapManager();