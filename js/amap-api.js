/**
 * 高德地图API封装模块
 * 提供地图相关功能的统一接口
 */

class AmapManager {
    constructor() {
        this.map = null;
        this.markers = [];
        this.autoCompleteService = null;
        this.geocoder = null;
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
                'AMap.Geolocation'
            ], () => {
                try {
                    // 初始化自动完成服务
                    this.autoCompleteService = new AMap.AutoComplete({
                        city: '全国'
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